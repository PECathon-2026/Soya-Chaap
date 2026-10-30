"use client";

import React from "react";
import { ReviewFindingEvent } from "@/types/events";
import { AgentBadge } from "@/components/ui/AgentBadge";
import { formatTime, cn } from "@/lib/utils";
import { ShieldAlert, ArrowRight, FileCode, Lock } from "lucide-react";

export function ReviewFindingCard({ event }: { event: ReviewFindingEvent }) {
  const { data, ts, agent } = event;

  const severityColor = {
    critical: "bg-rose-950 text-rose-400 border-rose-600 shadow-glow",
    high: "bg-orange-950 text-orange-400 border-orange-600",
    medium: "bg-amber-950 text-amber-400 border-amber-600",
    low: "bg-blue-950 text-blue-400 border-blue-600",
  }[data.severity] || "bg-zinc-900 text-zinc-400 border-zinc-700";

  return (
    <div className="group relative rounded-xl border border-purple-900/50 bg-purple-950/20 p-4 transition-all hover:border-purple-700/60 shadow-[0_0_20px_-5px_rgba(139,92,246,0.25)]">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-zinc-800/60">
        <div className="flex items-center gap-2">
          <AgentBadge agent={agent} size="sm" />
          <span className="font-mono text-xs text-zinc-500">{formatTime(ts)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "rounded-md border px-2 py-0.5 font-mono text-[11px] font-bold uppercase tracking-wider",
              severityColor
            )}
          >
            {data.severity} {data.category}
          </span>
          <span className="font-mono text-[11px] text-zinc-500">#{data.findingId}</span>
        </div>
      </div>

      {/* Finding Details */}
      <div className="mt-3 space-y-2.5">
        <div className="flex items-start gap-2">
          <ShieldAlert className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
          <div>
            <div className="font-mono text-xs font-semibold text-zinc-200">
              {data.rule}
            </div>
            <p className="mt-0.5 text-xs text-zinc-300 leading-relaxed">
              {data.description}
            </p>
          </div>
        </div>

        {/* File and Line info */}
        <div className="flex items-center gap-2 text-xs font-mono text-zinc-400 bg-zinc-900/60 rounded-lg p-2 border border-zinc-800/80">
          <FileCode className="w-3.5 h-3.5 text-purple-400" />
          <span className="text-zinc-200 font-semibold">{data.file}</span>
          <span className="text-zinc-500">line {data.line}</span>
        </div>

        {/* Code evidence */}
        {data.evidence && (
          <div>
            <div className="flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-purple-400/80 mb-1">
              <Lock className="w-3 h-3" />
              Offending Evidence
            </div>
            <pre className="rounded-lg border border-purple-900/40 bg-black/80 p-2.5 font-mono text-[11px] text-rose-300 overflow-x-auto whitespace-pre-wrap">
              {data.evidence}
            </pre>
          </div>
        )}

        {/* Feedback Routing Footer */}
        <div className="mt-3 flex items-center justify-between rounded-lg border border-purple-900/40 bg-purple-950/40 px-3 py-2 text-xs font-mono">
          <span className="text-purple-300 font-medium">Security Action:</span>
          <div className="flex items-center gap-2">
            <span className="text-zinc-400">Sent back to</span>
            <AgentBadge agent={data.remediationTarget} size="sm" />
            <ArrowRight className="w-3 h-3 text-purple-400" />
            <span className="text-rose-400 font-semibold">for remediation</span>
          </div>
        </div>
      </div>
    </div>
  );
}
