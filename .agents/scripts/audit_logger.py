import sys
import json
from datetime import datetime, timezone

try:
    raw = sys.stdin.read()
    payload = json.loads(raw) if raw.strip() else {}
except Exception:
    payload = {}

tool_name = payload.get("tool_name", "unknown")
ts = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

try:
    with open(".devpilot_audit.log", "a", encoding="utf-8") as f:
        f.write(f"[{ts}] ANTIGRAVITY_TOOL={tool_name}\n")
except Exception:
    pass

sys.exit(0)

