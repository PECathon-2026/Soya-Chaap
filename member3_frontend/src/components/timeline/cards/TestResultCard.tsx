"use client";

import React, { useState } from "react";
import { TestFailedEvent, TestPassedEvent } from "@/types/events";
import { AgentBadge } from "@/components/ui/AgentBadge";
import { VerificationBadge } from "@/components/ui/VerificationBadge";
import { formatTime, cn } from "@/lib/utils";
import { CheckCircle2, XCircle, ChevronDown, ChevronRight, Terminal, Clock } from "lucide-react";

interface TestResultCardProps {
  event: TestFailedEvent | TestPassedEvent;
}

export function TestResultCard({ event }: TestResultCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isFailed = event.type === "test_failed";
  const { ts, agent } = event;

  const passed = event.data.passed;
  const total = event.data.total;
  const failed = isFailed ? (event as TestFailedEvent).data.failed : 0;
  const suite = event.data.suite;
  const verified = event.data.verified;
  const durationMs = !isFailed ? (event as TestPassedEvent).data.durationMs : undefined;
  const errorSnippet = isFailed ? (event as TestFailedEvent).data.errorSnippet : null;
  const fullOutput = isFailed
    ? (event as TestFailedEvent).data.output
    : `PASS ${suite}\n✓ All ${passed} assertions passed successfully.`;

  return (
    <div
      className={cn(
        "group relative rounded-xl border p-4 transition-all",
        isFailed
          ? "border-rose-900/60 bg-rose-950/20 shadow-glow/30"
          : "border-emerald-900/60 bg-emerald-950/20 shadow-emeraldGlow/20"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-zinc-800/60">
        <div className="flex items-center gap-2">
          <AgentBadge agent={agent} size="sm" />
          <span className="font-mono text-xs text-zinc-500">{formatTime(ts)}</span>
        </div>
        <div className="flex items-center gap-2">
          <VerificationBadge verified={verified} size="sm" />
          <span
            className={cn(
              "font-mono text-xs font-semibold px-2 py-0.5 rounded uppercase tracking-wider",
              isFailed
                ? "bg-rose-950/80 text-rose-400 border border-rose-800/80"
                : "bg-emerald-950/80 text-emerald-400 border border-emerald-800/80"
            )}
          >
            {isFailed ? "Test Failed" : "Test Passed"}
          </span>
        </div>
      </div>

      {/* Main Suite & Count info */}
      <div className="mt-3 flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          {isFailed ? (
            <XCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          )}
          <div>
            <div className="font-mono text-xs font-semibold text-zinc-200">
              {suite}
            </div>
            <div className="mt-1 flex items-center gap-3 text-xs font-mono">
              <span className="text-emerald-400 font-medium">✓ {passed} passed</span>
              {isFailed && <span className="text-rose-400 font-medium">✕ {failed} failed</span>}
              <span className="text-zinc-500">({total} total)</span>
              {durationMs && (
                <span className="flex items-center gap-1 text-zinc-400">
                  <Clock className="w-3 h-3" />
                  {durationMs}ms
                </span>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1 rounded bg-zinc-900 px-2 py-1 font-mono text-[11px] text-zinc-400 hover:text-zinc-200 transition-colors shrink-0"
        >
          {isExpanded ? (
            <>
              <span>Hide Output</span>
              <ChevronDown className="w-3 h-3" />
            </>
          ) : (
            <>
              <span>View Output</span>
              <ChevronRight className="w-3 h-3" />
            </>
          )}
        </button>
      </div>

      {/* Error Snippet Box if failed */}
      {isFailed && errorSnippet && (
        <div className="mt-3 rounded-lg border border-rose-900/60 bg-black/60 p-2.5 font-mono text-xs text-rose-300 overflow-x-auto leading-relaxed">
          <span className="text-rose-500 font-bold block mb-1 text-[10px] uppercase">
            Error Diagnostic:
          </span>
          {errorSnippet}
        </div>
      )}

      {/* Expandable full terminal output */}
      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-zinc-800/60">
          <div className="flex items-center gap-1.5 text-[10px] font-mono font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
            <Terminal className="w-3 h-3 text-zinc-400" />
            Full Test Suite Logs
          </div>
          <pre className="rounded-lg border border-zinc-800 bg-black/90 p-3 font-mono text-[11px] text-zinc-300 overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-60">
            {fullOutput}
          </pre>
        </div>
      )}
    </div>
  );
}
