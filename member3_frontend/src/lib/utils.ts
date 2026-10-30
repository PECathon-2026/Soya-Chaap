import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { AgentType } from "@/types/events";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const AGENT_CONFIG: Record<
  AgentType,
  {
    name: string;
    role: string;
    color: string;
    badgeBg: string;
    badgeBorder: string;
    accentColor: string;
    glowClass: string;
    icon: string;
  }
> = {
  shogun: {
    name: "Shogun",
    role: "Planner & Strategist",
    color: "text-amber-400",
    badgeBg: "bg-amber-950/40",
    badgeBorder: "border-amber-500/40",
    accentColor: "#F59E0B",
    glowClass: "shadow-goldGlow",
    icon: "Scroll",
  },
  samurai: {
    name: "Samurai",
    role: "Lead Coder",
    color: "text-rose-400",
    badgeBg: "bg-rose-950/40",
    badgeBorder: "border-rose-500/40",
    accentColor: "#E11D48",
    glowClass: "shadow-glow",
    icon: "Swords",
  },
  sentinel: {
    name: "Sentinel",
    role: "Tester & Verifier",
    color: "text-emerald-400",
    badgeBg: "bg-emerald-950/40",
    badgeBorder: "border-emerald-500/40",
    accentColor: "#10B981",
    glowClass: "shadow-emeraldGlow",
    icon: "ShieldCheck",
  },
  shadow: {
    name: "Shadow",
    role: "Reviewer & Security",
    color: "text-purple-400",
    badgeBg: "bg-purple-950/40",
    badgeBorder: "border-purple-500/40",
    accentColor: "#8B5CF6",
    glowClass: "shadow-[0_0_20px_-5px_rgba(139,92,246,0.3)]",
    icon: "Eye",
  },
  orchestrator: {
    name: "Orchestrator",
    role: "System Coordinator",
    color: "text-slate-300",
    badgeBg: "bg-slate-900/60",
    badgeBorder: "border-slate-500/40",
    accentColor: "#94A3B8",
    glowClass: "shadow-[0_0_20px_-5px_rgba(148,163,184,0.3)]",
    icon: "Cpu",
  },
};

export function formatTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch {
    return isoString;
  }
}
