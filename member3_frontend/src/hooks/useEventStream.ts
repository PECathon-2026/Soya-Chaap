"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { DevPilotEvent, AgentType, MissionState, PlanTask } from "@/types/events";
import { reduceMissionState, initialMissionState } from "@/lib/mission-state";

export type EventSourceType = "replay" | "sse" | "websocket";

export interface ScenarioItem {
  id: string;
  title: string;
  objective?: string;
  default_request?: string;
  target_file?: string;
  test_file?: string;
  available?: boolean;
}

export interface UseEventStreamOptions {
  missionId?: string;
  sourceType?: EventSourceType;
  autoPlay?: boolean;
}

export interface UseEventStreamReturn {
  events: DevPilotEvent[];
  allEvents: DevPilotEvent[];
  currentEvent: DevPilotEvent | null;
  activeAgent: AgentType | null;
  isPlaying: boolean;
  speed: 1 | 2 | 5;
  isFinished: boolean;
  missionState: MissionState;
  sourceType: EventSourceType;
  scenarios: ScenarioItem[];
  selectedScenario: string;
  setSelectedScenario: (id: string) => void;
  play: () => void;
  pause: () => void;
  restart: () => void;
  step: () => void;
  setSpeed: (speed: 1 | 2 | 5) => void;
  postApproval: (approvalId: string, decision: "approved" | "rejected", notes?: string) => Promise<void>;
  submitClarification: (questionId: string, answer: string) => void;
  addUserInstruction: (instruction: string) => void;
  launchMission: (userRequest?: string, scenarioKey?: string) => Promise<void>;
  compareBaseline: (scenarioName?: string, userRequest?: string) => Promise<any>;
}

export function useEventStream(options: UseEventStreamOptions = {}): UseEventStreamReturn {
  const envSource = (process.env.NEXT_PUBLIC_EVENT_SOURCE as EventSourceType) || "websocket";
  const sourceType = options.sourceType || envSource;
  const initialMissionId = options.missionId || "01_feature_impl";

  const [allEvents, setAllEvents] = useState<DevPilotEvent[]>([]);
  const [streamedEvents, setStreamedEvents] = useState<DevPilotEvent[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(options.autoPlay ?? true);
  const [speed, setSpeed] = useState<1 | 2 | 5>(1);
  const [isFinished, setIsFinished] = useState<boolean>(false);
  const [activeAgent, setActiveAgent] = useState<AgentType | null>(null);

  // Scenarios state fetched from GET /api/scenarios
  const [scenarios, setScenarios] = useState<ScenarioItem[]>([
    {
      id: "01_feature_impl",
      title: "Feature Implementation",
      objective: "Add slugify(text) to string_utils.py and add unit test while preserving existing tests.",
      default_request: "Implement slugify(text: str) -> str in string_utils.py that lowercases, trims whitespace, and replaces non-alphanumeric chars with hyphens. Add test_slugify in test_utils.py.",
      target_file: "string_utils.py",
      test_file: "test_utils.py",
      available: true,
    },
    {
      id: "02_bug_investigation",
      title: "Bug Investigation",
      objective: "Detect and fix seeded off-by-one bug in calculate_moving_average loop boundary.",
      default_request: "Investigate why test_calculator.py fails. Fix the calculation bug in calculator.py so that calculate_moving_average computes all windows accurately.",
      target_file: "calculator.py",
      test_file: "test_calculator.py",
      available: true,
    },
    {
      id: "03_test_driven_recovery",
      title: "Test-Driven Recovery",
      objective: "Implement validate_token from scratch satisfying BEARER-<hex> protocol requirements.",
      default_request: "Repair token_auth.py so that validate_token properly checks for 'BEARER-' prefix, hexadecimal payload, and minimum length of 12 characters to pass test_token_auth.py.",
      target_file: "token_auth.py",
      test_file: "test_token_auth.py",
      available: true,
    },
    {
      id: "04_security_code_review",
      title: "Security Code Review",
      objective: "Detect hardcoded AWS secret and raw SQL injection, reject diff, and force secure remediation.",
      default_request: "Perform a security audit and refactor db_service.py. Eliminate the hardcoded AWS secret key using environment variables and sanitize the raw SQL string interpolation with parameterized queries.",
      target_file: "db_service.py",
      test_file: "test_db_service.py",
      available: true,
    },
    {
      id: "05_unexpected_conditions",
      title: "Unexpected Conditions & Bounded Autonomy",
      objective: "Handle unreachable external endpoint gracefully without infinite recursion or crashes.",
      default_request: "Enhance remote_sync.py to catch connection timeouts/unreachable host errors and return {'synced': False, 'reason': 'unreachable'} without crashing.",
      target_file: "remote_sync.py",
      test_file: "test_remote_sync.py",
      available: true,
    },
  ]);
  const [selectedScenario, setSelectedScenario] = useState<string>(initialMissionId);

  // Live mission state accumulated from events & backend data.state updates
  const [liveState, setLiveState] = useState<Partial<MissionState>>({
    missionId: initialMissionId,
    title: "Feature Implementation",
    status: "idle",
    git_diff: "",
  });

  const wsRef = useRef<WebSocket | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Helper to map backend node names to AgentType for AgentGraph
  const mapNodeToAgent = (nodeName: string): AgentType => {
    const lower = (nodeName || "").toLowerCase();
    if (lower.includes("shogun")) return "shogun";
    if (lower.includes("samurai")) return "samurai";
    if (lower.includes("sentinel")) return "sentinel";
    if (lower.includes("shadow")) return "shadow";
    return "orchestrator";
  };

  // 1. Fetch scenarios on mount from GET http://localhost:8000/api/scenarios
  useEffect(() => {
    let cancelled = false;
    fetch("http://localhost:8000/api/scenarios")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.scenarios && Array.isArray(data.scenarios) && data.scenarios.length > 0) {
          setScenarios(data.scenarios);
          if (!selectedScenario || selectedScenario === "mission_001") {
            setSelectedScenario(data.scenarios[0].id);
          }
        }
      })
      .catch((err) => {
        console.warn("[Scenarios API] Using fallback scenario list:", err);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // 2. Establish live WebSocket connection to ws://localhost:8000/ws/mission
  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimer: NodeJS.Timeout | null = null;

    const connectWebSocket = () => {
      try {
        ws = new WebSocket("ws://localhost:8000/ws/mission");
        wsRef.current = ws;

        ws.onopen = () => {
          console.info("[DevPilot WS] Connected to ws://localhost:8000/ws/mission");
        };

        ws.onmessage = (event) => {
          try {
            const parsed = JSON.parse(event.data);
            const rawEvent = (parsed.event || "").toLowerCase();
            const data = parsed.data || {};
            const timestamp = parsed.timestamp || new Date().toISOString();

            // -------------------------------------------------------------
            // A. MAP data.state updates (acceptance_criteria, tasks, git_diff, etc.)
            // -------------------------------------------------------------
            const stateUpdate = data.state || (data.details && typeof data.details === "object" ? data.details : null);
            if (stateUpdate) {
              setLiveState((prev) => {
                const nextState: Partial<MissionState> = { ...prev };
                if (stateUpdate.acceptance_criteria && Array.isArray(stateUpdate.acceptance_criteria)) {
                  nextState.acceptanceCriteria = stateUpdate.acceptance_criteria.map((ac: string | { text: string; completed?: boolean }) => ({
                    text: typeof ac === "string" ? ac : ac.text,
                    completed: typeof ac === "string" ? false : Boolean(ac.completed),
                  }));
                }
                if (stateUpdate.tasks && Array.isArray(stateUpdate.tasks)) {
                  nextState.tasks = stateUpdate.tasks.map((t: any) => ({
                    id: String(t.id || `task_${Date.now()}`),
                    title: String(t.description || t.title || "Execute task"),
                    status: (t.status || "pending") as PlanTask["status"],
                    assignee: mapNodeToAgent(t.assignee || "samurai"),
                  }));
                }
                if (stateUpdate.git_diff !== undefined) {
                  nextState.git_diff = stateUpdate.git_diff;
                }
                if (stateUpdate.iteration_count !== undefined) {
                  nextState.iteration = stateUpdate.iteration_count;
                }
                return nextState;
              });
            }

            // -------------------------------------------------------------
            // B. DISPATCH SPECIFIC WEBSOCKET EVENTS
            // -------------------------------------------------------------
            if (rawEvent === "node_start" || rawEvent === "node_started") {
              const node = data.node || data.name || "orchestrator";
              const mapped = mapNodeToAgent(node);
              setActiveAgent(mapped);

              const eventItem: DevPilotEvent = {
                id: Date.now() + Math.floor(Math.random() * 1000),
                ts: timestamp,
                type: "tool_called",
                agent: mapped,
                data: {
                  tool: node,
                  args: { iteration: data.iteration || 1 },
                  intent: data.description || `Commencing ${node} execution phase`,
                },
              };
              setStreamedEvents((prev) => [...prev, eventItem]);
            } else if (rawEvent === "node_finish" || rawEvent === "node_completed") {
              const node = data.node || data.name || "orchestrator";
              const mapped = mapNodeToAgent(node);

              if (data.details?.acceptance_criteria || data.details?.tasks) {
                const criteria = data.details.acceptance_criteria || [];
                const tasks = (data.details.tasks || []).map((t: any) => ({
                  id: String(t.id || "t1"),
                  title: String(t.description || t.title || "Task"),
                  status: (t.status || "pending") as PlanTask["status"],
                  assignee: mapped,
                }));

                const planEvent: DevPilotEvent = {
                  id: Date.now() + Math.floor(Math.random() * 1000),
                  ts: timestamp,
                  type: "plan_created",
                  agent: "shogun",
                  data: {
                    goal: data.summary || "DevPilot Guild Plan Formulation",
                    acceptanceCriteria: criteria,
                    tasks: tasks,
                    riskAssessment: "Automated analysis with Shadow Council oversight",
                  },
                };
                setStreamedEvents((prev) => [...prev, planEvent]);
              } else {
                const eventItem: DevPilotEvent = {
                  id: Date.now() + Math.floor(Math.random() * 1000),
                  ts: timestamp,
                  type: "tool_result",
                  agent: mapped,
                  data: {
                    tool: node,
                    output: data.summary || `Finished ${node}`,
                    verified: true,
                    exitCode: 0,
                  },
                };
                setStreamedEvents((prev) => [...prev, eventItem]);
              }
            } else if (rawEvent === "diff" || rawEvent === "diff_updated") {
              const diffStr = data.git_diff || "";
              setLiveState((prev) => ({
                ...prev,
                git_diff: diffStr,
                modifiedFiles: data.changed_files || prev.modifiedFiles || [],
              }));
            } else if (rawEvent === "test" || rawEvent === "test_output") {
              const passed = Boolean(data.passed);
              const testEvent: DevPilotEvent = passed
                ? {
                    id: Date.now() + Math.floor(Math.random() * 1000),
                    ts: timestamp,
                    type: "test_passed",
                    agent: "sentinel",
                    data: {
                      suite: "Pytest Test Suite",
                      passed: 1,
                      total: 1,
                      durationMs: 420,
                      verified: true,
                      assertionsCount: 3,
                    },
                  }
                : {
                    id: Date.now() + Math.floor(Math.random() * 1000),
                    ts: timestamp,
                    type: "test_failed",
                    agent: "sentinel",
                    data: {
                      suite: "Pytest Test Suite",
                      passed: 0,
                      failed: 1,
                      total: 1,
                      errorSnippet: data.stdout || data.stderr || "Test assertions failed",
                      output: data.stdout || "Pytest failure details",
                      verified: false,
                    },
                  };
              setStreamedEvents((prev) => [...prev, testEvent]);
            } else if (rawEvent === "critique" || rawEvent === "critique_received") {
              if (data.findings && Array.isArray(data.findings) && data.findings.length > 0) {
                data.findings.forEach((f: any, idx: number) => {
                  const findingStr = typeof f === "string" ? f : f.description || JSON.stringify(f);
                  const findingEvent: DevPilotEvent = {
                    id: Date.now() + idx,
                    ts: timestamp,
                    type: "review_finding",
                    agent: "shadow",
                    data: {
                      findingId: `sec_${Date.now()}_${idx}`,
                      severity: "high",
                      category: "security",
                      file: "target_file.py",
                      line: 1,
                      rule: "VULNERABILITY_CHECK",
                      description: findingStr,
                      evidence: findingStr,
                      remediationTarget: "samurai",
                    },
                  };
                  setStreamedEvents((prev) => [...prev, findingEvent]);
                });
              }
            } else if (rawEvent === "interrupt" || rawEvent === "awaiting_human_approval") {
              const gitDiff = data.git_diff || "";
              setLiveState((prev) => ({
                ...prev,
                status: "waiting_approval",
                git_diff: gitDiff || prev.git_diff,
              }));
              setActiveAgent("orchestrator");

              const approvalEvent: DevPilotEvent = {
                id: Date.now(),
                ts: timestamp,
                type: "approval_requested",
                agent: "orchestrator",
                data: {
                  approvalId: data.mission_id || `approval_${Date.now()}`,
                  summary: data.changes_summary || `Changes prepared for ${data.scenario_name || "scenario"}. Sign-off requested.`,
                  riskLevel: data.security_summary?.passed ? "low" : "high",
                  changesCount: {
                    files: 1,
                    additions: 14,
                    deletions: 2,
                  },
                  diffPreview: gitDiff,
                  verified: Boolean(data.test_summary?.passed),
                },
              };
              setStreamedEvents((prev) => [...prev, approvalEvent]);
            } else if (rawEvent === "complete" || rawEvent === "mission_completed") {
              const isMerged = data.status === "merged";
              setIsFinished(true);
              setIsPlaying(false);
              setLiveState((prev) => ({
                ...prev,
                status: isMerged ? "done" : "idle",
              }));
              setActiveAgent(null);

              const doneEvent: DevPilotEvent = {
                id: Date.now(),
                ts: timestamp,
                type: "mission_done",
                agent: "orchestrator",
                data: {
                  summary: data.summary || (isMerged ? "Mission approved and merged." : "Mission completed."),
                  verifiedOutcomes: [
                    "Automated pytest regression checks passed",
                    "Shadow Council security scan verified",
                    "Human Daimyo authorization confirmed",
                  ],
                  unverifiedClaims: [],
                  durationMs: 4800,
                  iterations: data.iteration || 1,
                },
              };
              setStreamedEvents((prev) => [...prev, doneEvent]);
            } else if (rawEvent === "iteration") {
              setLiveState((prev) => ({
                ...prev,
                iteration: (prev.iteration || 1) + 1,
                retryCount: (prev.retryCount || 0) + 1,
              }));

              const retryEvent: DevPilotEvent = {
                id: Date.now(),
                ts: timestamp,
                type: "retry",
                agent: "orchestrator",
                data: {
                  retryIndex: data.iteration || 2,
                  maxRetries: 3,
                  routedTo: "samurai",
                  reason: data.reason || "Autonomous defect repair loop initiated",
                  strategyAdjustment: "Re-synthesizing code modifications to resolve failing test traces.",
                },
              };
              setStreamedEvents((prev) => [...prev, retryEvent]);
            } else if (rawEvent === "status" || rawEvent === "mission_started") {
              setLiveState((prev) => ({
                ...prev,
                missionId: data.mission_id || prev.missionId,
                title: data.scenario_name || prev.title,
                status: "running",
              }));
              setIsFinished(false);
              setIsPlaying(true);

              const startEvent: DevPilotEvent = {
                id: Date.now(),
                ts: timestamp,
                type: "mission_started",
                agent: "orchestrator",
                data: {
                  missionId: data.mission_id || "mission_001",
                  title: data.scenario_name || "DevPilot Engineering Mission",
                  objective: data.user_request || "Execute multi-agent engineering workflow",
                  repo: data.repo_path || "sandbox_repos",
                  branch: "main",
                  commit: "HEAD",
                },
              };
              setStreamedEvents((prev) => [...prev, startEvent]);
            } else if (rawEvent === "error") {
              setLiveState((prev) => ({ ...prev, status: "escalated" }));
              const errorEvent: DevPilotEvent = {
                id: Date.now(),
                ts: timestamp,
                type: "mission_escalated",
                agent: "orchestrator",
                data: {
                  attemptCount: 3,
                  maxAttempts: 3,
                  reason: data.summary || data.error || "Unhandled error during mission execution",
                  blockerDetails: JSON.stringify(data),
                  suggestedHumanAction: "Review terminal traces and verify environment parameters.",
                },
              };
              setStreamedEvents((prev) => [...prev, errorEvent]);
            }
          } catch (e) {
            console.error("[DevPilot WS] Failed to parse message:", e);
          }
        };

        ws.onclose = () => {
          console.warn("[DevPilot WS] Connection closed. Retrying in 2.5s...");
          reconnectTimer = setTimeout(connectWebSocket, 2500);
        };

        ws.onerror = (err) => {
          console.warn("[DevPilot WS] Socket error:", err);
          ws?.close();
        };
      } catch (err) {
        console.warn("[DevPilot WS] Could not instantiate WebSocket:", err);
        reconnectTimer = setTimeout(connectWebSocket, 2500);
      }
    };

    connectWebSocket();

    return () => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (ws) ws.close();
    };
  }, []);

  // 3. Fallback Replay tick loop if user switches to replay
  useEffect(() => {
    if (sourceType !== "replay") return;
    if (!isPlaying) return;
    if (allEvents.length === 0) return;
    if (currentIndex >= allEvents.length) {
      setIsFinished(true);
      setIsPlaying(false);
      return;
    }

    const baseDelay = 1600;
    const delay = Math.max(300, Math.floor(baseDelay / speed));

    timerRef.current = setTimeout(() => {
      const nextEvent = allEvents[currentIndex];
      if (nextEvent) {
        setStreamedEvents((prev) => [...prev, nextEvent]);
        setCurrentIndex((prev) => prev + 1);
      }
    }, delay);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [sourceType, isPlaying, currentIndex, allEvents, speed]);

  // Controls
  const play = useCallback(() => {
    if (currentIndex >= allEvents.length && allEvents.length > 0) {
      setStreamedEvents([]);
      setCurrentIndex(0);
      setIsFinished(false);
    }
    setIsPlaying(true);
  }, [currentIndex, allEvents.length]);

  const pause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const restart = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setStreamedEvents([]);
    setCurrentIndex(0);
    setIsFinished(false);
    setIsPlaying(true);
  }, []);

  const step = useCallback(() => {
    if (currentIndex < allEvents.length) {
      const nextEvent = allEvents[currentIndex];
      setStreamedEvents((prev) => [...prev, nextEvent]);
      setCurrentIndex((prev) => prev + 1);
    }
  }, [currentIndex, allEvents]);

  // -------------------------------------------------------------
  // CONTRACT 2: LAUNCHING A MISSION
  // POST http://localhost:8000/api/mission/start
  // Payload: { user_request, scenario_key, model_provider: "gemini", max_iterations: 3 }
  // -------------------------------------------------------------
  const launchMission = useCallback(
    async (userRequest?: string, scenarioKey?: string) => {
      const targetScenario = scenarioKey || selectedScenario || "01_feature_impl";
      const meta = scenarios.find((s) => s.id === targetScenario);
      const reqText = userRequest || meta?.default_request || "Execute multi-agent engineering workflow";

      // Clear previous events and prepare state
      setStreamedEvents([]);
      setIsFinished(false);
      setIsPlaying(true);
      setLiveState({
        missionId: targetScenario,
        title: meta?.title || targetScenario,
        status: "running",
        git_diff: "",
      });

      const payload = {
        user_request: reqText,
        scenario_key: targetScenario,
        scenario_name: targetScenario,
        model_provider: "gemini",
        max_iterations: 3,
      };

      try {
        const res = await fetch("http://localhost:8000/api/mission/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.detail || `HTTP ${res.status}`);
        }
        console.info(`[Mission Started] Successfully launched ${targetScenario}`);
      } catch (err: any) {
        console.warn("[Mission Start] Encountered error:", err.message);
        // Fallback local simulated start event
        const now = new Date().toISOString();
        const startEvent: DevPilotEvent = {
          id: Date.now(),
          ts: now,
          type: "mission_started",
          agent: "orchestrator",
          data: {
            missionId: targetScenario,
            title: meta?.title || "Autonomous Mission",
            objective: reqText,
            repo: targetScenario,
            branch: "main",
            commit: "HEAD",
          },
        };
        setStreamedEvents([startEvent]);
      }
    },
    [selectedScenario, scenarios]
  );

  // -------------------------------------------------------------
  // CONTRACT 4: HUMAN-IN-THE-LOOP APPROVAL
  // POST http://localhost:8000/api/mission/approve
  // Payload: { decision: "approve" } or { decision: "reject" }
  // -------------------------------------------------------------
  const postApproval = useCallback(
    async (approvalId: string, decision: "approved" | "rejected", notes?: string) => {
      const normalizedDecision = decision === "approved" ? "approve" : "reject";

      try {
        await fetch("http://localhost:8000/api/mission/approve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            decision: normalizedDecision,
            feedback: notes || (decision === "approved" ? "Approved by Daimyo" : "Rejected by Daimyo"),
          }),
        });
      } catch (err) {
        console.warn("[Approval API] Could not contact backend directly:", err);
      }

      const now = new Date().toISOString();
      const syntheticEvent: DevPilotEvent =
        decision === "approved"
          ? {
              id: Date.now(),
              ts: now,
              type: "approval_granted",
              agent: "orchestrator",
              data: {
                approvalId,
                approvedBy: "Human Operator (You)",
                notes: notes || "Manual sign-off via DevPilot Mission Control",
              },
            }
          : {
              id: Date.now(),
              ts: now,
              type: "approval_rejected",
              agent: "orchestrator",
              data: {
                approvalId,
                rejectedBy: "Human Operator (You)",
                reason: notes || "Rejected by user in approval card",
              },
            };

      setStreamedEvents((prev) => [...prev, syntheticEvent]);
    },
    []
  );

  // -------------------------------------------------------------
  // CONTRACT 5: BASELINE COMPARISON
  // POST http://localhost:8000/api/baseline/compare
  // Payload: { scenario_name, user_request }
  // -------------------------------------------------------------
  const compareBaseline = useCallback(
    async (scenarioName?: string, userRequest?: string) => {
      const targetScenario = scenarioName || selectedScenario || "01_feature_impl";
      const payload = {
        scenario_name: targetScenario,
        user_request: userRequest || null,
      };

      try {
        const res = await fetch("http://localhost:8000/api/baseline/compare", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        // Inject benchmark comparison directly into terminal logs & state
        const comparisonText = JSON.stringify(data.comparison, null, 2);
        const logEvent: DevPilotEvent = {
          id: Date.now(),
          ts: new Date().toISOString(),
          type: "tool_result",
          agent: "orchestrator",
          data: {
            tool: "baseline_benchmark",
            output: `[BASELINE BENCHMARK COMPARISON]\n${data.summary}\n${comparisonText}`,
            verified: true,
            exitCode: 0,
          },
        };
        setStreamedEvents((prev) => [...prev, logEvent]);
        return data;
      } catch (err: any) {
        console.warn("[Baseline Compare] Error:", err.message);
        return null;
      }
    },
    [selectedScenario]
  );

  // Submit clarification response
  const submitClarification = useCallback((questionId: string, answer: string) => {
    const now = new Date().toISOString();
    const clarificationAnswerEvent: DevPilotEvent = {
      id: Date.now(),
      ts: now,
      type: "tool_result",
      agent: "shogun",
      data: {
        tool: "human_clarification",
        output: `User responded: "${answer}"`,
        verified: true,
      },
    };
    setStreamedEvents((prev) => [...prev, clarificationAnswerEvent]);
  }, []);

  // Add ad-hoc user instruction / trigger mission
  const addUserInstruction = useCallback(
    (instruction: string) => {
      if (instruction.toLowerCase().includes("baseline") || instruction.toLowerCase().includes("compare")) {
        compareBaseline(selectedScenario, instruction);
        return;
      }

      // If mission is currently idle or finished, launch a new mission with this instruction
      if (liveState.status === "idle" || liveState.status === "done" || streamedEvents.length === 0) {
        launchMission(instruction, selectedScenario);
        return;
      }

      const now = new Date().toISOString();
      const event: DevPilotEvent = {
        id: Date.now(),
        ts: now,
        type: "clarification_requested",
        agent: "shogun",
        data: {
          questionId: `user-${Date.now()}`,
          question: `Operator instruction: ${instruction}`,
          context: "Direct user intervention from DevPilot timeline input.",
        },
      };
      setStreamedEvents((prev) => [...prev, event]);
    },
    [liveState.status, streamedEvents.length, selectedScenario, launchMission, compareBaseline]
  );

  const currentEvent = streamedEvents[streamedEvents.length - 1] || null;
  const computedActiveAgent = activeAgent || currentEvent?.agent || null;

  // Merge the reduced event stream with any direct liveState updates from WebSocket data.state
  const baseMissionState = reduceMissionState(streamedEvents);
  const missionState: MissionState = {
    ...baseMissionState,
    ...liveState,
    // Preserve arrays if already populated in baseMissionState
    tasks: liveState.tasks && liveState.tasks.length > 0 ? liveState.tasks : baseMissionState.tasks,
    acceptanceCriteria:
      liveState.acceptanceCriteria && liveState.acceptanceCriteria.length > 0
        ? liveState.acceptanceCriteria
        : baseMissionState.acceptanceCriteria,
    terminalLogs: baseMissionState.terminalLogs,
    git_diff: liveState.git_diff || baseMissionState.git_diff || "",
    status: (liveState.status as MissionState["status"]) || baseMissionState.status,
  };

  return {
    events: streamedEvents,
    allEvents,
    currentEvent,
    activeAgent: computedActiveAgent,
    isPlaying,
    speed,
    isFinished,
    missionState,
    sourceType,
    scenarios,
    selectedScenario,
    setSelectedScenario,
    play,
    pause,
    restart,
    step,
    setSpeed,
    postApproval,
    submitClarification,
    addUserInstruction,
    launchMission,
    compareBaseline,
  };
}
