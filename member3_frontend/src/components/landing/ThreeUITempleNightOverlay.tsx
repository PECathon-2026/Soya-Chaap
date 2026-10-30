"use client";

import React from "react";

interface ThreeUITempleNightOverlayProps {
  onEnter: () => void;
}

export function ThreeUITempleNightOverlay({ onEnter }: ThreeUITempleNightOverlayProps) {
  return (
    <div className="absolute inset-0 pointer-events-none z-10 flex flex-col justify-between p-6 sm:p-10 select-none">
      {/* TOP ROW (Watermarks removed) */}
      <div className="flex items-start justify-between w-full">
        {/* Top-Left: Clean title and description without THREEUI watermark */}
        <div className="flex flex-col space-y-3.5 max-w-md pointer-events-auto">
          {/* Subtle amber pill: KYOTO MOUNTAIN TEMPLE (THREEUI watermark removed) */}
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-600/40 bg-[#24170E]/70 px-3.5 py-1 text-[11px] font-mono tracking-widest text-[#FCD34D] uppercase backdrop-blur-md shadow-sm w-fit">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_8px_#f59e0b]" />
            <span>KYOTO MOUNTAIN TEMPLE</span>
          </div>

          {/* Title: TEMPLE NIGHT */}
          <h1
            className="text-4xl sm:text-5xl font-bold tracking-wider text-slate-100 uppercase drop-shadow-[0_4px_20px_rgba(0,0,0,0.8)]"
            style={{ fontFamily: "'Cinzel', 'Playfair Display', Georgia, serif" }}
          >
            TEMPLE NIGHT
          </h1>

          {/* Description */}
          <p className="text-xs sm:text-[13px] text-slate-300/80 leading-relaxed max-w-[390px] font-sans drop-shadow">
            Procedural Kyoto mountain temple after dark, with authored architecture, rain, mist, leaves, pointer wisps, and custom bloom pipeline.
          </p>
        </div>

        {/* Top-Right watermark badges removed */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Audio / ambiance toggle could go here or remain completely clean */}
        </div>
      </div>

      {/* BOTTOM ROW (Watermarks removed) */}
      <div className="flex items-end justify-between w-full">
        {/* Bottom-Left: Clean interaction hint */}
        <div className="text-[11px] font-mono tracking-wider text-slate-400/90 uppercase drop-shadow select-none flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400/80 inline-block animate-pulse" />
          <span>MOVE POINTER TO DIRECT WISPS AND CAMERA DRIFT</span>
        </div>

        {/* Center Bottom: Clean interactive gate open prompt */}
        <div
          onClick={onEnter}
          className="pointer-events-auto cursor-pointer group flex flex-col items-center gap-1.5 -translate-y-1 transition-all"
          title="Scroll or click to open login terminal"
        >
          <div className="h-6 w-px bg-gradient-to-b from-transparent via-amber-400 to-rose-500 animate-pulse" />
          <div className="rounded-full border border-amber-500/40 bg-black/60 backdrop-blur-md px-4 py-1.5 text-[11px] font-mono text-amber-300/90 group-hover:text-amber-200 group-hover:border-amber-400 group-hover:bg-black/80 transition-all shadow-goldGlow flex items-center gap-2">
            <span>Scroll down or click to enter</span>
            <span className="text-rose-400 font-bold group-hover:translate-y-0.5 transition-transform">↓</span>
          </div>
        </div>

        {/* Bottom-Right pipeline watermark removed */}
        <div className="text-[11px] font-mono text-transparent select-none">
          {/* Clean spacer */}
        </div>
      </div>
    </div>
  );
}
