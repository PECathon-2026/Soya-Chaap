"use client";

import React, { useState } from "react";
import { ApprovalRequestedEvent } from "@/types/events";
import { AgentBadge } from "@/components/ui/AgentBadge";
import { VerificationBadge } from "@/components/ui/VerificationBadge";
import { formatTime, cn } from "@/lib/utils";
import { ShieldCheck, Check, X, FileDiff, AlertTriangle } from "lucide-react";

interface ApprovalCardProps {
  event: ApprovalRequestedEvent;
  onDecision?: (approvalId: string, decision: "approved" | "rejected", notes?: string) => void;
}

export function ApprovalCard({ event, onDecision }: ApprovalCardProps) {
  const { data, ts, agent } = event;
  const [decision, setDecision] = useState<"approved" | "rejected" | null>(null);
  const [notes, setNotes] = useState("");
  const [showNotes, setShowNotes] = useState(false);

  const handleApprove = () => {
    setDecision("approved");
    if (onDecision) onDecision(data.approvalId, "approved", notes);
  };

  const handleReject = () => {
    setDecision("rejected");
    if (onDecision) onDecision(data.approvalId, "rejected", notes || "Rejected by user");
  };

  return (
    <div className="group relative rounded-xl border border-rose-600/70 bg-gradient-to-br from-zinc-950 via-zinc-950 to-zinc-900/90 p-4 transition-all shadow-[0_0_25px_-5px_rgba(225,29,72,0.3)]">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
        <div className="flex items-center gap-2">
          <AgentBadge agent={agent} size="sm" />
          <span className="font-mono text-xs text-zinc-500">{formatTime(ts)}</span>
        </div>
        <div className="flex items-center gap-2">
          <VerificationBadge verified={data.verified} size="sm" />
          <span className="rounded-md border border-rose-500/50 bg-rose-950/60 px-2 py-0.5 font-mono text-[11px] font-bold text-rose-400">
            Approval Required
          </span>
        </div>
      </div>

      {/* Main summary */}
      <div className="mt-3 space-y-3">
        <div className="flex items-start gap-2.5">
          <ShieldCheck className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-zinc-100">{data.summary}</h4>
            <div className="mt-1 flex items-center gap-2 text-xs font-mono text-zinc-400">
              <span>Risk level:</span>
              <span
                className={cn(
                  "font-bold uppercase text-[11px]",
                  data.riskLevel === "high"
                    ? "text-rose-400"
                    : data.riskLevel === "medium"
                    ? "text-amber-400"
                    : "text-emerald-400"
                )}
              >
                {data.riskLevel}
              </span>
            </div>
          </div>
        </div>

        {/* Diff summary stats */}
        <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/80 p-3 font-mono text-xs">
          <div className="flex items-center gap-2 text-zinc-300">
            <FileDiff className="w-4 h-4 text-zinc-400" />
            <span>{data.changesCount.files} files modified</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-emerald-400 font-semibold">
              +{data.changesCount.additions} lines
            </span>
            <span className="text-rose-400 font-semibold">
              -{data.changesCount.deletions} lines
            </span>
          </div>
        </div>

        {/* Diff Preview if present */}
        {data.diffPreview && (
          <pre className="rounded-lg border border-zinc-800 bg-black/80 p-2.5 font-mono text-[11px] text-zinc-300 overflow-x-auto max-h-36">
            {data.diffPreview}
          </pre>
        )}

        {/* Action Controls */}
        {decision ? (
          <div
            className={cn(
              "rounded-lg p-3 text-xs font-mono border",
              decision === "approved"
                ? "bg-emerald-950/40 border-emerald-600/60 text-emerald-300"
                : "bg-rose-950/40 border-rose-600/60 text-rose-300"
            )}
          >
            {decision === "approved" ? (
              <span className="flex items-center gap-2 font-semibold">
                <Check className="w-4 h-4 text-emerald-400" />
                Signed off and approved. Committing changes to branch.
              </span>
            ) : (
              <span className="flex items-center gap-2 font-semibold">
                <X className="w-4 h-4 text-rose-400" />
                Rejected. Routed back to agents for revision.
              </span>
            )}
          </div>
        ) : (
          <div className="space-y-2 pt-1">
            {showNotes && (
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional sign-off notes or rejection reason..."
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-rose-500 font-mono"
              />
            )}

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowNotes(!showNotes)}
                className="text-[11px] font-mono text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                {showNotes ? "Hide note input" : "+ Add sign-off note"}
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleReject}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-rose-800/80 bg-rose-950/40 px-3.5 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-900/60 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Reject</span>
                </button>
                <button
                  type="button"
                  onClick={handleApprove}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-zinc-950 transition-colors shadow-emeraldGlow"
                >
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Approve & Merge</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
