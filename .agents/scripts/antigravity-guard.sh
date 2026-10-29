#!/usr/bin/env bash
# Antigravity PreToolUse Guard: Protects shared_contract.py, blocks path traversal, and prevents destructive commands.
set -euo pipefail

PAYLOAD=$(cat)
TOOL_NAME=$(echo "$PAYLOAD" | jq -r '.tool_name // empty' 2>/dev/null || true)
TARGET_FILE=$(echo "$PAYLOAD" | jq -r '.tool_input.TargetFile // .tool_input.file_path // empty' 2>/dev/null || true)
COMMAND_LINE=$(echo "$PAYLOAD" | jq -r '.tool_input.CommandLine // .tool_input.command // empty' 2>/dev/null || true)

# 1. Lock shared_contract.py once created
if [[ -n "$TARGET_FILE" && "$TARGET_FILE" == *"shared_contract.py" && -f "shared_contract.py" ]]; then
  echo "BLOCKED BY DEVPILOT GUARD: shared_contract.py is a locked team contract and cannot be modified!" >&2
  exit 2
fi

# 2. Block Path Traversal & Secret Files
if [[ -n "$TARGET_FILE" ]]; then
  if [[ "$TARGET_FILE" == *".."* ]] || [[ "$TARGET_FILE" == *".env"* ]]; then
    echo "BLOCKED BY DEVPILOT GUARD: Out-of-workspace path or .env access ('$TARGET_FILE') is forbidden." >&2
    exit 2
  fi
fi

# 3. Block Destructive Terminal Commands
if [[ "$TOOL_NAME" == "run_command" && -n "$COMMAND_LINE" ]]; then
  if echo "$COMMAND_LINE" | grep -Eiq '(rm\s+-rf|sudo\s+|git\s+push\s+--force|git\s+reset\s+--hard|mkfs|dd\s+if=)'; then
    echo "BLOCKED BY DEVPILOT GUARD: Destructive command '$COMMAND_LINE' is strictly prohibited." >&2
    exit 2
  fi
fi

exit 0

