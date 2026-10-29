"""String utilities module for DevPilot evaluation scenario 01.

Scenario Objective:
Add `slugify(text: str) -> str` to convert text into lowercased,
hyphen-delimited, alphanumeric slugs (e.g., 'Hello World! 123' -> 'hello-world-123')
and add corresponding tests while preserving existing truncate and count_words functionality.
"""

def truncate(text: str, max_len: int = 10) -> str:
    """Truncates text to max_len, appending '...' if the text exceeds max_len."""
    if len(text) <= max_len:
        return text
    return text[:max_len] + "..."


def count_words(text: str) -> int:
    """Counts the number of whitespace-delimited words in the text."""
    if not text or not text.strip():
        return 0
    return len(text.strip().split())
