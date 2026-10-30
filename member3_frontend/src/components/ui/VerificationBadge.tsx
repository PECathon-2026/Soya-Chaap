"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { CheckCircle2, AlertTriangle } from "lucide-react";

interface VerificationBadgeProps {
  verified?: boolean;
  className?: string;
  size?: "sm" | "md";
}

export function VerificationBadge({
  verified,
  className,
  size = "md",
}: VerificationBadgeProps) {
  const isVerified = Boolean(verified);

  if (isVerified) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-md border border-emerald-500/40 bg-emerald-950/40 px-2 py-0.5 font-mono font-medium text-emerald-400 shadow-emeraldGlow transition-all",
          size === "sm" ? "text-[10px] px-1.5 py-0.2" : "text-xs",
          className
        )}
        title="Verified by real tool execution or automated test suite"
      >
        <CheckCircle2 className={size === "sm" ? "w-2.5 h-2.5" : "w-3 h-3"} />
        <span>Verified</span>
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border border-amber-500/40 bg-amber-950/40 px-2 py-0.5 font-mono font-medium text-amber-400 shadow-goldGlow transition-all",
        size === "sm" ? "text-[10px] px-1.5 py-0.2" : "text-xs",
        className
      )}
      title="Unverified AI assertion (heuristic or model claim)"
    >
      <AlertTriangle className={size === "sm" ? "w-2.5 h-2.5" : "w-3 h-3"} />
      <span>Model claim</span>
    </span>
  );
}
