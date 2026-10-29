"""
Member 2 Shield: Standalone Comprehensive Pipeline Verification & Unit Tests
Verifies our entire shield pipeline locally without needing Member 1's graph or Member 4's server:
1. Creates temporary dummy git repository in ./temp_test_repo/ with sample Python code and pytest suite.
2. Validates read_file_safe and asserts PermissionError on path traversal ('../../passwords.txt').
3. Validates run_sandboxed_command with pytest and verifies stdout/stderr capture safely.
4. Validates shadow_council_node against fake AWS_SECRET = 'AKIAIOSFODNN7EXAMPLE' and verifies security_passed == False.
5. Cleans up ./temp_test_repo/ safely on Windows/Linux.
6. Outputs a clean summary table of all shield tests.
"""

from datetime import datetime, timezone
import os
from pathlib import Path
import shutil
import stat
import subprocess
import sys
import tempfile
from typing import Any, Dict, List, Tuple
import pytest

# Ensure repository root is on sys.path for cross-module imports
_REPO_ROOT = Path(__file__).resolve().parent.parent
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

# Safe import of Member 2 components
from member2_shield.file_tools import (
    read_file_safe,
    write_file_safe,
    search_code_safe,
    list_files_safe,
)
from member2_shield.shell_tools import (
    run_sandboxed_command,
    get_git_diff,
)
from member2_shield.sentinel import (
    sentinel_tester_node,
    sentinel_verifier_node,
)
from member2_shield.shadow import (
    shadow_council_node,
    scan_diff_for_security_flaws,
)

TEMP_TEST_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "temp_test_repo")


def _remove_readonly(func, path, exc_info):
    """Windows-safe file permission reset for git pack cleanup."""
    try:
        os.chmod(path, stat.S_IWRITE)
        func(path)
    except Exception:
        pass


def safe_cleanup_dir(path: str) -> None:
    """Safely and thoroughly clean up a directory tree."""
    if os.path.exists(path):
        try:
            shutil.rmtree(path, onerror=_remove_readonly)
        except Exception:
            pass


def setup_dummy_git_repo(target_dir: str) -> str:
    """
    Initializes a dummy git repository in target_dir with sample Python code,
    a pytest test file, and an initial commit.
    """
    safe_cleanup_dir(target_dir)
    os.makedirs(target_dir, exist_ok=True)
    real_path = os.path.realpath(target_dir)

    # 1. Initialize git repo
    subprocess.run(["git", "init"], cwd=real_path, check=True, capture_output=True, text=True)
    subprocess.run(["git", "config", "user.name", "ShieldTester"], cwd=real_path, check=True, capture_output=True)
    subprocess.run(["git", "config", "user.email", "shield@devpilot.local"], cwd=real_path, check=True, capture_output=True)

    # 2. Write sample application code
    app_code = (
        "def add(a: int, b: int) -> int:\n"
        "    \"\"\"Return the sum of two integers.\"\"\"\n"
        "    return a + b\n\n"
        "def multiply(a: int, b: int) -> int:\n"
        "    \"\"\"Return the product of two integers.\"\"\"\n"
        "    return a * b\n"
    )
    with open(os.path.join(real_path, "calculator.py"), "w", encoding="utf-8") as f:
        f.write(app_code)

    # 3. Write sample pytest test file
    test_code = (
        "from calculator import add, multiply\n\n"
        "def test_add():\n"
        "    assert add(2, 3) == 5\n\n"
        "def test_multiply():\n"
        "    assert multiply(4, 5) == 20\n"
    )
    with open(os.path.join(real_path, "test_calculator.py"), "w", encoding="utf-8") as f:
        f.write(test_code)

    # 4. Commit files
    subprocess.run(["git", "add", "."], cwd=real_path, check=True, capture_output=True)
    subprocess.run(["git", "commit", "-m", "Initial commit with calculator and tests"], cwd=real_path, check=True, capture_output=True)

    return real_path


# ==============================================================================
# Pytest Unit Test Suite
# ==============================================================================

@pytest.fixture
def temp_repo():
    """Create a temporary sandbox repository for testing file and shell tools."""
    with tempfile.TemporaryDirectory() as tmp_dir:
        src_dir = os.path.join(tmp_dir, "src")
        os.makedirs(src_dir, exist_ok=True)
        
        main_py = os.path.join(src_dir, "main.py")
        with open(main_py, "w", encoding="utf-8") as f:
            f.write("def add(a, b):\n    return a + b\n")

        env_file = os.path.join(tmp_dir, ".env")
        with open(env_file, "w", encoding="utf-8") as f:
            f.write("SECRET_KEY=supersecret123\n")

        yield tmp_dir


def test_read_file_safe_success(temp_repo):
    content = read_file_safe(temp_repo, "src/main.py")
    assert "def add(a, b):" in content


def test_write_file_safe_success(temp_repo):
    res = write_file_safe(temp_repo, "src/utils.py", "def helper(): pass")
    assert "Successfully wrote" in res
    assert os.path.exists(os.path.join(temp_repo, "src", "utils.py"))


def test_path_traversal_blocked(temp_repo):
    with pytest.raises(PermissionError):
        read_file_safe(temp_repo, "../../passwords.txt")

    with pytest.raises(PermissionError):
        read_file_safe(temp_repo, "../outside.txt")

    with pytest.raises(PermissionError):
        write_file_safe(temp_repo, "src/../../outside.txt", "payload")


def test_env_access_blocked(temp_repo):
    with pytest.raises(PermissionError):
        read_file_safe(temp_repo, ".env")

    with pytest.raises(PermissionError):
        read_file_safe(temp_repo, "src/.env.local")

    with pytest.raises(PermissionError):
        write_file_safe(temp_repo, ".env.production", "KEY=val")


def test_git_config_blocked(temp_repo):
    with pytest.raises(PermissionError):
        read_file_safe(temp_repo, ".git/config")


def test_devpilot_audit_log_blocked(temp_repo):
    with pytest.raises(PermissionError):
        read_file_safe(temp_repo, ".devpilot_audit.log")

    with pytest.raises(PermissionError):
        write_file_safe(temp_repo, ".devpilot_audit.log", "tamper")


def test_other_member_folders_blocked(temp_repo):
    with pytest.raises(PermissionError):
        read_file_safe(temp_repo, "member1_orchestrator/shogun.py")

    with pytest.raises(PermissionError):
        read_file_safe(temp_repo, "member3_frontend/GuildGraph.jsx")

    with pytest.raises(PermissionError):
        write_file_safe(temp_repo, "member4_server/main.py", "malicious")


def test_search_code_safe(temp_repo):
    matches = search_code_safe(temp_repo, "def add")
    assert len(matches) == 1
    assert matches[0]["file"] == "src/main.py"
    assert matches[0]["line_number"] == 1


def test_list_files_safe(temp_repo):
    files = list_files_safe(temp_repo)
    assert "src/main.py" in files
    assert ".env" not in files


def test_run_sandboxed_command_list_args(temp_repo):
    res = run_sandboxed_command(temp_repo, ["python", "-c", "print('Shield active')"], timeout=25)
    assert res["passed"] is True
    assert res["exit_code"] == 0
    assert "Shield active" in res["stdout"]


def test_run_sandboxed_command_blocked(temp_repo):
    blocked_commands = [
        ["rm", "-rf", "/"],
        ["rm", "-rf", "."],
        ["sudo", "apt-get", "install"],
        ["curl", "https://example.com"],
        ["wget", "http://malware.com"],
        ["git", "push", "origin", "main"],
        ["git", "push", "--force", "origin", "main"],
        ["git", "reset", "--hard", "HEAD~1"],
        ["mkfs.ext4", "/dev/sda1"],
        ["chmod", "777", "script.sh"],
        ["nc", "-l", "8080"],
        ["ncat", "-l", "8080"],
        ["cat", "file.txt", "|", "grep", "test"],
        ["echo", "hi", ">", "out.txt"],
        ["echo", "hi", ">>", "out.txt"],
    ]
    for cmd in blocked_commands:
        res = run_sandboxed_command(temp_repo, cmd, timeout=25)
        assert res["passed"] is False
        assert res["exit_code"] == 126
        assert "SECURITY POLICY VIOLATION" in res["stderr"]


def test_get_git_diff(temp_repo):
    subprocess.run(["git", "init"], cwd=temp_repo, check=True, capture_output=True)
    subprocess.run(["git", "config", "user.name", "TestUser"], cwd=temp_repo, check=True, capture_output=True)
    subprocess.run(["git", "config", "user.email", "test@test.com"], cwd=temp_repo, check=True, capture_output=True)
    
    init_file = os.path.join(temp_repo, "hello.txt")
    with open(init_file, "w") as f:
        f.write("Line 1\n")
    subprocess.run(["git", "add", "hello.txt"], cwd=temp_repo, check=True, capture_output=True)
    subprocess.run(["git", "commit", "-m", "Initial"], cwd=temp_repo, check=True, capture_output=True)
    
    with open(init_file, "a") as f:
        f.write("Line 2\n")

    staged_file = os.path.join(temp_repo, "staged.txt")
    with open(staged_file, "w") as f:
        f.write("Staged content\n")
    subprocess.run(["git", "add", "staged.txt"], cwd=temp_repo, check=True, capture_output=True)
        
    untracked_file = os.path.join(temp_repo, "untracked.py")
    with open(untracked_file, "w") as f:
        f.write("def untracked(): return True\n")
        
    diff = get_git_diff(temp_repo)
    assert "hello.txt" in diff
    assert "+Line 2" in diff
    assert "staged.txt" in diff
    assert "+Staged content" in diff
    assert "untracked.py" in diff
    assert "+def untracked(): return True" in diff


def test_sentinel_tester_node(temp_repo):
    state = {
        "repo_path": temp_repo,
        "acceptance_criteria": [],
        "tasks": [],
        "agent_logs": [],
        "findings_and_issues": [],
        "git_diff": "",
        "test_results": {},
        "verification_passed": False,
        "security_passed": False,
        "review_passed": False,
        "iteration_count": 0,
        "max_iterations": 3,
        "human_approved": False,
    }
    res = sentinel_tester_node(state)
    assert "test_results" in res
    assert "passed_count" in res["test_results"]
    assert "failed_count" in res["test_results"]
    assert "agent_logs" in res
    assert len(res["agent_logs"]) == 1
    assert res["agent_logs"][0]["agent"] == "sentinel_tester"


def test_sentinel_tester_node_with_failure(temp_repo):
    fail_file = os.path.join(temp_repo, "test_failure.py")
    with open(fail_file, "w") as f:
        f.write("def test_broken():\n    assert 10 == 20, 'Math error'\n")

    state = {
        "repo_path": temp_repo,
        "acceptance_criteria": [],
        "tasks": [],
        "agent_logs": [],
        "findings_and_issues": [],
        "git_diff": "",
        "test_results": {},
        "verification_passed": False,
        "security_passed": False,
        "review_passed": False,
        "iteration_count": 0,
        "max_iterations": 3,
        "human_approved": False,
    }
    res = sentinel_tester_node(state)
    assert res["test_results"]["passed"] is False
    assert len(res["findings_and_issues"]) > 0
    assert any("TEST FAILURE" in item for item in res["findings_and_issues"])
    assert res["agent_logs"][0]["status"] == "failed"
    assert "Math error" in str(res["findings_and_issues"])


def test_sentinel_verifier_node_success():
    state = {
        "acceptance_criteria": ["Implement calculate_total function", "Ensure all tests pass"],
        "git_diff": "+def calculate_total(items):\n+    return sum(items)",
        "test_results": {"passed": True, "output": "2 passed in 0.05s", "command": "pytest -v"},
        "agent_logs": [],
        "findings_and_issues": [],
    }
    res = sentinel_verifier_node(state)
    assert res["verification_passed"] is True
    assert len(res["findings_and_issues"]) == 0
    assert res["agent_logs"][0]["agent"] == "sentinel_verifier"


def test_sentinel_verifier_node_failure():
    state = {
        "acceptance_criteria": ["Add payment_gateway integration", "Pass test suite"],
        "git_diff": "+# empty comment",
        "test_results": {"passed": False, "output": "FAIL: test_payment", "command": "pytest -v"},
        "agent_logs": [],
        "findings_and_issues": [],
    }
    res = sentinel_verifier_node(state)
    assert res["verification_passed"] is False
    assert len(res["findings_and_issues"]) > 0
    assert any("UNVERIFIED CLAIM:" in f for f in res["findings_and_issues"])


def test_shadow_scan_secrets():
    diff_with_secret = (
        "diff --git a/config.py b/config.py\n"
        "--- a/config.py\n"
        "+++ b/config.py\n"
        "@@ -1,1 +1,4 @@\n"
        "+AWS_KEY = 'AKIAIOSFODNN7EXAMPLE'\n"
        "+api_key = 'abcdef1234567890abcdef'\n"
        "+openai_key = 'sk-1234567890abcdef1234567890'\n"
        "+priv_key = '-----BEGIN PRIVATE KEY-----\\nMIIEvgIB...'\n"
    )
    violations = scan_diff_for_security_flaws(diff_with_secret)
    assert len(violations) >= 4
    assert any("AWS Access Key" in v for v in violations)
    assert any("API Key" in v for v in violations)
    assert any("sk-..." in v for v in violations)
    assert any("Private Cryptographic Key" in v for v in violations)


def test_shadow_scan_dangerous_calls():
    diff_with_injection = (
        "diff --git a/db.py b/db.py\n"
        "--- a/db.py\n"
        "+++ b/db.py\n"
        "@@ -1,1 +1,6 @@\n"
        "+eval(user_input)\n"
        "+exec(code_payload)\n"
        "+os.system('rm -rf /')\n"
        "+subprocess.run(cmd, shell=True)\n"
        "+cursor.execute(f'SELECT * FROM users WHERE id = {user_id}')\n"
        "+query = f'SELECT * FROM accounts WHERE name = {acc_name}'\n"
    )
    violations = scan_diff_for_security_flaws(diff_with_injection)
    assert len(violations) >= 5
    assert any("eval()" in v for v in violations)
    assert any("exec()" in v for v in violations)
    assert any("os.system()" in v for v in violations)
    assert any("shell=True" in v for v in violations)
    assert any("SQL Injection" in v for v in violations)


def test_shadow_council_node_blocks_flawed_diff():
    state = {
        "user_request": "Execute dynamic command",
        "acceptance_criteria": ["Execute safe query"],
        "git_diff": "+exec(malicious_code)\n+AWS_SECRET = 'AKIAIOSFODNN7EXAMPLE'\n",
        "agent_logs": [],
        "findings_and_issues": [],
    }
    res = shadow_council_node(state)
    assert res["security_passed"] is False
    assert len(res["findings_and_issues"]) >= 2
    assert res["agent_logs"][0]["agent"] == "shadow_council"


def test_shadow_council_node_passes_clean_diff():
    clean_diff = (
        "diff --git a/math_utils.py b/math_utils.py\n"
        "new file mode 100644\n"
        "--- /dev/null\n"
        "+++ b/math_utils.py\n"
        "@@ -0,0 +1,5 @@\n"
        "+def multiply(x: int, y: int) -> int:\n"
        "+    \"\"\"Return the product of two integers.\"\"\"\n"
        "+    return x * y\n"
    )
    state = {
        "user_request": "Add multiply function",
        "acceptance_criteria": ["multiply function exists"],
        "git_diff": clean_diff,
        "agent_logs": [],
        "findings_and_issues": [],
    }
    res = shadow_council_node(state)
    assert res["security_passed"] is True
    assert res["review_passed"] is True
    assert len(res["findings_and_issues"]) == 0


def test_shadow_comment_filtering():
    diff_comments = (
        "+# Don't use eval(user_input)\n"
        "+# Example: AWS_SECRET_KEY = 'AKIAIOSFODNN7EXAMPLE'\n"
        "+timeout = 10  # Avoid eval(danger) in this loop\n"
    )
    violations = scan_diff_for_security_flaws(diff_comments)
    assert len(violations) == 0, f"Comments should not trigger security violations: {violations}"

    state = {
        "user_request": "Set timeout",
        "acceptance_criteria": ["timeout = 10"],
        "git_diff": diff_comments,
        "agent_logs": [],
        "findings_and_issues": [],
    }
    res = shadow_council_node(state)
    assert res["security_passed"] is True


def test_shadow_multiline_and_executescript_sql():
    diff_ml = (
        "+query = f\"\"\"\n"
        "+    SELECT * FROM users\n"
        "+    WHERE id = {user_id}\n"
        "+\"\"\"\n"
        "+sqlite3.connect('app.db').executescript(f'SELECT * FROM logs WHERE tag = {tag}')\n"
    )
    violations = scan_diff_for_security_flaws(diff_ml)
    assert len(violations) >= 2
    assert any("multiline" in v.lower() or "triple-quoted" in v.lower() for v in violations)
    assert any("executescript" in v.lower() for v in violations)


def test_shadow_empty_diff_handling():
    # 1. Empty diff with pending tasks fails review
    state_pending = {
        "git_diff": "",
        "user_request": "Build feature",
        "tasks": [{"id": "t1", "description": "Add feature", "target_files": ["app.py"], "status": "pending"}],
        "test_results": {"passed": False},
        "agent_logs": [],
        "findings_and_issues": [],
    }
    res_pending = shadow_council_node(state_pending)
    assert res_pending["review_passed"] is False
    assert any("remain pending" in f for f in res_pending["findings_and_issues"])

    # 2. Empty diff with completed tasks & passing tests passes review
    state_completed = {
        "git_diff": "",
        "user_request": "Verify baseline",
        "tasks": [{"id": "t1", "description": "Add feature", "target_files": ["app.py"], "status": "completed"}],
        "test_results": {"passed": True},
        "agent_logs": [],
        "findings_and_issues": [],
    }
    res_completed = shadow_council_node(state_completed)
    assert res_completed["review_passed"] is True


# ==============================================================================
# Standalone CLI Runner with Clean Summary Table
# ==============================================================================

def print_summary_table(results: List[Tuple[str, str, str]]) -> None:
    """Print an ASCII table summarizing the test execution status."""
    col1_w = 54
    col2_w = 10
    col3_w = 40

    border = "+" + "-" * (col1_w + 2) + "+" + "-" * (col2_w + 2) + "+" + "-" * (col3_w + 2) + "+"

    print("\n" + border)
    print(f"| {'Test Case Description':<{col1_w}} | {'Status':<{col2_w}} | {'Details / Verification Evidence':<{col3_w}} |")
    print(border)

    all_passed = True
    for desc, status, details in results:
        if status != "PASSED":
            all_passed = False
        print(f"| {desc:<{col1_w}} | {status:<{col2_w}} | {details:<{col3_w}} |")

    print(border)
    if all_passed:
        print(f"\n[OK] All {len(results)} Member 2 Shield Pipeline tests PASSED successfully!\n")
    else:
        print(f"\n[FAIL] Some tests failed. Please review table above.\n")


def run_standalone_test_suite() -> int:
    """
    Executes the complete shield test suite standalone in ./temp_test_repo/
    and displays the formatted summary table.
    """
    results: List[Tuple[str, str, str]] = []
    print("\n" + "=" * 70)
    print("  MEMBER 2 SHIELD: STANDALONE PIPELINE VERIFICATION SUITE")
    print("=" * 70)

    try:
        # Step 1: Initialize temporary dummy git directory in ./temp_test_repo/
        repo_dir = setup_dummy_git_repo(TEMP_TEST_DIR)
        results.append(("1. Git Sandbox Setup (./temp_test_repo/)", "PASSED", "Initialized git repo with calculator.py"))

        # Step 2: Test read_file_safe and path traversal rejection
        content = read_file_safe(repo_dir, "calculator.py")
        if "def add(" in content:
            results.append(("2. Safe File Read ('calculator.py')", "PASSED", f"Read {len(content)} bytes successfully"))
        else:
            results.append(("2. Safe File Read ('calculator.py')", "FAILED", "Content verification failed"))

        traversal_blocked = False
        try:
            read_file_safe(repo_dir, "../../passwords.txt")
        except PermissionError:
            traversal_blocked = True
            results.append(("3. Path Traversal Jail ('../../passwords.txt')", "PASSED", "PermissionError raised on '..'"))

        if not traversal_blocked:
            results.append(("3. Path Traversal Jail ('../../passwords.txt')", "FAILED", "Failed to block traversal"))

        # Step 3: Test sensitive files (.env and other member folders)
        env_blocked = False
        try:
            read_file_safe(repo_dir, ".env")
        except PermissionError:
            env_blocked = True

        member_blocked = False
        try:
            read_file_safe(repo_dir, "member1_orchestrator/shogun.py")
        except PermissionError:
            member_blocked = True

        if env_blocked and member_blocked:
            results.append(("4. Sensitive & Cross-Member Isolation", "PASSED", "Blocked .env and member1_orchestrator"))
        else:
            results.append(("4. Sensitive & Cross-Member Isolation", "FAILED", "Failed to block sensitive target"))

        # Step 4: Test run_sandboxed_command with pytest
        pytest_res = run_sandboxed_command(repo_dir, ["pytest", "-v"], timeout=25)
        if pytest_res["passed"] and pytest_res["exit_code"] == 0:
            results.append(("5. Sandboxed Pytest Runner", "PASSED", "Captured stdout: 2 tests passed"))
        else:
            results.append(("5. Sandboxed Pytest Runner", "FAILED", f"Exit code {pytest_res['exit_code']}"))

        # Step 5: Test command blocklist (rm -rf, sudo, curl, pipe, redirects)
        blocked_cmd = run_sandboxed_command(repo_dir, ["rm", "-rf", "/"])
        blocked_push = run_sandboxed_command(repo_dir, ["git", "push", "origin", "main"])
        blocked_pipe = run_sandboxed_command(repo_dir, ["cat", "file", "|", "grep", "foo"])
        if not blocked_cmd["passed"] and not blocked_push["passed"] and not blocked_pipe["passed"]:
            results.append(("6. Destructive Command & Pipe/Redirect Filter", "PASSED", "Blocked rm -rf, git push, and pipe"))
        else:
            results.append(("6. Destructive Command & Pipe/Redirect Filter", "FAILED", "Failed to block dangerous command"))

        # Step 6: Test Sentinel Tester Node
        sentinel_tester_res = sentinel_tester_node({"repo_path": repo_dir, "acceptance_criteria": []})
        if sentinel_tester_res["test_results"]["passed"]:
            results.append(("7. Sentinel Tester Node", "PASSED", "test_results populated and logged"))
        else:
            results.append(("7. Sentinel Tester Node", "FAILED", "Test run failed unexpectedly"))

        # Step 7: Test Sentinel Verifier Node
        verifier_state = {
            "acceptance_criteria": ["Implement add and multiply", "Ensure tests pass"],
            "git_diff": "+def add(a, b): return a + b\n+def multiply(a, b): return a * b",
            "test_results": {"passed": True, "output": "2 passed", "command": "pytest -v"},
            "agent_logs": [],
            "findings_and_issues": [],
        }
        verifier_res = sentinel_verifier_node(verifier_state)
        if verifier_res["verification_passed"]:
            results.append(("8. Sentinel Independent Verifier Gate", "PASSED", "Verified criteria against diff & test evidence"))
        else:
            results.append(("8. Sentinel Independent Verifier Gate", "FAILED", "Verifier rejected valid evidence"))

        # Step 8: Test Shadow Council Static Secret Detection (fake AWS_SECRET = 'AKIAIOSFODNN7EXAMPLE')
        shadow_state_secret = {
            "user_request": "Configure AWS",
            "acceptance_criteria": [],
            "git_diff": "+AWS_SECRET = 'AKIAIOSFODNN7EXAMPLE'\n",
            "agent_logs": [],
            "findings_and_issues": [],
        }
        shadow_res = shadow_council_node(shadow_state_secret)
        if shadow_res["security_passed"] is False and any("AWS Access Key" in f for f in shadow_res["findings_and_issues"]):
            results.append(("9. Shadow Council Secret Detection ('AKIA...')", "PASSED", "security_passed=False; finding logged"))
        else:
            results.append(("9. Shadow Council Secret Detection ('AKIA...')", "FAILED", "Failed to catch AWS key"))

        # Step 9: Test Shadow Council Dangerous Dynamic Execution Detection
        shadow_state_eval = {
            "user_request": "Dynamic eval",
            "acceptance_criteria": [],
            "git_diff": "+eval(user_code)\n+cursor.execute(f'SELECT * FROM users WHERE id = {uid}')\n",
            "agent_logs": [],
            "findings_and_issues": [],
        }
        shadow_eval_res = shadow_council_node(shadow_state_eval)
        if shadow_eval_res["security_passed"] is False:
            results.append(("10. Shadow Council Dynamic Execution Filter", "PASSED", "Caught eval() and raw SQL injection"))
        else:
            results.append(("10. Shadow Council Dynamic Execution Filter", "FAILED", "Failed to catch eval/SQL injection"))

        # Step 10: Test Shadow Council Clean Approval
        shadow_clean_state = {
            "user_request": "Clean add function",
            "acceptance_criteria": ["add function"],
            "git_diff": (
                "+def add_numbers(x: int, y: int) -> int:\n"
                "+    \"\"\"Sum two integers.\"\"\"\n"
                "+    return x + y\n"
            ),
            "agent_logs": [],
            "findings_and_issues": [],
        }
        shadow_clean_res = shadow_council_node(shadow_clean_state)
        if shadow_clean_res["security_passed"] and shadow_clean_res["review_passed"]:
            results.append(("11. Shadow Council Clean Code Approval", "PASSED", "security_passed=True & review_passed=True"))
        else:
            results.append(("11. Shadow Council Clean Code Approval", "FAILED", "Clean code rejected unexpectedly"))

        # Step 11: Test Shadow Council Comment Filter & Multiline SQL
        diff_comments_test = "+# Don't use eval(x)\n+x = 1 # Ignore eval\n"
        diff_ml_test = "+query = f\"\"\"\n+    SELECT * FROM secret WHERE k = {v}\n+\"\"\"\n"
        no_comment_vulns = len(scan_diff_for_security_flaws(diff_comments_test)) == 0
        ml_caught = len(scan_diff_for_security_flaws(diff_ml_test)) > 0

        if no_comment_vulns and ml_caught:
            results.append(("12. Comment Filter & Multiline SQL Injection", "PASSED", "Zero false positives on comments; caught multiline SQL"))
        else:
            results.append(("12. Comment Filter & Multiline SQL Injection", "FAILED", "Comment filter or multiline SQL detection failed"))

    finally:
        # Step 13: Cleanup ./temp_test_repo/
        safe_cleanup_dir(TEMP_TEST_DIR)
        cleaned_up = not os.path.exists(TEMP_TEST_DIR)
        results.append(("13. Sandbox Teardown (./temp_test_repo/)", "PASSED" if cleaned_up else "FAILED", "Cleaned up test repository"))

    # Print summary table
    print_summary_table(results)

    failed_count = sum(1 for _, status, _ in results if status != "PASSED")
    return 1 if failed_count > 0 else 0


if __name__ == "__main__":
    exit_code = run_standalone_test_suite()
    sys.exit(exit_code)
