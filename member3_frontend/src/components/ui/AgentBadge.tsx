"use client";

import React from "react";
import { AgentType } from "@/types/events";
import { AGENT_CONFIG, cn } from "@/lib/utils";
import { Scroll, Swords, ShieldCheck, Eye, Cpu } from "lucide-react";

interface AgentBadgeProps {
  agent: AgentType;
  showRole?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
  isActive?: boolean;
}

export function AgentBadge({
  agent,
  showRole = false,
  size = "md",
  className,
  isActive = false,
}: AgentBadgeProps) {
  const config = AGENT_CONFIG[agent] || AGENT_CONFIG.orchestrator;

  const renderIcon = () => {
    const iconProps = {
      className: cn(
        size === "sm" ? "w-3 h-3" : size === "lg" ? "w-4 h-4" : "w-3.5 h-3.5",
        config.color
      ),
    };

    switch (config.icon) {
      case "Scroll":
        return <Scroll {...iconProps} />;
      case "Swords":
        return <Swords {...iconProps} />;
      case "ShieldCheck":
        return <ShieldCheck {...iconProps} />;
      case "Eye":
        return <Eye {...iconProps} />;
      case "Cpu":
      default:
        return <Cpu {...iconProps} />;
    }
  };

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-xs uppercase tracking-wider transition-all",
        config.badgeBg,
        config.badgeBorder,
        isActive && `${config.glowClass} ring-1 ring-white/20`,
        size === "sm" && "text-[10px] px-2 py-0.5",
        size === "lg" && "text-sm px-3.5 py-1",
        className
      )}
    >
      <span className="flex items-center justify-center">{renderIcon()}</span>
      <span className={cn("font-semibold", config.color)}>{config.name}</span>
      {showRole && (
        <span className="text-[10px] text-zinc-400 normal-case tracking-normal">
          • {config.role}
        </span>
      )}
    </div>
  );
}
