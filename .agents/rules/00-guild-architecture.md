---
trigger: always_on
description: Enforces the shared MissionState schema, PS-001 rubric compliance, and cross-module import interfaces across all 4 team folders.
---

# Shared State & Cross-Module Interface Contract
1. State Imports: Every Python agent node must import `from shared_contract import MissionState, TaskItem`.
2. Additive Reducers: In `MissionState`, `agent_logs` and `findings_and_issues` use `Annotated[List[...], operator.add]`. When returning a partial state dict from any LangGraph node, return ONLY the newly added log entries or findings in a list, never the accumulated list.
3. Cross-Folder Signatures:
   - `member2_shield.file_tools`: `read_file_safe`, `write_file_safe`, `search_code_safe`, `list_files_safe`.
   - `member2_shield.shell_tools`: `run_sandboxed_command`, `get_git_diff`.
   - `member2_shield.sentinel`: `sentinel_tester_node`, `sentinel_verifier_node`.
   - `member2_shield.shadow`: `shadow_council_node`.
   - `member1_orchestrator.graph`: export compiled graph with `MemorySaver` and `interrupt_before=["finalize_changes"]`.

