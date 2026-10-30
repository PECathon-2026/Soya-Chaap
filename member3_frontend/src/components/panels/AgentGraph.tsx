"use client";

import React, { useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MarkerType,
  Node,
  Edge,
  BackgroundVariant,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { AgentType } from "@/types/events";
import { AGENT_CONFIG } from "@/lib/utils";
import { Crown, Swords, ShieldCheck, Eye, Cpu, RotateCcw } from "lucide-react";

interface AgentGraphProps {
  activeAgent: AgentType | null;
  retryCount: number;
}

export function AgentGraph({ activeAgent, retryCount }: AgentGraphProps) {
  const nodes: Node[] = useMemo(() => {
    const agentList: { id: AgentType; x: number; y: number }[] = [
      { id: "orchestrator", x: 220, y: 30 },
      { id: "shogun", x: 40, y: 150 },
      { id: "samurai", x: 220, y: 160 },
      { id: "sentinel", x: 400, y: 150 },
      { id: "shadow", x: 220, y: 300 },
    ];

    return agentList.map(({ id, x, y }) => {
      const config = AGENT_CONFIG[id];
      const isActive = activeAgent === id;

      return {
        id,
        position: { x, y },
        data: {
          label: (
            <div
              className={`relative rounded-xl border px-3.5 py-2.5 font-mono transition-all duration-300 min-w-[130px] text-center ${
                isActive
                  ? `${config.badgeBg} ${config.badgeBorder} ${config.glowClass} ring-2 ring-white/40 scale-105`
                  : "bg-zinc-950/90 border-zinc-800 text-zinc-400"
              }`}
            >
              {isActive && (
                <span className="absolute -top-2.5 right-2 rounded-full bg-rose-600 px-1.5 py-0.2 text-[9px] font-bold text-white uppercase tracking-wider animate-pulse">
                  Active
                </span>
              )}
              <div className="flex items-center justify-center gap-1.5 mb-1">
                {id === "orchestrator" && <Cpu className="w-3.5 h-3.5 text-slate-300" />}
                {id === "shogun" && <Crown className="w-3.5 h-3.5 text-amber-400" />}
                {id === "samurai" && <Swords className="w-3.5 h-3.5 text-rose-500" />}
                {id === "sentinel" && <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />}
                {id === "shadow" && <Eye className="w-3.5 h-3.5 text-purple-400" />}
                <span className={`text-xs font-bold ${config.color}`}>{config.name}</span>
              </div>
              <div className="text-[10px] text-zinc-400">{config.role.split(" ")[0]}</div>
            </div>
          ),
        },
      };
    });
  }, [activeAgent]);

  const edges: Edge[] = useMemo(() => {
    const isRetryActive = activeAgent === "samurai" && retryCount > 0;
    const isShadowRemediation = activeAgent === "samurai" && !isRetryActive;

    return [
      {
        id: "orch-shogun",
        source: "orchestrator",
        target: "shogun",
        animated: activeAgent === "shogun",
        style: { stroke: "#94a3b8", strokeWidth: 1.5 },
        markerEnd: { type: MarkerType.ArrowClosed, color: "#94a3b8" },
      },
      {
        id: "shogun-samurai",
        source: "shogun",
        target: "samurai",
        label: "Tasks",
        labelStyle: { fill: "#f59e0b", fontSize: 10, fontFamily: "monospace" },
        animated: activeAgent === "samurai",
        style: { stroke: "#f59e0b", strokeWidth: 1.5 },
        markerEnd: { type: MarkerType.ArrowClosed, color: "#f59e0b" },
      },
      {
        id: "samurai-sentinel",
        source: "samurai",
        target: "sentinel",
        label: "Verify",
        labelStyle: { fill: "#10b981", fontSize: 10, fontFamily: "monospace" },
        animated: activeAgent === "sentinel",
        style: { stroke: "#10b981", strokeWidth: 1.5 },
        markerEnd: { type: MarkerType.ArrowClosed, color: "#10b981" },
      },
      // Backward Feedback Loop: Sentinel -> Samurai on test failure!
      {
        id: "sentinel-samurai-loop",
        source: "sentinel",
        target: "samurai",
        label: `Loop: Test Fail (${retryCount}/3)`,
        labelStyle: {
          fill: "#e11d48",
          fontSize: 10,
          fontWeight: 700,
          fontFamily: "monospace",
        },
        labelBgPadding: [6, 3],
        labelBgBorderRadius: 4,
        labelBgStyle: { fill: "#270810", fillOpacity: 0.9, stroke: "#e11d48" },
        animated: true,
        style: {
          stroke: "#e11d48",
          strokeWidth: 2,
          strokeDasharray: "5 5",
        },
        markerEnd: { type: MarkerType.ArrowClosed, color: "#e11d48" },
      },
      {
        id: "sentinel-shadow",
        source: "sentinel",
        target: "shadow",
        label: "Security Audit",
        labelStyle: { fill: "#8b5cf6", fontSize: 10, fontFamily: "monospace" },
        animated: activeAgent === "shadow",
        style: { stroke: "#8b5cf6", strokeWidth: 1.5 },
        markerEnd: { type: MarkerType.ArrowClosed, color: "#8b5cf6" },
      },
      // Backward Loop: Shadow -> Samurai on security finding!
      {
        id: "shadow-samurai-loop",
        source: "shadow",
        target: "samurai",
        label: "Fix Credential",
        labelStyle: { fill: "#c084fc", fontSize: 10, fontFamily: "monospace" },
        labelBgPadding: [6, 2],
        labelBgStyle: { fill: "#1f0d3d", stroke: "#8b5cf6" },
        animated: isShadowRemediation,
        style: { stroke: "#8b5cf6", strokeWidth: 1.8, strokeDasharray: "4 4" },
        markerEnd: { type: MarkerType.ArrowClosed, color: "#8b5cf6" },
      },
      {
        id: "shadow-orch",
        source: "shadow",
        target: "orchestrator",
        label: "Approval",
        labelStyle: { fill: "#38bdf8", fontSize: 10, fontFamily: "monospace" },
        animated: activeAgent === "orchestrator",
        style: { stroke: "#38bdf8", strokeWidth: 1.5 },
        markerEnd: { type: MarkerType.ArrowClosed, color: "#38bdf8" },
      },
    ];
  }, [activeAgent, retryCount]);

  return (
    <div className="h-full w-full bg-zinc-950 font-mono">
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-zinc-800 bg-zinc-900/60 text-xs">
        <div className="flex items-center gap-2 text-zinc-300">
          <RotateCcw className="w-4 h-4 text-rose-500" />
          <span className="font-semibold text-zinc-200">Autonomous Agent Network</span>
        </div>
        <span className="text-[10px] text-zinc-400">
          {retryCount > 0 ? `Active feedback loop: ${retryCount} retries` : "Pipeline ready"}
        </span>
      </div>

      <div className="h-[calc(100%-42px)] w-full">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          fitView
          fitViewOptions={{ padding: 0.25 }}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          panOnDrag={true}
          zoomOnScroll={true}
          proOptions={{ hideAttribution: true }}
          className="bg-zinc-950"
        >
          <Background color="#27272a" gap={20} size={1} variant={BackgroundVariant.Dots} />
          <Controls showInteractive={false} className="bg-zinc-900 border-zinc-800" />
        </ReactFlow>
      </div>
    </div>
  );
}
