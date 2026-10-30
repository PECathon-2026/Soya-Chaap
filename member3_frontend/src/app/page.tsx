"use client";

import React, { useState, useEffect } from "react";
import { Scene } from "@/components/Scene";
import { ThreeUITempleNightOverlay } from "@/components/landing/ThreeUITempleNightOverlay";
import { LoginTerminal } from "@/components/landing/LoginTerminal";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Timeline } from "@/components/timeline/Timeline";
import { TaskInput } from "@/components/timeline/TaskInput";
import { RightPanel } from "@/components/panels/RightPanel";
import { useEventStream } from "@/hooks/useEventStream";
import { zenAudio } from "@/lib/zen-audio";
import { AgentType } from "@/types/events";

export default function HomePage() {
  // Navigation views:
  // "temple" -> Clean Kyoto Temple Night Scene without watermarks
  // "login"  -> 3D Camera fly-through & center split reveals the 3D Holographic Login Tablet
  // "app"    -> Full DevPilot 3-Column AI Engineering Cockpit
  const [view, setView] = useState<"temple" | "login" | "app">("temple");
  const [isOpeningFromCenter, setIsOpeningFromCenter] = useState(false);
  const [missionId, setMissionId] = useState("mission_001");

  const {
    events,
    allEvents,
    activeAgent,
    isPlaying,
    speed,
    isFinished,
    missionState,
    sourceType,
    scenarios,
    selectedScenario,
    setSelectedScenario,
    play,
    pause,
    restart,
    step,
    setSpeed,
    postApproval,
    submitClarification,
    addUserInstruction,
    launchMission,
    compareBaseline,
  } = useEventStream({
    missionId,
    autoPlay: true,
  });

  // Listen for scroll down or touch swipe to trigger the 3D camera fly-through and split
  useEffect(() => {
    if (view !== "temple") return;

    let touchStartY = 0;

    const handleWheel = (e: WheelEvent) => {
      if (e.deltaY > 15) {
        triggerCenterOpen();
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0].clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      const delta = touchStartY - e.touches[0].clientY;
      if (delta > 25) {
        triggerCenterOpen();
      }
    };

    window.addEventListener("wheel", handleWheel, { passive: true });
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: true });

    return () => {
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
    };
  }, [view]);

  const triggerCenterOpen = () => {
    zenAudio.playChime(440);
    setIsOpeningFromCenter(true);
    setTimeout(() => {
      setView("login");
    }, 600);
  };

  const handleLoginSuccess = (agent: AgentType, operatorName: string) => {
    zenAudio.playChime(660);
    setView("app");
  };

  const handleBackToTemple = () => {
    zenAudio.playChime(396);
    setIsOpeningFromCenter(false);
    setView("temple");
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#05070a] select-none perspective-[1400px]">
      {/* 1. PERSISTENT 3D TEMPLE NIGHT SCENE */}
      <div
        className={`absolute inset-0 w-full h-full z-0 transition-transform duration-1000 ease-[cubic-bezier(0.25,1,0.5,1)] ${
          isOpeningFromCenter ? "scale-110 -translate-y-4" : "scale-100 translate-y-0"
        }`}
      >
        <Scene />
      </div>

      {/* Floating 3D Embers / Fireflies */}
      <div className="absolute inset-0 pointer-events-none z-[5] overflow-hidden">
        <div className="absolute w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_12px_#f59e0b] animate-pulse left-[15%] top-[70%]" />
        <div className="absolute w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_15px_#e11d48] animate-pulse left-[82%] top-[60%]" />
        <div className="absolute w-1 h-1 rounded-full bg-amber-300 shadow-[0_0_8px_#f59e0b] animate-ping left-[48%] top-[80%]" />
        <div className="absolute w-1.5 h-1.5 rounded-full bg-rose-400 shadow-[0_0_10px_#e11d48] animate-pulse left-[28%] top-[40%]" />
      </div>

      {/* 2. THE FIRST PAGE: CLEAN OVERLAY WITHOUT WATERMARKS */}
      {view === "temple" && (
        <ThreeUITempleNightOverlay onEnter={triggerCenterOpen} />
      )}

      {/* 3. 3D CENTER SPLIT SWINGING GATES LAYER */}
      {view !== "app" && (
        <div
          className={`absolute inset-0 z-20 pointer-events-none transition-opacity duration-500 ${
            view === "temple" && !isOpeningFromCenter ? "opacity-0" : "opacity-100"
          }`}
          style={{ transformStyle: "preserve-3d" }}
        >
          {/* Left Door - Swings open toward viewer in 3D */}
          <div
            className={`absolute top-0 left-0 w-1/2 h-full bg-[#07080b]/95 border-r border-amber-500/40 shadow-[-20px_0_60px_rgba(0,0,0,0.95)] backdrop-blur-xl transition-all duration-1000 ease-[cubic-bezier(0.77,0,0.175,1)] origin-left ${
              isOpeningFromCenter ? "-translate-x-full rotate-y-[-20deg]" : "translate-x-0 rotate-y-0"
            }`}
          >
            <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#f59e0b_1px,transparent_1px),linear-gradient(to_bottom,#f59e0b_1px,transparent_1px)] bg-[size:4rem_6rem]" />
          </div>

          {/* Right Door - Swings open toward viewer in 3D */}
          <div
            className={`absolute top-0 right-0 w-1/2 h-full bg-[#07080b]/95 border-l border-amber-500/40 shadow-[20px_0_60px_rgba(0,0,0,0.95)] backdrop-blur-xl transition-all duration-1000 ease-[cubic-bezier(0.77,0,0.175,1)] origin-right ${
              isOpeningFromCenter ? "translate-x-full rotate-y-[20deg]" : "translate-x-0 rotate-y-0"
            }`}
          >
            <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#f59e0b_1px,transparent_1px),linear-gradient(to_bottom,#f59e0b_1px,transparent_1px)] bg-[size:4rem_6rem]" />
          </div>
        </div>
      )}

      {/* 4. AUTHENTICATION VIEW (OVER LIVE 3D FIRST PAGE SCENE) */}
      {view === "login" && (
        <div className="absolute inset-0 z-30 flex items-center justify-center p-4 overflow-y-auto bg-black/30 backdrop-blur-[2px] animate-in fade-in zoom-in-95 duration-500">
          <LoginTerminal
            onLoginSuccess={handleLoginSuccess}
            onBackToTemple={handleBackToTemple}
          />
        </div>
      )}

      {/* 5. ORIGINAL DEVPILOT MISSION CONTROL */}
      {view === "app" && (
        <div className="absolute inset-0 z-40 flex h-screen w-screen overflow-hidden bg-[#08090C] text-zinc-100 animate-in fade-in duration-500">
          {/* Column 1: Left Navigation & Playback Sidebar */}
          <Sidebar
            currentMissionId={missionId}
            onSelectMission={(id) => {
              setMissionId(id);
              setSelectedScenario(id);
              restart();
            }}
            isPlaying={isPlaying}
            speed={speed}
            isFinished={isFinished}
            eventsCount={events.length}
            totalEventsCount={allEvents.length}
            sourceType={sourceType}
            scenarios={scenarios}
            selectedScenario={selectedScenario}
            onSelectScenario={(id) => {
              setSelectedScenario(id);
              setMissionId(id);
              launchMission(undefined, id);
            }}
            onLaunchMission={(req, scenario) => {
              launchMission(req, scenario || selectedScenario);
            }}
            onPlay={play}
            onPause={pause}
            onRestart={restart}
            onStep={step}
            onSetSpeed={setSpeed}
          />

          {/* Column 2: Center Mission Timeline Stream */}
          <main className="flex-1 flex flex-col h-full min-w-0 border-r border-zinc-800/80 bg-zinc-950 overflow-hidden">
            <Header
              missionState={missionState}
              activeAgent={activeAgent}
              isPlaying={isPlaying}
              onToggleTemple={handleBackToTemple}
            />

            <Timeline
              events={events}
              activeAgent={activeAgent}
              isPlaying={isPlaying}
              isFinished={isFinished}
              onApprovalDecision={postApproval}
              onSubmitClarification={submitClarification}
            />

            <TaskInput
              onSendMessage={addUserInstruction}
              disabled={isFinished}
            />
          </main>

          {/* Column 3: Right Inspector Panel with 6 Tabs */}
          <aside className="w-[480px] xl:w-[560px] 2xl:w-[620px] shrink-0 h-full overflow-hidden hidden lg:block">
            <RightPanel
              missionState={missionState}
              activeAgent={activeAgent}
              missionId={missionId}
            />
          </aside>
        </div>
      )}
    </div>
  );
}
