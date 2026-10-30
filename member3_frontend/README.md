# DevPilot // Multi-Agent AI Engineering Mission Control

> Autonomous AI engineering frontend designed for real-time orchestration of specialized agent teams (Shogun, Samurai, Sentinel, Shadow, Orchestrator) with strict verification gates, human-in-the-loop approvals, and interactive feedback loops.

---

## ⚡ Tech Stack

- **Framework**: Next.js 14 (App Router) + TypeScript
- **Styling**: Tailwind CSS + Custom Samurai-themed Dark Mode (`#08090C`, crimson accents, gold badges)
- **Agent Network Visualization**: `@xyflow/react` (ReactFlow) with real-time active node highlighting and animated routing edges
- **Diff Engine**: Unified diff renderer with line-by-line additions, deletions, chunk headers, and file breakdowns
- **Event Replay Engine**: `useEventStream` supporting offline JSONL simulation with speed multipliers (1x, 2x, 5x), step execution, and live SSE fallback

---

## 🚀 Quickstart & Run Instructions

### Prerequisites
- Node.js 18+ (tested on Node v20/v24)
- npm or pnpm

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Build for Production
```bash
npm run build
npm start
```

### 4. Switch Between Replay Mode & SSE Mode
DevPilot supports two event streams through a single interface:
- **Replay Mode (Default)**: Replays `/runs/mission_001/events.jsonl` with interactive delays.
- **SSE Mode**: Connects to an upstream Server-Sent Events backend at `http://localhost:8000/missions/{id}/events`.

To switch, set the environment variable:
```bash
# In .env.local
NEXT_PUBLIC_EVENT_SOURCE=replay # or 'sse'
```

---

## 🥋 Agent Roles & Visual Identities

| Agent | Role | Focus | Accent | Icon |
| :--- | :--- | :--- | :--- | :--- |
| **Shogun** | Planner & Strategist | High-level decomposition, acceptance criteria, task scheduling | Gold (`#F59E0B`) | 📜 Scroll / Crown |
| **Samurai** | Lead Coder | Code implementation, refactoring, patch generation, tool execution | Crimson (`#E11D48`) | ⚔️ Katana / Code |
| **Sentinel** | Tester & Verifier | Test execution, concurrency checks, regression suites, verification badges | Emerald (`#10B981`) | 🛡️ Shield / Verifier |
| **Shadow** | Reviewer & Security | AST security scans, hardcoded credential detection, vulnerability remediation | Purple (`#8B5CF6`) | 👁️ Eye / Security |
| **Orchestrator** | System Coordinator | State management, routing decisions, feedback loops, approval gating | Slate (`#94A3B8`) | ⚙️ System / Network |

---

## 🛡️ Critical Differentiator: Verified vs Claimed

DevPilot explicitly separates automated, empirical test results from theoretical model claims:

- **`✅ Verified`**: Attributed to real tool runs, unit tests, integration suites, and deterministic AST scans where `data.verified === true`.
- **`⚠️ Model claim`**: Theoretical assertions or estimations made by models without empirical execution proof.

In the final **Mission Done** card, outcomes are presented in two distinct columns: **Verified Outcomes** (green) vs **Model Claims** (amber).

---

## 📜 Event Contract (`src/types/events.ts`)

Every event in DevPilot implements the discriminated union:
```typescript
interface BaseEvent {
  id: number;
  ts: string; // ISO 8601 timestamp
  agent: 'shogun' | 'samurai' | 'sentinel' | 'shadow' | 'orchestrator';
}
```

### Supported Event Types:

1. **`mission_started`**: Initial mission objective, target repository, branch, and commit.
2. **`plan_created`**: Decomposed tasks and interactive acceptance criteria checklist.
3. **`tool_called`**: Invocation of a tool (e.g. `git_diff`, `file_write`, `vitest_run`) with arguments and intent (collapsible card).
4. **`tool_result`**: Monospace execution output, exit code, affected files, and verification badge.
5. **`test_failed`**: Test suite failure diagnostics, passed/failed counters, error snippets, and expandable stack traces.
6. **`test_passed`**: Verified test suite success with execution timing and assertion counts.
7. **`retry`**: Visible feedback loop indicator: `Retry 1/3 → routed to Samurai (reason: test failure)` with strategy adjustment notes.
8. **`review_finding`**: Security vulnerability alert with severity (`critical`, `high`, `medium`, `low`), file, line number, code evidence, and remediation routing back to Samurai.
9. **`finding_resolved`**: Proof of remediation and AST scan verification.
10. **`clarification_requested`**: Inline question from agents to human operator with suggestion chips and interactive response input.
11. **`approval_requested`**: Code change summary (+additions, -deletions), risk level, and interactive **[Approve & Merge]** / **[Reject]** buttons.
12. **`approval_granted`**: Human sign-off recording operator identity and audit notes.
13. **`approval_rejected`**: Rejection reason and routing back for revision.
14. **`mission_done`**: Final mission summary with duration, iterations, cost, and separate Verified Outcomes vs Model Claims tables.
15. **`mission_escalated`**: High-priority red banner indicating escalation to human after maximum retry attempts.

---

## 🔄 Real Feedback Loop Demonstrated in `mission_001`

The included replay run (`public/runs/mission_001/events.jsonl`) demonstrates a real-world engineering loop:
1. **Samurai** implements naive in-memory idempotency check in `src/api/webhook.ts`.
2. **Sentinel** runs concurrency tests with 20 parallel requests; tests **FAIL** due to multi-thread race condition.
3. **Orchestrator** triggers **Retry 1/3**, routing back to Samurai with strategy adjustment (atomic Redis `SETNX`).
4. **Samurai** refactors to use Redis distributed lock.
5. **Sentinel** re-verifies; all 4 concurrency tests **PASS**.
6. **Shadow** performs security scan and detects **CRITICAL** hardcoded Stripe secret in `src/config/stripe.ts` (`SEC-0842`).
7. **Shadow** routes issue back to Samurai for remediation.
8. **Samurai** replaces plaintext secret with `process.env.STRIPE_WEBHOOK_SECRET` and runtime guard.
9. **Shadow** verifies AST scan; marks finding **RESOLVED**.
10. **Sentinel** runs full regression test suite (12/12 pass in 840ms).
11. **Orchestrator** requests human code sign-off with diff summary.
12. Human approves via **[Approve & Merge]**.
13. **Mission Accomplished**: verified outcomes reported.

---

## 🖥️ Layout & Panels

### 1. Left Sidebar
- Past missions navigator with status indicators (Active, Completed, Escalated)
- `+ New Mission` button
- Replay Controller: Stream progress bar, Play, Pause, Step forward, Reset, and Speed multiplier (1x, 2x, 5x)
- Source mode toggle (Replay vs SSE)

### 2. Center Timeline
- Mission header with iteration count, branch info, and active agent badge
- Smooth auto-scrolling event stream (automatically pauses if user scrolls up; includes "Jump to latest" button)
- Typing / stream pulse indicator for the currently active agent
- Fixed bottom directive input for sending comments, commands, or answers to agents

### 3. Right Inspector Panel
- **[Diff]**: Unified diff viewer for `changes.diff` with additions, deletions, line numbers, and file headers.
- **[Terminal]**: Monospace stdout/stderr stream with copy button and filtering (All, Commands, Errors).
- **[Files]**: Interactive repository file explorer with modified line counters and verification badges.
- **[State]**: Live JSON view of mission state derived in real time via event reducer (tasks, findings, retries, counters).
- **[Agent Graph]**: Interactive ReactFlow canvas with 5 agent nodes, dynamic active aura glowing, and animated loop edges showing retry counters.
