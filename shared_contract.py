import operator
from typing import Annotated, TypedDict, List, Dict, Any

class TaskItem(TypedDict):
    id: str
    description: str
    target_files: List[str]
    status: str  # "pending", "in_progress", "completed", "failed"

class MissionState(TypedDict):
    user_request: str
    repo_path: str
    acceptance_criteria: List[str]
    tasks: List[TaskItem]
    agent_logs: Annotated[List[Dict[str, Any]], operator.add]
    findings_and_issues: Annotated[List[str], operator.add]
    git_diff: str
    test_results: Dict[str, Any]       # {"passed": bool, "output": str, "command": str}
    verification_passed: bool
    security_passed: bool
    review_passed: bool
    iteration_count: int
    max_iterations: int
    human_approved: bool
