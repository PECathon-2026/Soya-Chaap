"use client";

import React from "react";
import { DevPilotEvent } from "@/types/events";
import { MissionStartedCard } from "./cards/MissionStartedCard";
import { PlanCreatedCard } from "./cards/PlanCreatedCard";
import { ToolCallCard } from "./cards/ToolCallCard";
import { TestResultCard } from "./cards/TestResultCard";
import { RetryCard } from "./cards/RetryCard";
import { ReviewFindingCard } from "./cards/ReviewFindingCard";
import { FindingResolvedCard } from "./cards/FindingResolvedCard";
import { ClarificationCard } from "./cards/ClarificationCard";
import { ApprovalCard } from "./cards/ApprovalCard";
import { MissionDoneCard } from "./cards/MissionDoneCard";
import { MissionEscalatedCard } from "./cards/MissionEscalatedCard";
import { AgentBadge } from "@/components/ui/AgentBadge";
import { formatTime } from "@/lib/utils";
import { Check, X } from "lucide-react";

interface EventCardProps {
  event: DevPilotEvent;
  onApprovalDecision?: (approvalId: string, decision: "approved" | "rejected", notes?: string) => void;
  onSubmitClarification?: (questionId: string, reply: string) => void;
}

export function EventCard({
  event,
  onApprovalDecision,
  onSubmitClarification,
}: EventCardProps) {
  switch (event.type) {
    case "mission_started":
      return <MissionStartedCard event={event} />;
    case "plan_created":
      return <PlanCreatedCard event={event} />;
    case "tool_called":
      return <ToolCallCard callEvent={event} />;
    case "tool_result":
      return <ToolCallCard resultEvent={event} />;
    case "test_failed":
    case "test_passed":
      return <TestResultCard event={event} />;
    case "retry":
      return <RetryCard event={event} />;
    case "review_finding":
      return <ReviewFindingCard event={event} />;
    case "finding_resolved":
      return <FindingResolvedCard event={event} />;
    case "clarification_requested":
      return (
        <ClarificationCard
          event={event}
          onSubmitReply={onSubmitClarification}
        />
      );
    case "approval_requested":
      return (
        <ApprovalCard
          event={event}
          onDecision={onApprovalDecision}
        />
      );
    case "approval_granted":
      return (
        <div className="flex items-center justify-between rounded-xl border border-emerald-800/60 bg-emerald-950/30 p-3 font-mono text-xs">
          <div className="flex items-center gap-2">
            <AgentBadge agent={event.agent} size="sm" />
            <span className="text-zinc-500">{formatTime(event.ts)}</span>
            <Check className="w-4 h-4 text-emerald-400 stroke-[3]" />
            <span className="text-emerald-300 font-semibold">
              Approval Granted by {event.data.approvedBy}
            </span>
          </div>
          {event.data.notes && (
            <span className="text-zinc-400 italic text-[11px]">&ldquo;{event.data.notes}&rdquo;</span>
          )}
        </div>
      );
    case "approval_rejected":
      return (
        <div className="flex items-center justify-between rounded-xl border border-rose-800/60 bg-rose-950/30 p-3 font-mono text-xs">
          <div className="flex items-center gap-2">
            <AgentBadge agent={event.agent} size="sm" />
            <span className="text-zinc-500">{formatTime(event.ts)}</span>
            <X className="w-4 h-4 text-rose-400 stroke-[3]" />
            <span className="text-rose-300 font-semibold">
              Approval Rejected by {event.data.rejectedBy}
            </span>
          </div>
          <span className="text-zinc-400 italic text-[11px]">&ldquo;{event.data.reason}&rdquo;</span>
        </div>
      );
    case "mission_done":
      return <MissionDoneCard event={event} />;
    case "mission_escalated":
      return <MissionEscalatedCard event={event} />;
    default:
      return null;
  }
}
