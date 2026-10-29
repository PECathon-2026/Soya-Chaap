import sys
import json
import re
import os

try:
    raw = sys.stdin.read()
    payload = json.loads(raw) if raw.strip() else {}
except Exception:
    payload = {}

tool_name = payload.get("tool_name", "")
tool_input = payload.get("tool_input", {})
target_file = (
    tool_input.get("TargetFile")
    or tool_input.get("file_path")
    or tool_input.get("Path")
    or ""
)
command_line = (
    tool_input.get("CommandLine")
    or tool_input.get("command")
    or ""
)

# 1. Lock shared_contract.py once created
if target_file and "shared_contract.py" in target_file:
    if os.path.exists("shared_contract.py"):
        sys.stderr.write("BLOCKED BY DEVPILOT GUARD: shared_contract.py is a locked team contract and cannot be modified!\n")
        sys.exit(2)

# 2. Block Path Traversal & Secret Files
if target_file:
    if ".." in target_file or ".env" in target_file:
        sys.stderr.write(f"BLOCKED BY DEVPILOT GUARD: Out-of-workspace path or .env access ('{target_file}') is forbidden.\n")
        sys.exit(2)

# 3. Block Destructive Terminal Commands
if tool_name == "run_command" and command_line:
    if re.search(r"(rm\s+-rf|sudo\s+|git\s+push\s+--force|git\s+reset\s+--hard|mkfs|dd\s+if=)", command_line, re.IGNORECASE):
        sys.stderr.write(f"BLOCKED BY DEVPILOT GUARD: Destructive command '{command_line}' is strictly prohibited.\n")
        sys.exit(2)

sys.exit(0)

