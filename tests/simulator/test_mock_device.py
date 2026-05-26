import pytest
from tests.simulator.mock_device import MockDevice, SimulatorConfig, SensorValueFixture

def test_ble_advertisement_uuid():
    # Setup a configuration
    fixture = SensorValueFixture(
        ra_temp=75.0, ra_rh=50.0, sa_temp=55.0, oa_temp=95.0, da_temp=105.0,
        sl_sat=40.0, sl_pipe=50.0, ll_sat=110.0, ll_pipe=90.0
    )
    config = SimulatorConfig(
        scenario_id="scen-test-1",
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
    
    # Initialize the mock device
    device = MockDevice(config)
    
    # Verify that the service UUID is correct
    assert device.service_uuid == "e5c1e100-c97b-4835-ab3f-917462c95e1e"
    # Verify that it indicates it is advertising/active
    assert device.is_advertising is True

def test_core_characteristics():
    import json
    fixture = SensorValueFixture(
        ra_temp=75.0, ra_rh=50.0, sa_temp=55.0, oa_temp=95.0, da_temp=105.0,
        sl_sat=40.0, sl_pipe=50.0, ll_sat=110.0, ll_pipe=90.0
    )
    config = SimulatorConfig(
        scenario_id="scen-test-2",
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
    device = MockDevice(config)
    
    # Capture RA button
    payload_ra = device.capture_button("RA")
    data_ra = json.loads(payload_ra.decode('utf-8'))
    assert data_ra["button_id"] == "RA"
    assert data_ra["temp_f"] == 75.0
    assert data_ra["humidity_pct"] == 50.0
    assert "capture_ts" in data_ra
    
    # Read RA characteristic directly
    char_ra = device.read_characteristic("e5c1e101-c97b-4835-ab3f-917462c95e1e")
    assert json.loads(char_ra.decode('utf-8')) == data_ra
    
    # Capture SL encoder
    payload_sl = device.capture_encoder("SL", saturation_temp_f=42.0)
    data_sl = json.loads(payload_sl.decode('utf-8'))
    assert data_sl["encoder_id"] == "SL"
    assert data_sl["saturation_temp_f"] == 42.0
    assert data_sl["pipe_temp_f"] == 50.0
    assert "capture_ts" in data_sl

    # Read SL characteristic directly
    char_sl = device.read_characteristic("e5c1e105-c97b-4835-ab3f-917462c95e1e")
    assert json.loads(char_sl.decode('utf-8')) == data_sl

def test_switch_toggle_retransmission():
    import json
    fixture = SensorValueFixture(
        ra_temp=75.0, ra_rh=50.0, sa_temp=55.0, oa_temp=95.0, da_temp=105.0,
        sl_sat=40.0, sl_pipe=50.0, ll_sat=110.0, ll_pipe=90.0
    )
    config = SimulatorConfig(
        scenario_id="scen-test-3",
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
    device = MockDevice(config)
    
    # Defaults to 'before'
    assert device.active_phase == "before"
    
    # Capture RA in 'before'
    device.capture_button("RA")
    
    # Toggle switch to 'after'
    device.toggle_switch()
    assert device.active_phase == "after"
    
    # Read RA characteristic in 'after' (should be empty bytes or empty JSON)
    char_ra_after = device.read_characteristic("e5c1e101-c97b-4835-ab3f-917462c95e1e")
    assert char_ra_after == b""
    
    # Capture SA in 'after'
    device.capture_button("SA")
    
    # Toggle switch back to 'before'
    device.toggle_switch()
    assert device.active_phase == "before"
    
    # RA in 'before' should be restored and retransmitted/updated on characteristic
    char_ra_before = device.read_characteristic("e5c1e101-c97b-4835-ab3f-917462c95e1e")
    data_ra_before = json.loads(char_ra_before.decode('utf-8'))
    assert data_ra_before["button_id"] == "RA"
    assert data_ra_before["temp_f"] == 75.0

def test_telemetry_logging(tmp_path):
    import json
    import os
    import sqlite3
    from tests.db.init_db import init_db

    # Initialize a temporary db
    db_file = tmp_path / "telemetry_test.db"
    db_path = str(db_file)
    init_db(db_path)
    
    # Store old DB_PATH env var if it exists
    old_db_path = os.environ.get("DB_PATH")
    os.environ["DB_PATH"] = db_path
    
    try:
        fixture = SensorValueFixture(
            ra_temp=75.0, ra_rh=50.0, sa_temp=55.0, oa_temp=95.0, da_temp=105.0,
            sl_sat=40.0, sl_pipe=50.0, ll_sat=110.0, ll_pipe=90.0
        )
        config = SimulatorConfig(
            scenario_id="scen-test-4",
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
        device = MockDevice(config)
        
        # Simulated connection should log BLE_CONNECT
        device.connect()
        
        # Simulated button press should log BUTTON_CAPTURE
        device.capture_button("RA")
        
        # Verify db contents
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check BLE_CONNECT
        cursor.execute("SELECT event_type, event_name, duration_ms, payload FROM telemetry_logs WHERE event_name = 'BLE_CONNECT';")
        row_connect = cursor.fetchone()
        assert row_connect is not None
        assert row_connect[0] == "CONNECTIVITY"
        assert row_connect[1] == "BLE_CONNECT"
        assert row_connect[2] == 150 # duration_ms
        payload_connect = json.loads(row_connect[3])
        assert payload_connect["rssi_dbm"] == -50
        assert payload_connect["connect_duration_ms"] == 150
        
        # Check BUTTON_CAPTURE
        cursor.execute("SELECT event_type, event_name, duration_ms, payload FROM telemetry_logs WHERE event_name = 'BUTTON_CAPTURE';")
        row_capture = cursor.fetchone()
        assert row_capture is not None
        assert row_capture[0] == "HARDWARE"
        assert row_capture[1] == "BUTTON_CAPTURE"
        assert row_capture[2] == 50 # duration_ms
        payload_capture = json.loads(row_capture[3])
        assert payload_capture["button_id"] == "RA"
        assert payload_capture["sensor_value"]["temp_f"] == 75.0
        assert payload_capture["sensor_value"]["humidity_pct"] == 50.0
        assert payload_capture["capture_duration_ms"] == 50
        
        conn.close()
    finally:
        if old_db_path is not None:
            os.environ["DB_PATH"] = old_db_path
        else:
            os.environ.pop("DB_PATH", None)

def test_sensor_drift_and_faults(tmp_path):
    import json
    import os
    import sqlite3
    from tests.db.init_db import init_db

    # Initialize a temporary db
    db_file = tmp_path / "telemetry_test_faults.db"
    db_path = str(db_file)
    init_db(db_path)
    
    # Store old DB_PATH env var if it exists
    old_db_path = os.environ.get("DB_PATH")
    os.environ["DB_PATH"] = db_path
    
    try:
        fixture = SensorValueFixture(
            ra_temp=75.0, ra_rh=50.0, sa_temp=55.0, oa_temp=95.0, da_temp=105.0,
            sl_sat=40.0, sl_pipe=50.0, ll_sat=110.0, ll_pipe=90.0
        )
        
        # Test 1: SHT40 Drift
        config_drift = SimulatorConfig(
            scenario_id="scen-test-drift",
            workflow="B",
            network_cond="NET_NORMAL",
            power_state="PWR_CONTINUOUS",
            sensor_state="SENS_SHT40_DRIFT",
            sensor_values=fixture,
            ocr_path="OCR_SUCCESS",
            llm_path="LLM_SUCCESS",
            packet_loss_pct=0.0,
            rssi_override_dbm=None,
            sleep_trigger_step=None,
            sleep_duration_ms=0,
            corrupt_nvs_on_wake=False
        )
        device_drift = MockDevice(config_drift)
        
        # Capture RA and SA
        payload_ra = json.loads(device_drift.capture_button("RA").decode('utf-8'))
        payload_sa = json.loads(device_drift.capture_button("SA").decode('utf-8'))
        
        # RA should be shifted by +5.0 and SA by -5.0
        assert payload_ra["temp_f"] == 80.0
        assert payload_sa["temp_f"] == 50.0
        
        # Test 2: Clamp Disconnected
        config_disc = SimulatorConfig(
            scenario_id="scen-test-disc",
            workflow="B",
            network_cond="NET_NORMAL",
            power_state="PWR_CONTINUOUS",
            sensor_state="SENS_CLAMP_DISCONNECTED",
            sensor_values=fixture,
            ocr_path="OCR_SUCCESS",
            llm_path="LLM_SUCCESS",
            packet_loss_pct=0.0,
            rssi_override_dbm=None,
            sleep_trigger_step=None,
            sleep_duration_ms=0,
            corrupt_nvs_on_wake=False
        )
        device_disc = MockDevice(config_disc)
        
        # Capture SL
        payload_sl = json.loads(device_disc.capture_encoder("SL", saturation_temp_f=40.0).decode('utf-8'))
        assert payload_sl["pipe_temp_f"] is None
        
        # Verify SENSOR_FAULT events are logged in DB
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT event_type, event_name, payload FROM telemetry_logs WHERE event_name = 'SENSOR_FAULT';")
        rows = cursor.fetchall()
        assert len(rows) >= 2  # one from drift device, one from disc device
        
        payloads = [json.loads(r[2]) for r in rows]
        fault_codes = [p["sensor_fault_code"] for p in payloads]
        assert "SENS_SHT40_DRIFT" in fault_codes
        assert "SENS_CLAMP_DISCONNECTED" in fault_codes
        
        conn.close()
    finally:
        if old_db_path is not None:
            os.environ["DB_PATH"] = old_db_path
        else:
            os.environ.pop("DB_PATH", None)

def test_packet_loss_notify_dropping(tmp_path):
    import json
    import os
    import sqlite3
    from tests.db.init_db import init_db

    db_path = str(tmp_path / "telemetry_loss.db")
    init_db(db_path)
    old_db_path = os.environ.get("DB_PATH")
    os.environ["DB_PATH"] = db_path

    try:
        fixture = SensorValueFixture(
            ra_temp=75.0, ra_rh=50.0, sa_temp=55.0, oa_temp=95.0, da_temp=105.0,
            sl_sat=40.0, sl_pipe=50.0, ll_sat=110.0, ll_pipe=90.0
        )
        config = SimulatorConfig(
            scenario_id="scen-test-loss",
            workflow="B",
            network_cond="NET_LOSS_20",
            power_state="PWR_CONTINUOUS",
            sensor_state="SENS_NORMAL",
            sensor_values=fixture,
            ocr_path="OCR_SUCCESS",
            llm_path="LLM_SUCCESS",
            packet_loss_pct=0.20,
            rssi_override_dbm=None,
            sleep_trigger_step=None,
            sleep_duration_ms=0,
            corrupt_nvs_on_wake=False
        )
        device = MockDevice(config)

        notified_count = 0
        def on_notify(char_uuid, value):
            nonlocal notified_count
            notified_count += 1

        device.subscribe(MockDevice.UUID_MAP["RA"], on_notify)

        # Trigger 100 captures to test packet dropping
        for _ in range(100):
            device.capture_button("RA")

        # Expect around 80 notifications (±5% tolerance means 75 to 85)
        assert 75 <= notified_count <= 85
        
        # Verify loss reconnect event can be triggered
        device.trigger_loss_reconnect()
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT event_name, payload FROM telemetry_logs WHERE event_name = 'BLE_DISCONNECT';")
        row = cursor.fetchone()
        assert row is not None
        payload = json.loads(row[1])
        assert payload["disconnect_reason_code"] == 8
        assert payload["reconnect_attempt_count"] == 1
        conn.close()

    finally:
        if old_db_path is not None:
            os.environ["DB_PATH"] = old_db_path
        else:
            os.environ.pop("DB_PATH", None)

def test_rf_interference_reconnects(tmp_path):
    import json
    import os
    import sqlite3
    from tests.db.init_db import init_db

    db_path = str(tmp_path / "telemetry_rf.db")
    init_db(db_path)
    old_db_path = os.environ.get("DB_PATH")
    os.environ["DB_PATH"] = db_path

    try:
        fixture = SensorValueFixture(
            ra_temp=75.0, ra_rh=50.0, sa_temp=55.0, oa_temp=95.0, da_temp=105.0,
            sl_sat=40.0, sl_pipe=50.0, ll_sat=110.0, ll_pipe=90.0
        )
        config = SimulatorConfig(
            scenario_id="scen-test-rf",
            workflow="B",
            network_cond="NET_RF_INTERFERENCE",
            power_state="PWR_CONTINUOUS",
            sensor_state="SENS_NORMAL",
            sensor_values=fixture,
            ocr_path="OCR_SUCCESS",
            llm_path="LLM_SUCCESS",
            packet_loss_pct=0.0,
            rssi_override_dbm=-90,
            sleep_trigger_step=None,
            sleep_duration_ms=0,
            corrupt_nvs_on_wake=False
        )
        device = MockDevice(config)
        device.connect()

        # Check DB for 3 disconnects and 3 connects (plus the initial connection or within cycles)
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        cursor.execute("SELECT COUNT(*) FROM telemetry_logs WHERE event_name = 'BLE_DISCONNECT';")
        disconnect_count = cursor.fetchone()[0]
        assert disconnect_count == 3
        
        cursor.execute("SELECT COUNT(*) FROM telemetry_logs WHERE event_name = 'BLE_CONNECT';")
        connect_count = cursor.fetchone()[0]
        # Should be 4 (1 initial + 3 reconnects)
        assert connect_count == 4
        
        conn.close()

    finally:
        if old_db_path is not None:
            os.environ["DB_PATH"] = old_db_path
        else:
            os.environ.pop("DB_PATH", None)

def test_deep_sleep_nvs_roundtrip(tmp_path):
    import json
    import os
    import sqlite3
    from tests.db.init_db import init_db

    db_path = str(tmp_path / "telemetry_sleep.db")
    init_db(db_path)
    old_db_path = os.environ.get("DB_PATH")
    os.environ["DB_PATH"] = db_path

    # Override /data write path using environment or custom mapping
    try:
        fixture = SensorValueFixture(
            ra_temp=75.0, ra_rh=50.0, sa_temp=55.0, oa_temp=95.0, da_temp=105.0,
            sl_sat=40.0, sl_pipe=50.0, ll_sat=110.0, ll_pipe=90.0
        )
        config = SimulatorConfig(
            scenario_id="scen-test-sleep",
            workflow="B",
            network_cond="NET_NORMAL",
            power_state="PWR_SLEEP_1",
            sensor_state="SENS_NORMAL",
            sensor_values=fixture,
            ocr_path="OCR_SUCCESS",
            llm_path="LLM_SUCCESS",
            packet_loss_pct=0.0,
            rssi_override_dbm=None,
            sleep_trigger_step=None,
            sleep_duration_ms=500,
            corrupt_nvs_on_wake=False
        )
        device = MockDevice(config)

        # Capture some readings
        device.capture_button("RA")
        device.toggle_switch()
        device.capture_button("SA")

        # Enter sleep
        device.enter_deep_sleep()
        assert device.is_advertising is False

        # Wake from sleep
        device.wake_from_deep_sleep()
        assert device.is_advertising is True
        assert device.active_phase == "after"  # restored phase

        # Check DB
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        cursor.execute("SELECT event_name, payload FROM telemetry_logs WHERE event_name = 'DEEP_SLEEP_ENTER';")
        row_enter = cursor.fetchone()
        assert row_enter is not None
        payload_enter = json.loads(row_enter[1])
        assert payload_enter["cached_values_count"] == 2
        
        cursor.execute("SELECT event_name, payload FROM telemetry_logs WHERE event_name = 'DEEP_SLEEP_WAKE';")
        row_wake = cursor.fetchone()
        assert row_wake is not None
        payload_wake = json.loads(row_wake[1])
        assert payload_wake["sleep_duration_ms"] == 500
        assert payload_wake["nvs_cache_valid"] is True

        conn.close()

    finally:
        if old_db_path is not None:
            os.environ["DB_PATH"] = old_db_path
        else:
            os.environ.pop("DB_PATH", None)

def test_deep_sleep_nvs_corruption(tmp_path):
    import json
    import os
    import sqlite3
    from tests.db.init_db import init_db

    db_path = str(tmp_path / "telemetry_corrupt.db")
    init_db(db_path)
    old_db_path = os.environ.get("DB_PATH")
    os.environ["DB_PATH"] = db_path

    try:
        fixture = SensorValueFixture(
            ra_temp=75.0, ra_rh=50.0, sa_temp=55.0, oa_temp=95.0, da_temp=105.0,
            sl_sat=40.0, sl_pipe=50.0, ll_sat=110.0, ll_pipe=90.0
        )
        config = SimulatorConfig(
            scenario_id="scen-test-corrupt",
            workflow="B",
            network_cond="NET_NORMAL",
            power_state="PWR_SLEEP_1",
            sensor_state="SENS_NORMAL",
            sensor_values=fixture,
            ocr_path="OCR_SUCCESS",
            llm_path="LLM_SUCCESS",
            packet_loss_pct=0.0,
            rssi_override_dbm=None,
            sleep_trigger_step=None,
            sleep_duration_ms=300,
            corrupt_nvs_on_wake=True
        )
        device = MockDevice(config)

        # Capture some readings
        device.capture_button("RA")

        # Sleep and wake with corruption
        device.enter_deep_sleep()
        device.wake_from_deep_sleep()

        # Cache should be cleared
        assert device.caches["before"] == {}
        assert device.caches["after"] == {}

        # Check DB
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        cursor.execute("SELECT event_name, payload FROM telemetry_logs WHERE event_name = 'DEEP_SLEEP_WAKE';")
        payload_wake = json.loads(cursor.fetchone()[1])
        assert payload_wake["nvs_cache_valid"] is False

        cursor.execute("SELECT event_name, payload FROM telemetry_logs WHERE event_name = 'SENSOR_FAULT';")
        row_fault = cursor.fetchone()
        assert row_fault is not None
        payload_fault = json.loads(row_fault[1])
        assert payload_fault["sensor_fault_code"] == "NVS_CRC_MISMATCH"

        conn.close()

    finally:
        if old_db_path is not None:
            os.environ["DB_PATH"] = old_db_path
        else:
            os.environ.pop("DB_PATH", None)

def test_ota_abort(tmp_path):
    import json
    import os
    import sqlite3
    from tests.db.init_db import init_db

    db_path = str(tmp_path / "telemetry_ota.db")
    init_db(db_path)
    old_db_path = os.environ.get("DB_PATH")
    os.environ["DB_PATH"] = db_path

    try:
        fixture = SensorValueFixture(
            ra_temp=75.0, ra_rh=50.0, sa_temp=55.0, oa_temp=95.0, da_temp=105.0,
            sl_sat=40.0, sl_pipe=50.0, ll_sat=110.0, ll_pipe=90.0
        )
        config = SimulatorConfig(
            scenario_id="scen-test-ota",
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
        device = MockDevice(config)

        # Successful OTA
        device.simulate_ota(abort_pct=None)
        
        # Aborted OTA
        device.simulate_ota(abort_pct=85)

        # Check DB
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        cursor.execute("SELECT COUNT(*) FROM telemetry_logs WHERE event_name = 'OTA_COMPLETE';")
        assert cursor.fetchone()[0] == 1
        
        cursor.execute("SELECT event_name, payload FROM telemetry_logs WHERE event_name = 'WATCHDOG_RESET';")
        row_wd = cursor.fetchone()
        assert row_wd is not None
        payload_wd = json.loads(row_wd[1])
        assert payload_wd["watchdog_reset_count"] == 1
        assert payload_wd["reset_reason"] == "OTA_ABORT"

        conn.close()

    finally:
        if old_db_path is not None:
            os.environ["DB_PATH"] = old_db_path
        else:
            os.environ.pop("DB_PATH", None)





