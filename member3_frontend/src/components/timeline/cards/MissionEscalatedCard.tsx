"use client";

import React from "react";
import { MissionEscalatedEvent } from "@/types/events";
import { AgentBadge } from "@/components/ui/AgentBadge";
import { formatTime } from "@/lib/utils";
import { AlertOctagon, HelpCircle, ArrowRight } from "lucide-react";

export function MissionEscalatedCard({ event }: { event: MissionEscalatedEvent }) {
  const { data, ts, agent } = event;

  return (
    <div className="group relative rounded-xl border border-rose-600 bg-gradient-to-r from-rose-950/80 via-zinc-950 to-zinc-950 p-4 transition-all shadow-[0_0_30px_-5px_rgba(225,29,72,0.4)]">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-rose-900/60">
        <div className="flex items-center gap-2">
          <AgentBadge agent={agent} size="sm" />
          <span className="font-mono text-xs text-zinc-500">{formatTime(ts)}</span>
        </div>
        <div className="inline-flex items-center gap-1.5 rounded-full border border-rose-500 bg-rose-900/80 px-2.5 py-0.5 font-mono text-xs font-bold text-rose-200">
          <AlertOctagon className="w-3.5 h-3.5 text-rose-300" />
          <span>HUMAN INTERVENTION REQUIRED</span>
        </div>
      </div>

      {/* Main alert content */}
      <div className="mt-3 space-y-3">
        <div>
          <h3 className="text-sm font-bold text-rose-200 flex items-center gap-2">
            Escalated to human after {data.attemptCount} failed attempts
          </h3>
          <p className="mt-1 text-xs text-zinc-300 font-mono">
            {data.reason}
          </p>
        </div>

        {/* Blocker details */}
        {data.blockerDetails && (
          <div className="rounded-lg border border-rose-900/60 bg-black/60 p-3 text-xs font-mono text-rose-300">
            <span className="text-rose-400 font-bold uppercase text-[10px] block mb-1">
              Blocker Analysis
            </span>
            {data.blockerDetails}
          </div>
        )}

        {/* Suggested Action */}
        {data.suggestedHumanAction && (
          <div className="flex items-start gap-2 rounded-lg border border-zinc-800 bg-zinc-900/60 p-2.5 text-xs text-zinc-300 font-mono">
            <HelpCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-zinc-200 block text-[10px] uppercase text-amber-400">
                Recommended Action
              </span>
              {data.suggestedHumanAction}
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="pt-1 flex items-center justify-end">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg bg-rose-600 hover:bg-rose-500 px-4 py-2 text-xs font-bold text-white transition-colors"
          >
            <span>Take Control in Terminal</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
