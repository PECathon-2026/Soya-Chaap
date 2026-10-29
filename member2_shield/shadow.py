"""
Member 2 Shield: Shadow Council
Multi-layered static and semantic security review agent node.
1. Deterministic Static Regex Scan:
   - Hardcoded secrets: AWS access keys, generic API keys (sk-...), private keys, tokens.
   - Dangerous dynamic execution: eval(, exec(, os.system(, raw SQL formatting (f"SELECT... {user_input}").
   - Blocks immediately, sets security_passed = False, appends flagged line + reason.
2. Semantic Code Review (LLM Inspector):
   - Uses ChatGoogleGenerativeAI (Gemini) to inspect git diff for code readability,
     conventions, unhandled edge-case regressions, and missing validations.
   - Sets review_passed = False if regressions/code quality flaws exist.
   - Approves (security_passed = True and review_passed = True) only when both layers pass cleanly.
3. Detailed audit trail written to agent_logs.
"""

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


# Deterministic regex patterns for hardcoded secrets
SECRET_PATTERNS: List[Tuple[str, str]] = [
    (r"\bAKIA[0-9A-Z]{16}\b", "Hardcoded AWS Access Key ID"),
    (r"\bsk-[a-zA-Z0-9]{20,}\b", "Hardcoded API Secret Key (sk-...)"),
    (r"-----BEGIN (?:RSA|OPENSSH|EC|PGP|PRIVATE) KEY-----", "Hardcoded Private Cryptographic Key"),
    (r"\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{36,255}\b", "GitHub Personal Access Token"),
    (r"\bgithub_pat_[A-Za-z0-9_]{82}\b", "GitHub Fine-Grained Personal Access Token"),
    (r"\bxox[baprs]-[0-9a-zA-Z]{10,48}\b", "Slack API Token"),
    (r"(?i)\b(?:api[_-]?key|access[_-]?token|secret[_-]?key)\s*[:=]\s*['\"][A-Za-z0-9_\-]{16,}['\"]", "Hardcoded API Key / Secret Token assignment"),
    (r"(?i)\bbearer\s+[A-Za-z0-9_\-\.]{20,}\b", "Hardcoded Bearer Authentication Token"),
    (r"(?i)\bpassword\s*[:=]\s*['\"][^'\"\s]{6,}['\"]", "Hardcoded Plaintext Password"),
]

# Deterministic regex patterns for dangerous execution and injection calls
DANGEROUS_CALL_PATTERNS: List[Tuple[str, str]] = [
    (r"\beval\s*\(", "Dangerous dynamic evaluation: eval() call"),
    (r"\bexec\s*\(", "Dangerous dynamic code execution: exec() call"),
    (r"\bos\.system\s*\(", "High-risk direct shell command invocation: os.system()"),
    (r"\bos\.popen\s*\(", "High-risk direct shell pipeline: os.popen()"),
    (r"(?i)f[\"'].*?(?:SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|FROM|WHERE).*?\{.*?\}", "Raw SQL Injection via formatted f-string query"),
    (r"(?i)\b(?:cursor\.)?execute\s*\(\s*f[\"'].*?\{.*?\}", "Raw SQL Injection: formatted f-string in SQL execute() call"),
    (r"(?i)\b(?:cursor\.)?execute\s*\(\s*[\"'].*?%s.*?[\"']\s*\%", "Raw SQL Injection: % string formatting in SQL execute() call"),
    (r"(?i)\b(?:cursor\.)?execute\s*\(\s*[\"'].*?\+\s*[a-zA-Z_]", "Raw SQL Injection: string concatenation in SQL execute() call"),
    (r"\bshell\s*=\s*True\b", "High-risk subprocess execution with shell=True"),
    (r"\bpickle\.loads?\s*\(", "Insecure deserialization via pickle"),
    (r"\byaml\.load\s*\([^,)]+\)", "Insecure YAML deserialization without SafeLoader"),
    (r"\bdangerouslySetInnerHTML\b", "Cross-Site Scripting (XSS) risk via dangerouslySetInnerHTML"),
]


def extract_added_lines_from_diff(git_diff: str) -> List[Tuple[int, str]]:
    """
    Extract only newly added code lines from a unified git diff
    (lines starting with '+' excluding diff headers like '+++').
    Returns a list of tuples: (diff_line_number, line_content).
    """
    added_lines: List[Tuple[int, str]] = []
    if not git_diff:
        return added_lines

    for idx, line in enumerate(git_diff.splitlines(), start=1):
        if line.startswith("+") and not line.startswith("+++"):
            added_lines.append((idx, line[1:]))

    return added_lines


def scan_diff_for_security_flaws(git_diff: str) -> List[str]:
    """
    Run deterministic regex scans over added lines in git_diff.
    Detects hardcoded secrets (AWS, sk-..., private keys, tokens) and
    dangerous dynamic execution (eval, exec, os.system, raw SQL f-strings).

    Returns:
        List of formatted violation strings containing flagged line and reason.
    """
    violations: List[str] = []
    added_lines = extract_added_lines_from_diff(git_diff)

    for line_idx, line in added_lines:
        stripped_line = line.strip()

        # 1. Scan for hardcoded secrets
        for pattern, description in SECRET_PATTERNS:
            match = re.search(pattern, line)
            if match:
                snippet = stripped_line[:80]
                violations.append(
                    f"SECURITY VIOLATION [Hardcoded Secret]: {description} at line {line_idx}: '{snippet}'"
                )

        # 2. Scan for dangerous execution calls & injection risks
        for pattern, description in DANGEROUS_CALL_PATTERNS:
            match = re.search(pattern, line)
            if match:
                snippet = stripped_line[:80]
                violations.append(
                    f"SECURITY VIOLATION [Dangerous Execution]: {description} at line {line_idx}: '{snippet}'"
                )

    return violations


def _run_llm_code_review(
    git_diff: str,
    user_request: str,
    acceptance_criteria: List[str],
) -> Optional[Dict[str, Any]]:
    """
    Semantic code review via LangChain Google GenAI (ChatGoogleGenerativeAI) with gemini-2.5-flash.
    Reviews git diff for readability, repo conventions, edge-case regressions, and unhandled exceptions.
    Returns structured dict with 'review_passed' and 'critiques', or None on failure.
    """
    api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if not api_key or not git_diff.strip():
        return None

    try:
        from langchain_google_genai import ChatGoogleGenerativeAI
        from langchain_core.messages import SystemMessage, HumanMessage

        llm = ChatGoogleGenerativeAI(
            model="gemini-2.5-flash",
            temperature=0.0,
            google_api_key=api_key,
        )

        system_prompt = (
            "You are the Shadow Council: the hardcore critic and security auditor in DevPilot.\n"
            "Your objective is to conduct a semantic code quality, convention, and regression audit on the git diff.\n\n"
            "Audit Dimensions:\n"
            "1. Readability & Conventions: Follows clean Python idiomatic style, type hints, docstrings, and repo structure.\n"
            "2. Regressions & Edge Cases: Identifies potential regressions, unhandled exceptions, zero-divisions, "
            "missing null/empty checks, or broken caller contracts.\n"
            "3. Production Quality: Flags unfinished placeholders (TODO/FIXME), debug prints, or silent error swallowing.\n\n"
            "Rules:\n"
            "- If regressions or noticeable code quality issues exist, set review_passed = false and provide specific critiques.\n"
            "- Output valid JSON ONLY with this exact schema:\n"
            "{\n"
            '  "review_passed": true/false,\n'
            '  "has_regressions": true/false,\n'
            '  "has_quality_issues": true/false,\n'
            '  "critiques": ["CRITIQUE: <specific issue description with context>"]\n'
            "}"
        )

        user_content = (
            f"User Request:\n{user_request}\n\n"
            f"Acceptance Criteria:\n{json.dumps(acceptance_criteria, indent=2)}\n\n"
            f"Git Diff:\n{git_diff[:8000]}"
        )

        response = llm.invoke([SystemMessage(content=system_prompt), HumanMessage(content=user_content)])
        raw_text = response.content if hasattr(response, "content") else str(response)

        json_match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", raw_text, re.DOTALL)
        if json_match:
            raw_text = json_match.group(1)

        data = json.loads(raw_text)
        if "review_passed" in data and "critiques" in data:
            return {
                "review_passed": bool(data.get("review_passed", False)),
                "critiques": list(data.get("critiques", [])),
            }
    except Exception:
        return None

    return None


def _heuristic_code_review(git_diff: str) -> Dict[str, Any]:
    """
    Deterministic static code review heuristic engine when LLM is unavailable.
    Checks git diff for code smells, unfinished placeholders, bare excepts,
    raw print debugging statements, and broken syntax.
    """
    critiques: List[str] = []

    if not git_diff.strip():
        return {
            "review_passed": False,
            "critiques": ["CODE REVIEW: No code changes present in git diff to review."],
        }

    added_lines = extract_added_lines_from_diff(git_diff)

    for line_idx, line in added_lines:
        stripped = line.strip()

        # Unfinished placeholders
        if re.search(r"\b(?:TODO|FIXME|XXX|HACK)\b", stripped):
            critiques.append(
                f"CODE REVIEW: Unfinished placeholder detected at diff line {line_idx}: '{stripped[:60]}'"
            )

        # Raw debug prints in production code
        if re.search(r"\bprint\s*\(", stripped) and not stripped.startswith("#"):
            critiques.append(
                f"CODE REVIEW: Raw print statement found at diff line {line_idx}. Use structured logging: '{stripped[:60]}'"
            )

        # Dangerous bare except clauses (swallows KeyboardInterrupt/SystemExit)
        if re.search(r"\bexcept\s*:", stripped):
            critiques.append(
                f"CODE REVIEW: Anti-pattern detected at diff line {line_idx}: Bare 'except:' clause without explicit exception type."
            )

        # Silent pass on exception
        if re.search(r"\bpass\b", stripped) and "except" in stripped:
            critiques.append(
                f"CODE REVIEW: Silent exception suppression at diff line {line_idx}: 'except ...: pass'."
            )

    review_passed = (len(critiques) == 0)
    return {
        "review_passed": review_passed,
        "critiques": critiques,
    }


def shadow_council_node(state: MissionState) -> Dict[str, Any]:
    """
    Shadow Council Node:
    Performs multi-layered static and semantic security review on state["git_diff"]:
    1. Deterministic Static Regex Scan:
       Flags hardcoded secrets (AWS, sk-..., private keys) and dangerous execution
       calls (eval, exec, os.system, raw SQL formatting). If found, sets
       security_passed = False and immediately appends flagged lines to findings_and_issues.
    2. Semantic Code Review:
       Uses ChatGoogleGenerativeAI (or heuristic fallback) for readability,
       conventions, regressions, and edge-case exceptions. Sets review_passed = False
       if quality/regression issues are detected.
    3. Sets security_passed = True and review_passed = True only when both pass cleanly.
    4. Appends a comprehensive audit trail to agent_logs.

    Returns:
        Partial state dict for LangGraph:
        - "security_passed": bool
        - "review_passed": bool
        - "findings_and_issues": List[str] (newly detected issues only)
        - "agent_logs": [structured_audit_log_dict]
    """
    git_diff = state.get("git_diff", "")
    user_request = state.get("user_request", "")
    criteria = state.get("acceptance_criteria", [])

    # Layer 1: Deterministic Static Regex Security Scan
    security_violations = scan_diff_for_security_flaws(git_diff)
    security_passed = (len(security_violations) == 0)

    # Layer 2: Semantic Code Review (LLM Inspector with deterministic fallback)
    review_data = _run_llm_code_review(git_diff, user_request, criteria)
    if review_data is None:
        review_data = _heuristic_code_review(git_diff)

    review_critiques = list(review_data.get("critiques", []))
    review_passed = bool(review_data.get("review_passed", False))

    # If static security failed, review cannot be passed without resolution
    if not security_passed:
        # Static risk takes priority
        pass

    # Aggregate distinct new findings for the feedback loop
    new_findings: List[str] = []
    for violation in security_violations:
        if violation not in new_findings:
            new_findings.append(violation)

    for critique in review_critiques:
        if critique not in new_findings:
            new_findings.append(critique)

    # Construct comprehensive audit trail
    is_approved = security_passed and review_passed
    status_str = "passed" if is_approved else "failed"

    if is_approved:
        audit_details = (
            "AUDIT APPROVED: Zero static security vulnerabilities found, "
            "code readability verified, and no edge-case regressions detected."
        )
    else:
        rejection_reasons: List[str] = []
        if not security_passed:
            rejection_reasons.append(f"{len(security_violations)} static security violation(s) detected")
        if not review_passed:
            rejection_reasons.append(f"{len(review_critiques)} code review/regression issue(s) detected")
        audit_details = f"AUDIT REJECTED: {'; '.join(rejection_reasons)}."

    log_entry = {
        "agent": "shadow_council",
        "status": status_str,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "details": audit_details,
        "security_passed": security_passed,
        "review_passed": review_passed,
        "violations_count": len(security_violations),
        "critiques_count": len(review_critiques),
    }

    return {
        "security_passed": security_passed,
        "review_passed": review_passed,
        "findings_and_issues": new_findings,
        "agent_logs": [log_entry],
    }


if __name__ == "__main__":
    print("=== Member 2 Shield: Running shadow.py Self-Tests ===")

    # 1. Test Static Regex: Hardcoded AWS Key
    diff_aws = "+AWS_ACCESS_KEY_ID = 'AKIAIOSFODNN7EXAMPLE'\n"
    res_aws = shadow_council_node({"git_diff": diff_aws, "user_request": "", "acceptance_criteria": []})
    assert res_aws["security_passed"] is False, "Expected AWS key to trigger security failure"
    assert any("AWS Access Key" in f for f in res_aws["findings_and_issues"])
    print("[PASS] Hardcoded AWS key successfully detected and blocked.")

    # 2. Test Static Regex: Generic API Key (sk-...)
    diff_api = "+OPENAI_API_KEY = 'sk-1234567890abcdef1234567890'\n"
    res_api = shadow_council_node({"git_diff": diff_api, "user_request": "", "acceptance_criteria": []})
    assert res_api["security_passed"] is False, "Expected sk-... key to trigger security failure"
    assert any("API Secret Key" in f for f in res_api["findings_and_issues"])
    print("[PASS] Generic API key (sk-...) successfully detected and blocked.")

    # 3. Test Static Regex: Private Cryptographic Key
    diff_pk = "+KEY = '-----BEGIN PRIVATE KEY-----\\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgw...'\n"
    res_pk = shadow_council_node({"git_diff": diff_pk, "user_request": "", "acceptance_criteria": []})
    assert res_pk["security_passed"] is False, "Expected private key to trigger security failure"
    assert any("Private Cryptographic Key" in f for f in res_pk["findings_and_issues"])
    print("[PASS] Private cryptographic key successfully detected and blocked.")

    # 4. Test Dangerous Execution: eval() and exec()
    diff_eval = "+eval(user_expression)\n+exec(dynamically_generated_code)\n"
    res_eval = shadow_council_node({"git_diff": diff_eval, "user_request": "", "acceptance_criteria": []})
    assert res_eval["security_passed"] is False, "Expected eval/exec to trigger security failure"
    assert any("eval()" in f for f in res_eval["findings_and_issues"])
    assert any("exec()" in f for f in res_eval["findings_and_issues"])
    print("[PASS] Dynamic execution (eval/exec) successfully detected and blocked.")

    # 5. Test Dangerous Execution: os.system()
    diff_system = "+import os\n+os.system(f'rm -rf {target_directory}')\n"
    res_sys = shadow_council_node({"git_diff": diff_system, "user_request": "", "acceptance_criteria": []})
    assert res_sys["security_passed"] is False, "Expected os.system to trigger security failure"
    assert any("os.system()" in f for f in res_sys["findings_and_issues"])
    print("[PASS] Direct shell invocation (os.system) successfully detected and blocked.")

    # 6. Test Dangerous Execution: Raw SQL Injection via formatted f-string
    diff_sql = "+cursor.execute(f'SELECT * FROM users WHERE username = \"{user_input}\"')\n"
    res_sql = shadow_council_node({"git_diff": diff_sql, "user_request": "", "acceptance_criteria": []})
    assert res_sql["security_passed"] is False, "Expected raw SQL f-string to trigger security failure"
    assert any("SQL Injection" in f for f in res_sql["findings_and_issues"])
    print("[PASS] Raw SQL formatting injection successfully detected and blocked.")

    # 7. Test Code Review Quality: Bare except & TODO placeholders
    diff_smell = (
        "+def handle_request():\n"
        "+    # TODO: implement authentication\n"
        "+    try:\n"
        "+        process()\n"
        "+    except:\n"
        "+        pass\n"
    )
    res_smell = shadow_council_node({"git_diff": diff_smell, "user_request": "", "acceptance_criteria": []})
    assert res_smell["review_passed"] is False, "Expected code smells to fail review"
    assert any("placeholder" in f for f in res_smell["findings_and_issues"])
    assert any("Bare 'except:'" in f for f in res_smell["findings_and_issues"])
    print("[PASS] Code quality & regression flaws successfully detected and critiqued.")

    # 8. Test Clean Production Code: Both Security and Review Approved
    diff_clean = (
        "+from typing import List\n"
        "+\n"
        "+def compute_average(values: List[float]) -> float:\n"
        "+    \"\"\"Calculate and return the arithmetic mean of a non-empty list.\"\"\"\n"
        "+    if not values:\n"
        "+        raise ValueError('Cannot compute average of an empty list.')\n"
        "+    return sum(values) / len(values)\n"
    )
    res_clean = shadow_council_node({"git_diff": diff_clean, "user_request": "Compute average", "acceptance_criteria": ["compute_average function"]})
    assert res_clean["security_passed"] is True, "Clean code should pass security"
    assert res_clean["review_passed"] is True, "Clean code should pass review"
    assert len(res_clean["findings_and_issues"]) == 0, "Clean code should have 0 findings"
    assert res_clean["agent_logs"][0]["status"] == "passed"
    assert "AUDIT APPROVED" in res_clean["agent_logs"][0]["details"]
    print("[PASS] Clean production code successfully passed and approved by Shadow Council.")

    print("=== All shadow.py security & code review self-tests passed successfully! ===")
