"""Integration and unit tests for member4_server/main.py endpoints."""

import os
import sys
import pytest
from fastapi.testclient import TestClient

# Ensure member4_server directory is in Python path
SERVER_DIR = os.path.dirname(os.path.abspath(__file__))
if SERVER_DIR not in sys.path:
    sys.path.insert(0, SERVER_DIR)

from main import app, manager


@pytest.fixture
def client():
    return TestClient(app)


def test_health_check(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "DevPilot" in data["service"]


def test_list_scenarios(client):
    response = client.get("/api/scenarios")
    assert response.status_code == 200
    data = response.json()
    assert "scenarios" in data
    assert len(data["scenarios"]) == 5
    ids = [s["id"] for s in data["scenarios"]]
    assert "01_feature_impl" in ids
    assert "02_bug_investigation" in ids
    assert "03_test_driven_recovery" in ids
    assert "04_security_code_review" in ids
    assert "05_unexpected_conditions" in ids


def test_baseline_compare_bug_investigation(client):
    response = client.post(
        "/api/baseline/compare",
        json={"scenario_name": "02_bug_investigation"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["scenario"] == "02_bug_investigation"
    assert "comparison" in data
    comp = data["comparison"]
    assert "single_agent_blind_llm" in comp
    assert "devpilot_multi_agent_guild" in comp
    assert "loop boundary" in comp["devpilot_multi_agent_guild"]["code_produced"].lower() or \
           "range" in comp["devpilot_multi_agent_guild"]["code_produced"]


def test_baseline_compare_security(client):
    response = client.post(
        "/api/baseline/compare",
        json={"scenario_name": "04_security_code_review"},
    )
    assert response.status_code == 200
    data = response.json()
    comp = data["comparison"]
    assert comp["devpilot_multi_agent_guild"]["security_audit"] == "PASSED (Zero exposed secrets, sanitized queries)"
    assert "FAILED" in comp["single_agent_blind_llm"]["security_audit"]


def test_mission_status_initial(client):
    response = client.get("/api/mission/status")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data


def test_export_log(client):
    response = client.get("/api/mission/export-log")
    assert response.status_code == 200
    data = response.json()
    assert "total_events" in data
    assert "events" in data
    assert isinstance(data["events"], list)


def test_scenario_reset_endpoint(client):
    response = client.post("/api/mission/reset", params={"scenario_name": "01_feature_impl"})
    assert response.status_code == 200
    assert response.json()["status"] == "reset"
