# Member 4: FastAPI Server, Evaluation Benchmarks & Simulation Bridge

This module houses the central communication hub and evaluation harness for **DevPilot (PS-001)** — *The Mystic Mikado's Autonomous AI Engineering Guild*.

---

## 1. Responsibilities & Deliverables

| File / Directory | Mandate | Status |
| :--- | :--- | :--- |
| [`main.py`](file:///c:/Users/akhil/Desktop/Soya-Chaap/member4_server/main.py) | FastAPI REST & WebSocket `/ws/mission` streaming bridge, HITL approval gate, baseline comparator | ✅ Production-Ready |
| [`reqs_m4.txt`](file:///c:/Users/akhil/Desktop/Soya-Chaap/member4_server/reqs_m4.txt) | Member 4 dependencies (`fastapi`, `uvicorn`, `websockets`, `pydantic`, `pytest`) | ✅ Complete |
| [`seed_resetter.py`](file:///c:/Users/akhil/Desktop/Soya-Chaap/member4_server/seed_resetter.py) | Programmatic reset utility returning the 5 sandbox repos to seeded defect states | ✅ Complete |
| [`eval_runner.py`](file:///c:/Users/akhil/Desktop/Soya-Chaap/member4_server/eval_runner.py) | Headless CLI test harness evaluating all 5 scenarios and generating judge evidence logs | ✅ Complete |
| [`test_server.py`](file:///c:/Users/akhil/Desktop/Soya-Chaap/member4_server/test_server.py) | Pytest test suite testing all FastAPI server endpoints | ✅ 100% Passing |
| [`evidence_run_log.json`](file:///c:/Users/akhil/Desktop/Soya-Chaap/member4_server/evidence_run_log.json) | Empirical JSON run log documenting 5/5 scenario completions | ✅ Generated |
| [`sandbox_repos/`](file:///c:/Users/akhil/Desktop/Soya-Chaap/member4_server/sandbox_repos/) | 5 self-contained mini-repositories covering all PS-001 evaluation categories | ✅ Seeded & Tested |

---

## 2. The 5 Evaluation Scenarios

1. **`01_feature_impl` (Feature Addition & Non-Regression):**
   - *Target:* `string_utils.py` | *Test:* `test_utils.py`
   - *Task:* Implement `slugify(text: str) -> str` while preserving existing `truncate()` and `count_words()` behaviors.

2. **`02_bug_investigation` (Bug Diagnosis & Trace-Driven Repair):**
   - *Target:* `calculator.py` | *Test:* `test_calculator.py`
   - *Task:* Fix off-by-one boundary bug in `calculate_moving_average` using pytest `AssertionError` trace.

3. **`03_test_driven_recovery` (Test-Driven Recovery from Failing Stubs):**
   - *Target:* `token_auth.py` | *Test:* `test_token_auth.py`
   - *Task:* Implement `validate_token` satisfying Bearer hexadecimal protocol with minimum 12-char length.

4. **`04_security_code_review` (Security Auditing & Secret Interception):**
   - *Target:* `db_service.py` | *Test:* `test_db_service.py`
   - *Task:* Shadow Council intercepts hardcoded AWS key and raw SQL injection; enforces safe environment variables and parameterized queries.

5. **`05_unexpected_conditions` (Unexpected Conditions & Bounded Autonomy):**
   - *Target:* `remote_sync.py` | *Test:* `test_remote_sync.py`
   - *Task:* Gracefully handle unreachable host (`192.0.2.1:9999`) with fallback payload without infinite loops.

---

## 3. Running & Verifying Member 4

### Run the FastAPI Mission Control Server:
```bash
python -m uvicorn member4_server.main:app --host 0.0.0.0 --port 8000 --reload
```
- Swagger UI: `http://localhost:8000/docs`
- WebSocket: `ws://localhost:8000/ws/mission`

### Run the Headless Evaluation Suite:
```bash
python member4_server/eval_runner.py
```

### Run Server Endpoint Unit Tests:
```bash
python -m pytest member4_server/test_server.py -v
```

### Reset All Repos to Seeded Defect State:
```bash
python member4_server/seed_resetter.py
```

