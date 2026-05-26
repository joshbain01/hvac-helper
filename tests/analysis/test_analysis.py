import os
import json
import sqlite3
import pytest
from unittest.mock import patch, MagicMock

# We will implement the actual module in tests/analysis/agent_analysis.py
from tests.analysis.agent_analysis import check_budget, run_analysis_pipeline, parse_kimi_response

@pytest.fixture
def temp_spend_log(tmp_path):
    log_file = tmp_path / "spend_log.json"
    data = {
        "month": "2026-05",
        "total_usd": 0.0,
        "runs": []
    }
    with open(log_file, "w") as f:
        json.dump(data, f)
    return str(log_file)

def test_budget_halt_above_threshold(temp_spend_log):
    # Set spend above $19.50 threshold
    with open(temp_spend_log, "r") as f:
        data = json.load(f)
    data["total_usd"] = 19.60
    with open(temp_spend_log, "w") as f:
        json.dump(data, f)
        
    # Check budget should return False (halt)
    assert check_budget(temp_spend_log, estimated_cost=0.05) is False

def test_budget_warning_above_18(temp_spend_log, capsys):
    with open(temp_spend_log, "r") as f:
        data = json.load(f)
    data["total_usd"] = 18.50
    with open(temp_spend_log, "w") as f:
        json.dump(data, f)
        
    # Check budget should return True (allowed) but print warning to stderr
    assert check_budget(temp_spend_log, estimated_cost=0.05) is True
    captured = capsys.readouterr()
    assert "WARNING: Monthly budget spend" in captured.err

def test_kimi_json_parse_error_handling():
    malformed_response = "Here is the analysis:\n{ malformed json }"
    
    # parse_kimi_response should return an empty structure or log it and not crash
    result = parse_kimi_response(malformed_response)
    assert result == {"anomalies": [], "follow_up_queries": [], "hypotheses": []}

@patch("requests.get")
@patch("requests.post")
def test_hypothesis_submission_flow(mock_post, mock_get, temp_spend_log, tmp_path):
    # Mock GET /runs
    mock_run_resp = MagicMock()
    mock_run_resp.status_code = 200
    mock_run_resp.json.return_value = [{"run_id": "run-1"}]
    
    # Mock POST /query for FAIL scenarios
    mock_query_fail_resp = MagicMock()
    mock_query_fail_resp.status_code = 200
    mock_query_fail_resp.json.return_value = {
        "rows": [{"scenario_id": "scen-1", "network_cond": "NET_NORMAL", "power_state": "PWR_SLEEP_1", "sensor_state": "SENS_NORMAL", "ocr_path": "OCR_SUCCESS", "llm_path": "LLM_SUCCESS"}],
        "row_count": 1
    }
    
    # Mock POST /query for telemetry logs of scen-1
    mock_telemetry_resp = MagicMock()
    mock_telemetry_resp.status_code = 200
    mock_telemetry_resp.json.return_value = {
        "rows": [{"event_type": "HARDWARE", "event_name": "SENSOR_FAULT", "payload": "{}"}]
    }
    
    # Mock OpenRouter POST call to Kimi K2.5
    mock_kimi_resp = MagicMock()
    mock_kimi_resp.status_code = 200
    mock_kimi_resp.json.return_value = {
        "choices": [{
            "message": {
                "content": json.dumps({
                    "anomalies": [{
                        "title": "NVS Cache Corruption",
                        "description": "NVS CRC check fails",
                        "affected_scenarios": ["scen-1"],
                        "severity": "HIGH",
                        "user_impact": "Sensor data lost"
                    }],
                    "follow_up_queries": [{
                        "description": "Get all sensor faults",
                        "sql": "SELECT * FROM telemetry_logs WHERE event_name='SENSOR_FAULT';"
                    }],
                    "hypotheses": [{
                        "hypothesis_text": "NVS fails on wake",
                        "scenario_json": {
                            "workflow": "B",
                            "network_cond": "NET_NORMAL",
                            "power_state": "PWR_SLEEP_1",
                            "sensor_state": "SENS_BOTH_FAULT",
                            "ocr_path": "OCR_SUCCESS",
                            "llm_path": "LLM_SUCCESS"
                        }
                    }]
                })
            }
        }],
        "usage": {
            "prompt_tokens": 1000,
            "completion_tokens": 200
        }
    }
    
    # Mock POST /hypotheses
    mock_hyp_resp = MagicMock()
    mock_hyp_resp.status_code = 201
    mock_hyp_resp.json.return_value = {"hypothesis_id": "hyp-123", "status": "QUEUED"}
    
    # Assign side effects to post mock
    # Order of POST calls:
    # 1. POST /query (FAIL scenarios)
    # 2. POST /query (telemetry logs)
    # 3. OpenRouter POST (to base_url/chat/completions)
    # 4. POST /query (follow-up query)
    # 5. POST /hypotheses
    mock_post.side_effect = [
        mock_query_fail_resp,  # fetch fails
        mock_telemetry_resp,   # fetch telemetry
        mock_kimi_resp,        # OpenRouter call
        mock_telemetry_resp,   # execute follow-up
        mock_hyp_resp          # submit hypothesis
    ]
    mock_get.return_value = mock_run_resp
    
    # Override report directory for testing
    report_dir = str(tmp_path / "reports")
    
    # Set env vars
    os.environ["API_BEARER_TOKEN"] = "test-token"
    os.environ["OPENROUTER_API_KEY"] = "mock-key"
    os.environ["KIMI_MODEL"] = "moonshotai/kimi-k2.5"
    
    success = run_analysis_pipeline(
        api_base_url="http://localhost:8080",
        spend_log_path=temp_spend_log,
        report_dir=report_dir
    )
    
    assert success is True
    
    # Check that report files exist
    assert os.path.exists(report_dir)
    files = os.listdir(report_dir)
    # Should have a .json and a .md report
    assert any(f.endswith(".json") for f in files)
    assert any(f.endswith(".md") for f in files)
    
    # Check spend_log was updated
    with open(temp_spend_log, "r") as f:
        log_data = json.load(f)
    assert len(log_data["runs"]) == 1
    assert log_data["total_usd"] > 0.0
