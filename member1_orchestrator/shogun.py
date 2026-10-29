"""
member1_orchestrator/shogun.py
The Shogun's Council: Lead Planning & Codebase Reconnaissance Node.

Responsibilities:
- Uses langchain_google_genai.ChatGoogleGenerativeAI (gemini-2.5-flash) with structured output.
- Defines Pydantic schema ShogunPlanOutput with acceptance_criteria, tasks, and reasoning.
- Inspects target repository context using safe shield tools (with safe local fallback).
- When iteration_count == 0: Analyzes user_request and file listings to generate initial
  acceptance criteria and granular tasks (status: pending).
- When iteration_count > 0: Inspects findings_and_issues and test diagnostics to adapt
  tasks, marking failed tasks as pending and explaining adaptations.
- Provides graceful fallback handling when GEMINI_API_KEY is missing or during offline testing.
- Emits structured updates complying with MissionState schema and additive reducer format.
"""

from __future__ import annotations

import json
import logging
import os
import re
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field

# ---------------------------------------------------------------------------
# State Schema Imports with Fail-Safe Fallbacks
# ---------------------------------------------------------------------------
try:
    from shared_contract import MissionState, TaskItem
except ImportError:
    import operator
    from typing import Annotated, TypedDict

    class TaskItem(TypedDict):
        id: str
        description: str
        target_files: List[str]
        status: str

    class MissionState(TypedDict):
        user_request: str
        repo_path: str
        acceptance_criteria: List[str]
        tasks: List[TaskItem]
        agent_logs: Annotated[List[Dict[str, Any]], operator.add]
        findings_and_issues: Annotated[List[str], operator.add]
        git_diff: str
        test_results: Dict[str, Any]
        verification_passed: bool
        security_passed: bool
        review_passed: bool
        iteration_count: int
        max_iterations: int
        human_approved: bool

# ---------------------------------------------------------------------------
# Shield Tool Imports with In-Scope Safe Fallbacks
# ---------------------------------------------------------------------------
try:
    from member2_shield.file_tools import list_files_safe, read_file_safe
except ImportError:
    def list_files_safe(repo_path: str) -> List[str]:
        """Safe local directory inspection fallback if Member 2 is not yet present."""
        repo_full = os.path.realpath(repo_path)
        collected: List[str] = []
        for root, dirs, files in os.walk(repo_full):
            dirs[:] = [
                d for d in dirs
                if not d.startswith(".") and d not in ("node_modules", "__pycache__", ".git", "venv", ".venv")
            ]
            for f in files:
                if f.startswith("."):
                    continue
                full_p = os.path.join(root, f)
                rel_p = os.path.relpath(full_p, repo_full).replace("\\", "/")
                collected.append(rel_p)
        return sorted(collected)

    def read_file_safe(repo_path: str, relative_path: str) -> str:
        """Safe local file reading fallback preventing directory traversal."""
        repo_full = os.path.realpath(repo_path)
        target = os.path.realpath(os.path.join(repo_full, relative_path))
        if not (target == repo_full or target.startswith(repo_full + os.sep)):
            raise PermissionError(f"Access denied: path traversal detected ({relative_path})")
        if not os.path.isfile(target):
            raise FileNotFoundError(f"File not found: {relative_path}")
        with open(target, "r", encoding="utf-8", errors="replace") as f:
            return f.read()

logger = logging.getLogger("shogun_planner")
if not logger.handlers:
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter("[%(asctime)s] [SHOGUN] %(message)s"))
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)

# ---------------------------------------------------------------------------
# Pydantic Schemas for Structured LLM Planning Output
# ---------------------------------------------------------------------------
class TaskItemSchema(BaseModel):
    id: str = Field(description="Unique task identifier, e.g. TASK-001")
    description: str = Field(description="Granular, actionable implementation instruction")
    target_files: List[str] = Field(description="List of relative file paths to create or modify")
    status: str = Field(default="pending", description="Task execution status: pending, in_progress, completed, failed")

class ShogunPlanOutput(BaseModel):
    acceptance_criteria: List[str] = Field(
        description="Verifiable, measurable criteria required for mission completion"
    )
    tasks: List[TaskItem] = Field(
        description="Granular sequence of implementation tasks matching the TaskItem schema"
    )
    reasoning: str = Field(
        description="Strategic reasoning explaining the plan or adaptations made to overcome blockers"
    )

# ---------------------------------------------------------------------------
# Codebase Inspection & Context Reconnaissance
# ---------------------------------------------------------------------------
def _inspect_codebase(repo_path: str, user_request: str) -> Dict[str, Any]:
    """
    Performs codebase reconnaissance using safe shield tools:
    discovers files, inspects README, test files, and files matching request keywords.
    """
    context: Dict[str, Any] = {
        "file_tree": [],
        "key_snippets": {},
        "test_files": [],
        "entrypoints": [],
    }

    try:
        all_files = list_files_safe(repo_path)
        context["file_tree"] = all_files
    except Exception as exc:
        logger.warning("Could not list files in repository '%s': %s", repo_path, exc)
        return context

    for path in all_files:
        lower = path.lower()
        if "test" in lower or lower.endswith("_test.py") or lower.startswith("test_"):
            context["test_files"].append(path)
        if lower in ("readme.md", "setup.py", "pyproject.toml", "main.py", "app.py", "index.js"):
            context["entrypoints"].append(path)

    request_words = set(re.findall(r"\b[a-zA-Z_]{3,}\b", user_request.lower()))
    relevant_files: List[str] = []
    for path in all_files:
        path_words = set(re.findall(r"\b[a-zA-Z_]{3,}\b", path.lower()))
        if path_words.intersection(request_words) or path in context["entrypoints"] or path in context["test_files"]:
            relevant_files.append(path)

    for path in relevant_files[:8]:
        try:
            content = read_file_safe(repo_path, path)
            lines = content.splitlines()
            context["key_snippets"][path] = "\n".join(lines[:200])
        except Exception as exc:
            logger.debug("Failed reading file '%s' during inspection: %s", path, exc)

    return context

# ---------------------------------------------------------------------------
# Deterministic Fallback Planner (Zero Placeholders, Always Reliable)
# ---------------------------------------------------------------------------
def _deterministic_plan(
    user_request: str,
    repo_context: Dict[str, Any],
    iteration_count: int,
    findings: List[str],
    existing_criteria: List[str],
    existing_tasks: List[TaskItem],
) -> ShogunPlanOutput:
    """
    Generates a concrete, production-ready plan without LLM dependency.
    Synthesizes repo structure, user intent, and feedback loops.
    """
    file_tree = repo_context.get("file_tree", [])
    test_files = repo_context.get("test_files", [])

    if iteration_count == 0:
        criteria = [
            f"Fulfill core request: {user_request.strip()}",
            "Preserve existing architecture, style, and conventions without introducing syntax defects",
            "Ensure all automated unit and integration tests execute cleanly and pass",
            "Pass security audit without hardcoded secrets, dangerous evaluations, or injection vulnerabilities",
        ]

        matched_targets: List[str] = []
        req_words = [w.lower() for w in re.findall(r"\b[a-zA-Z0-9_\-\.]+\b", user_request)]
        for f in file_tree:
            base = os.path.basename(f).lower()
            if any(w in base for w in req_words if len(w) > 3):
                matched_targets.append(f)

        if not matched_targets:
            for candidate in ("main.py", "app.py", "core.py", "server.py", "index.py"):
                if candidate in file_tree:
                    matched_targets.append(candidate)
                    break
            if not matched_targets and file_tree:
                matched_targets.append(file_tree[0])

        tasks: List[TaskItem] = [
            {
                "id": "TASK-001",
                "description": f"Inspect and implement required modifications for: {user_request.strip()}",
                "target_files": matched_targets if matched_targets else ["main.py"],
                "status": "pending",
            },
            {
                "id": "TASK-002",
                "description": "Verify and update test suite coverage to validate new changes against edge cases",
                "target_files": test_files if test_files else ["test_main.py"],
                "status": "pending",
            },
        ]
        reasoning = "Initial plan formulated using repository file structure and deterministic keyword analysis."
        return ShogunPlanOutput(acceptance_criteria=criteria, tasks=tasks, reasoning=reasoning)

    else:
        adapted_criteria = list(existing_criteria)
        adapted_criteria.append(
            f"[Iteration {iteration_count}] Remediate all {len(findings)} reported defects and verify security/test compliance"
        )

        adapted_tasks: List[TaskItem] = []
        for t in existing_tasks:
            current_status = t.get("status", "pending")
            new_status = "pending" if current_status == "failed" else current_status
            adapted_tasks.append({
                "id": t["id"],
                "description": t["description"],
                "target_files": t["target_files"],
                "status": new_status,
            })

        referenced_files: List[str] = []
        for issue in findings:
            for path in file_tree:
                if path in issue or os.path.basename(path) in issue:
                    if path not in referenced_files:
                        referenced_files.append(path)

        if not referenced_files and file_tree:
            referenced_files = [file_tree[0]]

        task_num = len(adapted_tasks) + 1
        adapted_tasks.append({
            "id": f"TASK-FIX-{task_num:03d}",
            "description": f"Address detected failures from iteration {iteration_count}: " + "; ".join(findings[:3]),
            "target_files": referenced_files,
            "status": "pending",
        })

        reasoning = (
            f"Adapted plan for iteration {iteration_count} to systematically resolve "
            f"{len(findings)} issues reported by Sentinel Verifiers and Shadow Council."
        )
        return ShogunPlanOutput(acceptance_criteria=adapted_criteria, tasks=adapted_tasks, reasoning=reasoning)

# ---------------------------------------------------------------------------
# LLM-Powered Planner with ChatGoogleGenerativeAI
# ---------------------------------------------------------------------------
def _invoke_llm_planner(
    user_request: str,
    repo_context: Dict[str, Any],
    iteration_count: int,
    findings: List[str],
    test_results: Dict[str, Any],
    existing_criteria: List[str],
    existing_tasks: List[TaskItem],
) -> Optional[ShogunPlanOutput]:
    """
    Invokes ChatGoogleGenerativeAI(model='gemini-2.5-flash', temperature=0.2)
    with .with_structured_output(ShogunPlanOutput).
    Returns None if GEMINI_API_KEY is missing or if invocation fails.
    """
    api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if not api_key:
        logger.info("GEMINI_API_KEY not found in environment; using graceful deterministic Shogun engine.")
        return None

    try:
        from langchain_core.messages import HumanMessage, SystemMessage
        from langchain_google_genai import ChatGoogleGenerativeAI

        llm = ChatGoogleGenerativeAI(
            model="gemini-2.5-flash",
            temperature=0.2,
            api_key=api_key,
        )

        structured_llm = llm.with_structured_output(ShogunPlanOutput)

        system_prompt = (
            "You are The Shogun's Council: Lead Strategic Planning and Codebase Reconnaissance Agent of the DevPilot Guild. "
            "Your objective is to decompose engineering requests into verifiable acceptance criteria and granular tasks. "
            "Every task must conform strictly to the TaskItem schema: id, description, target_files, and status ('pending'). "
            "If iteration_count > 0, inspect findings_and_issues and test diagnostics, mark failed tasks as pending, "
            "and explain how the plan adapts to eliminate blockers. Adhere to all codebase conventions and safety standards."
        )

        if iteration_count == 0:
            user_content = (
                f"### MISSION PLANNING (Iteration 0)\n"
                f"User Request: {user_request}\n"
                f"Discovered Files:\n{json.dumps(repo_context.get('file_tree', []), indent=2)}\n"
                f"Test Files:\n{json.dumps(repo_context.get('test_files', []), indent=2)}\n"
                f"Key File Previews:\n{json.dumps(repo_context.get('key_snippets', {}), indent=2)}\n\n"
                "Formulate the initial mission plan with verifiable acceptance criteria, "
                "granular pending tasks matching the TaskItem schema, and strategic reasoning."
            )
        else:
            user_content = (
                f"### MISSION RE-PLANNING & ADAPTATION (Iteration {iteration_count})\n"
                f"User Request: {user_request}\n"
                f"Existing Acceptance Criteria:\n{json.dumps(existing_criteria, indent=2)}\n"
                f"Existing Tasks:\n{json.dumps(existing_tasks, indent=2)}\n"
                f"Active Findings & Issues:\n{json.dumps(findings, indent=2)}\n"
                f"Test Diagnostics:\n{json.dumps(test_results, indent=2)}\n"
                f"Discovered Files:\n{json.dumps(repo_context.get('file_tree', []), indent=2)}\n\n"
                "Revise the plan to resolve the blockers: mark failed tasks as pending, "
                "add explicit repair tasks for the reported failures, refine acceptance criteria, "
                "and provide reasoning explaining how the plan overcomes these blockers."
            )

        result: ShogunPlanOutput = structured_llm.invoke([
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_content),
        ])
        return result

    except Exception as exc:
        logger.warning(
            "Gemini Shogun planning encountered error: %s. Reverting to deterministic fallback.",
            exc,
        )
        return None

# ---------------------------------------------------------------------------
# Main Shogun Planner Node Definition
# ---------------------------------------------------------------------------
def shogun_planner_node(state: MissionState) -> Dict[str, Any]:
    """
    LangGraph Node: shogun_planner
    
    1. Inspects repo_path using safe tools from member2_shield.file_tools (with local fallback).
    2. Initializes ChatGoogleGenerativeAI(model="gemini-2.5-flash", temperature=0.2).
    3. Uses .with_structured_output(ShogunPlanOutput).
    4. On iteration_count == 0: Supplies user_request and file listings to generate initial plan.
    5. On iteration_count > 0: Supplies findings_and_issues and test diagnostics to adapt tasks,
       marking failed tasks as pending.
    6. Provides graceful fallback handling when GEMINI_API_KEY is missing.
    7. Returns state updates containing acceptance_criteria, tasks, and an appended entry in agent_logs.
    """
    user_request = state.get("user_request", "")
    repo_path = state.get("repo_path", ".")
    iteration_count = state.get("iteration_count", 0)
    findings = state.get("findings_and_issues", [])
    test_results = state.get("test_results", {})
    existing_criteria = state.get("acceptance_criteria", [])
    existing_tasks = state.get("tasks", [])

    logger.info("Executing Shogun Planner (Iteration %d) for repo: %s", iteration_count, repo_path)

    # 1. Reconnaissance via Safe Shield Tools
    repo_context = _inspect_codebase(repo_path, user_request)

    # 2. Plan Generation with Gemini 2.5 Flash (with graceful fallback)
    plan = _invoke_llm_planner(
        user_request=user_request,
        repo_context=repo_context,
        iteration_count=iteration_count,
        findings=findings,
        test_results=test_results,
        existing_criteria=existing_criteria,
        existing_tasks=existing_tasks,
    )

    if plan is None:
        plan = _deterministic_plan(
            user_request=user_request,
            repo_context=repo_context,
            iteration_count=iteration_count,
            findings=findings,
            existing_criteria=existing_criteria,
            existing_tasks=existing_tasks,
        )

    # Format tasks as List[TaskItem]
    formatted_tasks: List[TaskItem] = []
    for t in plan.tasks:
        if isinstance(t, dict):
            task_dict: TaskItem = {
                "id": t.get("id", f"TASK-{len(formatted_tasks)+1:03d}"),
                "description": t.get("description", ""),
                "target_files": t.get("target_files", []),
                "status": t.get("status", "pending"),
            }
        else:
            task_dict = {
                "id": getattr(t, "id", f"TASK-{len(formatted_tasks)+1:03d}"),
                "description": getattr(t, "description", ""),
                "target_files": getattr(t, "target_files", []),
                "status": getattr(t, "status", "pending"),
            }
        # In re-entry loops, ensure any failed tasks are marked pending
        if iteration_count > 0 and task_dict["status"] == "failed":
            task_dict["status"] = "pending"
        formatted_tasks.append(task_dict)

    action = "plan_generated" if iteration_count == 0 else "plan_adapted"
    explanation = (
        f"Initial mission plan generated with {len(formatted_tasks)} tasks and {len(plan.acceptance_criteria)} criteria."
        if iteration_count == 0
        else (
            f"Adapted plan for iteration {iteration_count}: analyzed {len(findings)} findings, "
            f"marked failed tasks as pending, and formulated targeted remediation tasks to overcome blockers."
        )
    )

    log_entry: Dict[str, Any] = {
        "agent": "shogun_planner",
        "action": action,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "iteration": iteration_count,
        "message": explanation,
        "details": {
            "reasoning": plan.reasoning,
            "task_ids": [t["id"] for t in formatted_tasks],
            "acceptance_criteria_count": len(plan.acceptance_criteria),
            "files_discovered": len(repo_context.get("file_tree", [])),
            "findings_count": len(findings),
        },
    }

    return {
        "acceptance_criteria": plan.acceptance_criteria,
        "tasks": formatted_tasks,
        "agent_logs": [log_entry],
    }
