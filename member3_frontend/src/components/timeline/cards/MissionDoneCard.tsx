"use client";

import React from "react";
import { MissionDoneEvent } from "@/types/events";
import { AgentBadge } from "@/components/ui/AgentBadge";
import { formatTime } from "@/lib/utils";
import { Award, CheckCircle2, AlertTriangle, Clock, RefreshCw, DollarSign } from "lucide-react";

export function MissionDoneCard({ event }: { event: MissionDoneEvent }) {
  const { data, ts, agent } = event;

  const durationSec = (data.durationMs / 1000).toFixed(1);

  return (
    <div className="group relative rounded-xl border border-gold/60 bg-gradient-to-b from-zinc-950 via-zinc-950 to-amber-950/20 p-5 transition-all shadow-goldGlow">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-amber-900/40">
        <div className="flex items-center gap-2">
          <AgentBadge agent={agent} size="sm" />
          <span className="font-mono text-xs text-zinc-500">{formatTime(ts)}</span>
        </div>
        <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/60 bg-amber-950/80 px-3 py-0.5 font-mono text-xs font-bold text-amber-300">
          <Award className="w-3.5 h-3.5 text-amber-400" />
          <span>MISSION ACCOMPLISHED</span>
        </div>
      </div>

      {/* Main summary message */}
      <div className="mt-3.5">
        <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
          {data.summary}
        </h3>

        {/* High-level metrics row */}
        <div className="mt-3 grid grid-cols-3 gap-2 font-mono text-xs">
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-2.5 flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            <div>
              <span className="text-zinc-500 text-[10px] block">TOTAL TIME</span>
              <span className="font-bold text-zinc-200">{durationSec}s</span>
            </div>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-2.5 flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-rose-400" />
            <div>
              <span className="text-zinc-500 text-[10px] block">ITERATIONS</span>
              <span className="font-bold text-zinc-200">{data.iterations} loops</span>
            </div>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-2.5 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            <div>
              <span className="text-zinc-500 text-[10px] block">MODEL COST</span>
              <span className="font-bold text-zinc-200">${data.totalCostUsd?.toFixed(3) || "0.042"}</span>
            </div>
          </div>
        </div>

        {/* CRITICAL DIFFERENTIATOR: Verified Outcomes vs Unverified Claims Separately */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Verified Outcomes */}
          <div className="rounded-xl border border-emerald-800/60 bg-emerald-950/20 p-3.5 space-y-2">
            <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-emerald-400 uppercase tracking-wider">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Verified Outcomes</span>
            </div>
            <p className="text-[11px] text-zinc-400 font-mono">
              Empirically confirmed through automated test execution and tool scans.
            </p>
            <div className="space-y-1.5 pt-1">
              {data.verifiedOutcomes.map((outcome, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs text-zinc-200 font-mono">
                  <span className="text-emerald-400 shrink-0 font-bold">✓</span>
                  <span>{outcome}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Unverified Claims */}
          <div className="rounded-xl border border-amber-800/60 bg-amber-950/20 p-3.5 space-y-2">
            <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-amber-400 uppercase tracking-wider">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>Model Claims</span>
            </div>
            <p className="text-[11px] text-zinc-400 font-mono">
              Theoretical assertions or estimates made by agents without direct test proof.
            </p>
            <div className="space-y-1.5 pt-1">
              {data.unverifiedClaims.map((claim, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs text-zinc-300 font-mono">
                  <span className="text-amber-400 shrink-0 font-bold">⚠</span>
                  <span className="italic">{claim}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
