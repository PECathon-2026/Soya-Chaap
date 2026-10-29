"""
Member 2 Shield: Safe Shell & Execution Tools
Provides sandboxed execution for tests and tools with destructive command blocking,
pipe/redirect filtering, timeout protection, and git diff extraction.
"""

import os
from pathlib import Path
import re
import shlex
import shutil
import subprocess
import sys
import tempfile
from typing import Any, Dict, List, Optional, Union

# Blocked command patterns (regexes) for destructive actions and network calls
BLOCKED_PATTERNS = [
    (r"\brm\s+(-[a-zA-Z]*r[a-zA-Z]*f*|-[a-zA-Z]*f[a-zA-Z]*r*|\/s|\/q)\b", "Destructive recursive deletion (rm -rf / rm -r)"),
    (r"\brmdir\s+[\/\-]s\b", "Destructive directory removal (rmdir /s)"),
    (r"\bsudo\b", "Privilege escalation (sudo)"),
    (r"\bsu(\s+-[a-zA-Z]*)?\b", "Switch user execution (su)"),
    (r"\bmkfs(\.[a-zA-Z0-9]+)?\b", "Filesystem creation/formatting (mkfs)"),
    (r"\bgit\s+push\b", "Outbound repository push (git push)"),
    (r"\bgit\s+reset\s+--hard\b", "Destructive git reset (git reset --hard)"),
    (r"\bgit\s+clean\s+.*-f\b", "Destructive untracked cleanup (git clean -f)"),
    (r"\bcurl\b", "Outbound network transfer (curl)"),
    (r"\bwget\b", "Outbound network download (wget)"),
    (r"\b(nc|ncat|netcat)\b", "Raw network socket connection (nc/ncat/netcat)"),
    (r"\bchmod\s+777\b", "Insecure permission grant (chmod 777)"),
    (r"\bchown\b", "File ownership alteration (chown)"),
    (r"\bfdisk\b", "Partition table manipulation (fdisk)"),
    (r"\bdd\s+if=", "Raw block device overwrite (dd)"),
    (r"\bformat\s+[a-zA-Z]:", "Windows drive format command"),
    (r"\b(shutdown|reboot|init\s+0|halt)\b", "System termination/reboot"),
    (r":\(\)\s*\{\s*:\s*\|\s*:\s*&\s*\}\s*;\s*:", "Fork bomb denial of service"),
    (r"\b(Invoke-WebRequest|Invoke-RestMethod|iwr|irm)\b", "PowerShell network request"),
]

# Explicit redirect tokens prohibited from command execution
REDIRECT_TOKENS = {">", ">>", "<", "<<", "2>", "1>", "2>&1", ">&", "|&"}


def check_command_safety(cmd_args: List[str]) -> Optional[str]:
    """
    Check if a command argument list violates sandbox security rules.
    Blocks destructive commands, git push, curl, wget, nc, pipes, and redirects.

    Args:
        cmd_args: List of command arguments.

    Returns:
        Violation description if prohibited, or None if safe.
    """
    if not cmd_args:
        return "Empty command argument list."

    # 1. Block pipe commands ('|' in any argument token)
    for arg in cmd_args:
        if "|" in arg:
            return f"Pipe operator ('|') detected in command argument: '{arg}'"

    # 2. Block file redirect operators ('>', '>>', '<', etc.)
    for arg in cmd_args:
        if arg in REDIRECT_TOKENS:
            return f"Redirection operator ('{arg}') detected."
        # Match tokens like '>file.txt' or '2>error.log'
        if re.search(r"(?:^|[0-9])(?:>>?|<<?)[a-zA-Z0-9_\-\.\/]", arg):
            return f"Redirection operator detected in command argument: '{arg}'"

    # 3. Assemble command string to evaluate pattern blocklist
    full_cmd = " ".join(cmd_args)
    for pattern, description in BLOCKED_PATTERNS:
        if re.search(pattern, full_cmd, re.IGNORECASE):
            return f"{description} matched pattern '{pattern}'"

    return None


def run_sandboxed_command(
    repo_path: str,
    cmd_args: Union[List[str], str],
    timeout: int = 25,
) -> Dict[str, Any]:
    """
    Execute a sandboxed command within repo_path using subprocess.run(shell=False).
    Enforces a strict blocklist against destructive commands, network calls,
    pipe operators, and redirection.

    Args:
        repo_path: Base directory of the repository where the command is executed.
        cmd_args: Command to execute as a list of strings (e.g. ['pytest', '-v'])
                  or command string (auto-tokenized safely).
        timeout: Execution timeout limit in seconds (default: 25).

    Returns:
        Clean dictionary matching:
        {
            "passed": bool,
            "stdout": str,
            "stderr": str,
            "exit_code": int,
            "output": str,      # Combined output for backward compatibility
            "command": str,     # Executed command string
        }
    """
    if not repo_path:
        return {
            "passed": False,
            "stdout": "",
            "stderr": "Execution error: repo_path must be specified.",
            "exit_code": 1,
            "output": "Execution error: repo_path must be specified.",
            "command": str(cmd_args),
        }

    real_repo = os.path.realpath(repo_path)
    if not os.path.isdir(real_repo):
        return {
            "passed": False,
            "stdout": "",
            "stderr": f"Execution error: Repository directory does not exist: '{repo_path}'",
            "exit_code": 1,
            "output": f"Execution error: Repository directory does not exist: '{repo_path}'",
            "command": str(cmd_args),
        }

    # Normalize cmd_args to List[str]
    if isinstance(cmd_args, str):
        cleaned = cmd_args.strip()
        if not cleaned:
            return {
                "passed": False,
                "stdout": "",
                "stderr": "Execution error: Empty command provided.",
                "exit_code": 1,
                "output": "Execution error: Empty command provided.",
                "command": "",
            }
        try:
            parsed_args = shlex.split(cleaned, posix=True)
        except ValueError as err:
            return {
                "passed": False,
                "stdout": "",
                "stderr": f"Command parsing error: {str(err)}",
                "exit_code": 1,
                "output": f"Command parsing error: {str(err)}",
                "command": cleaned,
            }
    elif isinstance(cmd_args, (list, tuple)):
        parsed_args = [str(arg) for arg in cmd_args if str(arg).strip()]
    else:
        return {
            "passed": False,
            "stdout": "",
            "stderr": f"Invalid argument type for cmd_args: {type(cmd_args).__name__}",
            "exit_code": 1,
            "output": f"Invalid argument type for cmd_args: {type(cmd_args).__name__}",
            "command": str(cmd_args),
        }

    if not parsed_args:
        return {
            "passed": False,
            "stdout": "",
            "stderr": "Execution error: Command argument list is empty.",
            "exit_code": 1,
            "output": "Execution error: Command argument list is empty.",
            "command": "",
        }

    cmd_string = " ".join(parsed_args)

    # Enforce security blocklist and pipe/redirect filtering
    violation = check_command_safety(parsed_args)
    if violation:
        err_msg = f"SECURITY POLICY VIOLATION: Command rejected. Reason: {violation}"
        return {
            "passed": False,
            "stdout": "",
            "stderr": err_msg,
            "exit_code": 126,
            "output": err_msg,
            "command": cmd_string,
        }

    # Map well-known Python tools to the active Python environment
    executable = parsed_args[0]
    final_args = list(parsed_args)

    if executable == "pytest":
        pytest_path = shutil.which("pytest")
        if pytest_path:
            final_args[0] = pytest_path
        else:
            final_args = [sys.executable, "-m", "pytest"] + parsed_args[1:]
    elif executable in ("python", "python3"):
        final_args[0] = sys.executable

    # Prepare sanitized execution environment
    env = os.environ.copy()
    env["PYTHONUNBUFFERED"] = "1"
    env["PYTHONDONTWRITEBYTECODE"] = "1"

    try:
        result = subprocess.run(
            final_args,
            cwd=real_repo,
            shell=False,
            capture_output=True,
            text=True,
            timeout=timeout,
            env=env,
        )
        stdout = result.stdout or ""
        stderr = result.stderr or ""
        combined_output = (stdout + ("\n" if stdout and stderr else "") + stderr).strip()

        return {
            "passed": result.returncode == 0,
            "stdout": stdout,
            "stderr": stderr,
            "exit_code": result.returncode,
            "output": combined_output,
            "command": cmd_string,
        }
    except subprocess.TimeoutExpired as e:
        stdout_str = e.stdout.decode("utf-8", errors="replace") if isinstance(e.stdout, bytes) else (e.stdout or "")
        stderr_str = e.stderr.decode("utf-8", errors="replace") if isinstance(e.stderr, bytes) else (e.stderr or "")
        timeout_msg = f"TIMEOUT: Command exceeded limit of {timeout} seconds."
        combined = f"{timeout_msg}\n{stdout_str}\n{stderr_str}".strip()

        return {
            "passed": False,
            "stdout": stdout_str,
            "stderr": f"{timeout_msg}\n{stderr_str}".strip(),
            "exit_code": 124,
            "output": combined,
            "command": cmd_string,
        }
    except FileNotFoundError:
        not_found_msg = f"Executable not found on system PATH: '{parsed_args[0]}'"
        return {
            "passed": False,
            "stdout": "",
            "stderr": not_found_msg,
            "exit_code": 127,
            "output": not_found_msg,
            "command": cmd_string,
        }
    except Exception as exc:
        exc_msg = f"Subprocess execution error: {type(exc).__name__}: {str(exc)}"
        return {
            "passed": False,
            "stdout": "",
            "stderr": exc_msg,
            "exit_code": 1,
            "output": exc_msg,
            "command": cmd_string,
        }


def get_git_diff(repo_path: str) -> str:
    """
    Run git diff inside repo_path to return all uncommitted changes,
    including staged and unstaged working tree modifications and untracked files.

    Args:
        repo_path: Base directory of the repository.

    Returns:
        Unified git diff string.
    """
    real_repo = os.path.realpath(repo_path)
    if not os.path.isdir(real_repo):
        return f"Error: Repository directory '{repo_path}' does not exist."

    # Verify directory is a valid git worktree
    check_git = subprocess.run(
        ["git", "rev-parse", "--is-inside-work-tree"],
        cwd=real_repo,
        shell=False,
        capture_output=True,
        text=True,
    )
    if check_git.returncode != 0:
        return f"Error: '{repo_path}' is not a valid git repository."

    diff_parts: List[str] = []

    # 1. Capture changes against HEAD (covers both staged and unstaged tracked files)
    diff_head = subprocess.run(
        ["git", "diff", "HEAD"],
        cwd=real_repo,
        shell=False,
        capture_output=True,
        text=True,
    )
    if diff_head.returncode == 0 and diff_head.stdout.strip():
        diff_parts.append(diff_head.stdout.strip())
    else:
        # If HEAD does not exist (new repository without an initial commit), diff unstaged and staged
        diff_unstaged = subprocess.run(
            ["git", "diff"],
            cwd=real_repo,
            shell=False,
            capture_output=True,
            text=True,
        )
        if diff_unstaged.returncode == 0 and diff_unstaged.stdout.strip():
            diff_parts.append(diff_unstaged.stdout.strip())

        diff_staged = subprocess.run(
            ["git", "diff", "--staged"],
            cwd=real_repo,
            shell=False,
            capture_output=True,
            text=True,
        )
        if diff_staged.returncode == 0 and diff_staged.stdout.strip():
            diff_parts.append(diff_staged.stdout.strip())

    # 2. Capture untracked new files so they are visible in diff reviews
    status_proc = subprocess.run(
        ["git", "status", "--porcelain"],
        cwd=real_repo,
        shell=False,
        capture_output=True,
        text=True,
    )
    if status_proc.returncode == 0 and status_proc.stdout.strip():
        for line in status_proc.stdout.splitlines():
            line = line.strip()
            if line.startswith("??"):
                untracked_file = line[2:].strip().strip('"')
                untracked_full = os.path.join(real_repo, untracked_file)
                if os.path.isfile(untracked_full):
                    try:
                        with open(untracked_full, "r", encoding="utf-8", errors="replace") as f:
                            file_lines = f.readlines()
                        num_lines = len(file_lines)
                        diff_parts.append(
                            f"diff --git a/{untracked_file} b/{untracked_file}\n"
                            f"new file mode 100644\n"
                            f"--- /dev/null\n"
                            f"+++ b/{untracked_file}\n"
                            f"@@ -0,0 +1,{num_lines} @@\n"
                            + "".join(f"+{l}" for l in file_lines).rstrip()
                        )
                    except Exception:
                        pass

    return "\n\n".join(diff_parts).strip()


if __name__ == "__main__":
    print("=== Member 2 Shield: Running shell_tools.py Self-Tests ===")
    with tempfile.TemporaryDirectory() as temp_dir:
        real_temp = os.path.realpath(temp_dir)

        # 1. Test safe command execution with list of strings
        res_safe = run_sandboxed_command(real_temp, ["python", "-c", "print('Shell tools safe')"], timeout=25)
        assert res_safe["passed"] is True, "Safe command failed"
        assert res_safe["exit_code"] == 0, "Safe command exit code should be 0"
        assert "Shell tools safe" in res_safe["stdout"], "Stdout did not contain expected text"
        print("[PASS] Safe command list execution verified.")

        # 2. Test strictly blocked commands
        blocked_test_commands = [
            (["rm", "-rf", "/"], "rm -rf"),
            (["sudo", "whoami"], "sudo"),
            (["mkfs", "/dev/sda1"], "mkfs"),
            (["git", "push", "origin", "main"], "git push"),
            (["git", "reset", "--hard", "HEAD~1"], "git reset --hard"),
            (["curl", "https://example.com"], "curl"),
            (["wget", "https://example.com"], "wget"),
            (["nc", "-l", "9999"], "nc"),
            (["ncat", "-l", "9999"], "ncat"),
            (["cat", "file.txt", "|", "grep", "secret"], "pipe operator"),
            (["echo", "bad", ">", "out.txt"], "redirect operator >"),
            (["echo", "bad", ">>", "out.txt"], "redirect operator >>"),
            (["cat", "<", "input.txt"], "redirect operator <"),
        ]

        for cmd, name in blocked_test_commands:
            res_blocked = run_sandboxed_command(real_temp, cmd, timeout=25)
            assert res_blocked["passed"] is False, f"Blocked command '{name}' should have failed"
            assert res_blocked["exit_code"] == 126, f"Blocked command '{name}' should have exit code 126"
            assert "SECURITY POLICY VIOLATION" in res_blocked["stderr"], f"Missing violation notice for '{name}'"
            print(f"[PASS] Blocked command correctly intercepted: {name}")

        # 3. Test git diff execution (staged and unstaged changes)
        subprocess.run(["git", "init"], cwd=real_temp, check=True, capture_output=True)
        subprocess.run(["git", "config", "user.name", "Tester"], cwd=real_temp, check=True, capture_output=True)
        subprocess.run(["git", "config", "user.email", "tester@test.com"], cwd=real_temp, check=True, capture_output=True)

        # Create initial commit
        test_file = os.path.join(real_temp, "app.py")
        with open(test_file, "w") as f:
            f.write("print('v1')\n")
        subprocess.run(["git", "add", "app.py"], cwd=real_temp, check=True, capture_output=True)
        subprocess.run(["git", "commit", "-m", "v1"], cwd=real_temp, check=True, capture_output=True)

        # Modify app.py (unstaged) and create new staged file
        with open(test_file, "w") as f:
            f.write("print('v2')\n")
        staged_file = os.path.join(real_temp, "staged.py")
        with open(staged_file, "w") as f:
            f.write("print('staged')\n")
        subprocess.run(["git", "add", "staged.py"], cwd=real_temp, check=True, capture_output=True)

        diff_out = get_git_diff(real_temp)
        assert "app.py" in diff_out, "Unstaged diff missing in git diff"
        assert "staged.py" in diff_out, "Staged diff missing in git diff"
        print("[PASS] Git diff for staged and unstaged changes verified.")

    print("=== All shell_tools.py security checks & self-tests passed successfully! ===")
