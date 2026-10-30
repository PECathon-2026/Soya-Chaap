"use client";

import React from "react";

interface CenterSplitGateProps {
  isOpen: boolean;
  onOpen: () => void;
  frontContent: React.ReactNode;
  backContent: React.ReactNode;
}

export function CenterSplitGate({
  isOpen,
  onOpen,
  frontContent,
  backContent,
}: CenterSplitGateProps) {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#05070a]">
      {/* Back Layer: Revealed in the center when the front opens */}
      <div className="absolute inset-0 w-full h-full z-10">{backContent}</div>

      {/* Front Layer: Pure 3D Scene that splits open from between */}
      <div
        className={`absolute inset-0 z-20 pointer-events-none ${
          isOpen ? "pointer-events-none" : "pointer-events-auto"
        }`}
      >
        {/* Left half panel */}
        <div
          className={`absolute top-0 left-0 w-1/2 h-full overflow-hidden transition-transform duration-1000 ease-[cubic-bezier(0.77,0,0.175,1)] ${
            isOpen ? "-translate-x-full shadow-[-20px_0_50px_rgba(0,0,0,0.9)]" : "translate-x-0"
          }`}
          style={{ clipPath: "inset(0 0 0 0)" }}
        >
          {/* We render the left half of the 200% width container */}
          <div className="absolute top-0 left-0 w-[200vw] h-full pointer-events-auto">
            {frontContent}
          </div>
          {/* Seam border with golden crimson glow */}
          <div className="absolute top-0 right-0 w-[1px] h-full bg-gradient-to-b from-transparent via-amber-500/60 to-transparent shadow-[0_0_15px_#f59e0b]" />
        </div>

        {/* Right half panel */}
        <div
          className={`absolute top-0 right-0 w-1/2 h-full overflow-hidden transition-transform duration-1000 ease-[cubic-bezier(0.77,0,0.175,1)] ${
            isOpen ? "translate-x-full shadow-[20px_0_50px_rgba(0,0,0,0.9)]" : "translate-x-0"
          }`}
          style={{ clipPath: "inset(0 0 0 0)" }}
        >
          {/* We render the right half by offsetting left by -100vw */}
          <div className="absolute top-0 -left-[100vw] w-[200vw] h-full pointer-events-auto">
            {frontContent}
          </div>
          {/* Seam border with golden crimson glow */}
          <div className="absolute top-0 left-0 w-[1px] h-full bg-gradient-to-b from-transparent via-amber-500/60 to-transparent shadow-[0_0_15px_#f59e0b]" />
        </div>

        {/* Minimal, elegant center split cue when closed */}
        {!isOpen && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 pointer-events-auto flex flex-col items-center gap-1.5 cursor-pointer group" onClick={onOpen}>
            <div className="h-8 w-px bg-gradient-to-b from-transparent via-amber-400 to-rose-500 animate-pulse" />
            <div className="rounded-full border border-amber-500/30 bg-black/60 backdrop-blur-md px-3.5 py-1 text-[11px] font-mono text-amber-300/80 group-hover:text-amber-200 group-hover:border-amber-400 group-hover:bg-black/80 transition-all shadow-[0_0_20px_rgba(0,0,0,0.8)] flex items-center gap-2">
              <span>Scroll or click to open</span>
              <span className="text-rose-400 font-bold group-hover:translate-y-0.5 transition-transform">↓</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
