"use client";

import React, { useRef, useEffect, useState, UIEvent } from "react";
import { DevPilotEvent, AgentType } from "@/types/events";
import { EventCard } from "./EventCard";
import { AGENT_CONFIG } from "@/lib/utils";
import { ArrowDown, Loader2 } from "lucide-react";

interface TimelineProps {
  events: DevPilotEvent[];
  activeAgent: AgentType | null;
  isPlaying: boolean;
  isFinished: boolean;
  onApprovalDecision?: (approvalId: string, decision: "approved" | "rejected", notes?: string) => void;
  onSubmitClarification?: (questionId: string, reply: string) => void;
}

export function Timeline({
  events,
  activeAgent,
  isPlaying,
  isFinished,
  onApprovalDecision,
  onSubmitClarification,
}: TimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [userHasScrolledUp, setUserHasScrolledUp] = useState(false);

  // Auto-scroll logic: scroll to bottom whenever events change, unless user explicitly scrolled up
  useEffect(() => {
    if (!userHasScrolledUp && containerRef.current) {
      containerRef.current.scrollTo({
        top: containerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [events, userHasScrolledUp]);

  const handleScroll = (e: UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 60;
    if (isAtBottom) {
      setUserHasScrolledUp(false);
    } else {
      setUserHasScrolledUp(true);
    }
  };

  const scrollToBottom = () => {
    if (containerRef.current) {
      containerRef.current.scrollTo({
        top: containerRef.current.scrollHeight,
        behavior: "smooth",
      });
      setUserHasScrolledUp(false);
    }
  };

  const agentConfig = activeAgent ? AGENT_CONFIG[activeAgent] : null;

  return (
    <div className="relative flex-1 h-full overflow-hidden flex flex-col">
      {/* Scrollable Event Stream */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-5 space-y-3.5 scroll-smooth"
      >
        {events.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-zinc-900/80 border border-zinc-800 flex items-center justify-center text-rose-500 shadow-glow animate-pulse">
              ⚔️
            </div>
            <h3 className="text-sm font-semibold text-zinc-300">
              DevPilot Ready for Deployment
            </h3>
            <p className="text-xs text-zinc-500 font-mono max-w-sm">
              Press Play or Step in the control panel to initiate the mission replay sequence.
            </p>
          </div>
        ) : (
          events.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              onApprovalDecision={onApprovalDecision}
              onSubmitClarification={onSubmitClarification}
            />
          ))
        )}

        {/* Active Agent Streaming Skeleton / Typing Indicator */}
        {isPlaying && !isFinished && agentConfig && (
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-3.5 flex items-center justify-between animate-pulse">
            <div className="flex items-center gap-3">
              <div className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
              </div>
              <div className="flex items-center gap-2 font-mono text-xs text-zinc-300">
                <span className={agentConfig.color}>
                  {agentConfig.name}
                </span>
                <span className="text-zinc-500">is executing operations...</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-zinc-500 font-mono text-[11px]">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-500" />
              <span>Stream active</span>
            </div>
          </div>
        )}

        <div className="h-4" />
      </div>

      {/* Floating Jump to Bottom Button if user scrolled up */}
      {userHasScrolledUp && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-4 right-6 flex items-center gap-1.5 rounded-full border border-zinc-700 bg-zinc-900/90 backdrop-blur px-3 py-1.5 text-xs font-mono text-zinc-300 shadow-xl hover:bg-zinc-800 hover:text-white transition-all z-20"
        >
          <ArrowDown className="w-3.5 h-3.5 text-rose-400" />
          <span>Jump to latest</span>
        </button>
      )}
    </div>
  );
}
