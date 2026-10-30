"use client";

import React, { useState } from "react";
import {
  Volume2,
  VolumeX,
  Sparkles,
  ArrowDown,
  LogIn,
  Play,
  Compass,
  Swords,
  ShieldCheck,
  Eye,
  Cpu,
} from "lucide-react";
import { zenAudio } from "@/lib/zen-audio";

interface LandingHeroOverlayProps {
  onEnterLogin: () => void;
  onEnterDirectApp: () => void;
}

export function LandingHeroOverlay({
  onEnterLogin,
  onEnterDirectApp,
}: LandingHeroOverlayProps) {
  const [isAudioActive, setIsAudioActive] = useState(false);

  const toggleSound = () => {
    const active = zenAudio.toggleRain();
    setIsAudioActive(active);
    zenAudio.playChime(active ? 528 : 396);
  };

  return (
    <div className="absolute inset-0 pointer-events-none z-10 flex flex-col justify-between p-6 sm:p-10 select-none">
      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between w-full pointer-events-auto">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-600 via-rose-700 to-amber-500 flex items-center justify-center text-white font-bold shadow-glow text-base">
            ⚔️
          </div>
          <div>
            <div className="text-base font-bold tracking-widest text-zinc-100 font-mono flex items-center gap-2">
              DEVPILOT
              <span className="text-[10px] font-semibold text-rose-400 uppercase tracking-widest px-1.5 py-0.5 rounded bg-rose-950/80 border border-rose-900/60">
                PROD v2.4
              </span>
            </div>
            <div className="text-[10px] font-mono text-zinc-400 tracking-tight">
              Kage Kyoto Temple Sanctuary
            </div>
          </div>
        </div>

        {/* Top Right Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggleSound}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-mono transition-all backdrop-blur-md ${
              isAudioActive
                ? "bg-amber-950/80 border-amber-500/60 text-amber-300 shadow-goldGlow"
                : "bg-zinc-900/70 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
            }`}
            title="Toggle procedural Kyoto temple rain & ambient wind"
          >
            {isAudioActive ? (
              <Volume2 className="w-3.5 h-3.5 text-amber-400" />
            ) : (
              <VolumeX className="w-3.5 h-3.5" />
            )}
            <span>{isAudioActive ? "Temple Rain ON" : "Soundscape"}</span>
          </button>

          <button
            onClick={onEnterDirectApp}
            className="flex items-center gap-1.5 rounded-full border border-rose-600/80 bg-rose-950/80 hover:bg-rose-900 px-4 py-1.5 text-xs font-mono font-semibold text-rose-200 transition-all shadow-glow"
          >
            <Play className="w-3 h-3 fill-current" />
            <span>Launch Mission</span>
          </button>
        </div>
      </div>

      {/* Center Hero Titles */}
      <div className="max-w-2xl my-auto space-y-4">
        {/* Subtle pill badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-950/40 px-3.5 py-1 text-xs font-mono text-amber-300 shadow-goldGlow backdrop-blur-md">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Kyoto Procedural World • Real-time Shaders & Leaves</span>
        </div>

        {/* Hero Headline */}
        <div className="space-y-2">
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white font-sans drop-shadow-[0_4px_25px_rgba(0,0,0,0.8)]">
            Autonomous AI <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-500 via-rose-400 to-amber-400">
              Engineering Ops
            </span>
          </h1>
          <p className="text-sm sm:text-base text-zinc-300 font-mono max-w-lg leading-relaxed drop-shadow-md">
            5 synchronized agents orchestrating code generation, concurrency testing, and automated security remediation with real-world feedback loops.
          </p>
        </div>

        {/* 5 Agents Quick Badges */}
        <div className="flex flex-wrap items-center gap-2 pt-2 text-[11px] font-mono">
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-black/60 px-2.5 py-1 text-amber-400 backdrop-blur-md">
            <Compass className="w-3.5 h-3.5" /> Shogun
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-black/60 px-2.5 py-1 text-rose-400 backdrop-blur-md">
            <Swords className="w-3.5 h-3.5" /> Samurai
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-black/60 px-2.5 py-1 text-emerald-400 backdrop-blur-md">
            <ShieldCheck className="w-3.5 h-3.5" /> Sentinel
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-purple-500/30 bg-black/60 px-2.5 py-1 text-purple-400 backdrop-blur-md">
            <Eye className="w-3.5 h-3.5" /> Shadow
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-500/30 bg-black/60 px-2.5 py-1 text-slate-300 backdrop-blur-md">
            <Cpu className="w-3.5 h-3.5" /> Orchestrator
          </span>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-wrap items-center gap-3 pt-3 pointer-events-auto">
          <button
            onClick={onEnterLogin}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white font-mono font-bold px-6 py-3 text-sm shadow-glow transition-all active:scale-95"
          >
            <LogIn className="w-4 h-4" />
            <span>Enter Operator Terminal</span>
          </button>

          <button
            onClick={onEnterDirectApp}
            className="flex items-center gap-2 rounded-xl border border-zinc-700/80 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200 font-mono text-sm px-5 py-3 transition-all backdrop-blur-md"
          >
            <Play className="w-4 h-4 text-rose-400 fill-current" />
            <span>Instant Mission Control</span>
          </button>
        </div>
      </div>

      {/* Bottom Interactive Hints & Scroll Down Prompt */}
      <div className="flex items-end justify-between w-full pt-4">
        <div className="hidden sm:block text-[11px] font-mono text-zinc-400/80 bg-black/50 px-3 py-1.5 rounded-lg backdrop-blur-md border border-zinc-800/60">
          ✨ <span className="text-zinc-200">Interactive:</span> Move pointer across screen to cast spirit wisps on pagoda & cherry leaves
        </div>

        <button
          onClick={onEnterLogin}
          className="pointer-events-auto flex items-center gap-2 text-xs font-mono text-amber-300 bg-amber-950/40 hover:bg-amber-900/60 border border-amber-600/40 px-3.5 py-2 rounded-full backdrop-blur-md transition-all shadow-goldGlow animate-bounce"
        >
          <span>Scroll down or click to enter</span>
          <ArrowDown className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
