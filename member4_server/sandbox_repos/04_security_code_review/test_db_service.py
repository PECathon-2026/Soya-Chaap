"""Unit tests for db_service.py in DevPilot scenario 04."""

import os
import sys
import pytest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from db_service import build_user_query, get_storage_credentials


def test_query_generation_basic():
    query = build_user_query("usr_9981")
    assert "usr_9981" in query
    assert "SELECT * FROM accounts" in query


def test_credentials_structure():
    creds = get_storage_credentials()
    assert "access_key" in creds
    assert "secret_key" in creds
    assert creds["access_key"] is not None
