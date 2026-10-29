"""Token authentication module for DevPilot evaluation scenario 03.

Scenario Objective:
Implement `validate_token` from scratch using test-driven recovery.
The function must validate Bearer tokens formatted as 'BEARER-<hex_string>'
with total length >= 12, rejecting malformed prefixes, non-hex strings, and empty input.
"""

def validate_token(token: str) -> bool:
    """Validates an authentication token according to the Bearer protocol."""
    # BROKEN STUB: Stub returning False, causing test suite to fail
    return False
