"""Unit tests for token_auth.py in DevPilot scenario 03.

This test suite asserts that validate_token properly checks bearer prefix,
hexadecimal payload, and minimum length requirements.
"""

import os
import sys
import pytest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from token_auth import validate_token


def test_valid_bearer_tokens():
    assert validate_token("BEARER-1a2b3c") is True
    assert validate_token("BEARER-deadbeefcafe") is True
    assert validate_token("BEARER-0123456789abcdefABCDEF") is True
    assert validate_token("BEARER-12345") is True


def test_invalid_prefix():
    assert validate_token("TOKEN-1a2b3c4d5e") is False
    assert validate_token("Bearer-1a2b3c4d5e") is False
    assert validate_token("bearer-1a2b3c4d5e") is False
    assert validate_token("BEARER_1a2b3c4d5e") is False
    assert validate_token("1a2b3c4d5e6f7a") is False


def test_insufficient_length():
    assert validate_token("") is False
    assert validate_token("BEARER-") is False
    assert validate_token("BEARER-1") is False
    assert validate_token("BEARER-1234") is False


def test_non_hex_payload():
    assert validate_token("BEARER-xyz12345") is False
    assert validate_token("BEARER-1a2b3g4h5i") is False
    assert validate_token("BEARER-123-45678") is False
    assert validate_token("BEARER-hello_world") is False


def test_invalid_types():
    assert validate_token(None) is False
    assert validate_token(123456789012) is False
    assert validate_token(["BEARER-1a2b3c"]) is False
