"""
Member 2 Shield: Sentinel Dojo
Full production implementation matching PECathon PS-001 requirements:
1. sentinel_tester_node: Runs pytest -v via run_sandboxed_command, parses exact
   test failures, assertion errors, and stack traces, updates test_results, appends
   diagnostics to findings_and_issues, and writes structured agent_logs.
2. sentinel_verifier_node: Independent auditor comparing git_diff and test_results
   against state["acceptance_criteria"] using Gemini LLM (with deterministic
   heuristic fallback), enforcing the core rule: Never claim success without real evidence.
"""

from datetime import datetime, timezone
import json
import os
from pathlib import Path
import re
import sys
import tempfile
from typing import Any, Dict, List, Optional

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
    Updates test_results, appends failure summaries to findings_and_issues,
    and returns a structured agent_logs entry.

    Returns:
        Partial state dict for LangGraph:
        - "test_results": {"passed": bool, "output": str, "command": str}
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
    cmd_str = " ".join(command) if isinstance(command, list) else str(command)

    # Parse detailed test failures for feedback loop
    new_findings: List[str] = []
    if not passed:
        new_findings = parse_pytest_failures(test_output)

    status_str = "passed" if passed else "failed"
    details_str = (
        f"All automated tests in '{cmd_str}' passed successfully."
        if passed
        else f"Test suite '{cmd_str}' failed with {len(new_findings)} diagnostic finding(s): "
        + "; ".join(new_findings)[:400]
    )

    log_entry = {
        "agent": "sentinel_tester",
        "status": status_str,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "details": details_str,
        "command": cmd_str,
        "exit_code": test_result.get("exit_code", 0 if passed else 1),
    }

    return {
        "test_results": {
            "passed": passed,
            "output": test_output,
            "command": cmd_str,
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
    Uses LangChain Google GenAI (ChatGoogleGenerativeAI) with gemini-2.5-flash
    to objectively verify each acceptance criterion against git_diff and test_results.
    Enforces the core rule: Never claim success without real evidence.
    """
    api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if not api_key:
        return None

    try:
        from langchain_google_genai import ChatGoogleGenerativeAI
        from langchain_core.messages import SystemMessage, HumanMessage

        # Initialize Gemini model
        llm = ChatGoogleGenerativeAI(
            model="gemini-2.5-flash",
            temperature=0.0,
            google_api_key=api_key,
        )

        system_prompt = (
            "You are Sentinel Verifier, an independent Quality Assurance auditor in an autonomous engineering guild.\n"
            "Core Principle: NEVER CLAIM SUCCESS WITHOUT REAL EVIDENCE.\n\n"
            "Your task is to independently evaluate whether EVERY item in the acceptance criteria is verified "
            "based strictly on:\n"
            "1. The git diff showing actual code implementation.\n"
            "2. The test results showing passing automated test execution.\n\n"
            "Strict Evaluation Rules:\n"
            "- If an acceptance criterion requires a function, endpoint, class, bugfix, or behavior, there MUST be "
            "concrete proof in the git diff. If the diff is empty or missing the code, mark it FAILED.\n"
            "- If automated tests failed, any criterion requiring verified functionality or test stability MUST be marked FAILED.\n"
            "- Never extrapolate or assume. If evidence is missing, mark the criterion unverified.\n\n"
            "Output valid JSON ONLY with this exact schema:\n"
            "{\n"
            '  "verification_passed": true/false,\n'
            '  "evaluations": [\n'
            '    {"criterion": "...", "status": "PASSED"|"FAILED", "evidence": "...", "issue": "..."}\n'
            "  ],\n"
            '  "unmet_criteria": ["UNMET CRITERION: <details of missing implementation or failed test>"]\n'
            "}"
        )

        user_content = (
            f"Acceptance Criteria:\n{json.dumps(criteria, indent=2)}\n\n"
            f"Git Diff:\n{git_diff[:8000] if git_diff else 'No git diff provided.'}\n\n"
            f"Test Results:\nPassed: {test_results.get('passed', False)}\n"
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
                # Derive unmet from evaluations if needed
                for ev in data.get("evaluations", []):
                    if ev.get("status") == "FAILED":
                        unmet.append(f"UNMET CRITERION ('{ev.get('criterion')}'): {ev.get('issue', 'Evidence missing')}")
            return {
                "verification_passed": bool(data.get("verification_passed", False)),
                "unmet_criteria": unmet,
            }
    except Exception:
        # Fall back to heuristic engine if API call fails or model unavailable
        return None

    return None


def _verify_with_heuristics(
    criteria: List[str],
    git_diff: str,
    test_results: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Deterministic verification engine enforcing: Never claim success without real evidence.
    Inspects git diff and test logs for concrete fulfillment of acceptance criteria.
    """
    unmet: List[str] = []
    tests_passed = bool(test_results.get("passed", False))
    test_output = test_results.get("output", "")
    diff_lower = git_diff.lower() if git_diff else ""

    # Rule: If diff is empty, no changes were implemented
    if not git_diff.strip():
        unmet.append("UNMET CRITERION: No code changes detected in repository (git diff is empty). Cannot verify implementation.")

    # Rule: If tests failed, flag test verification failure
    if not tests_passed:
        unmet.append(
            f"UNMET CRITERION: Automated test suite failed ('{test_results.get('command', 'pytest -v')}'). "
            f"All tests must pass cleanly for verification."
        )

    for idx, criterion in enumerate(criteria, start=1):
        crit_lower = criterion.lower()

        # Check if criterion is primarily about test suite passing
        is_test_criterion = any(w in crit_lower for w in ("test", "pass", "pytest", "spec", "coverage", "suite"))
        is_impl_criterion = any(
            w in crit_lower
            for w in ("implement", "add", "create", "modify", "fix", "feature", "function", "class", "method", "endpoint")
        )

        # 1. Pure test satisfaction criterion (e.g. "Ensure all tests pass", "Pass test suite")
        if is_test_criterion and not is_impl_criterion:
            if not tests_passed:
                unmet.append(f"UNMET CRITERION #{idx} ('{criterion}'): Automated test suite failed.")
            continue

        # 2. Implementation criterion: requires concrete proof in git diff
        tokens = re.findall(r"['\"`]?([a-zA-Z0-9_]{3,})['\"`]?", criterion)
        meaningful_tokens = [
            t.lower() for t in tokens
            if t.lower() not in {
                "the", "and", "for", "with", "must", "should", "return", "test", "when",
                "that", "all", "ensure", "passes", "pass", "suite", "implement", "function"
            }
        ]

        # If tests failed and criterion requires tests, fail it
        if is_test_criterion and not tests_passed:
            unmet.append(f"UNMET CRITERION #{idx} ('{criterion}'): Automated tests failed.")
            continue

        # Verify implementation tokens appear in git diff or test output
        if meaningful_tokens and git_diff:
            token_matches = [t for t in meaningful_tokens if t in diff_lower or t in test_output.lower()]
            if not token_matches:
                unmet.append(
                    f"UNMET CRITERION #{idx} ('{criterion}'): No evidence of corresponding implementation "
                    f"or symbols found in git diff."
                )

    verification_passed = (len(unmet) == 0)
    return {
        "verification_passed": verification_passed,
        "unmet_criteria": unmet,
    }


def sentinel_verifier_node(state: MissionState) -> Dict[str, Any]:
    """
    Sentinel Verifier Node:
    Acts as an independent verifier comparing git_diff and test_results against
    state["acceptance_criteria"]. Enforces: Never claim success without real evidence.
    Sets verification_passed: bool, appends unmet criteria to findings_and_issues,
    and returns a structured audit entry in agent_logs.

    Returns:
        Partial state dict for LangGraph:
        - "verification_passed": bool
        - "findings_and_issues": List[str] (newly discovered unmet criteria only)
        - "agent_logs": [structured_audit_log_dict]
    """
    criteria = state.get("acceptance_criteria", [])
    git_diff = state.get("git_diff", "")
    test_results = state.get("test_results", {})

    if not criteria:
        # If no criteria provided, require passing tests and positive diff
        tests_passed = bool(test_results.get("passed", False))
        has_diff = bool(git_diff and git_diff.strip())
        verification_passed = tests_passed and has_diff
        unmet_criteria: List[str] = []
        if not tests_passed:
            unmet_criteria.append("UNMET CRITERION: No acceptance criteria specified, and test suite failed.")
        if not has_diff:
            unmet_criteria.append("UNMET CRITERION: No acceptance criteria specified, and no git diff exists.")
    else:
        # 1. Try LLM independent verification (Gemini 2.5 Flash)
        verification_data = _verify_with_llm(criteria, git_diff, test_results)
        
        # 2. Fall back to deterministic heuristic verification if LLM is unavailable
        if verification_data is None:
            verification_data = _verify_with_heuristics(criteria, git_diff, test_results)

        verification_passed = bool(verification_data.get("verification_passed", False))
        unmet_criteria = list(verification_data.get("unmet_criteria", []))

    status_str = "passed" if verification_passed else "failed"
    details_str = (
        f"All {len(criteria)} acceptance criteria successfully verified against git diff and passing test evidence."
        if verification_passed
        else f"{len(unmet_criteria)} criteria unverified: " + "; ".join(unmet_criteria)[:400]
    )

    log_entry = {
        "agent": "sentinel_verifier",
        "status": status_str,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "details": details_str,
        "criteria_total": len(criteria),
        "criteria_unmet": len(unmet_criteria),
    }

    return {
        "verification_passed": verification_passed,
        "findings_and_issues": unmet_criteria,
        "agent_logs": [log_entry],
    }


if __name__ == "__main__":
    print("=== Member 2 Shield: Running sentinel.py Self-Tests ===")
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
        assert res_pass["agent_logs"][0]["status"] == "passed"
        assert len(res_pass["findings_and_issues"]) == 0
        print("[PASS] sentinel_tester_node passing test verified.")

        # 2. Test sentinel_tester_node on failing test
        fail_file = os.path.join(real_repo, "test_fail.py")
        with open(fail_file, "w") as f:
            f.write("def test_bad(): assert 2 + 2 == 5\n")

        res_fail = sentinel_tester_node(pass_state)
        assert res_fail["test_results"]["passed"] is False, "Expected tests to fail"
        assert res_fail["agent_logs"][0]["status"] == "failed"
        assert len(res_fail["findings_and_issues"]) > 0, "Expected failure diagnostics in findings_and_issues"
        print(f"[PASS] sentinel_tester_node failure parsing verified: {res_fail['findings_and_issues'][0]}")

        # 3. Test sentinel_verifier_node with real evidence
        ver_pass_state = {
            "acceptance_criteria": ["Implement multiply function", "Ensure test_ok passes"],
            "git_diff": "+def multiply(a, b):\n+    return a * b",
            "test_results": {"passed": True, "output": "1 passed in 0.01s", "command": "pytest -v"},
            "agent_logs": [],
            "findings_and_issues": [],
        }
        res_ver_pass = sentinel_verifier_node(ver_pass_state)
        assert res_ver_pass["verification_passed"] is True
        assert len(res_ver_pass["findings_and_issues"]) == 0
        print("[PASS] sentinel_verifier_node with evidence verified.")

        # 4. Test sentinel_verifier_node without evidence (Never claim success without real evidence)
        ver_fail_state = {
            "acceptance_criteria": ["Implement divide_numbers function"],
            "git_diff": "+# Just a comment, no implementation",
            "test_results": {"passed": True, "output": "1 passed", "command": "pytest -v"},
            "agent_logs": [],
            "findings_and_issues": [],
        }
        res_ver_fail = sentinel_verifier_node(ver_fail_state)
        assert res_ver_fail["verification_passed"] is False
        assert len(res_ver_fail["findings_and_issues"]) > 0
        print(f"[PASS] sentinel_verifier_node no-evidence rejection verified: {res_ver_fail['findings_and_issues'][0]}")

    print("=== All sentinel.py production checks & self-tests passed successfully! ===")
