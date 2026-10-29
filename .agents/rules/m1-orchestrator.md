---
trigger: glob
globs: member1_orchestrator/**
description: Rules for Member 1 (shogun.py, samurai.py, graph.py).
---
# Member 1 Strict Scope
- Only edit files in `member1_orchestrator/`.
- `shogun.py`: Decomposes user request into `acceptance_criteria` and `tasks` (`List[TaskItem]`).
- `samurai.py`: Uses `member2_shield.file_tools` and addresses test/security failures from `findings_and_issues`.
- `graph.py`: Implements cyclic LangGraph with parallel fan-out and max 3 iterations bounded limit.

