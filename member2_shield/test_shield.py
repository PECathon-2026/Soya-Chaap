"""
Unit and Integration Tests for Member 2 Shield
Validates path traversal prevention, command sandboxing, test execution,
acceptance verification, and security scanning.
"""

import os
from pathlib import Path
import tempfile
import pytest

from member2_shield.file_tools import (
    read_file_safe,
    write_file_safe,
    search_code_safe,
    list_files_safe,
)
from member2_shield.shell_tools import (
    run_sandboxed_command,
    get_git_diff,
    check_command_safety,
)
from member2_shield.sentinel import (
    sentinel_tester_node,
    sentinel_verifier_node,
)
from member2_shield.shadow import (
    shadow_council_node,
    scan_diff_for_security_flaws,
)


@pytest.fixture
def temp_repo():
    """Create a temporary sandbox repository for testing file and shell tools."""
    with tempfile.TemporaryDirectory() as tmp_dir:
        # Create a sample structure
        src_dir = os.path.join(tmp_dir, "src")
        os.makedirs(src_dir, exist_ok=True)
        
        main_py = os.path.join(src_dir, "main.py")
        with open(main_py, "w", encoding="utf-8") as f:
            f.write("def add(a, b):\n    return a + b\n")

        # Create sensitive files that must be blocked
        env_file = os.path.join(tmp_dir, ".env")
        with open(env_file, "w", encoding="utf-8") as f:
            f.write("SECRET_KEY=supersecret123\n")

        yield tmp_dir


# --- File Tools Tests ---

def test_read_file_safe_success(temp_repo):
    content = read_file_safe(temp_repo, "src/main.py")
    assert "def add(a, b):" in content


def test_write_file_safe_success(temp_repo):
    res = write_file_safe(temp_repo, "src/utils.py", "def helper(): pass")
    assert "Successfully wrote" in res
    assert os.path.exists(os.path.join(temp_repo, "src", "utils.py"))


def test_path_traversal_blocked(temp_repo):
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
    # .env must be hidden and filtered out
    assert ".env" not in files


# --- Shell Tools Tests ---

def test_run_sandboxed_command_list_args(temp_repo):
    res = run_sandboxed_command(temp_repo, ["python", "-c", "print('Shield active')"], timeout=25)
    assert res["passed"] is True
    assert res["exit_code"] == 0
    assert "Shield active" in res["stdout"]
    assert "stderr" in res


def test_run_sandboxed_command_blocked(temp_repo):
    # Test destructive blocklist triggers
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
    import subprocess
    # Initialize a temporary git repo
    subprocess.run(["git", "init"], cwd=temp_repo, check=True, capture_output=True)
    subprocess.run(["git", "config", "user.name", "TestUser"], cwd=temp_repo, check=True, capture_output=True)
    subprocess.run(["git", "config", "user.email", "test@test.com"], cwd=temp_repo, check=True, capture_output=True)
    
    # Create initial commit
    init_file = os.path.join(temp_repo, "hello.txt")
    with open(init_file, "w") as f:
        f.write("Line 1\n")
    subprocess.run(["git", "add", "hello.txt"], cwd=temp_repo, check=True, capture_output=True)
    subprocess.run(["git", "commit", "-m", "Initial"], cwd=temp_repo, check=True, capture_output=True)
    
    # Modify hello.txt (unstaged)
    with open(init_file, "a") as f:
        f.write("Line 2\n")

    # Add staged file
    staged_file = os.path.join(temp_repo, "staged.txt")
    with open(staged_file, "w") as f:
        f.write("Staged content\n")
    subprocess.run(["git", "add", "staged.txt"], cwd=temp_repo, check=True, capture_output=True)
        
    # Create untracked file
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


# --- Sentinel Tests ---

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
        "acceptance_criteria": ["Add calculate_total function", "Ensure all tests pass"],
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


# --- Shadow Council Tests ---

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
        "git_diff": "+exec(malicious_code)\n+secret_key = '1234567890abcdef1234567890'",
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
