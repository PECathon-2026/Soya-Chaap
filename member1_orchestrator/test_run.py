import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from shared_contract import MissionState
from member1_orchestrator.graph import build_devpilot_graph

def main():
    print("Testing DevPilot LangGraph flow with Gemini...")
    graph = build_devpilot_graph()
    
    initial_state: MissionState = {
        "user_request": "Add input validation to calculator functions",
        "repo_path": "./member4_server/sandbox_repos/01_feature_impl",
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
        "max_iterations": 3,
        "human_approved": False
    }

    config = {"configurable": {"thread_id": "session-test-002"}}
    
    for event in graph.stream(initial_state, config=config):
        for node_name, state_update in event.items():
            print(f"==> Executed Node: {node_name}")
            
            # Handle standard node updates (dictionary)
            if isinstance(state_update, dict):
                logs = state_update.get("agent_logs")
                if logs and isinstance(logs, list):
                    print(f"    Latest Log: {logs[-1].get('message', logs[-1])}")
            # Handle human oversight pause (__interrupt__)
            elif node_name == "__interrupt__":
                print("    [PAUSED] Reached Human-in-the-Loop approval checkpoint.")

    print("\nState Machine execution complete! Ready for FastAPI WebSocket bridge.")

if __name__ == "__main__":
    main()
