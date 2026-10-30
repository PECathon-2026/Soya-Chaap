"use client";

import React from "react";
import { MissionStartedEvent } from "@/types/events";
import { AgentBadge } from "@/components/ui/AgentBadge";
import { formatTime } from "@/lib/utils";
import { Compass, GitBranch, GitCommit, FolderGit2 } from "lucide-react";

export function MissionStartedCard({ event }: { event: MissionStartedEvent }) {
  const { data, ts, agent } = event;

  return (
    <div className="group relative rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-4 transition-all hover:border-zinc-700/80">
      <div className="flex items-center justify-between pb-3 border-b border-zinc-800/60">
        <div className="flex items-center gap-2">
          <AgentBadge agent={agent} size="sm" />
          <span className="font-mono text-xs text-zinc-500">{formatTime(ts)}</span>
        </div>
        <span className="rounded-md border border-zinc-800 bg-zinc-900/60 px-2 py-0.5 font-mono text-[11px] text-zinc-400">
          ID: {data.missionId}
        </span>
      </div>

      <div className="mt-3 space-y-2">
        <div className="flex items-start gap-2">
          <Compass className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
          <div>
            <h3 className="text-sm font-semibold text-zinc-100">{data.title}</h3>
            <p className="mt-1 text-xs text-zinc-400 leading-relaxed">{data.objective}</p>
          </div>
        </div>

        {data.context && (
          <div className="mt-2 rounded-lg bg-zinc-900/60 p-2.5 text-xs text-zinc-300 font-mono border border-zinc-800/60">
            <span className="text-amber-400/90 font-semibold uppercase text-[10px] block mb-1">
              Mission Context
            </span>
            {data.context}
          </div>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-3 pt-2 text-[11px] text-zinc-400 font-mono">
          <span className="inline-flex items-center gap-1.5">
            <FolderGit2 className="w-3.5 h-3.5 text-zinc-500" />
            {data.repo}
          </span>
          <span className="inline-flex items-center gap-1.5 text-zinc-300">
            <GitBranch className="w-3.5 h-3.5 text-rose-400" />
            {data.branch}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <GitCommit className="w-3.5 h-3.5 text-zinc-500" />
            {data.commit}
          </span>
        </div>
      </div>
    </div>
  );
}
