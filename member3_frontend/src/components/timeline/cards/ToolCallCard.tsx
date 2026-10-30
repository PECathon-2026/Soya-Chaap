"use client";

import React, { useState } from "react";
import { ToolCalledEvent, ToolResultEvent } from "@/types/events";
import { AgentBadge } from "@/components/ui/AgentBadge";
import { VerificationBadge } from "@/components/ui/VerificationBadge";
import { formatTime } from "@/lib/utils";
import { Wrench, ChevronDown, ChevronRight, Terminal, Clock, FileCode } from "lucide-react";

interface ToolCallCardProps {
  callEvent?: ToolCalledEvent;
  resultEvent?: ToolResultEvent;
}

export function ToolCallCard({ callEvent, resultEvent }: ToolCallCardProps) {
  const [isOpen, setIsOpen] = useState(false);

  const event = callEvent || resultEvent;
  if (!event) return null;

  const agent = event.agent;
  const ts = event.ts;
  const toolName = callEvent?.data.tool || resultEvent?.data.tool || "tool_call";
  const intent = callEvent?.data.intent;
  const args = callEvent?.data.args;
  const output = resultEvent?.data.output;
  const exitCode = resultEvent?.data.exitCode;
  const durationMs = resultEvent?.data.durationMs;
  const verified = resultEvent?.data.verified;
  const affectedFiles = resultEvent?.data.affectedFiles;

  return (
    <div className="group relative rounded-xl border border-zinc-800/80 bg-zinc-950/70 p-3.5 transition-all hover:border-zinc-700/80">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AgentBadge agent={agent} size="sm" />
          <span className="font-mono text-xs text-zinc-500">{formatTime(ts)}</span>
        </div>
        <div className="flex items-center gap-2">
          {resultEvent && <VerificationBadge verified={verified} size="sm" />}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-1 rounded-md bg-zinc-900/80 px-2 py-1 font-mono text-[11px] text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            {isOpen ? (
              <>
                <span>Collapse</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </>
            ) : (
              <>
                <span>Expand</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main summary bar */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="mt-2.5 flex items-center justify-between cursor-pointer select-none rounded-lg border border-zinc-800/60 bg-zinc-900/50 px-3 py-2 text-xs"
      >
        <div className="flex items-center gap-2 font-mono">
          <Wrench className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
          <span className="font-semibold text-zinc-200">{toolName}</span>
          {intent && (
            <span className="text-zinc-400 truncate max-w-[280px] sm:max-w-md">
              — {intent}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 font-mono text-[10px] text-zinc-500">
          {durationMs !== undefined && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {durationMs}ms
            </span>
          )}
          {exitCode !== undefined && (
            <span
              className={
                exitCode === 0 ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"
              }
            >
              exit: {exitCode}
            </span>
          )}
        </div>
      </div>

      {/* Collapsed/Expanded Body */}
      {isOpen && (
        <div className="mt-3 space-y-3 pt-2 border-t border-zinc-800/60">
          {/* Tool Arguments */}
          {args && (
            <div>
              <div className="text-[10px] font-mono font-semibold uppercase tracking-wider text-zinc-500 mb-1">
                Arguments
              </div>
              <pre className="rounded-lg border border-zinc-800 bg-black/60 p-2.5 font-mono text-[11px] text-zinc-300 overflow-x-auto">
                {JSON.stringify(args, null, 2)}
              </pre>
            </div>
          )}

          {/* Affected Files */}
          {affectedFiles && affectedFiles.length > 0 && (
            <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
              <FileCode className="w-3.5 h-3.5 text-rose-400" />
              <span>Affected:</span>
              <div className="flex flex-wrap gap-1">
                {affectedFiles.map((file, i) => (
                  <span
                    key={i}
                    className="rounded bg-zinc-900 px-1.5 py-0.5 text-zinc-300 border border-zinc-800"
                  >
                    {file}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Tool Output */}
          {output && (
            <div>
              <div className="flex items-center gap-1.5 text-[10px] font-mono font-semibold uppercase tracking-wider text-zinc-500 mb-1">
                <Terminal className="w-3 h-3 text-zinc-400" />
                Execution Output
              </div>
              <pre className="rounded-lg border border-zinc-800 bg-black/80 p-3 font-mono text-[11px] text-zinc-200 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                {output}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
