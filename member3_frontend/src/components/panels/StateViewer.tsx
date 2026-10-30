"use client";

import React, { useState } from "react";
import { MissionState } from "@/types/events";
import { Database, Copy, Check, Code, Layers } from "lucide-react";
import { AgentBadge } from "@/components/ui/AgentBadge";

interface StateViewerProps {
  state: MissionState;
}

export function StateViewer({ state }: StateViewerProps) {
  const [viewMode, setViewMode] = useState<"summary" | "json">("summary");
  const [copied, setCopied] = useState(false);

  const copyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(state, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="h-full flex flex-col bg-zinc-950 font-mono text-xs">
      {/* State Toolbar */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-zinc-800 bg-zinc-900/60">
        <div className="flex items-center gap-2 text-zinc-300">
          <Database className="w-4 h-4 text-amber-400" />
          <span className="font-semibold text-zinc-200">Shared Mission State</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg bg-zinc-800/80 p-0.5 text-[10px]">
            <button
              onClick={() => setViewMode("summary")}
              className={`px-2 py-0.5 rounded transition-colors ${
                viewMode === "summary"
                  ? "bg-zinc-700 text-white font-semibold"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Summary
            </button>
            <button
              onClick={() => setViewMode("json")}
              className={`px-2 py-0.5 rounded transition-colors ${
                viewMode === "json"
                  ? "bg-zinc-700 text-white font-semibold"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Raw JSON
            </button>
          </div>

          <button
            onClick={copyJson}
            className="flex items-center gap-1 rounded bg-zinc-800 hover:bg-zinc-700 px-2 py-1 text-[11px] text-zinc-300 transition-colors"
            title="Copy state JSON"
          >
            {copied ? (
              <Check className="w-3 h-3 text-emerald-400" />
            ) : (
              <Copy className="w-3 h-3" />
            )}
          </button>
        </div>
      </div>

      {/* Main View Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {viewMode === "json" ? (
          <pre className="rounded-xl border border-zinc-800 bg-black/80 p-3.5 font-mono text-[11px] text-zinc-300 overflow-x-auto leading-relaxed">
            {JSON.stringify(state, null, 2)}
          </pre>
        ) : (
          <div className="space-y-4">
            {/* Top Stat Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-2.5">
                <span className="text-[10px] text-zinc-500 uppercase block">Status</span>
                <span className="font-bold text-amber-400 uppercase text-xs">
                  {state.status}
                </span>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-2.5">
                <span className="text-[10px] text-zinc-500 uppercase block">Iteration</span>
                <span className="font-bold text-zinc-200 text-xs">
                  Loop #{state.iteration}
                </span>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-2.5">
                <span className="text-[10px] text-zinc-500 uppercase block">Retries</span>
                <span className="font-bold text-rose-400 text-xs">
                  {state.retryCount}
                </span>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-2.5">
                <span className="text-[10px] text-zinc-500 uppercase block">Active Agent</span>
                <span className="font-bold text-zinc-200 text-xs">
                  {state.currentAgent ? state.currentAgent.toUpperCase() : "None"}
                </span>
              </div>
            </div>

            {/* Task Board State */}
            <div className="rounded-xl border border-zinc-800 bg-black/40 p-3 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-300 border-b border-zinc-800/80 pb-2">
                <span>Mission Task Progress</span>
                <span className="text-zinc-500">{state.tasks.length} total</span>
              </div>

              {state.tasks.length === 0 ? (
                <div className="text-zinc-600 text-center py-4">No tasks initialized yet</div>
              ) : (
                <div className="space-y-1.5">
                  {state.tasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between rounded-lg border border-zinc-800/60 bg-zinc-900/40 px-2.5 py-1.5"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-zinc-500 text-[10px]">{task.id}</span>
                        <span className="text-zinc-200">{task.title}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded px-1.5 py-0.5 text-[9px] uppercase font-bold ${
                            task.status === "completed"
                              ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                              : task.status === "in_progress"
                              ? "bg-rose-950 text-rose-400 border border-rose-800"
                              : "bg-zinc-800 text-zinc-400"
                          }`}
                        >
                          {task.status}
                        </span>
                        <AgentBadge agent={task.assignee} size="sm" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Security Findings State */}
            <div className="rounded-xl border border-zinc-800 bg-black/40 p-3 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-300 border-b border-zinc-800/80 pb-2">
                <span>Security & Code Findings</span>
                <span className="text-zinc-500">{state.findings.length} findings</span>
              </div>

              {state.findings.length === 0 ? (
                <div className="text-zinc-600 text-center py-4">Zero vulnerabilities detected</div>
              ) : (
                <div className="space-y-2">
                  {state.findings.map((f) => {
                    const isResolved = state.resolvedFindingIds.includes(f.findingId);
                    return (
                      <div
                        key={f.findingId}
                        className={`rounded-lg border p-2.5 space-y-1 ${
                          isResolved
                            ? "bg-emerald-950/20 border-emerald-900/40"
                            : "bg-rose-950/20 border-rose-900/40"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-zinc-200">
                            #{f.findingId} • {f.rule}
                          </span>
                          <span
                            className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                              isResolved
                                ? "bg-emerald-900/80 text-emerald-300"
                                : "bg-rose-900/80 text-rose-300"
                            }`}
                          >
                            {isResolved ? "Resolved" : "Open"}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-400">{f.description}</p>
                        <div className="text-[10px] text-zinc-500 font-mono">
                          {f.file}:{f.line}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
