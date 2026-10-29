---
trigger: glob
globs: member2_shield/**
description: Rules for Member 2 (file_tools.py, shell_tools.py, sentinel.py, shadow.py).
---
# Member 2 Strict Scope
- Only edit files in `member2_shield/`.
- `file_tools.py`: Strictly enforce path jail using `os.path.realpath`. Raise `PermissionError` on `..` or `.env`.
- `shell_tools.py`: Block destructive shell commands (`rm -rf`, `sudo`, `curl`, `git push --force`).
- `sentinel.py`: Runs automated tests and independently validates acceptance criteria.
- `shadow.py`: Static regex scan for secrets (`AKIA...`, private keys) and security review.

