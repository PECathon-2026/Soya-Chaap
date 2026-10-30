export type AgentType = 'shogun' | 'samurai' | 'sentinel' | 'shadow' | 'orchestrator';

export interface BaseEvent {
  id: number;
  ts: string;
  agent: AgentType;
}

export interface MissionStartedData {
  missionId: string;
  title: string;
  objective: string;
  repo: string;
  branch: string;
  commit: string;
  context?: string;
}

export interface MissionStartedEvent extends BaseEvent {
  type: 'mission_started';
  data: MissionStartedData;
}

export interface PlanTask {
  id: string;
  title: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  assignee: AgentType;
}

export interface PlanCreatedData {
  goal: string;
  acceptanceCriteria: string[];
  tasks: PlanTask[];
  riskAssessment: string;
}

export interface PlanCreatedEvent extends BaseEvent {
  type: 'plan_created';
  data: PlanCreatedData;
}

export interface ToolCalledData {
  tool: string;
  args: Record<string, unknown>;
  intent: string;
}

export interface ToolCalledEvent extends BaseEvent {
  type: 'tool_called';
  data: ToolCalledData;
}

export interface ToolResultData {
  tool: string;
  output: string;
  exitCode?: number;
  durationMs?: number;
  verified: boolean;
  affectedFiles?: string[];
}

export interface ToolResultEvent extends BaseEvent {
  type: 'tool_result';
  data: ToolResultData;
}

export interface TestFailedData {
  suite: string;
  passed: number;
  failed: number;
  total: number;
  errorSnippet: string;
  output: string;
  verified: boolean;
}

export interface TestFailedEvent extends BaseEvent {
  type: 'test_failed';
  data: TestFailedData;
}

export interface TestPassedData {
  suite: string;
  passed: number;
  total: number;
  durationMs?: number;
  verified: boolean;
  assertionsCount: number;
}

export interface TestPassedEvent extends BaseEvent {
  type: 'test_passed';
  data: TestPassedData;
}

export interface RetryData {
  retryIndex: number;
  maxRetries: number;
  routedTo: AgentType;
  reason: string;
  strategyAdjustment: string;
}

export interface RetryEvent extends BaseEvent {
  type: 'retry';
  data: RetryData;
}

export interface ReviewFindingData {
  findingId: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: 'security' | 'correctness' | 'performance' | 'style';
  file: string;
  line: number;
  rule: string;
  description: string;
  evidence: string;
  remediationTarget: AgentType;
}

export interface ReviewFindingEvent extends BaseEvent {
  type: 'review_finding';
  data: ReviewFindingData;
}

export interface FindingResolvedData {
  findingId: string;
  resolution: string;
  verified: boolean;
}

export interface FindingResolvedEvent extends BaseEvent {
  type: 'finding_resolved';
  data: FindingResolvedData;
}

export interface ClarificationRequestedData {
  questionId: string;
  question: string;
  options?: string[];
  context: string;
}

export interface ClarificationRequestedEvent extends BaseEvent {
  type: 'clarification_requested';
  data: ClarificationRequestedData;
}

export interface ApprovalRequestedData {
  approvalId: string;
  summary: string;
  riskLevel: 'low' | 'medium' | 'high';
  changesCount: {
    files: number;
    additions: number;
    deletions: number;
  };
  diffPreview?: string;
  verified: boolean;
}

export interface ApprovalRequestedEvent extends BaseEvent {
  type: 'approval_requested';
  data: ApprovalRequestedData;
}

export interface ApprovalGrantedData {
  approvalId: string;
  approvedBy: string;
  notes?: string;
}

export interface ApprovalGrantedEvent extends BaseEvent {
  type: 'approval_granted';
  data: ApprovalGrantedData;
}

export interface ApprovalRejectedData {
  approvalId: string;
  rejectedBy: string;
  reason: string;
}

export interface ApprovalRejectedEvent extends BaseEvent {
  type: 'approval_rejected';
  data: ApprovalRejectedData;
}

export interface MissionDoneData {
  summary: string;
  verifiedOutcomes: string[];
  unverifiedClaims: string[];
  durationMs: number;
  totalCostUsd?: number;
  iterations: number;
}

export interface MissionDoneEvent extends BaseEvent {
  type: 'mission_done';
  data: MissionDoneData;
}

export interface MissionEscalatedData {
  attemptCount: number;
  maxAttempts: number;
  reason: string;
  blockerDetails: string;
  suggestedHumanAction: string;
}

export interface MissionEscalatedEvent extends BaseEvent {
  type: 'mission_escalated';
  data: MissionEscalatedData;
}

export type DevPilotEvent =
  | MissionStartedEvent
  | PlanCreatedEvent
  | ToolCalledEvent
  | ToolResultEvent
  | TestFailedEvent
  | TestPassedEvent
  | RetryEvent
  | ReviewFindingEvent
  | FindingResolvedEvent
  | ClarificationRequestedEvent
  | ApprovalRequestedEvent
  | ApprovalGrantedEvent
  | ApprovalRejectedEvent
  | MissionDoneEvent
  | MissionEscalatedEvent;

export interface MissionState {
  missionId: string;
  title: string;
  status: 'idle' | 'running' | 'paused' | 'waiting_approval' | 'waiting_clarification' | 'done' | 'escalated';
  currentAgent: AgentType | null;
  iteration: number;
  retryCount: number;
  tasks: PlanTask[];
  acceptanceCriteria: { text: string; completed: boolean }[];
  findings: ReviewFindingData[];
  resolvedFindingIds: string[];
  verifiedOutcomes: string[];
  unverifiedClaims: string[];
  terminalLogs: {
    id: string;
    ts: string;
    source: string;
    type: 'info' | 'error' | 'success' | 'command';
    text: string;
  }[];
  activeApproval: ApprovalRequestedData | null;
  activeClarification: ClarificationRequestedData | null;
  modifiedFiles: string[];
  git_diff?: string;
}
