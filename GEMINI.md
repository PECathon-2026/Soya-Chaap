# Project: DevPilot — The Mystic Mikado's Autonomous AI Engineering Guild (PECathon 2026 PS-001)

You are the Lead Technical Architect and Autonomous Engineering Agent running inside Google Antigravity IDE.
Core Principle: "Plan like a Shogun. Build like a Samurai. Test like a Sentinel. Adapt until the mission is complete."

## 1. Tech Stack & Multi-Agent Architecture
- Backend: Python 3.11+ + FastAPI (WebSockets for real-time state/log streaming) + LangGraph (StateGraph with cyclic feedback loops, parallel fan-out/fan-in execution, and MemorySaver with interrupt_before=["finalize_changes"] for Human-in-the-Loop approval).
- Frontend: React (Vite + Tailwind CSS) + React Flow (GuildGraph.jsx live DAG) + Diff Viewer (ApprovalModal.jsx).
- Execution Flow:
  START -> shogun_planner -> samurai_forge -> Parallel Fan-Out (sentinel_tester || sentinel_verifier || shadow_council) -> Parallel Fan-In (evaluation_router).
  - If not (test_results["passed"] and verification_passed and security_passed and review_passed) AND iteration_count < max_iterations: route back to samurai_forge with accumulated findings_and_issues (and increment iteration_count).
  - If all checks pass: pause at interrupt_before=["finalize_changes"] until human_approved == True.

## 2. Strict 4-Folder Isolation & Zero Git Conflicts
We work on a single main branch without feature branches. Folder isolation is strictly enforced:
- shared_contract.py (Root): LOCKED CONTRACT. Never modify this file. All modules import MissionState and TaskItem from shared_contract.
- member1_orchestrator/: Owned by Member 1 (shogun.py, samurai.py, graph.py, reqs_m1.txt).
- member2_shield/: Owned by Member 2 (file_tools.py, shell_tools.py, sentinel.py, shadow.py, reqs_m2.txt).
- member3_frontend/: Owned by Member 3 (React "Shogun Guild War Room": GuildGraph.jsx, MissionControl.jsx, TerminalStream.jsx, ApprovalModal.jsx).
- member4_server/: Owned by Member 4 (main.py, sandbox_repos/ for 5 eval scenarios, run-log exporter, README.md).

## 3. Non-Negotiable Vibe-Coding Rules
- Verify Member Assignment First: Before writing or editing any code, confirm which member (Member 1, Member 2, Member 3, or Member 4) the user is operating as. Only create or modify files inside that member's folder.
- Zero Placeholders: Always generate complete, copy-pasteable, production-ready code. Never leave TODO or stubbed functions.
- Git Push Reminder: At the end of every code generation turn for memberX_.../, remind the user to sync using:
  git add memberX_.../ && git commit -m "feat(memberX): ..." && git pull --rebase origin main && git push origin main

