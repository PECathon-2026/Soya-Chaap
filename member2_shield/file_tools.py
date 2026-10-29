"""
Member 2 Shield: Safe File Tools
Provides secure, sandboxed file operations enforcing path-traversal prevention,
symlink escape blocking, and strict isolation against sensitive files
(.env, .git/, .devpilot_audit.log, and other member folders).
"""

import os
from pathlib import Path
import re
import tempfile
from typing import Any, Dict, List

# Directories excluded from traversal, search, or listing
IGNORED_DIRS = {
    ".git",
    "__pycache__",
    "node_modules",
    ".venv",
    "venv",
    ".pytest_cache",
    ".mypy_cache",
    ".ruff_cache",
    ".tox",
    ".eggs",
}

# Protected folders belonging to other guild members
OTHER_MEMBER_FOLDERS = {
    "member1_orchestrator",
    "member3_frontend",
    "member4_server",
}

# Regex patterns matching forbidden sensitive files or paths
BLOCKED_NAME_PATTERNS = [
    r"^\.env(\..+)?$",                   # .env, .env.local, .env.production, etc.
    r"^\.git$",                         # git internals
    r"^\.devpilot_audit(\..+)?\.log$",  # audit logs
    r"^\.devpilot_audit\.log$",
    r"^id_rsa(\.pub)?$",                # ssh keys
    r"^\.bash_history$",
]


def _is_blocked_name(name: str) -> bool:
    """Check if a filename or path component matches any prohibited pattern."""
    for pattern in BLOCKED_NAME_PATTERNS:
        if re.search(pattern, name, re.IGNORECASE):
            return True
    return False


def _is_other_member_path(name: str) -> bool:
    """Check if a path component references another member's folder."""
    if name in OTHER_MEMBER_FOLDERS:
        return True
    # Match any pattern like member1_..., member3_..., member4_...
    if re.match(r"^member[134]_", name, re.IGNORECASE):
        return True
    return False


def _validate_and_resolve_path(repo_path: str, relative_path: str, must_exist: bool = False) -> str:
    """
    Validate relative_path against repo_path and return the canonical resolved path.
    Enforces that the path resolves strictly inside os.path.realpath(repo_path)
    and starts with that prefix.

    Raises:
        ValueError: If arguments are empty.
        FileNotFoundError: If repo_path or target file does not exist.
        PermissionError: If path traversal (..), symlink escape, access to sensitive
                         files (.env, .git/, .devpilot_audit.log), or access to other
                         member folders is attempted.
    """
    if not repo_path:
        raise ValueError("repo_path must be a non-empty string.")
    if relative_path is None or relative_path == "":
        raise ValueError("relative_path must be a non-empty string.")

    real_repo = os.path.realpath(repo_path)
    if not os.path.isdir(real_repo):
        raise FileNotFoundError(f"Repository directory does not exist: '{repo_path}'")

    # Normalize backslashes to forward slashes for unified parsing
    norm_rel = relative_path.replace("\\", "/").strip()

    # Reject absolute paths passed as relative paths
    if os.path.isabs(norm_rel) or norm_rel.startswith("/") or (len(norm_rel) > 1 and norm_rel[1] == ":"):
        raise PermissionError(f"Absolute paths are forbidden: '{relative_path}'")

    parts = [p for p in norm_rel.split("/") if p and p != "."]

    # Explicit check for '..' traversal tokens
    if ".." in parts:
        raise PermissionError(f"Path traversal using '..' is strictly prohibited: '{relative_path}'")

    # Check for blocked names and other member folders in path segments
    for part in parts:
        if _is_blocked_name(part):
            raise PermissionError(
                f"Access to prohibited sensitive file or directory '{part}' is denied: '{relative_path}'"
            )
        if _is_other_member_path(part):
            raise PermissionError(
                f"Access to other member directory '{part}' is strictly prohibited: '{relative_path}'"
            )

    # Compute prospective full path and canonicalize with realpath
    target_path = os.path.join(real_repo, os.path.normpath(norm_rel))
    real_target = os.path.realpath(target_path)

    # Enforce workspace boundary jail: target must start with real_repo prefix
    prefix = real_repo if real_repo.endswith(os.sep) else real_repo + os.sep
    if not (real_target == real_repo or real_target.startswith(prefix)):
        raise PermissionError(
            f"Path escape outside repo_path root is prohibited: '{relative_path}' -> '{real_target}'"
        )

    # Validate resolved path segments to block symlinks pointing to sensitive files or other member folders
    target_rel = os.path.relpath(real_target, real_repo).replace("\\", "/")
    target_parts = [p for p in target_rel.split("/") if p and p != "."]
    for part in target_parts:
        if _is_blocked_name(part):
            raise PermissionError(
                f"Resolved target references prohibited component '{part}': '{relative_path}'"
            )
        if _is_other_member_path(part):
            raise PermissionError(
                f"Resolved target references other member folder '{part}': '{relative_path}'"
            )

    if must_exist and not os.path.exists(real_target):
        raise FileNotFoundError(f"File not found within repository: '{relative_path}'")

    return real_target


def read_file_safe(repo_path: str, relative_path: str) -> str:
    """
    Safely read the text content of a file inside repo_path.

    Args:
        repo_path: Base directory of the repository.
        relative_path: Relative path to the file within the repository.

    Returns:
        The content of the file as a string.

    Raises:
        PermissionError: If path traversal or access to restricted files is attempted.
        FileNotFoundError: If the file does not exist.
        IsADirectoryError: If the target path is a directory.
    """
    resolved_path = _validate_and_resolve_path(repo_path, relative_path, must_exist=True)

    if os.path.isdir(resolved_path):
        raise IsADirectoryError(f"Path is a directory, not a file: '{relative_path}'")

    with open(resolved_path, "r", encoding="utf-8", errors="replace") as f:
        return f.read()


def write_file_safe(repo_path: str, relative_path: str, content: str) -> str:
    """
    Safely write string content to a file inside repo_path.
    Creates parent directories if necessary, ensuring all directories remain
    within the repo boundary.

    Args:
        repo_path: Base directory of the repository.
        relative_path: Relative path to the target file.
        content: Text content to write.

    Returns:
        Status message indicating write success.

    Raises:
        PermissionError: If path traversal or write to restricted files is attempted.
    """
    resolved_path = _validate_and_resolve_path(repo_path, relative_path, must_exist=False)

    parent_dir = os.path.dirname(resolved_path)
    if parent_dir:
        real_repo = os.path.realpath(repo_path)
        prefix = real_repo if real_repo.endswith(os.sep) else real_repo + os.sep
        real_parent = os.path.realpath(parent_dir)
        if not (real_parent == real_repo or real_parent.startswith(prefix)):
            raise PermissionError(f"Parent directory escapes workspace root: '{parent_dir}'")
        os.makedirs(real_parent, exist_ok=True)

    with open(resolved_path, "w", encoding="utf-8") as f:
        f.write(content)

    return f"Successfully wrote {len(content)} characters to '{relative_path}'"


def search_code_safe(repo_path: str, pattern: str) -> List[Dict[str, Any]]:
    """
    Safely search for a pattern (regex or substring) across all text files in repo_path.
    Returns line numbers and matching snippets, skipping binary files, __pycache__,
    VCS folders (.git), sensitive files (.env, .devpilot_audit.log), and other member folders.

    Args:
        repo_path: Base directory of the repository.
        pattern: Regex or substring pattern to search for.

    Returns:
        List of dictionaries with format:
        [{"file": relative_path, "line_number": int, "line": str, "match": str}]
    """
    real_repo = os.path.realpath(repo_path)
    if not os.path.isdir(real_repo):
        raise FileNotFoundError(f"Repository directory does not exist: '{repo_path}'")

    try:
        regex = re.compile(pattern)
    except re.error:
        regex = re.compile(re.escape(pattern))

    results: List[Dict[str, Any]] = []

    for root, dirs, files in os.walk(real_repo):
        # Filter out ignored directories and other member folders in-place
        dirs[:] = [
            d for d in dirs
            if d not in IGNORED_DIRS and not _is_blocked_name(d) and not _is_other_member_path(d)
        ]

        for file_name in files:
            if _is_blocked_name(file_name) or _is_other_member_path(file_name):
                continue

            full_file_path = os.path.join(root, file_name)
            real_file_path = os.path.realpath(full_file_path)

            prefix = real_repo if real_repo.endswith(os.sep) else real_repo + os.sep
            if not (real_file_path.startswith(prefix)):
                continue

            rel_path = os.path.relpath(real_file_path, real_repo).replace("\\", "/")

            try:
                # Fast probe for binary files: inspect first 4096 bytes for null bytes
                with open(real_file_path, "rb") as f_bin:
                    chunk = f_bin.read(4096)
                    if b"\x00" in chunk:
                        continue

                with open(real_file_path, "r", encoding="utf-8", errors="replace") as f_text:
                    for line_idx, line in enumerate(f_text, start=1):
                        match = regex.search(line)
                        if match:
                            results.append({
                                "file": rel_path,
                                "line_number": line_idx,
                                "line": line.rstrip("\r\n"),
                                "match": match.group(0),
                            })
            except (OSError, UnicodeDecodeError):
                continue

    return results


def list_files_safe(repo_path: str) -> List[str]:
    """
    Safely list all files in the repository relative to repo_path.
    Filters out VCS/cache directories, sensitive files (.env, .devpilot_audit.log),
    and other member folders.

    Args:
        repo_path: Base directory of the repository.

    Returns:
        Sorted list of relative file paths using forward slashes.
    """
    real_repo = os.path.realpath(repo_path)
    if not os.path.isdir(real_repo):
        raise FileNotFoundError(f"Repository directory does not exist: '{repo_path}'")

    file_list: List[str] = []

    for root, dirs, files in os.walk(real_repo):
        dirs[:] = [
            d for d in dirs
            if d not in IGNORED_DIRS and not _is_blocked_name(d) and not _is_other_member_path(d)
        ]

        for file_name in files:
            if _is_blocked_name(file_name) or _is_other_member_path(file_name):
                continue

            full_file_path = os.path.join(root, file_name)
            real_file_path = os.path.realpath(full_file_path)

            prefix = real_repo if real_repo.endswith(os.sep) else real_repo + os.sep
            if not (real_file_path.startswith(prefix)):
                continue

            rel_path = os.path.relpath(real_file_path, real_repo).replace("\\", "/")
            file_list.append(rel_path)

    return sorted(file_list)


if __name__ == "__main__":
    print("=== Member 2 Shield: Running file_tools.py Self-Tests ===")
    with tempfile.TemporaryDirectory() as temp_sandbox:
        real_sandbox = os.path.realpath(temp_sandbox)
        
        # 1. Test safe write and read
        write_file_safe(real_sandbox, "src/hello.py", "print('Hello DevPilot')\n")
        content = read_file_safe(real_sandbox, "src/hello.py")
        assert "Hello DevPilot" in content, "Failed reading written file"
        print("[PASS] Safe write and read verified.")

        # 2. Test search_code_safe
        search_res = search_code_safe(real_sandbox, "DevPilot")
        assert len(search_res) == 1 and search_res[0]["line_number"] == 1, "Failed code search"
        print("[PASS] Code search with line numbers verified.")

        # 3. Test list_files_safe
        files = list_files_safe(real_sandbox)
        assert "src/hello.py" in files, "Failed file listing"
        print("[PASS] Safe file listing verified.")

        # 4. Test path jail: '..' traversal rejection
        try:
            read_file_safe(real_sandbox, "../secret.txt")
            assert False, "Should have raised PermissionError on '..'"
        except PermissionError:
            print("[PASS] '..' path traversal correctly rejected.")

        # 5. Test sensitive file: .env rejection
        try:
            read_file_safe(real_sandbox, ".env")
            assert False, "Should have raised PermissionError on '.env'"
        except PermissionError:
            print("[PASS] '.env' access correctly rejected.")

        # 6. Test sensitive file: .devpilot_audit.log rejection
        try:
            write_file_safe(real_sandbox, ".devpilot_audit.log", "leak")
            assert False, "Should have raised PermissionError on '.devpilot_audit.log'"
        except PermissionError:
            print("[PASS] '.devpilot_audit.log' access correctly rejected.")

        # 7. Test sensitive directory: .git/config rejection
        try:
            read_file_safe(real_sandbox, ".git/config")
            assert False, "Should have raised PermissionError on '.git/config'"
        except PermissionError:
            print("[PASS] '.git/config' access correctly rejected.")

        # 8. Test other member folder rejection
        try:
            read_file_safe(real_sandbox, "member1_orchestrator/shogun.py")
            assert False, "Should have raised PermissionError on 'member1_orchestrator'"
        except PermissionError:
            print("[PASS] Other member folder access correctly rejected.")

    print("=== All file_tools.py security checks & self-tests passed successfully! ===")
