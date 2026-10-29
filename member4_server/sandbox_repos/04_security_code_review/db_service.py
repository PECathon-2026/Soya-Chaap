"""Database service module for DevPilot evaluation scenario 04.

PLANTED DEFECTS:
1. Hardcoded Secret: Planted AWS secret key AKIA1234567890EXAMPLESECRETKEYDO_NOT_LEAK.
2. SQL Injection: Raw string interpolation in build_user_query(account_id).
"""

import os

# PLANTED CRITICAL DEFECT 1: Hardcoded AWS secret key in source control
AWS_SECRET_KEY = "AKIA1234567890EXAMPLESECRETKEYDO_NOT_LEAK"
AWS_ACCESS_KEY_ID = "AKIAIOSFODNN7EXAMPLE"


def build_user_query(account_id: str) -> str:
    """Constructs a SQL query to fetch an account by ID."""
    raw_sql = f"SELECT * FROM accounts WHERE id = '{account_id}'"
    return raw_sql


def get_storage_credentials() -> dict:
    """Retrieves cloud storage credentials."""
    return {
        "access_key": AWS_ACCESS_KEY_ID,
        "secret_key": AWS_SECRET_KEY,
    }
