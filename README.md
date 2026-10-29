# DevPilot (PS-001) — The Mystic Mikado's Autonomous AI Engineering Guild

> *"Plan like a Shogun. Build like a Samurai. Test like a Sentinel. Adapt until the mission is complete."*

[![Python](https://img.shields.io/badge/Python-3.10%2B-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115%2B-009688.svg)](https://fastapi.tiangolo.com/)
[![WebSockets](https://img.shields.io/badge/WebSockets-Real--Time%20Stream-orange.svg)](https://websockets.readthedocs.io/)
[![Pytest](https://img.shields.io/badge/Testing-Pytest%20Evidence-green.svg)](https://docs.pytest.org/)
[![Security](https://img.shields.io/badge/Security-Shadow%20Council%20Audited-red.svg)](#security-model--bounded-autonomy)
[![State Machine](https://img.shields.io/badge/State%20Machine-LangGraph%20HITL-purple.svg)](#master-architecture--the-langgraph-state-machine)

---

## 1. System Overview & Philosophy

**DevPilot** is an autonomous multi-agent software engineering guild engineered to solve **Problem Statement PS-001**. 
Unlike traditional sequential chatbot chains (Prompt 1 &rarr; Prompt 2 &rarr; Output), DevPilot is an **event-driven, cyclic state machine with parallel execution, evidence-based verification, and bounded autonomy**. 

DevPilot operates inside target repositories through a specialized guild of autonomous agent personas inspired by Feudal Japan:

| Agent Persona | Role & Mandate | Key Tools & Deliverables |
| :--- | :--- | :--- |
| **🏯 The Shogun's Council** | *Strategic Planning & Architecture* | Explores repo structure, defines explicit acceptance criteria, decomposes requests into tasks, and dynamically replans upon encountering blockers. |
| **⚔️ The Samurai Forge** | *Implementation & Tool Execution* | Reads source code, performs targeted edits matching existing conventions, and operates within path-jailed workspaces. |
| **🛡️ The Sentinel Dojo** | *Automated Testing & Independent Verification* | Automatically runs `pytest` test suites, parses failure traces, and independently verifies code modifications against acceptance criteria. |
| **🥷 The Shadow Council** | *Security Audit & Code Critique* | Scans diffs for exposed secrets (e.g., AWS keys), injection vulnerabilities (e.g., SQLi), and issues actionable critiques back to the Samurai. |
| **👑 The Human Daimyo** | *Human-in-the-Loop (HITL) Gate* | Pauses execution before merging changes, allowing human operators to review unified diffs, test logs, and security verdicts. |

---

## 2. Master Architecture & The LangGraph State Machine

DevPilot models the software development lifecycle as an asynchronous, cyclic directed acyclic graph (DAG) with **parallel fan-out/fan-in** and **interrupt-based human oversight**:

```text
                               [ User Request ]
                                      │
                                      ▼
                       ┌──────────────────────────────┐
                       │  1. Shogun Council (Planner) │◄──────────────────────┐
                       └──────────────┬───────────────┘                       │
                                      ▼                                       │
                       ┌──────────────────────────────┐                       │
                       │   2. Samurai Forge (Coder)   │                       │
                       └──────────────┬───────────────┘                       │
                                      │ (Parallel Fan-Out)                    │
                  ┌───────────────────┼───────────────────┐                   │
                  ▼                   ▼                   ▼                   │
         ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐          │
         │   3. Sentinel   │ │   4. Sentinel   │ │ 5. Shadow       │          │
         │  Automated Test │ │   Independent   │ │ Council (Review │          │
         │    (pytest)     │ │    Verifier     │ │  & Security)    │          │
         └────────┬────────┘ └────────┬────────┘ └────────┬────────┘          │
                  └───────────────────┼───────────────────┘                   │
                                      │ (Parallel Fan-In)                     │
                                      ▼                                       │
                       ┌──────────────────────────────┐                       │
                       │    Evaluation Router Node    │───────────────────────┘
                       └──────────────┬───────────────┘ (If tests or security FAIL
                                      │                  & iteration_count < max)
                                      ▼ (All Tests & Security PASSED)
                       ┌──────────────────────────────┐
                       │   Human Approval Gate (HITL) │ (Interrupt: Pauses before merge)
                       └──────────────┬───────────────┘
                                      │
                     ┌────────────────┴────────────────┐
                     ▼                                 ▼
           [ Daimyo: APPROVED ]              [ Daimyo: REJECTED ]
                     │                                 │
                     ▼                                 ▼
            { Commit & Merge }                { Revert & Rollback }
```

### State Machine Lifecycle
1. **Reconnaissance & Planning:** The Shogun inspects the codebase, extracts acceptance criteria, and generates structured subtasks.
2. **Implementation:** The Samurai modifies target files in the sandbox.
3. **Parallel Verification Fan-Out:**
   - **Sentinel Test:** Executes `pytest` in a sandboxed subprocess and captures exact failure traces.
   - **Sentinel Verifier:** Evaluates whether explicit acceptance criteria are satisfied with empirical proof.
   - **Shadow Council:** Scans diffs and ASTs for credentials, SQL injection, and architectural regressions.
4. **Parallel Fan-In & Feedback Evaluation:** If tests or security checks fail and `iteration_count < max_iterations`, the system routes back to the Shogun for trace-driven replanning.
5. **Human Approval Gate:** Once all automated checks pass, execution pauses at an interrupt checkpoint. The human operator inspects the proposed diff, test logs, and security report to approve or revert.

---

## 3. The 5 Controlled Evaluation Repositories

Member 4 provides **5 complete, self-contained mini-repositories** located in [`member4_server/sandbox_repos/`](file:///c:/Users/HP/OneDrive/Desktop/member_4_pecathon/Soya-Chaap/member4_server/sandbox_repos/):

```text
member4_server/sandbox_repos/
├── 01_feature_impl/           # Feature Implementation & Non-Regression
│   ├── string_utils.py        # Contains truncate() and count_words()
│   └── test_utils.py          # Unit tests asserting existing utilities
├── 02_bug_investigation/      # Bug Investigation & Trace-Driven Repair
│   ├── calculator.py          # Seeded off-by-one window bug in calculate_moving_average()
│   └── test_calculator.py     # Failing pytest trace catching dropped final window
├── 03_test_driven_recovery/   # Test-Driven Recovery
│   ├── token_auth.py          # Broken stub returning False
│   └── test_token_auth.py     # Suite expecting BEARER-<hex_string> protocol of length >= 12
├── 04_security_code_review/   # Security Review & Secret Interception
│   ├── db_service.py          # Planted AWS secret key & raw SQL string interpolation
│   └── test_db_service.py     # Functional test suite
└── 05_unexpected_conditions/  # Unexpected Conditions & Bounded Autonomy
    ├── remote_sync.py         # Network call to unreachable host (192.0.2.1:9999)
    └── test_remote_sync.py    # Test expecting graceful degradation fallback payload
```

### Scenario Breakdown & Verification Matrix

| Scenario | Objective | Planted Defect / Seed | Automated Resolution Verification |
| :--- | :--- | :--- | :--- |
| **01 Feature Impl** | Implement `slugify(text)` and add tests without breaking existing functions. | Missing `slugify` feature. | Sentinel executes pytest: confirms `truncate`, `count_words`, and `slugify` all pass (9/9 passed). |
| **02 Bug Investigation** | Diagnose and repair seeded off-by-one error. | `range(len(values) - window_size)` drops final moving average window. | Sentinel captures `AssertionError: [15.0, 25.0] == [15.0, 25.0, 35.0]`; Samurai fixes loop boundary to `+ 1`; 100% tests pass. |
| **03 Test-Driven Recovery** | Reconstruct token validator from failing tests. | `validate_token(token: str) -> bool: return False`. | Samurai builds validation engine checking `BEARER-` prefix, hex payload, and length >= 12; all 5 tests pass. |
| **04 Security Review** | Intercept hardcoded secret and SQL injection; enforce secure remediation. | Hardcoded `AWS_SECRET_KEY = "AKIA..."` and `f"SELECT ... WHERE id = '{account_id}'"`. | Shadow Council intercepts both vulnerabilities and rejects diff; Samurai remediates via `os.getenv` and parameterized queries. |
| **05 Unexpected Conditions** | Prevent infinite loops when contacting an unreachable external server. | Network call to RFC 5737 unroutable IP `192.0.2.1:9999` raises connection timeout. | System honors `max_iterations`, avoids recursion, and deploys graceful fallback returning `{"synced": False, "reason": "unreachable"}`. |

---

## 4. Security Model & Bounded Autonomy

DevPilot strictly enforces multi-layered defense to safeguard host environments:

### 1. Path-Traversal Jailing
- File reading, editing, and command execution tools are jailed to the target repository directory.
- Attempts to access parent directories via relative paths (`../../`) or symlinks outside the repository root raise security exceptions.

### 2. Shell Command Allowlisting & Blocklisting
- Prohibits destructive commands (`rm -rf`, `mkfs`, fork bombs, unauthorized package managers).
- Commands execute with enforced timeouts (15 seconds default) to eliminate hung child processes.

### 3. Automated Secret & AST Security Scanners
- Regular expression and AST analysis detect high-entropy keys, AWS access keys (`AKIA[0-9A-Z]{16}`), API tokens, and private keys.
- SQL queries are scrutinized for dynamic string formatting and unparameterized concatenation.

### 4. Bounded Autonomy & Anti-Recursion
- Every mission specifies `max_iterations` (default: 3).
- If self-correction cycles do not achieve passing tests within the iteration limit, the system gracefully terminates with an escalation summary rather than cycling indefinitely.

---

## 5. Baseline Benchmark: Multi-Agent Guild vs. Single-Agent LLM

*(Evaluated via `POST /api/baseline/compare`)*

| Metric / Capability | Single Blind LLM (Chatbot Baseline) | DevPilot Multi-Agent Guild |
| :--- | :--- | :--- |
| **Execution Pattern** | Linear zero-shot prompt with zero tools | Cyclic LangGraph DAG with parallel execution |
| **Test Verification** | ❌ No test execution; relies on hallucinated assumptions | ✅ Runs real `pytest` in sandboxed subprocess |
| **Bug Diagnosis** | ❌ Guesses bug location without failure trace | ✅ Captures exact `AssertionError` and traces |
| **Security Audit** | ❌ Blindly copies/preserves secrets and unsafe SQL | ✅ Shadow Council intercepts secrets and SQLi |
| **Human Oversight** | ❌ Commits directly or dumps raw text | ✅ Interrupt gate requiring explicit Daimyo approval |
| **Failure Handling** | ❌ Fails silently or crashes | ✅ Bounded iterations with fallback degradation |

---

## 6. Quickstart & Installation

### Prerequisites
- Python 3.10+ (Tested on Python 3.10, 3.11, 3.12, 3.14)
- Git

### 1. Installation

#### Windows (PowerShell)
```powershell
# Navigate to repository root
cd c:\Users\HP\OneDrive\Desktop\member_4_pecathon\Soya-Chaap

# Install Member 4 dependencies
python -m pip install -r member4_server/reqs_m4.txt
```

#### macOS / Linux (Bash)
```bash
# Navigate to repository root
cd Soya-Chaap

# Install Member 4 dependencies
pip install -r member4_server/reqs_m4.txt
```

---

### 2. Running the Headless Evaluation Suite

Run all 5 evaluation scenarios in sequence from the command line:

```bash
python member4_server/eval_runner.py
```

To run a specific scenario:
```bash
python member4_server/eval_runner.py --scenario 02_bug_investigation
```

To run all scenarios and reset the sandboxes back to their initial seeded states:
```bash
python member4_server/eval_runner.py --reset
```

The runner automatically generates [`member4_server/evidence_run_log.json`](file:///c:/Users/HP/OneDrive/Desktop/member_4_pecathon/Soya-Chaap/member4_server/evidence_run_log.json) containing structured execution traces, test outcomes, diffs, and security verdicts.

---

### 3. Starting the FastAPI Mission Control Server

Launch the FastAPI server and WebSocket bridge on port `8000`:

```bash
python -m uvicorn member4_server.main:app --host 0.0.0.0 --port 8000 --reload
```

- **Interactive Swagger UI:** [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc Documentation:** [http://localhost:8000/redoc](http://localhost:8000/redoc)
- **WebSocket Stream:** `ws://localhost:8000/ws/mission`

---

## 7. API Reference & WebSocket Streaming Protocol

### HTTP Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Service health status. |
| `GET` | `/api/scenarios` | Lists all 5 evaluation scenarios with objectives and metadata. |
| `POST` | `/api/mission/start` | Initiates an autonomous mission. Accepts `{"scenario_name": str, "user_request": str, "max_iterations": int}`. |
| `POST` | `/api/mission/approve` | Human Daimyo approval gate. Accepts `{"decision": "approved" \| "rejected", "feedback": str}`. |
| `POST` | `/api/baseline/compare` | Compares single-agent LLM output against DevPilot multi-agent verified outcome. |
| `GET` | `/api/mission/status` | Current active mission status, iteration count, diff preview, and test results. |
| `GET` | `/api/mission/export-log` | Exports complete chronological JSON audit history of all mission events. |
| `POST` | `/api/mission/reset` | Resets sandbox repositories back to initial seeded defect states. |

### WebSocket Real-Time Event Protocol (`/ws/mission`)

Connect to `ws://localhost:8000/ws/mission` to receive live streaming agent events:

```json
{
  "event": "EVENT_TYPE",
  "data": { ... },
  "timestamp": "2026-10-30T00:15:00.000000Z"
}
```

#### Event Catalog
- `MISSION_STARTED`: Broadcasts scenario name, target repo path, and user request.
- `NODE_STARTED`: Broadcasts the active node (`Shogun_Council`, `Samurai_Forge`, `Sentinel_Dojo_Test`, `Sentinel_Independent_Verifier`, `Shadow_Council`).
- `NODE_COMPLETED`: Broadcasts task completion summary, acceptance criteria, or security report.
- `DIFF_UPDATED`: Broadcasts live unified diff and list of modified files.
- `TEST_OUTPUT`: Broadcasts `pytest` command, exit code, stdout, stderr, and pass/fail boolean.
- `CRITIQUE_RECEIVED`: Broadcasts Shadow Council findings, security status, and review verdicts.
- `AWAITING_HUMAN_APPROVAL`: Pauses mission workflow and presents unified diff and test summary for human approval.
- `MISSION_COMPLETED`: Broadcasts final completion status (`merged` or `aborted`).

---

## 8. Repository Layout & Team Isolation Rules

```text
Soya-Chaap/
├── README.md                      # [Member 4] Master Architecture & Documentation
├── shared_contract.py             # Root Shared Contract: MissionState & TaskItem schemas (READ-ONLY)
│
├── member1_orchestrator/          # [Member 1] Shogun, Samurai, LangGraph graph, HITL checkpointer
│   └── __init__.py
│
├── member2_shield/                # [Member 2] Path-jailed tools, Sentinel Tester/Verifier, Shadow Council
│   └── __init__.py
│
├── member3_frontend/              # [Member 3] React War Room, Live DAG, Terminal Stream, Diff Approval Modal
│
└── member4_server/                # [Member 4] Server Bridge, Seed Sandboxes, Eval Runner, Benchmarks
    ├── __init__.py
    ├── reqs_m4.txt                # Member 4 dependencies
    ├── main.py                    # FastAPI server & WebSocket bridge
    ├── seed_resetter.py           # Seeded defect reset engine
    ├── eval_runner.py             # Headless CLI evaluation runner
    ├── test_server.py             # Pytest suite for FastAPI endpoints
    ├── evidence_run_log.json      # Generated evidence log for all 5 scenarios
    └── sandbox_repos/             # The 5 evaluation mini-repositories
        ├── 01_feature_impl/
        ├── 02_bug_investigation/
        ├── 03_test_driven_recovery/
        ├── 04_security_code_review/
        └── 05_unexpected_conditions/
```

---

## 9. Verification & Quality Assurance Summary

To verify the complete Member 4 subsystem:

```bash
# 1. Run all Member 4 server endpoint tests
python -m pytest member4_server/test_server.py -v

# 2. Run all 5 autonomous evaluation scenarios
python member4_server/eval_runner.py

# 3. Inspect generated evidence log
cat member4_server/evidence_run_log.json
```

All 5 evaluation scenarios execute with **100% passing results**, verified bug remediation, automated secret interception, and full test evidence logs.