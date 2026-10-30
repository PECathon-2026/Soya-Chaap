"use client";

import React from "react";

interface ShojiGateProps {
  isOpen: boolean;
  onTransitionEnd?: () => void;
  children: React.ReactNode;
}

export function ShojiGate({ isOpen, onTransitionEnd, children }: ShojiGateProps) {
  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Content behind the gate */}
      <div className="w-full h-full">{children}</div>

      {/* Left Shoji Panel */}
      <div
        onTransitionEnd={onTransitionEnd}
        className={`fixed top-0 left-0 w-1/2 h-full z-50 pointer-events-none transition-transform duration-1000 ease-[cubic-bezier(0.77,0,0.175,1)] flex ${
          isOpen ? "-translate-x-full" : "translate-x-0 pointer-events-auto"
        }`}
      >
        <div className="w-full h-full bg-[#07080b]/95 border-r border-amber-600/40 relative shadow-[15px_0_40px_rgba(0,0,0,0.9)] backdrop-blur-xl flex flex-col justify-between p-8">
          {/* Traditional lattice grid pattern */}
          <div className="absolute inset-0 opacity-15 bg-[linear-gradient(to_right,#f59e0b_1px,transparent_1px),linear-gradient(to_bottom,#f59e0b_1px,transparent_1px)] bg-[size:3.5rem_5rem]" />
          
          <div className="relative z-10 flex items-center gap-3">
            <span className="text-2xl font-serif text-amber-400">零</span>
            <div className="h-0.5 w-12 bg-gradient-to-r from-amber-500 to-transparent" />
            <span className="text-xs font-mono tracking-widest text-zinc-400 uppercase">
              DevPilot Gate • Alpha
            </span>
          </div>

          <div className="relative z-10 font-serif text-4xl text-amber-500/20 select-none tracking-widest writing-vertical">
            侍魂 • 影武者
          </div>

          <div className="relative z-10 font-mono text-[10px] text-zinc-500">
            SYSTEM // INTEGRATED DEFENSE
          </div>
        </div>
      </div>

      {/* Right Shoji Panel */}
      <div
        className={`fixed top-0 right-0 w-1/2 h-full z-50 pointer-events-none transition-transform duration-1000 ease-[cubic-bezier(0.77,0,0.175,1)] flex ${
          isOpen ? "translate-x-full" : "translate-x-0 pointer-events-auto"
        }`}
      >
        <div className="w-full h-full bg-[#07080b]/95 border-l border-amber-600/40 relative shadow-[-15px_0_40px_rgba(0,0,0,0.9)] backdrop-blur-xl flex flex-col justify-between p-8 items-end text-right">
          <div className="absolute inset-0 opacity-15 bg-[linear-gradient(to_right,#f59e0b_1px,transparent_1px),linear-gradient(to_bottom,#f59e0b_1px,transparent_1px)] bg-[size:3.5rem_5rem]" />
          
          <div className="relative z-10 flex items-center gap-3">
            <span className="text-xs font-mono tracking-widest text-zinc-400 uppercase">
              DevPilot Gate • Omega
            </span>
            <div className="h-0.5 w-12 bg-gradient-to-l from-amber-500 to-transparent" />
            <span className="text-2xl font-serif text-amber-400">壱</span>
          </div>

          <div className="relative z-10 font-serif text-4xl text-amber-500/20 select-none tracking-widest writing-vertical">
            将軍 • 神仏
          </div>

          <div className="relative z-10 font-mono text-[10px] text-zinc-500">
            PROTOCOL // SECURE SHADOW
          </div>
        </div>
      </div>
    </div>
  );
}
