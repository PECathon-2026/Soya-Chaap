---
name: git-safe-sync
description: Safely stages, commits, rebases, and pushes only the current member's isolated folder to origin main.
---
# Git Safe Sync
1. Check `git status --short`.
2. Ensure only `memberX_.../` is staged.
3. Run: `git add memberX_.../ && git commit -m "feat(memberX): update" && git pull --rebase origin main && git push origin main`.

