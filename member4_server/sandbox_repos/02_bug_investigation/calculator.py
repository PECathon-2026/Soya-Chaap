"""Calculator module for DevPilot evaluation scenario 02.

Scenario Objective:
Detect and resolve the seeded off-by-one bug in calculate_moving_average.
The loop boundary incorrectly excludes the final sliding window.
"""

def calculate_moving_average(values: list[float], window_size: int) -> list[float]:
    """Calculates simple moving average for values using a sliding window.
    
    Args:
        values: List of float numbers.
        window_size: Positive integer specifying window width.
        
    Returns:
        List of float moving averages.
        
    Raises:
        ValueError: If window_size <= 0 or window_size > len(values).
    """
    if window_size <= 0:
        raise ValueError("window_size must be positive")
    if not values:
        return []
    if window_size > len(values):
        raise ValueError("window_size cannot exceed values length")
    
    averages = []
    # SEEDED BUG: Off-by-one boundary drops the final window.
    # range(len(values) - window_size) only generates up to len - window_size - 1.
    # The correct boundary is range(len(values) - window_size + 1).
    for i in range(len(values) - window_size):
        window = values[i : i + window_size]
        averages.append(sum(window) / float(window_size))
    return averages
