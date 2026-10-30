"use client";

import React from "react";
import { AgentType, MissionState } from "@/types/events";
import { AgentBadge } from "@/components/ui/AgentBadge";
import { GitBranch, ShieldCheck, Flame, CheckCircle2, AlertOctagon, Clock } from "lucide-react";

interface HeaderProps {
  missionState: MissionState;
  activeAgent: AgentType | null;
  isPlaying: boolean;
  onToggleTemple?: () => void;
}

export function Header({ missionState, activeAgent, isPlaying, onToggleTemple }: HeaderProps) {
  const getStatusBadge = () => {
    switch (missionState.status) {
      case "done":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/60 bg-emerald-950/80 px-2.5 py-0.5 font-mono text-[10px] sm:text-[11px] font-bold text-emerald-400 shadow-emeraldGlow whitespace-nowrap">
            <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
            <span>MISSION ACCOMPLISHED</span>
          </span>
        );
      case "waiting_approval":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500 bg-rose-950/90 px-2.5 py-0.5 font-mono text-[10px] sm:text-[11px] font-bold text-rose-300 animate-pulse shadow-glow whitespace-nowrap">
            <Flame className="w-3 h-3 text-rose-400 shrink-0" />
            <span>PENDING SIGN-OFF</span>
          </span>
        );
      case "escalated":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-600 bg-rose-950 px-2.5 py-0.5 font-mono text-[10px] sm:text-[11px] font-bold text-rose-300 shadow-glow whitespace-nowrap">
            <AlertOctagon className="w-3 h-3 text-rose-400 shrink-0" />
            <span>HUMAN ESCALATION</span>
          </span>
        );
      case "running":
      default:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/50 bg-amber-950/60 px-2.5 py-0.5 font-mono text-[10px] sm:text-[11px] font-bold text-amber-300 shadow-goldGlow/40 whitespace-nowrap">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400"></span>
            </span>
            <span>ENGAGED // ACTIVE</span>
          </span>
        );
    }
  };

  return (
    <header className="h-14 flex items-center justify-between px-4 border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-md select-none shrink-0 w-full min-w-0 overflow-hidden">
      {/* Left Info (Truncted properly to frame) */}
      <div className="flex flex-col min-w-0 flex-1 mr-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-mono text-xs text-zinc-500 font-semibold shrink-0">
            {missionState.missionId}
          </span>
          <span className="text-zinc-600 shrink-0">•</span>
          <h1 className="text-xs sm:text-sm font-bold text-zinc-100 truncate">
            {missionState.title}
          </h1>
        </div>
        <div className="flex items-center gap-2 mt-0.5 text-[10px] sm:text-[11px] font-mono text-zinc-400 min-w-0">
          <span className="flex items-center gap-1 text-zinc-400 truncate">
            <GitBranch className="w-3 h-3 text-rose-400 shrink-0" />
            <span className="truncate">feat/fix-webhook-idempotency</span>
          </span>
          <span className="text-zinc-600 shrink-0">•</span>
          <span className="shrink-0">Iter #{missionState.iteration}</span>
          {missionState.retryCount > 0 && (
            <>
              <span className="text-zinc-600 shrink-0">•</span>
              <span className="text-rose-400 font-bold shrink-0">
                {missionState.retryCount} retries
              </span>
            </>
          )}
        </div>
      </div>

      {/* Right Agent & Status indicators (Compact and non-colliding) */}
      <div className="flex items-center gap-2 shrink-0">
        {onToggleTemple && (
          <button
            onClick={onToggleTemple}
            className="flex items-center gap-1.5 rounded-lg border border-amber-600/40 bg-amber-950/40 hover:bg-amber-900/60 px-2 py-1 text-xs font-mono text-amber-300 transition-colors shadow-goldGlow/30 shrink-0"
            title="Return to Kyoto Temple 3D Sanctuary"
          >
            <span>⛩️</span>
            <span className="hidden xl:inline">Temple Dojo</span>
          </button>
        )}
        {activeAgent && (
          <div className="hidden 2xl:flex items-center gap-1.5 font-mono text-xs shrink-0">
            <span className="text-zinc-500 text-[11px]">Active:</span>
            <AgentBadge agent={activeAgent} size="sm" isActive={isPlaying} />
          </div>
        )}
        <div className="shrink-0">{getStatusBadge()}</div>
      </div>
    </header>
  );
}
