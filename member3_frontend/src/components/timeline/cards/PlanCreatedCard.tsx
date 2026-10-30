"use client";

import React, { useState } from "react";
import { PlanCreatedEvent } from "@/types/events";
import { AgentBadge } from "@/components/ui/AgentBadge";
import { formatTime } from "@/lib/utils";
import { CheckSquare, Square, ListTodo, ShieldAlert, ArrowRight } from "lucide-react";

export function PlanCreatedCard({ event }: { event: PlanCreatedEvent }) {
  const { data, ts, agent } = event;
  const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>({});

  const toggleCheck = (idx: number) => {
    setCheckedItems((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  return (
    <div className="group relative rounded-xl border border-amber-900/40 bg-zinc-950/70 p-4 transition-all hover:border-amber-700/50 shadow-goldGlow/20">
      <div className="flex items-center justify-between pb-3 border-b border-zinc-800/60">
        <div className="flex items-center gap-2">
          <AgentBadge agent={agent} size="sm" />
          <span className="font-mono text-xs text-zinc-500">{formatTime(ts)}</span>
        </div>
        <span className="inline-flex items-center gap-1 font-mono text-[11px] text-amber-400 font-semibold uppercase">
          Tactical Plan Created
        </span>
      </div>

      <div className="mt-3">
        <h4 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
          <ListTodo className="w-4 h-4 text-amber-400" />
          {data.goal}
        </h4>

        {/* Acceptance Criteria Checklist */}
        <div className="mt-3 rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
          <div className="text-[11px] font-mono font-semibold uppercase tracking-wider text-amber-400/90 mb-2">
            Acceptance Criteria (Checklist)
          </div>
          <div className="space-y-1.5">
            {data.acceptanceCriteria.map((criterion, idx) => {
              const isChecked = Boolean(checkedItems[idx]);
              return (
                <div
                  key={idx}
                  onClick={() => toggleCheck(idx)}
                  className="flex items-start gap-2.5 text-xs text-zinc-300 cursor-pointer select-none hover:text-zinc-100 transition-colors"
                >
                  <span className="mt-0.5 shrink-0 text-amber-400">
                    {isChecked ? (
                      <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Square className="w-3.5 h-3.5 text-zinc-500" />
                    )}
                  </span>
                  <span className={isChecked ? "line-through text-zinc-500" : ""}>
                    {criterion}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Task List */}
        <div className="mt-3 space-y-2">
          <div className="text-[11px] font-mono font-semibold uppercase tracking-wider text-zinc-400">
            Assigned Tasks
          </div>
          <div className="grid grid-cols-1 gap-2">
            {data.tasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between rounded-lg border border-zinc-800/80 bg-zinc-900/40 px-3 py-2 text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] text-zinc-500">{task.id}</span>
                  <span className="text-zinc-200">{task.title}</span>
                </div>
                <div className="flex items-center gap-2">
                  <ArrowRight className="w-3 h-3 text-zinc-600" />
                  <AgentBadge agent={task.assignee} size="sm" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Risk Assessment */}
        {data.riskAssessment && (
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-900/30 bg-amber-950/20 p-2.5 text-xs text-amber-200/90 font-mono">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-amber-400 text-[10px] uppercase block">
                Risk Assessment
              </span>
              {data.riskAssessment}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
