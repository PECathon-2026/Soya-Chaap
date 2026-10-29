#!/usr/bin/env bash
# Antigravity PostToolUse Hook: Appends transparent tool trace to .devpilot_audit.log
PAYLOAD=$(cat)
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || date +"%Y-%m-%dT%H:%M:%SZ")
TOOL_NAME=$(echo "$PAYLOAD" | jq -r '.tool_name // "unknown"' 2>/dev/null || echo "unknown")
echo "[$TIMESTAMP] ANTIGRAVITY_TOOL=$TOOL_NAME" >> .devpilot_audit.log
exit 0

