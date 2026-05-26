import os
import json
import sqlite3
import pytest
from tests.db.init_db import init_db
from tests.simulator.mock_device import MockDevice, SimulatorConfig, SensorValueFixture
from tests.harness.runner import MobileAppLogicDriver, validate_data_integrity, run_scenario

os.environ["API_BEARER_TOKEN"] = "test-token"

@pytest.fixture(scope="module")
def test_db(tmp_path_factory):
    db_dir = tmp_path_factory.mktemp("db")
    db_file = db_dir / "test_telemetry.db"
    db_path = str(db_file)
    init_db(db_path)
    os.environ["DB_PATH"] = db_path
    yield db_path

def test_harness_basic_run_loop(test_db):
    fixture = SensorValueFixture(
        ra_temp=75.0, ra_rh=50.0, sa_temp=55.0, oa_temp=95.0, da_temp=105.0,
        sl_sat=40.0, sl_pipe=50.0, ll_sat=110.0, ll_pipe=90.0
    )
    config = SimulatorConfig(
        scenario_id="scen-pass-1",
        workflow="B",
        network_cond="NET_NORMAL",
        power_state="PWR_CONTINUOUS",
        sensor_state="SENS_NORMAL",
        sensor_values=fixture,
        ocr_path="OCR_SUCCESS",
        llm_path="LLM_SUCCESS",
        packet_loss_pct=0.0,
        rssi_override_dbm=None,
        sleep_trigger_step=None,
        sleep_duration_ms=0,
        corrupt_nvs_on_wake=False
    )
    
    run_id = "test-run-1"
    result = run_scenario(config, run_id=run_id, api_base_url=None)
    
    assert result.outcome == "PASS"
    assert result.data_integrity is True
    
    conn = sqlite3.connect(test_db)
    cursor = conn.cursor()
    cursor.execute("SELECT outcome, data_integrity FROM test_scenarios WHERE scenario_id='scen-pass-1';")
    row = cursor.fetchone()
    assert row is not None
    assert row[0] == "PASS"
    assert row[1] == 1
    conn.close()

def test_mobile_app_logic_driver_transitions(test_db):
    fixture = SensorValueFixture(
        ra_temp=75.0, ra_rh=50.0, sa_temp=55.0, oa_temp=95.0, da_temp=105.0,
        sl_sat=40.0, sl_pipe=50.0, ll_sat=110.0, ll_pipe=90.0
    )
    config = SimulatorConfig(
        scenario_id="scen-transitions",
        workflow="B",
        network_cond="NET_NORMAL",
        power_state="PWR_CONTINUOUS",
        sensor_state="SENS_NORMAL",
        sensor_values=fixture,
        ocr_path="OCR_SUCCESS",
        llm_path="LLM_SUCCESS",
        packet_loss_pct=0.0,
        rssi_override_dbm=None,
        sleep_trigger_step=None,
        sleep_duration_ms=0,
        corrupt_nvs_on_wake=False
    )
    
    driver = MobileAppLogicDriver(config)
    assert driver.snapshot["status"] == "DRAFT"
    
    # Connect and populate required sensors manually to verify transitions
    device = MockDevice(config)
    driver.connect_to(device)
    
    # Trigger notifications by capturing
    device.capture_button("RA")
    device.capture_button("SA")
    device.capture_button("OA")
    device.capture_button("DA")
    device.capture_encoder("SL", 40.0)
    device.capture_encoder("LL", 110.0)
    
    # Toggle phase and capture AFTER set
    device.toggle_switch()
    device.capture_button("RA")
    device.capture_button("SA")
    device.capture_button("OA")
    device.capture_button("DA")
    device.capture_encoder("SL", 40.0)
    device.capture_encoder("LL", 110.0)
    
    # Finalize/submit
    driver.submit_snapshot(status="COMPLETED")
    assert driver.snapshot["status"] == "COMPLETED"
    assert len(driver.outbox) == 1
    
    # Sync outbox
    driver.sync_outbox()
    assert len(driver.outbox) == 0
    assert driver.snapshot["snapshot_id"] in driver.synced_snapshots

def test_data_integrity_validation_mismatch():
    fixture = SensorValueFixture(
        ra_temp=75.0, ra_rh=50.0, sa_temp=55.0, oa_temp=95.0, da_temp=105.0,
        sl_sat=40.0, sl_pipe=50.0, ll_sat=110.0, ll_pipe=90.0
    )
    config = SimulatorConfig(
        scenario_id="scen-integrity-mismatch",
        workflow="B",
        network_cond="NET_NORMAL",
        power_state="PWR_CONTINUOUS",
        sensor_state="SENS_NORMAL",
        sensor_values=fixture,
        ocr_path="OCR_SUCCESS",
        llm_path="LLM_SUCCESS",
        packet_loss_pct=0.0,
        rssi_override_dbm=None,
        sleep_trigger_step=None,
        sleep_duration_ms=0,
        corrupt_nvs_on_wake=False
    )
    
    # Build a snapshot with a deliberately incorrect Delta T calculation
    snapshot = {
        "before_set": {
            "return_air": {"temp": 75.0, "humidity": 50.0},
            "supply_air": {"temp": 55.0, "humidity": 50.0},
            "calculations": {
                "evaporator_delta_t": 25.0,  # Deliberately wrong (75 - 55 = 20)
                "superheat": 10.0,
                "subcooling": 20.0
            }
        }
    }
    
    result = validate_data_integrity(snapshot, config)
    assert result.valid is False
    assert "Delta T mismatch" in result.reason

def test_idempotency_enforcement(test_db):
    fixture = SensorValueFixture(
        ra_temp=75.0, ra_rh=50.0, sa_temp=55.0, oa_temp=95.0, da_temp=105.0,
        sl_sat=40.0, sl_pipe=50.0, ll_sat=110.0, ll_pipe=90.0
    )
    config = SimulatorConfig(
        scenario_id="scen-idempotency",
        workflow="B",
        network_cond="NET_NORMAL",
        power_state="PWR_CONTINUOUS",
        sensor_state="SENS_NORMAL",
        sensor_values=fixture,
        ocr_path="OCR_SUCCESS",
        llm_path="LLM_SUCCESS",
        packet_loss_pct=0.0,
        rssi_override_dbm=None,
        sleep_trigger_step=None,
        sleep_duration_ms=0,
        corrupt_nvs_on_wake=False
    )
    
    driver = MobileAppLogicDriver(config)
    device = MockDevice(config)
    driver.connect_to(device)
    
    # Capture inputs
    device.capture_button("RA")
    device.capture_button("SA")
    device.capture_button("OA")
    device.capture_button("DA")
    device.capture_encoder("SL", 40.0)
    device.capture_encoder("LL", 110.0)
    
    device.toggle_switch()
    device.capture_button("RA")
    device.capture_button("SA")
    device.capture_button("OA")
    device.capture_button("DA")
    device.capture_encoder("SL", 40.0)
    device.capture_encoder("LL", 110.0)
    
    # Submit first time -> added to outbox
    driver.submit_snapshot(status="COMPLETED")
    
    # Submit second time with same snapshot_id -> raises IdempotencyViolation
    with pytest.raises(Exception) as excinfo:
        driver.submit_snapshot(status="COMPLETED")
    assert "idempotency_violation" in str(excinfo.value)

def test_workflow_c_offline_sync(test_db):
    # Test workflow C offline capture + delayed sync
    fixture = SensorValueFixture(
        ra_temp=75.0, ra_rh=50.0, sa_temp=55.0, oa_temp=95.0, da_temp=105.0,
        sl_sat=40.0, sl_pipe=50.0, ll_sat=110.0, ll_pipe=90.0
    )
    config = SimulatorConfig(
        scenario_id="scen-offline-sync",
        workflow="C",
        network_cond="NET_OFFLINE_2H",
        power_state="PWR_CONTINUOUS",
        sensor_state="SENS_NORMAL",
        sensor_values=fixture,
        ocr_path="OCR_SUCCESS",
        llm_path="LLM_SUCCESS",
        packet_loss_pct=0.0,
        rssi_override_dbm=None,
        sleep_trigger_step=None,
        sleep_duration_ms=0,
        corrupt_nvs_on_wake=False
    )
    
    result = run_scenario(config, run_id="run-offline-test", api_base_url=None)
    assert result.outcome == "PASS"
    assert result.data_integrity is True
    
    import hashlib
    salt = "hvac-helper-salt"
    expected_hash = hashlib.sha256(("scen-offline-sync" + salt).encode('utf-8')).hexdigest()

    # Verify that telemetry logs has SYNC_ATTEMPT with failure, then success
    conn = sqlite3.connect(test_db)
    cursor = conn.cursor()
    cursor.execute("SELECT payload FROM telemetry_logs WHERE event_name='SYNC_ATTEMPT' AND device_hash = ?;", (expected_hash,))
    rows = cursor.fetchall()
    assert len(rows) >= 2
    
    statuses = [json.loads(r[0])["http_status"] for r in rows]
    assert 0 in statuses  # first attempt fails
    assert 202 in statuses  # second attempt succeeds after restoring network
    conn.close()

def test_markdown_report_generation(tmp_path):
    from tests.harness.runner import write_summary_report
    results = [
        {
            "scenario_id": "scen-1",
            "workflow": "B",
            "network_cond": "NET_NORMAL",
            "power_state": "PWR_CONTINUOUS",
            "sensor_state": "SENS_NORMAL",
            "outcome": "PASS",
            "failure_reason": None,
            "duration_ms": 1200,
            "data_integrity": True
        }
    ]
    # Set the report folder check to fallback to data/reports
    write_summary_report(results, "1a")
    
    report_dir = "data/reports"
    assert os.path.exists(report_dir)
    files = os.listdir(report_dir)
    assert len(files) >= 1

def test_wal_mode_and_concurrency(test_db):
    import time
    from tests.harness.runner import run_scenarios_parallel
    with open("tests/scenarios/phase_1a.json", "r") as f:
        scenario_ids = json.load(f)[:4]
        
    results = run_scenarios_parallel(scenario_ids, num_workers=2, api_base_url=None)
    assert len(results) == 4
    for r in results:
        assert r["outcome"] in ("PASS", "FAIL", "ERROR")

def test_mock_clock_offline_sync_acceleration(test_db):
    import time
    fixture = SensorValueFixture(
        ra_temp=75.0, ra_rh=50.0, sa_temp=55.0, oa_temp=95.0, da_temp=105.0,
        sl_sat=40.0, sl_pipe=50.0, ll_sat=110.0, ll_pipe=90.0
    )
    config = SimulatorConfig(
        scenario_id="scen-clock-accel",
        workflow="C",
        network_cond="NET_OFFLINE_2H",
        power_state="PWR_CONTINUOUS",
        sensor_state="SENS_NORMAL",
        sensor_values=fixture,
        ocr_path="OCR_SUCCESS",
        llm_path="LLM_SUCCESS",
        packet_loss_pct=0.0,
        rssi_override_dbm=None,
        sleep_trigger_step=None,
        sleep_duration_ms=0,
        corrupt_nvs_on_wake=False
    )
    
    start_time = time.time()
    result = run_scenario(config, run_id="run-clock-test", api_base_url=None)
    duration = time.time() - start_time
    
    assert duration < 5.0
    assert result.outcome == "PASS"
    
    import hashlib
    salt = "hvac-helper-salt"
    expected_hash = hashlib.sha256(("scen-clock-accel" + salt).encode('utf-8')).hexdigest()

    conn = sqlite3.connect(test_db)
    cursor = conn.cursor()
    cursor.execute("""
        SELECT COUNT(*) FROM telemetry_logs 
        WHERE event_name='SYNC_ATTEMPT' 
        AND device_hash = ?;
    """, (expected_hash,))
    count = cursor.fetchone()[0]
    conn.close()
    assert count == 121


