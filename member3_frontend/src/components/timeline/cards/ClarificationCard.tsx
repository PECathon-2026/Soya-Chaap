"use client";

import React, { useState } from "react";
import { ClarificationRequestedEvent } from "@/types/events";
import { AgentBadge } from "@/components/ui/AgentBadge";
import { formatTime } from "@/lib/utils";
import { HelpCircle, Send } from "lucide-react";

interface ClarificationCardProps {
  event: ClarificationRequestedEvent;
  onSubmitReply?: (questionId: string, reply: string) => void;
}

export function ClarificationCard({ event, onSubmitReply }: ClarificationCardProps) {
  const { data, ts, agent } = event;
  const [reply, setReply] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reply.trim() || submitted) return;
    setSubmitted(true);
    if (onSubmitReply) {
      onSubmitReply(data.questionId, reply.trim());
    }
  };

  const selectOption = (opt: string) => {
    setReply(opt);
  };

  return (
    <div className="group relative rounded-xl border border-amber-600/60 bg-gradient-to-r from-amber-950/40 via-zinc-950/90 to-zinc-950/60 p-4 transition-all shadow-goldGlow/20">
      <div className="flex items-center justify-between pb-2 border-b border-zinc-800/60">
        <div className="flex items-center gap-2">
          <AgentBadge agent={agent} size="sm" />
          <span className="font-mono text-xs text-zinc-500">{formatTime(ts)}</span>
        </div>
        <span className="inline-flex items-center gap-1 rounded-md bg-amber-950/80 px-2 py-0.5 font-mono text-[11px] font-bold text-amber-400 border border-amber-800">
          Operator Input Required
        </span>
      </div>

      <div className="mt-3 space-y-3">
        <div className="flex items-start gap-2.5">
          <HelpCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-semibold text-zinc-100">{data.question}</h4>
            {data.context && (
              <p className="mt-1 text-xs text-zinc-400 leading-relaxed font-mono">
                {data.context}
              </p>
            )}
          </div>
        </div>

        {/* Suggested Quick Options */}
        {data.options && data.options.length > 0 && !submitted && (
          <div className="flex flex-wrap gap-2 pt-1">
            {data.options.map((opt, i) => (
              <button
                key={i}
                type="button"
                onClick={() => selectOption(opt)}
                className="rounded-lg border border-zinc-700 bg-zinc-900/80 px-2.5 py-1 text-xs text-zinc-300 hover:border-amber-500 hover:text-amber-300 transition-colors"
              >
                {opt}
              </button>
            ))}
          </div>
        )}

        {/* Interactive Reply Input */}
        {submitted ? (
          <div className="rounded-lg border border-emerald-900/60 bg-emerald-950/20 p-2.5 text-xs text-emerald-400 font-mono">
            ✓ Your response was forwarded to {agent}: &ldquo;{reply}&rdquo;
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex items-center gap-2 pt-1">
            <input
              type="text"
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="Type your response to the agent..."
              className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
            <button
              type="submit"
              disabled={!reply.trim()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 disabled:opacity-40 disabled:hover:bg-amber-500 px-3 py-2 text-xs font-semibold text-zinc-950 transition-colors"
            >
              <span>Reply</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
