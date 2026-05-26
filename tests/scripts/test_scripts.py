import os
import json
import sqlite3
import pytest
from datetime import datetime
from unittest.mock import patch, MagicMock
from tests.db.init_db import init_db

# Import functions to test
from tests.scripts.generate_report import run_queries, generate_markdown, generate_html
from tests.scripts.health_check import check_db, check_api, check_stale_run, check_spend

@pytest.fixture(scope="module")
def test_db(tmp_path_factory):
    db_dir = tmp_path_factory.mktemp("db")
    db_file = db_dir / "test_telemetry.db"
    db_path = str(db_file)
    init_db(db_path)
    os.environ["DB_PATH"] = db_path
    
    # Seed scenario data
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    created_at = datetime_str = "2026-05-25T12:00:00Z"
    cursor.execute("""
        INSERT INTO test_scenarios (
            scenario_id, run_id, workflow, network_cond, power_state, sensor_state, 
            ocr_path, llm_path, outcome, total_duration_ms, data_integrity, created_at
        ) VALUES (
            'scen-1', 'run-1', 'B', 'NET_NORMAL', 'PWR_CONTINUOUS', 'SENS_NORMAL',
            'OCR_SUCCESS', 'LLM_SUCCESS', 'PASS', 1500, 1, ?
        );
    """, (created_at,))
    cursor.execute("""
        INSERT INTO test_scenarios (
            scenario_id, run_id, workflow, network_cond, power_state, sensor_state, 
            ocr_path, llm_path, outcome, failure_reason, failure_step, total_duration_ms, data_integrity, created_at
        ) VALUES (
            'scen-2', 'run-1', 'B', 'NET_LOSS_20', 'PWR_CONTINUOUS', 'SENS_NORMAL',
            'OCR_SUCCESS', 'LLM_SUCCESS', 'FAIL', 'connection_lost', 3, 2500, 0, ?
        );
    """, (created_at,))
    cursor.execute("""
        INSERT INTO agent_hypotheses (
            hypothesis_id, proposed_by, hypothesis_text, scenario_json, status, created_at
        ) VALUES (
            'hyp-1', 'kimi', 'Test', '{}', 'QUEUED', ?
        );
    """, (created_at,))
    conn.commit()
    conn.close()
    
    yield db_path

def test_report_queries(test_db):
    data = run_queries(test_db)
    
    # Check overall pass rate
    assert data["overall"]["total"] == 2
    assert data["overall"]["passed"] == 1
    assert data["overall"]["pass_rate_pct"] == 50.0
    
    # Check dimension breakdown
    assert "network_cond" in data["dimensions"]
    assert "power_state" in data["dimensions"]
    
    # Check failures grouping
    assert len(data["failures"]) == 1
    assert data["failures"][0]["failure_reason"] == "connection_lost"
    assert data["failures"][0]["failure_step"] == 3
    assert data["failures"][0]["pattern_count"] == 1
    
    # Check hypotheses count
    assert data["hypotheses"]["QUEUED"] == 1

def test_report_generation_files(test_db, tmp_path):
    data = run_queries(test_db)
    
    md_file = tmp_path / "weekly-summary.md"
    html_file = tmp_path / "weekly-summary.html"
    
    generate_markdown(data, str(md_file))
    generate_html(data, str(html_file), "tokens/design-tokens.json")
    
    assert os.path.exists(md_file)
    assert os.path.exists(html_file)
    
    with open(md_file, "r") as f:
        md_text = f.read()
    assert "50.0%" in md_text
    
    with open(html_file, "r") as f:
        html_text = f.read()
    assert "Weekly Summary Dashboard" in html_text

def test_health_check_db_check(test_db, tmp_path):
    # DB exists
    assert check_db(test_db) is True
    
    # DB missing
    assert check_db(str(tmp_path / "nonexistent.db")) is False

@patch("requests.get")
def test_health_check_api(mock_get):
    # API healthy
    mock_resp_ok = MagicMock()
    mock_resp_ok.status_code = 200
    mock_get.return_value = mock_resp_ok
    assert check_api("http://localhost:8080", "token") is True
    
    # API unhealthy
    mock_resp_fail = MagicMock()
    mock_resp_fail.status_code = 500
    mock_get.return_value = mock_resp_fail
    assert check_api("http://localhost:8080", "token") is False

def test_health_check_stale_run(test_db):
    # Database currently has a last run from 2026-05-25T12:00:00Z.
    # Since current year is 2026, we check stale run status.
    # It should return 1 (warning) if the gap is > 26 hours.
    # To test robustly, we mock datetime.now to control elapsed time.
    from datetime import datetime, timezone
    
    # Seed a fresh run time in the test db
    conn = sqlite3.connect(test_db)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM test_scenarios;")
    # Set run time to 1 hour ago
    from datetime import datetime, timedelta
    one_hour_ago = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat().replace("+00:00", "") + "Z"
    cursor.execute("""
        INSERT INTO test_scenarios (
            scenario_id, run_id, workflow, network_cond, power_state, sensor_state, 
            ocr_path, llm_path, outcome, total_duration_ms, data_integrity, created_at
        ) VALUES (
            'scen-fresh', 'run-fresh', 'B', 'NET_NORMAL', 'PWR_CONTINUOUS', 'SENS_NORMAL',
            'OCR_SUCCESS', 'LLM_SUCCESS', 'PASS', 1500, 1, ?
        );
    """, (one_hour_ago,))
    conn.commit()
    conn.close()
    
    # Under 26h -> exit 0 (healthy)
    assert check_stale_run(test_db) == 0
    
    # Set run time to 30 hours ago
    conn = sqlite3.connect(test_db)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM test_scenarios;")
    thirty_hours_ago = (datetime.now(timezone.utc) - timedelta(hours=30)).isoformat().replace("+00:00", "") + "Z"
    cursor.execute("""
        INSERT INTO test_scenarios (
            scenario_id, run_id, workflow, network_cond, power_state, sensor_state, 
            ocr_path, llm_path, outcome, total_duration_ms, data_integrity, created_at
        ) VALUES (
            'scen-stale', 'run-stale', 'B', 'NET_NORMAL', 'PWR_CONTINUOUS', 'SENS_NORMAL',
            'OCR_SUCCESS', 'LLM_SUCCESS', 'PASS', 1500, 1, ?
        );
    """, (thirty_hours_ago,))
    conn.commit()
    conn.close()
    
    # Over 26h -> exit 1 (warning)
    assert check_stale_run(test_db) == 1

def test_health_check_spend_budget(tmp_path):
    log_file = tmp_path / "spend_log.json"
    
    # Under 80% spend
    with open(log_file, "w") as f:
        json.dump({"total_usd": 5.00}, f)
    assert check_spend(str(log_file)) == 0
    
    # Over 80% spend (80% of $20.00 is $16.00)
    with open(log_file, "w") as f:
        json.dump({"total_usd": 16.50}, f)
    assert check_spend(str(log_file)) == 1
