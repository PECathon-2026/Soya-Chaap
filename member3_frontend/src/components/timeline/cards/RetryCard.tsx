"use client";

import React from "react";
import { RetryEvent } from "@/types/events";
import { AgentBadge } from "@/components/ui/AgentBadge";
import { formatTime } from "@/lib/utils";
import { RotateCw, ArrowRight, Lightbulb } from "lucide-react";

export function RetryCard({ event }: { event: RetryEvent }) {
  const { data, ts, agent } = event;

  return (
    <div className="group relative rounded-xl border border-rose-600/50 bg-gradient-to-r from-rose-950/40 via-zinc-950/80 to-zinc-950/40 p-4 transition-all shadow-glow">
      {/* Top Bar */}
      <div className="flex items-center justify-between pb-2 border-b border-rose-900/40">
        <div className="flex items-center gap-2">
          <AgentBadge agent={agent} size="sm" />
          <span className="font-mono text-xs text-zinc-500">{formatTime(ts)}</span>
        </div>
        <div className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/60 bg-rose-950 px-2.5 py-0.5 font-mono text-xs font-semibold text-rose-300">
          <RotateCw className="w-3.5 h-3.5 animate-spin text-rose-400" />
          <span>
            Feedback Loop • Retry {data.retryIndex}/{data.maxRetries}
          </span>
        </div>
      </div>

      {/* Main Loop Banner */}
      <div className="mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg border border-rose-900/40 bg-black/60 p-3">
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="font-bold text-rose-400">Retry {data.retryIndex}/{data.maxRetries}</span>
          <ArrowRight className="w-3.5 h-3.5 text-rose-500" />
          <span className="text-zinc-300">Routed to</span>
          <AgentBadge agent={data.routedTo} size="sm" />
        </div>

        <div className="text-xs text-zinc-400 font-mono italic">
          reason: <span className="text-rose-300 not-italic font-semibold">{data.reason}</span>
        </div>
      </div>

      {/* Tactical Strategy Adjustment */}
      {data.strategyAdjustment && (
        <div className="mt-2.5 flex items-start gap-2 rounded-lg border border-amber-900/30 bg-amber-950/20 p-2.5 text-xs font-mono text-amber-200">
          <Lightbulb className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-amber-400 uppercase text-[10px] block">
              Strategy Adjustment
            </span>
            {data.strategyAdjustment}
          </div>
        </div>
      )}
    </div>
  );
}
