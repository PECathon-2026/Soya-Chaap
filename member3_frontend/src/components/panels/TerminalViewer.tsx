"use client";

import React, { useRef, useEffect, useState } from "react";
import { MissionState } from "@/types/events";
import { Terminal, Copy, Check, Trash2, ArrowDown } from "lucide-react";
import { formatTime } from "@/lib/utils";

interface TerminalViewerProps {
  logs: MissionState["terminalLogs"];
}

export function TerminalViewer({ logs }: TerminalViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [filter, setFilter] = useState<string>("all");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs]);

  const filteredLogs = logs.filter((log) => {
    if (filter === "all") return true;
    if (filter === "errors") return log.type === "error";
    if (filter === "commands") return log.type === "command";
    return true;
  });

  const copyLogs = () => {
    const raw = logs.map((l) => `[${l.ts}] [${l.source}] ${l.text}`).join("\n");
    navigator.clipboard.writeText(raw);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="h-full flex flex-col bg-zinc-950 font-mono text-xs">
      {/* Terminal Toolbar */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-zinc-800 bg-zinc-900/60">
        <div className="flex items-center gap-2 text-zinc-300">
          <Terminal className="w-4 h-4 text-emerald-400" />
          <span className="font-semibold text-zinc-200">Terminal Log Stream</span>
          <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400">
            {logs.length} entries
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Filter Pills */}
          <div className="flex items-center rounded-lg bg-zinc-800/80 p-0.5 text-[10px]">
            {(["all", "commands", "errors"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setFilter(mode)}
                className={`px-2 py-0.5 rounded capitalize transition-colors ${
                  filter === mode
                    ? "bg-zinc-700 text-white font-semibold"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          <button
            onClick={copyLogs}
            className="flex items-center gap-1 rounded bg-zinc-800 hover:bg-zinc-700 px-2 py-1 text-[11px] text-zinc-300 transition-colors"
            title="Copy terminal buffer"
          >
            {copied ? (
              <Check className="w-3 h-3 text-emerald-400" />
            ) : (
              <Copy className="w-3 h-3" />
            )}
          </button>
        </div>
      </div>

      {/* Monospace Output Window */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto p-3.5 font-mono text-[11px] space-y-2 bg-black/90 scroll-smooth"
      >
        {filteredLogs.length === 0 ? (
          <div className="text-zinc-600 text-center py-12">
            Terminal buffer empty. Events will log here as tools run.
          </div>
        ) : (
          filteredLogs.map((log) => {
            const isError = log.type === "error";
            const isSuccess = log.type === "success";
            const isCmd = log.type === "command";

            return (
              <div
                key={log.id}
                className={`rounded-lg p-2 leading-relaxed border ${
                  isError
                    ? "bg-rose-950/20 border-rose-900/50 text-rose-300"
                    : isSuccess
                    ? "bg-emerald-950/20 border-emerald-900/50 text-emerald-300"
                    : isCmd
                    ? "bg-zinc-900/60 border-zinc-800 text-amber-300 font-bold"
                    : "bg-zinc-900/30 border-zinc-900 text-zinc-300"
                }`}
              >
                <div className="flex items-center justify-between text-[10px] text-zinc-500 mb-1">
                  <span className="font-semibold text-zinc-400">
                    [{log.source}]
                  </span>
                  <span>{formatTime(log.ts)}</span>
                </div>
                <div className="whitespace-pre-wrap font-mono">{log.text}</div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
