"use client";

import React from "react";
import { FindingResolvedEvent } from "@/types/events";
import { AgentBadge } from "@/components/ui/AgentBadge";
import { VerificationBadge } from "@/components/ui/VerificationBadge";
import { formatTime } from "@/lib/utils";
import { CheckCircle2 } from "lucide-react";

export function FindingResolvedCard({ event }: { event: FindingResolvedEvent }) {
  const { data, ts, agent } = event;

  return (
    <div className="group relative rounded-xl border border-emerald-900/40 bg-zinc-950/70 p-3.5 transition-all hover:border-emerald-700/50">
      <div className="flex items-center justify-between pb-2 border-b border-zinc-800/60">
        <div className="flex items-center gap-2">
          <AgentBadge agent={agent} size="sm" />
          <span className="font-mono text-xs text-zinc-500">{formatTime(ts)}</span>
        </div>
        <div className="flex items-center gap-2">
          <VerificationBadge verified={data.verified} size="sm" />
          <span className="font-mono text-[11px] font-semibold text-emerald-400">
            Finding Resolved
          </span>
        </div>
      </div>

      <div className="mt-2.5 flex items-start gap-2.5">
        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-mono text-xs text-zinc-400">
            Issue <span className="font-semibold text-zinc-200">#{data.findingId}</span>:
          </span>
          <p className="mt-0.5 text-xs text-zinc-300 leading-relaxed font-mono">
            {data.resolution}
          </p>
        </div>
      </div>
    </div>
  );
}
