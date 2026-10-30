import { DevPilotEvent, MissionState, PlanTask, ReviewFindingData } from "@/types/events";

export const initialMissionState: MissionState = {
  missionId: "mission_001",
  title: "DevPilot Mission",
  status: "idle",
  currentAgent: null,
  iteration: 1,
  retryCount: 0,
  tasks: [],
  acceptanceCriteria: [],
  findings: [],
  resolvedFindingIds: [],
  verifiedOutcomes: [],
  unverifiedClaims: [],
  terminalLogs: [],
  activeApproval: null,
  activeClarification: null,
  modifiedFiles: [],
  git_diff: "",
};

export function reduceMissionState(events: DevPilotEvent[]): MissionState {
  return events.reduce((state, event) => {
    const next: MissionState = { ...state, currentAgent: event.agent };

    switch (event.type) {
      case "mission_started":
        next.missionId = event.data.missionId;
        next.title = event.data.title;
        next.status = "running";
        next.terminalLogs = [
          ...next.terminalLogs,
          {
            id: `log-${event.id}`,
            ts: event.ts,
            source: "Orchestrator",
            type: "info",
            text: `[MISSION START] ${event.data.title} (${event.data.repo}@${event.data.branch})`,
          },
        ];
        break;

      case "plan_created":
        next.tasks = event.data.tasks.map((t) => ({ ...t }));
        next.acceptanceCriteria = event.data.acceptanceCriteria.map((ac) => ({
          text: ac,
          completed: false,
        }));
        next.terminalLogs = [
          ...next.terminalLogs,
          {
            id: `log-${event.id}`,
            ts: event.ts,
            source: "Shogun",
            type: "info",
            text: `[PLAN CREATED] ${event.data.tasks.length} tasks scheduled, ${event.data.acceptanceCriteria.length} acceptance criteria defined.`,
          },
        ];
        break;

      case "tool_called":
        next.terminalLogs = [
          ...next.terminalLogs,
          {
            id: `log-${event.id}`,
            ts: event.ts,
            source: event.agent,
            type: "command",
            text: `$ ${event.data.tool} ${JSON.stringify(event.data.args)}`,
          },
        ];
        break;

      case "tool_result": {
        const affected = event.data.affectedFiles || [];
        const filesSet = new Set([...next.modifiedFiles, ...affected]);
        next.modifiedFiles = Array.from(filesSet);

        next.terminalLogs = [
          ...next.terminalLogs,
          {
            id: `log-${event.id}`,
            ts: event.ts,
            source: event.agent,
            type: event.data.exitCode === 0 ? "success" : "info",
            text: event.data.output,
          },
        ];
        break;
      }

      case "test_failed":
        next.terminalLogs = [
          ...next.terminalLogs,
          {
            id: `log-${event.id}`,
            ts: event.ts,
            source: "Sentinel",
            type: "error",
            text: `FAIL: ${event.data.suite} (${event.data.failed} failed, ${event.data.passed} passed)\n${event.data.errorSnippet}`,
          },
        ];
        break;

      case "test_passed":
        // Mark first non-completed acceptance criteria as done if tests pass
        next.acceptanceCriteria = next.acceptanceCriteria.map((ac, idx) =>
          idx === 0 ? { ...ac, completed: true } : ac
        );
        next.terminalLogs = [
          ...next.terminalLogs,
          {
            id: `log-${event.id}`,
            ts: event.ts,
            source: "Sentinel",
            type: "success",
            text: `PASS: ${event.data.suite} (${event.data.passed}/${event.data.total} passed) in ${event.data.durationMs ?? 420}ms`,
          },
        ];
        break;

      case "retry":
        next.retryCount += 1;
        next.iteration += 1;
        next.terminalLogs = [
          ...next.terminalLogs,
          {
            id: `log-${event.id}`,
            ts: event.ts,
            source: "Orchestrator",
            type: "info",
            text: `[RETRY ${event.data.retryIndex}/${event.data.maxRetries}] Routed to ${event.data.routedTo}: ${event.data.reason}`,
          },
        ];
        break;

      case "review_finding": {
        const existingIdx = next.findings.findIndex(
          (f) => f.findingId === event.data.findingId
        );
        if (existingIdx === -1) {
          next.findings = [...next.findings, event.data];
        }
        next.terminalLogs = [
          ...next.terminalLogs,
          {
            id: `log-${event.id}`,
            ts: event.ts,
            source: "Shadow",
            type: "error",
            text: `[SECURITY FINDING] ${event.data.severity.toUpperCase()} - ${event.data.file}:${event.data.line} [${event.data.rule}]: ${event.data.description}`,
          },
        ];
        break;
      }

      case "finding_resolved": {
        next.resolvedFindingIds = Array.from(
          new Set([...next.resolvedFindingIds, event.data.findingId])
        );
        next.terminalLogs = [
          ...next.terminalLogs,
          {
            id: `log-${event.id}`,
            ts: event.ts,
            source: event.agent,
            type: "success",
            text: `[RESOLVED] Finding ${event.data.findingId}: ${event.data.resolution}`,
          },
        ];
        break;
      }

      case "clarification_requested":
        next.status = "waiting_clarification";
        next.activeClarification = event.data;
        break;

      case "approval_requested":
        next.status = "waiting_approval";
        next.activeApproval = event.data;
        if (event.data.diffPreview) {
          next.git_diff = event.data.diffPreview;
        }
        next.terminalLogs = [
          ...next.terminalLogs,
          {
            id: `log-${event.id}`,
            ts: event.ts,
            source: event.agent,
            type: "info",
            text: `[APPROVAL NEEDED] ${event.data.summary} (${event.data.changesCount.additions} additions, ${event.data.changesCount.deletions} deletions)`,
          },
        ];
        break;

      case "approval_granted":
        next.status = "running";
        next.activeApproval = null;
        next.terminalLogs = [
          ...next.terminalLogs,
          {
            id: `log-${event.id}`,
            ts: event.ts,
            source: "Orchestrator",
            type: "success",
            text: `[APPROVED] Signed off by ${event.data.approvedBy}`,
          },
        ];
        break;

      case "approval_rejected":
        next.status = "running";
        next.activeApproval = null;
        next.terminalLogs = [
          ...next.terminalLogs,
          {
            id: `log-${event.id}`,
            ts: event.ts,
            source: "Orchestrator",
            type: "error",
            text: `[REJECTED] Rejected by ${event.data.rejectedBy}: ${event.data.reason}`,
          },
        ];
        break;

      case "mission_done":
        next.status = "done";
        next.verifiedOutcomes = event.data.verifiedOutcomes;
        next.unverifiedClaims = event.data.unverifiedClaims;
        next.tasks = next.tasks.map((t) => ({ ...t, status: "completed" }));
        next.acceptanceCriteria = next.acceptanceCriteria.map((ac) => ({
          ...ac,
          completed: true,
        }));
        next.terminalLogs = [
          ...next.terminalLogs,
          {
            id: `log-${event.id}`,
            ts: event.ts,
            source: "Orchestrator",
            type: "success",
            text: `[MISSION COMPLETE] ${event.data.summary}`,
          },
        ];
        break;

      case "mission_escalated":
        next.status = "escalated";
        next.terminalLogs = [
          ...next.terminalLogs,
          {
            id: `log-${event.id}`,
            ts: event.ts,
            source: "Orchestrator",
            type: "error",
            text: `[ESCALATED] Human intervention required after ${event.data.attemptCount} failed attempts. Reason: ${event.data.reason}`,
          },
        ];
        break;
    }

    return next;
  }, initialMissionState);
}
