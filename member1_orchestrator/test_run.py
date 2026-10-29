"""
member1_orchestrator/test_run.py
End-to-End Orchestration & Heterogeneous Multi-Agent LangGraph verification.

Dynamic Parameters:
- Target Repository: sys.argv[1] -> os.environ.get("TARGET_REPO_PATH") -> "./member4_server/sandbox_repos/01_feature_impl"
- Max Iterations: int(os.environ.get("MAX_ITERATIONS", 3))
- Environment loading: loads .env via dotenv.load_dotenv()
"""

import os
import sys
from pathlib import Path

# Automatic Environment Loading
try:
    import dotenv
    dotenv.load_dotenv()
except ImportError:
    pass

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from shared_contract import MissionState
from member1_orchestrator.graph import build_devpilot_graph


def main():
    repo_path = sys.argv[1] if len(sys.argv) > 1 else os.environ.get(
        "TARGET_REPO_PATH", "./member4_server/sandbox_repos/01_feature_impl"
    )
    max_iterations = int(os.environ.get("MAX_ITERATIONS", 3))

    print(f"Testing DevPilot LangGraph flow with Gemini...")
    print(f" -> Target Repo: {repo_path}")
    print(f" -> Max Iterations: {max_iterations}")

    graph = build_devpilot_graph()
    
    initial_state: MissionState = {
        "user_request": "Add input validation to calculator functions",
        "repo_path": repo_path,
        "acceptance_criteria": [],
        "tasks": [],
        "agent_logs": [],
        "findings_and_issues": [],
        "git_diff": "",
        "test_results": {"passed": False, "output": "", "command": ""},
        "verification_passed": False,
        "security_passed": False,
        "review_passed": False,
        "iteration_count": 0,
        "max_iterations": max_iterations,
        "human_approved": False,
    }

    config = {"configurable": {"thread_id": "session-test-002"}}
    
    for event in graph.stream(initial_state, config=config):
        for node_name, state_update in event.items():
            print(f"==> Executed Node: {node_name}")
            
            # Handle standard node updates (dictionary)
            if isinstance(state_update, dict):
                logs = state_update.get("agent_logs")
                if logs and isinstance(logs, list):
                    last_log = logs[-1]
                    details = last_log.get("details", {})
                    model_rep = (
                        last_log.get("model")
                        or (details.get("model_used") if isinstance(details, dict) else None)
                        or (details.get("model") if isinstance(details, dict) else None)
                        or last_log.get("model_used")
                        or "deterministic"
                    )
                    print(f"    Latest Log: {last_log.get('message', last_log)}")
                    print(f"    Active Model: {model_rep}")
            # Handle human oversight pause (__interrupt__)
            elif node_name == "__interrupt__":
                print("    [PAUSED] Reached Human-in-the-Loop approval checkpoint.")

    print("\nState Machine execution complete! Ready for FastAPI WebSocket bridge.")


if __name__ == "__main__":
    main()
