"""
Member 2 Shield Package
Provides sandboxed file and shell operations, test execution, acceptance verification,
and security & code review audits for DevPilot.
"""

from member2_shield.file_tools import (
    read_file_safe,
    write_file_safe,
    search_code_safe,
    list_files_safe,
)
from member2_shield.shell_tools import (
    run_sandboxed_command,
    get_git_diff,
)
from member2_shield.sentinel import (
    sentinel_tester_node,
    sentinel_verifier_node,
)
from member2_shield.shadow import (
    shadow_council_node,
)

__all__ = [
    "read_file_safe",
    "write_file_safe",
    "search_code_safe",
    "list_files_safe",
    "run_sandboxed_command",
    "get_git_diff",
    "sentinel_tester_node",
    "sentinel_verifier_node",
    "shadow_council_node",
]

