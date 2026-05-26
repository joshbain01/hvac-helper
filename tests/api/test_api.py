import os
import sqlite3
import pytest
from fastapi.testclient import TestClient
from tests.db.init_db import init_db

os.environ["API_BEARER_TOKEN"] = "test-token"
from tests.api.main import app

@pytest.fixture(scope="module")
def test_db(tmp_path_factory):
    db_dir = tmp_path_factory.mktemp("db")
    db_file = db_dir / "test_telemetry.db"
    db_path = str(db_file)
    init_db(db_path)
    os.environ["DB_PATH"] = db_path
    import tests.api.main
    tests.api.main.DB_PATH = db_path
    yield db_path

@pytest.fixture
def client():
    # Clear rate limits between tests if the dictionary is imported/accessible
    import tests.api.main
    if hasattr(tests.api.main, 'rate_limits'):
        tests.api.main.rate_limits.clear()
    return TestClient(app)

def test_auth_missing_token(client):
    response = client.get("/schema")
    assert response.status_code == 401

def test_get_schema_success(client, test_db):
    response = client.get("/schema", headers={"Authorization": "Bearer test-token"})
    assert response.status_code == 200
    data = response.json()
    assert "telemetry_logs" in data
    assert "test_scenarios" in data
    assert "agent_hypotheses" in data

def test_get_scenarios(client, test_db):
    # Insert seed scenario
    conn = sqlite3.connect(test_db)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM test_scenarios;")
    cursor.execute("""
        INSERT INTO test_scenarios (
            scenario_id, run_id, workflow, network_cond, power_state, sensor_state, 
            ocr_path, llm_path, outcome, total_duration_ms, data_integrity, created_at
        ) VALUES (
            'scen-1', 'run-1', 'B', 'NET_NORMAL', 'PWR_CONTINUOUS', 'SENS_NORMAL',
            'OCR_SUCCESS', 'LLM_SUCCESS', 'PASS', 2500, 1, '2026-05-24T12:00:00Z'
        );
    """)
    conn.commit()
    conn.close()

    response = client.get("/scenarios", headers={"Authorization": "Bearer test-token"})
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["scenario_id"] == "scen-1"

def test_get_runs(client, test_db):
    response = client.get("/runs", headers={"Authorization": "Bearer test-token"})
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["run_id"] == "run-1"
    assert data[0]["total_scenarios"] == 1
    assert data[0]["passed_count"] == 1

def test_get_hypotheses(client, test_db):
    # Insert seed hypothesis
    conn = sqlite3.connect(test_db)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM agent_hypotheses;")
    cursor.execute("""
        INSERT INTO agent_hypotheses (
            hypothesis_id, proposed_by, hypothesis_text, scenario_json, status, created_at
        ) VALUES (
            'hyp-1', 'kimi', 'Test hypothesis', '{}', 'QUEUED', '2026-05-24T12:00:00Z'
        );
    """)
    conn.commit()
    conn.close()

    response = client.get("/hypotheses", headers={"Authorization": "Bearer test-token"})
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["hypothesis_id"] == "hyp-1"

def test_query_select_success(client, test_db):
    payload = {
        "sql": "SELECT scenario_id, outcome FROM test_scenarios WHERE outcome = 'PASS';",
        "description": "Find passing scenarios"
    }
    response = client.post("/query", json=payload, headers={"Authorization": "Bearer test-token"})
    assert response.status_code == 200
    data = response.json()
    assert "rows" in data
    assert data["row_count"] == 1
    assert data["rows"][0]["scenario_id"] == "scen-1"
    assert "execution_ms" in data

def test_query_insert_forbidden(client, test_db):
    payload = {
        "sql": "INSERT INTO test_scenarios (scenario_id, run_id, workflow) VALUES ('scen-2', 'run-1', 'A');"
    }
    response = client.post("/query", json=payload, headers={"Authorization": "Bearer test-token"})
    assert response.status_code == 403

def test_query_drop_forbidden(client, test_db):
    payload = {
        "sql": "DROP TABLE telemetry_logs;"
    }
    response = client.post("/query", json=payload, headers={"Authorization": "Bearer test-token"})
    assert response.status_code == 403

def test_query_row_limit(client, test_db):
    # Insert 1005 mock logs
    conn = sqlite3.connect(test_db)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM telemetry_logs;")
    cursor.executemany(
        "INSERT INTO telemetry_logs (event_id, device_hash, event_type, event_name, payload, timestamp) VALUES (?, 'hash', 'OCR', 'OCR_SCAN_COMPLETE', '{}', '2026-05-24T12:00:00Z')",
        [(f"id-{i}",) for i in range(1005)]
    )
    conn.commit()
    conn.close()

    payload = {"sql": "SELECT event_id FROM telemetry_logs;"}
    response = client.post("/query", json=payload, headers={"Authorization": "Bearer test-token"})
    assert response.status_code == 200
    data = response.json()
    assert data["row_count"] == 1000
    assert len(data["rows"]) == 1000

def test_query_timeout(client, test_db):
    # Re-insert logs to make sure cross join is expensive
    conn = sqlite3.connect(test_db)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM telemetry_logs;")
    cursor.executemany(
        "INSERT INTO telemetry_logs (event_id, device_hash, event_type, event_name, payload, timestamp) VALUES (?, 'hash', 'OCR', 'OCR_SCAN_COMPLETE', '{}', '2026-05-24T12:00:00Z')",
        [(f"id-{i}",) for i in range(1000)]
    )
    conn.commit()
    conn.close()

    expensive_sql = "SELECT COUNT(*) FROM telemetry_logs a CROSS JOIN telemetry_logs b CROSS JOIN telemetry_logs c;"
    payload = {"sql": expensive_sql}
    response = client.post("/query", json=payload, headers={"Authorization": "Bearer test-token"})
    assert response.status_code == 408

def test_submit_hypothesis_success(client, test_db):
    payload = {
        "proposed_by": "kimi-k2.5",
        "hypothesis_text": "Deep sleep causes NVS corruption in 15% of cases",
        "scenario_json": {
            "workflow": "B",
            "network_cond": "NET_RF_INTERFERENCE",
            "power_state": "PWR_SLEEP_1",
            "sensor_state": "SENS_NORMAL",
            "ocr_path": "OCR_SUCCESS",
            "llm_path": "LLM_SUCCESS"
        },
        "evidence_query": "SELECT COUNT(*) FROM telemetry_logs;"
    }
    response = client.post("/hypotheses", json=payload, headers={"Authorization": "Bearer test-token"})
    assert response.status_code == 201
    data = response.json()
    assert "hypothesis_id" in data
    assert data["status"] == "QUEUED"

def test_submit_hypothesis_invalid_dimensions(client, test_db):
    payload = {
        "proposed_by": "kimi-k2.5",
        "hypothesis_text": "Invalid dimensions",
        "scenario_json": {
            "workflow": "Z",  # Invalid
            "network_cond": "NET_NORMAL",
            "power_state": "PWR_CONTINUOUS",
            "sensor_state": "SENS_NORMAL",
            "ocr_path": "OCR_SUCCESS",
            "llm_path": "LLM_SUCCESS"
        }
    }
    response = client.post("/hypotheses", json=payload, headers={"Authorization": "Bearer test-token"})
    assert response.status_code == 422

def test_rate_limiter(client, test_db):
    # Make 60 requests
    for _ in range(60):
        response = client.get("/schema", headers={"Authorization": "Bearer test-token"})
        assert response.status_code == 200
        
    # The 61st should be rate limited
    response = client.get("/schema", headers={"Authorization": "Bearer test-token"})
    assert response.status_code == 429
    assert "Rate limit exceeded" in response.json()["detail"]

def test_upload_snapshot_lifecycle(client):
    # Reset first
    client.post("/api/v1/reset", headers={"Authorization": "Bearer test-token"})
    
    snapshot_payload = {
        "snapshot_id": "snap-12345",
        "schema_version": 1,
        "status": "DRAFT",
        "revision": 1,
        "technician_id": "tech-123",
        "job_id": "job-123",
        "customer_id": "cust-123",
        "refrigerant": "R-410A",
        "created_at": "2026-05-24T12:00:00Z",
        "updated_at": "2026-05-24T12:00:00Z"
    }
    
    headers = {
        "Authorization": "Bearer test-token",
        "Idempotency-Key": "ikey-1"
    }
    
    # 1. Successful upload (202 Accepted)
    response = client.post("/api/v1/snapshots", json=snapshot_payload, headers=headers)
    assert response.status_code == 202
    data = response.json()
    assert data["snapshot_id"] == "snap-12345"
    assert data["status"] == "DRAFT"
    assert response.headers["Idempotency-Key"] == "ikey-1"
    
    # 2. Idempotent upload (200 OK, Cache HIT)
    response_dup = client.post("/api/v1/snapshots", json=snapshot_payload, headers=headers)
    assert response_dup.status_code == 200
    assert response_dup.headers["X-Cache-Lookup"] == "HIT"
    assert response_dup.json() == data
    
    # 3. Conflict upload (same revision, new idempotency key)
    headers["Idempotency-Key"] = "ikey-2"
    response_conf = client.post("/api/v1/snapshots", json=snapshot_payload, headers=headers)
    assert response_conf.status_code == 409
    
    # 4. Successful upload of a new revision
    snapshot_payload["revision"] = 2
    response_rev2 = client.post("/api/v1/snapshots", json=snapshot_payload, headers=headers)
    assert response_rev2.status_code == 202
    assert response_rev2.json()["revision"] == 2
    
    # 5. Lock completion state (status completed)
    snapshot_payload["status"] = "COMPLETED"
    snapshot_payload["revision"] = 3
    headers["Idempotency-Key"] = "ikey-3"
    response_comp = client.post("/api/v1/snapshots", json=snapshot_payload, headers=headers)
    assert response_comp.status_code == 202
    
    # 6. Reject edits once sealed/completed
    snapshot_payload["revision"] = 4
    headers["Idempotency-Key"] = "ikey-4"
    response_blocked = client.post("/api/v1/snapshots", json=snapshot_payload, headers=headers)
    assert response_blocked.status_code == 409

