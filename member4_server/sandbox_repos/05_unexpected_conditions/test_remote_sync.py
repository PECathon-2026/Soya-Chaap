"""Unit tests for remote_sync.py in DevPilot scenario 05."""

import os
import sys
import pytest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from remote_sync import sync_remote_data


def test_sync_remote_data_graceful_handling():
    result = sync_remote_data({"entity_id": "test_record_42"})
    assert isinstance(result, dict)
    assert result.get("synced") is False
    assert result.get("reason") == "unreachable"
