"""
Member 2 Shield: Sentinel Dojo
Full production implementation matching PECathon PS-001 requirements:

1. Automatic Environment Loading:
   - Loads dotenv at import time so GEMINI_API_KEY / GOOGLE_API_KEY are always available.

2. Heterogeneous Model Assignment:
   - Sentinel Dojo uses SENTINEL_MODEL (default: "gemini-2.5-flash") with temperature=0.0
     for strict, zero-hallucination empirical evidence verification.
   - Logs active model and verification engine in agent_logs.

3. Sentinel Tester Node (sentinel_tester_node):
   - Executes pytest -v inside state["repo_path"] via run_sandboxed_command.
   - Parses stdout/stderr for exact test failures, assertion errors, and stack traces.
   - Separates stdout into passed_tests_count and failed_tests_count.
   - Updates state["test_results"] with: passed: bool, output: str, command: str,
     passed_count: int, failed_count: int.
   - Appends clear diagnostic failure messages to findings_and_issues so Samurai knows
     the exact failing assertions.

4. Sentinel Verifier Node (sentinel_verifier_node):
   - Independent QA verifier comparing terminal test output and git_diff against each item
     in state["acceptance_criteria"].
   - Enforces the core PS-001 rule: Never claim success without real evidence.
   - If an acceptance criterion claims a feature was added, but git_diff contains no
     corresponding logic or no passing test exists, marks verification_passed = False
     and adds "UNVERIFIED CLAIM: [criterion]" to findings_and_issues.
"""

# 1. Automatic Environment Loading
try:
    import dotenv
    dotenv.load_dotenv()
except ImportError:
    pass

from datetime import datetime, timezone
import json
import os
from pathlib import Path
import re
import sys
import tempfile
from typing import Any, Dict, List, Optional, Tuple

# Ensure repository root is on sys.path for cross-module imports
_REPO_ROOT = Path(__file__).resolve().parent.parent
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

# Safe import of shared contract with standalone fallback
try:
    from shared_contract import MissionState, TaskItem
except ImportError:
    import operator
    from typing import Annotated, TypedDict

    class TaskItem(TypedDict):
        id: str
        description: str
        target_files: List[str]
        status: str

    class MissionState(TypedDict):
        user_request: str
        repo_path: str
        acceptance_criteria: List[str]
        tasks: List[TaskItem]
        agent_logs: Annotated[List[Dict[str, Any]], operator.add]
        findings_and_issues: Annotated[List[str], operator.add]
        git_diff: str
        test_results: Dict[str, Any]
        verification_passed: bool
        security_passed: bool
        review_passed: bool
        iteration_count: int
        max_iterations: int
        human_approved: bool

# Import shell tools
try:
    from member2_shield.shell_tools import run_sandboxed_command
except ImportError:
    from shell_tools import run_sandboxed_command


def parse_test_counts(output: str, exit_code: int = 0) -> Tuple[int, int]:
    """
    Parses test execution stdout/stderr to extract counts of passed and failed tests.
    Supports both pytest summary format and unittest output format.
    Returns (passed_count, failed_count).
    """
    if not output or not output.strip():
        return (0, 1 if exit_code != 0 else 0)

    passed_count = 0
    failed_count = 0

    # 1. Check pytest summary line: e.g. "=== 1 failed, 2 passed in 0.12s ===" or "=== 4 passed in 0.05s ==="
    summary_match = re.search(r"=+\s*(.*?)\s+in\s+[\d\.]+s\s*=+", output)
    if summary_match:
        summary_text = summary_match.group(1)
        pass_m = re.search(r"(\d+)\s+passed", summary_text)
        if pass_m:
            passed_count = int(pass_m.group(1))
        fail_m = re.search(r"(\d+)\s+failed", summary_text)
        if fail_m:
            failed_count += int(fail_m.group(1))
        err_m = re.search(r"(\d+)\s+error", summary_text)
        if err_m:
            failed_count += int(err_m.group(1))

    # 2. Count individual pytest verbose status markers: e.g. "test_pass.py::test_ok PASSED"
    if passed_count == 0 and failed_count == 0:
        passed_markers = re.findall(r"::\S+\s+PASSED", output)
        failed_markers = re.findall(r"::\S+\s+(?:FAILED|ERROR)", output)
        if passed_markers or failed_markers:
            passed_count = len(passed_markers)
            failed_count = len(failed_markers)

    # 3. Check unittest output: e.g. "Ran 3 tests ... FAILED (failures=1, errors=1)" or "OK"
    if passed_count == 0 and failed_count == 0:
        ran_m = re.search(r"Ran\s+(\d+)\s+tests?", output)
        if ran_m:
            total = int(ran_m.group(1))
            failures_m = re.search(r"failures=(\d+)", output)
            errors_m = re.search(r"errors=(\d+)", output)
            n_fail = int(failures_m.group(1)) if failures_m else 0
            n_err = int(errors_m.group(1)) if errors_m else 0
            failed_count = n_fail + n_err
            passed_count = max(0, total - failed_count)

    # If test failed by exit code but zero failures were parsed, count as at least 1 failure
    if exit_code != 0 and failed_count == 0:
        failed_count = 1

    return passed_count, failed_count


def parse_pytest_failures(output: str) -> List[str]:
    """
    Parse pytest stdout/stderr to extract detailed, actionable failure diagnostics,
    including failed test names, assertion messages, failing code lines, and stack traces.
    """
    if not output or not output.strip():
        return ["Test execution produced no output or terminated abruptly."]

    failures: List[str] = []

    # 1. Parse individual failure blocks under '=== FAILURES ==='
    failure_blocks = re.findall(
        r"_{3,}\s+([^\n_]+)\s+_{3,}\n(.*?)(?=\n_{3,}|\n={3,}|\Z)",
        output,
        re.DOTALL,
    )

    if failure_blocks:
        for raw_test_name, block in failure_blocks:
            test_name = raw_test_name.strip()
            # Extract error lines starting with 'E '
            error_lines = [
                l.strip()[2:].strip() for l in block.splitlines() if l.strip().startswith("E ")
            ]
            # Extract source lines causing failure starting with '> '
            code_lines = [
                l.strip()[2:].strip() for l in block.splitlines() if l.strip().startswith("> ")
            ]

            error_summary = "; ".join(error_lines) if error_lines else "Test failed with unhandled exception"
            code_ctx = f" (Failing line: `{code_lines[0]}`)" if code_lines else ""
            failures.append(f"TEST FAILURE [{test_name}]: {error_summary}{code_ctx}")

    # 2. Parse short test summary info if failure blocks were not matched
    if not failures:
        short_summary_matches = re.findall(r"^FAILED\s+([^\n]+)", output, re.MULTILINE)
        for match in short_summary_matches:
            failures.append(f"TEST FAILURE: {match.strip()}")

    # 3. Detect module errors, syntax errors, or uncaught tracebacks
    if not failures:
        error_match = re.search(r"([A-Za-z]+Error:[^\n]+)", output)
        if error_match:
            failures.append(f"TEST RUNTIME ERROR: {error_match.group(1).strip()}")
        else:
            tail_lines = [l.strip() for l in output.splitlines() if l.strip()][-3:]
            failures.append(f"TEST EXECUTION FAILED: {' | '.join(tail_lines)}")

    return failures


def sentinel_tester_node(state: MissionState) -> Dict[str, Any]:
    """
    Sentinel Tester Node:
    Runs pytest -v inside state["repo_path"] using run_sandboxed_command.
    Parses exact test failures, assertion errors, and stack traces.
    Separates stdout into passed_tests_count and failed_tests_count.
    Updates test_results with: passed, output, command, passed_count, failed_count.
    Appends failure summaries to findings_and_issues, and returns a structured agent_logs entry.

    Returns:
        Partial state dict for LangGraph:
        - "test_results": {
            "passed": bool,
            "output": str,
            "command": str,
            "passed_count": int,
            "failed_count": int,
          }
        - "findings_and_issues": List[str] (new failure diagnostics if tests failed)
        - "agent_logs": [structured_log_dict]
    """
    repo_path = state.get("repo_path", ".")
    real_repo = os.path.realpath(repo_path)

    # Execute pytest suite with sandboxing
    command = ["pytest", "-v"]
    test_result = run_sandboxed_command(real_repo, command, timeout=25)

    # Fallback to python unittest if pytest reports no tests collected
    if not test_result.get("passed") and "no tests ran" in test_result.get("output", "").lower():
        fallback_cmd = [sys.executable, "-m", "unittest", "discover", "-s", ".", "-p", "test*.py"]
        fallback_res = run_sandboxed_command(real_repo, fallback_cmd, timeout=25)
        if fallback_res.get("passed") or fallback_res.get("exit_code") == 0:
            test_result = fallback_res
            command = fallback_cmd

    passed = bool(test_result.get("passed", False))
    test_output = test_result.get("output", "") or ""
    exit_code = test_result.get("exit_code", 0 if passed else 1)
    cmd_str = " ".join(command) if isinstance(command, list) else str(command)

    # Separate stdout/stderr into passed_count and failed_count
    passed_count, failed_count = parse_test_counts(test_output, exit_code=exit_code)

    # If command succeeded, ensure failed_count is 0 and at least 1 test passed
    if passed and failed_count == 0 and passed_count == 0:
        passed_count = 1

    # Parse detailed test failures for the Samurai feedback loop
    new_findings: List[str] = []
    if not passed:
        new_findings = parse_pytest_failures(test_output)

    status_str = "passed" if passed else "failed"
    details_str = (
        f"Automated test suite '{cmd_str}' passed ({passed_count} passed, 0 failed)."
        if passed
        else f"Automated test suite '{cmd_str}' failed ({passed_count} passed, {failed_count} failed) "
        f"with {len(new_findings)} diagnostic finding(s): " + "; ".join(new_findings)[:400]
    )

    details_dict = {
        "command": cmd_str,
        "passed_count": passed_count,
        "failed_count": failed_count,
        "exit_code": exit_code,
        "summary": details_str,
    }

    log_entry = {
        "agent": "sentinel_tester",
        "status": status_str,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "message": details_str,
        "details": details_dict,
        "command": cmd_str,
        "exit_code": exit_code,
        "passed_count": passed_count,
        "failed_count": failed_count,
    }

    return {
        "test_results": {
            "passed": passed,
            "output": test_output,
            "command": cmd_str,
            "passed_count": passed_count,
            "failed_count": failed_count,
        },
        "findings_and_issues": new_findings,
        "agent_logs": [log_entry],
    }


def _verify_with_llm(
    criteria: List[str],
    git_diff: str,
    test_results: Dict[str, Any],
) -> Optional[Dict[str, Any]]:
    """
    Uses LangChain Google GenAI (ChatGoogleGenerativeAI) with SENTINEL_MODEL (default: gemini-2.5-flash)
    at temperature=0.0 to objectively verify each acceptance criterion against git_diff and test_results.
    Enforces the core rule: Never claim success without real evidence.
    """
    api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if not api_key:
        return None

    try:
        from langchain_google_genai import ChatGoogleGenerativeAI
        from langchain_core.messages import SystemMessage, HumanMessage

        model_name = os.environ.get("SENTINEL_MODEL", os.environ.get("DEFAULT_MODEL", "gemini-2.5-flash"))
        temperature = float(os.environ.get("SENTINEL_TEMPERATURE", 0.0))
        llm = ChatGoogleGenerativeAI(
            model=model_name,
            temperature=temperature,
            api_key=api_key,
        )

        system_prompt = (
            "You are Sentinel Verifier, an independent Quality Assurance auditor in an autonomous engineering guild.\n"
            "Core Principle: NEVER CLAIM SUCCESS WITHOUT REAL EVIDENCE.\n\n"
            "Your task is to independently evaluate whether EVERY item in the acceptance criteria is verified "
            "based strictly on:\n"
            "1. The git diff showing actual code implementation.\n"
            "2. The test results showing passing automated test execution.\n\n"
            "Strict Evaluation Rules:\n"
            "- If an acceptance criterion claims a feature was added, modified, or fixed, there MUST be concrete "
            "corresponding logic in the git diff AND a passing test in the test results. If either is missing, "
            "mark verification_passed = false and record 'UNVERIFIED CLAIM: [<criterion>] - <reason>'.\n"
            "- If automated tests failed, any criterion requiring verified functionality or test stability MUST be marked FAILED.\n"
            "- Never extrapolate or assume. If evidence is missing, mark the criterion unverified.\n\n"
            "Output valid JSON ONLY with this exact schema:\n"
            "{\n"
            '  "verification_passed": true/false,\n'
            '  "evaluations": [\n'
            '    {"criterion": "...", "status": "PASSED"|"FAILED", "evidence": "...", "issue": "..."}\n'
            "  ],\n"
            '  "unmet_criteria": ["UNVERIFIED CLAIM: [<criterion>] - <specific missing evidence or test failure>"]\n'
            "}"
        )

        user_content = (
            f"Acceptance Criteria:\n{json.dumps(criteria, indent=2)}\n\n"
            f"Git Diff:\n{git_diff[:8000] if git_diff else 'No git diff provided.'}\n\n"
            f"Test Results:\n"
            f"Passed: {test_results.get('passed', False)}\n"
            f"Passed Count: {test_results.get('passed_count', 0)}\n"
            f"Failed Count: {test_results.get('failed_count', 0)}\n"
            f"Command: {test_results.get('command', 'pytest -v')}\n"
            f"Output:\n{test_results.get('output', '')[:4000]}"
        )

        response = llm.invoke([SystemMessage(content=system_prompt), HumanMessage(content=user_content)])
        raw_text = response.content if hasattr(response, "content") else str(response)

        # Extract JSON from potential markdown code fence
        json_match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", raw_text, re.DOTALL)
        if json_match:
            raw_text = json_match.group(1)

        data = json.loads(raw_text)
        if "verification_passed" in data and ("unmet_criteria" in data or "evaluations" in data):
            unmet = data.get("unmet_criteria", [])
            if not unmet and not data.get("verification_passed", False):
                for ev in data.get("evaluations", []):
                    if ev.get("status") == "FAILED":
                        crit = ev.get("criterion", "Unknown")
                        issue = ev.get("issue", "Evidence missing in diff or tests")
                        unmet.append(f"UNVERIFIED CLAIM: [{crit}] - {issue}")
            # Ensure proper UNVERIFIED CLAIM: prefix
            formatted_unmet = []
            for item in unmet:
                if not item.startswith("UNVERIFIED CLAIM:"):
                    formatted_unmet.append(f"UNVERIFIED CLAIM: {item}")
                else:
                    formatted_unmet.append(item)
            return {
                "verification_passed": bool(data.get("verification_passed", False)),
                "unmet_criteria": formatted_unmet,
                "verifier_engine": "llm",
                "model": model_name,
            }
    except Exception:
        return None

    return None


def _verify_with_heuristics(
    criteria: List[str],
    git_diff: str,
    test_results: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Deterministic verification engine enforcing: Never claim success without real evidence.
    Inspects terminal test output and git_diff against each item in acceptance_criteria.
    If an acceptance criterion claims a feature was added, but git_diff contains no
    corresponding logic or no passing test exists, marks verification_passed = False
    and records 'UNVERIFIED CLAIM: [criterion]'.
    """
    unmet: List[str] = []
    tests_passed = bool(test_results.get("passed", False))
    test_output = test_results.get("output", "")
    diff_lower = git_diff.lower() if git_diff else ""
    has_diff = bool(git_diff and git_diff.strip())

    for criterion in criteria:
        crit_lower = criterion.lower()

        # Categorize criterion
        is_test_criterion = any(w in crit_lower for w in ("test", "pass", "pytest", "spec", "coverage", "suite"))
        is_impl_criterion = any(
            w in crit_lower
            for w in (
                "implement", "add", "create", "modify", "fix", "feature", "function",
                "class", "method", "endpoint", "support", "logic", "handler", "service",
            )
        )

        # 1. Pure test satisfaction criterion (e.g. "Ensure all tests pass", "Pass test suite")
        if is_test_criterion and not is_impl_criterion:
            if not tests_passed:
                unmet.append(
                    f"UNVERIFIED CLAIM: [{criterion}] - Automated test suite failed to pass cleanly."
                )
            continue

        # 2. Feature / Implementation criterion: requires both corresponding logic in git_diff AND passing tests
        # Extract meaningful tokens/symbols from criterion
        tokens = re.findall(r"['\"`]?([a-zA-Z0-9_]{3,})['\"`]?", criterion)
        meaningful_tokens = [
            t.lower() for t in tokens
            if t.lower() not in {
                "the", "and", "for", "with", "must", "should", "return", "test", "when",
                "that", "all", "ensure", "passes", "pass", "suite", "implement", "function",
                "create", "add", "feature", "code", "file", "using", "from"
            }
        ]

        # Check for passing test existence
        if not tests_passed:
            unmet.append(
                f"UNVERIFIED CLAIM: [{criterion}] - Feature claim unverified because no passing test suite exists."
            )
            continue

        # Check for corresponding logic in git_diff
        if not has_diff:
            unmet.append(
                f"UNVERIFIED CLAIM: [{criterion}] - Feature claimed but git_diff contains no code modifications."
            )
            continue

        if meaningful_tokens:
            token_matches = [
                t for t in meaningful_tokens
                if t in diff_lower or t in test_output.lower()
            ]
            if not token_matches:
                unmet.append(
                    f"UNVERIFIED CLAIM: [{criterion}] - Feature claimed but git_diff contains no corresponding logic or symbols."
                )

    verification_passed = (len(unmet) == 0)
    return {
        "verification_passed": verification_passed,
        "unmet_criteria": unmet,
        "verifier_engine": "deterministic_heuristic_fallback",
        "model": None,
    }


def sentinel_verifier_node(state: MissionState) -> Dict[str, Any]:
    """
    Sentinel Verifier Node:
    Acts as an independent verifier comparing git_diff and test_results against
    state["acceptance_criteria"]. Enforces: Never claim success without real evidence.

    Configured with SENTINEL_MODEL (default: "gemini-2.5-flash", temperature=0.0).
    Logs active model and verifier details in agent_logs.

    If an acceptance criterion claims a feature was added, but git_diff contains no
    corresponding logic or no passing test exists, marks verification_passed = False
    and adds 'UNVERIFIED CLAIM: [criterion]' to findings_and_issues.

    Returns:
        Partial state dict for LangGraph:
        - "verification_passed": bool
        - "findings_and_issues": List[str] (newly discovered unverified claims only)
        - "agent_logs": [structured_audit_log_dict]
    """
    criteria = state.get("acceptance_criteria", [])
    git_diff = state.get("git_diff", "")
    test_results = state.get("test_results", {})

    active_model = os.environ.get("SENTINEL_MODEL", os.environ.get("DEFAULT_MODEL", "gemini-2.5-flash"))
    verification_data: Dict[str, Any] = {}

    if not criteria:
        # If no criteria provided, require passing tests and positive diff
        tests_passed = bool(test_results.get("passed", False))
        has_diff = bool(git_diff and git_diff.strip())
        verification_passed = tests_passed and has_diff
        unmet_criteria: List[str] = []
        if not tests_passed:
            unmet_criteria.append("UNVERIFIED CLAIM: [Automated Tests] - Test suite failed.")
        if not has_diff:
            unmet_criteria.append("UNVERIFIED CLAIM: [Code Changes] - No code modifications found in git diff.")
        verification_data = {
            "verification_passed": verification_passed,
            "unmet_criteria": unmet_criteria,
            "verifier_engine": "deterministic_heuristic_fallback",
            "model": None,
        }
    else:
        # 1. Try LLM independent verification (Gemini 2.5 Flash at temperature=0.0)
        llm_res = _verify_with_llm(criteria, git_diff, test_results)

        # 2. Fall back to deterministic heuristic verification if LLM is unavailable
        if llm_res is not None:
            verification_data = llm_res
        else:
            verification_data = _verify_with_heuristics(criteria, git_diff, test_results)

        verification_passed = bool(verification_data.get("verification_passed", False))
        unmet_criteria = list(verification_data.get("unmet_criteria", []))

    verifier_engine = verification_data.get("verifier_engine", "deterministic_heuristic_fallback")
    verifier_model = verification_data.get("model") or active_model

    status_str = "passed" if verification_passed else "failed"
    details_str = (
        f"All {len(criteria)} acceptance criteria successfully verified with real git_diff and test evidence."
        if verification_passed
        else f"{len(unmet_criteria)} criteria unverified: " + "; ".join(unmet_criteria)[:400]
    )

    details_dict = {
        "model": verifier_model,
        "model_used": active_model,
        "verifier_engine": verifier_engine,
        "criteria_total": len(criteria),
        "criteria_unmet": len(unmet_criteria),
        "summary": details_str,
    }

    log_entry = {
        "agent": "sentinel_verifier",
        "status": status_str,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "message": details_str,
        "details": details_dict,
        "criteria_total": len(criteria),
        "criteria_unmet": len(unmet_criteria),
        "verifier_engine": verifier_engine,
        "model": verifier_model,
        "model_used": active_model,
    }

    return {
        "verification_passed": verification_passed,
        "findings_and_issues": unmet_criteria,
        "agent_logs": [log_entry],
    }


if __name__ == "__main__":
    print("=== Member 2 Shield: Running sentinel.py Production Self-Tests ===")
    with tempfile.TemporaryDirectory() as temp_repo:
        real_repo = os.path.realpath(temp_repo)

        # 1. Test sentinel_tester_node on passing test
        test_file = os.path.join(real_repo, "test_pass.py")
        with open(test_file, "w") as f:
            f.write("def test_ok(): assert 1 == 1\n")

        pass_state = {
            "repo_path": real_repo,
            "acceptance_criteria": ["test_ok passes"],
            "tasks": [],
            "agent_logs": [],
            "findings_and_issues": [],
            "git_diff": "+def test_ok(): assert 1 == 1",
            "test_results": {},
            "verification_passed": False,
            "security_passed": False,
            "review_passed": False,
            "iteration_count": 0,
            "max_iterations": 3,
            "human_approved": False,
        }

        res_pass = sentinel_tester_node(pass_state)
        assert res_pass["test_results"]["passed"] is True, "Expected tests to pass"
        assert res_pass["test_results"]["passed_count"] >= 1, "Expected passed_count >= 1"
        assert res_pass["test_results"]["failed_count"] == 0, "Expected failed_count == 0"
        assert res_pass["agent_logs"][0]["status"] == "passed"
        assert len(res_pass["findings_and_issues"]) == 0
        print(f"[PASS] 1. sentinel_tester_node passing test verified ({res_pass['test_results']['passed_count']} passed).")

        # 2. Test sentinel_tester_node on failing test
        fail_file = os.path.join(real_repo, "test_fail.py")
        with open(fail_file, "w") as f:
            f.write("def test_bad(): assert 2 + 2 == 5, 'Math assertion error'\n")

        res_fail = sentinel_tester_node(pass_state)
        assert res_fail["test_results"]["passed"] is False, "Expected tests to fail"
        assert res_fail["test_results"]["failed_count"] >= 1, "Expected failed_count >= 1"
        assert res_fail["agent_logs"][0]["status"] == "failed"
        assert len(res_fail["findings_and_issues"]) > 0, "Expected failure diagnostics in findings_and_issues"
        assert any("Math assertion error" in f or "TEST FAILURE" in f for f in res_fail["findings_and_issues"])
        print(f"[PASS] 2. sentinel_tester_node failure parsing verified: {res_fail['findings_and_issues'][0]}")

        # 3. Test sentinel_verifier_node with real evidence
        ver_pass_state = {
            "acceptance_criteria": ["Implement multiply function", "Ensure test_ok passes"],
            "git_diff": "+def multiply(a, b):\n+    return a * b",
            "test_results": {
                "passed": True,
                "output": "1 passed in 0.01s",
                "command": "pytest -v",
                "passed_count": 1,
                "failed_count": 0,
            },
            "agent_logs": [],
            "findings_and_issues": [],
        }
        res_ver_pass = sentinel_verifier_node(ver_pass_state)
        assert res_ver_pass["verification_passed"] is True
        assert len(res_ver_pass["findings_and_issues"]) == 0
        assert "model" in res_ver_pass["agent_logs"][0]
        assert "model_used" in res_ver_pass["agent_logs"][0]["details"]
        print(f"[PASS] 3. sentinel_verifier_node with real evidence verified (model={res_ver_pass['agent_logs'][0]['model']}).")

        # 4. Test sentinel_verifier_node without evidence (UNVERIFIED CLAIM)
        ver_fail_state = {
            "acceptance_criteria": ["Implement divide_numbers function"],
            "git_diff": "+# Just a comment, no implementation",
            "test_results": {
                "passed": True,
                "output": "1 passed",
                "command": "pytest -v",
                "passed_count": 1,
                "failed_count": 0,
            },
            "agent_logs": [],
            "findings_and_issues": [],
        }
        res_ver_fail = sentinel_verifier_node(ver_fail_state)
        assert res_ver_fail["verification_passed"] is False
        assert len(res_ver_fail["findings_and_issues"]) > 0
        assert any("UNVERIFIED CLAIM: [Implement divide_numbers function]" in f for f in res_ver_fail["findings_and_issues"])
        print(f"[PASS] 4. sentinel_verifier_node unverified claim rejection verified: {res_ver_fail['findings_and_issues'][0]}")

    print("=== All sentinel.py production checks & self-tests passed successfully! ===")
