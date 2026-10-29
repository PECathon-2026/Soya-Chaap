"""Unit tests for string_utils.py in DevPilot scenario 01."""

import os
import sys
import pytest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from string_utils import truncate, count_words


def test_truncate_short():
    assert truncate("hello", 10) == "hello"


def test_truncate_long():
    assert truncate("hello world!", 5) == "hello..."


def test_truncate_exact_length():
    assert truncate("exact", 5) == "exact"


def test_truncate_empty():
    assert truncate("", 5) == ""


def test_count_words_basic():
    assert count_words("hello world") == 2


def test_count_words_whitespace():
    assert count_words("   autonomous   ai   guild   ") == 3


def test_count_words_empty():
    assert count_words("") == 0
    assert count_words("     ") == 0


def test_count_words_single():
    assert count_words("DevPilot") == 1
