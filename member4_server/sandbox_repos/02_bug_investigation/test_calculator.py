"""Unit tests for calculator.py in DevPilot scenario 02.

This test file exposes the seeded off-by-one error in calculate_moving_average.
"""

import os
import sys
import pytest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from calculator import calculate_moving_average


def test_moving_average_basic():
    result = calculate_moving_average([10.0, 20.0, 30.0, 40.0], 2)
    assert result == [15.0, 25.0, 35.0]


def test_moving_average_window_size_one():
    result = calculate_moving_average([1.0, 2.0, 3.0], 1)
    assert result == [1.0, 2.0, 3.0]


def test_moving_average_window_equals_length():
    result = calculate_moving_average([10.0, 20.0, 30.0], 3)
    assert result == [20.0]


def test_moving_average_invalid_window():
    with pytest.raises(ValueError, match="window_size must be positive"):
        calculate_moving_average([1.0, 2.0], 0)

    with pytest.raises(ValueError, match="window_size cannot exceed values length"):
        calculate_moving_average([1.0, 2.0], 5)
