import os
import sys
import json
import uuid
import time
import sqlite3
import argparse
import requests
import hashlib
import multiprocessing
from datetime import datetime, timezone
from dataclasses import dataclass
from typing import Optional, Dict, Any, List

from tests.simulator.mock_device import MockDevice, SimulatorConfig, SensorValueFixture

@dataclass
class ScenarioResult:
    outcome: str               # "PASS" | "FAIL" | "ERROR"
    failure_step: Optional[int] = None
    failure_reason: Optional[str] = None
    total_duration_ms: int = 0
    snapshot_id: Optional[str] = None
    data_integrity: bool = True

class IdempotencyViolation(Exception):
    pass

class StepFailure(Exception):
    pass

class MobileAppLogicDriver:
    def __init__(self, config: SimulatorConfig, api_base_url: Optional[str] = None):
        self.config = config
        self.api_base_url = api_base_url
        self.device = None
        self.snapshot = None
        self.outbox = []
        self.synced_snapshots = {}
        self.elapsed_simulated_seconds = 0
        
        # Salted device hash matching MockDevice
        salt = "hvac-helper-salt"
        self.device_hash = hashlib.sha256((self.config.scenario_id + salt).encode('utf-8')).hexdigest()
        
        self._init_draft_snapshot()

    def _init_draft_snapshot(self, parent_id: Optional[str] = None, revision: int = 1):
        self.snapshot = {
            "snapshot_id": str(uuid.uuid4()),
            "revision": revision,
            "status": "DRAFT",
            "technician_id": "tech-123",
            "job_id": "job-123",
            "customer_id": "cust-123",
            "refrigerant": "R-410A",
            "equipment": None,
            "before_set": {},
            "after_set": {},
            "technician_notes": None,
            "created_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "") + "Z",
            "updated_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "") + "Z"
        }
        if parent_id:
            self.snapshot["parent_id"] = parent_id

    def advance_clock(self, seconds: int):
        self.elapsed_simulated_seconds += seconds

    def connect_to(self, device: MockDevice):
        self.device = device
        self.device.connect()
        
        # Subscribe to BLE notifications
        self.device.subscribe(MockDevice.UUID_MAP["RA"], self.on_ra_notification)
        self.device.subscribe(MockDevice.UUID_MAP["SA"], self.on_sa_notification)
        self.device.subscribe(MockDevice.UUID_MAP["OA"], self.on_oa_notification)
        self.device.subscribe(MockDevice.UUID_MAP["DA"], self.on_da_notification)
        self.device.subscribe(MockDevice.UUID_MAP["SL"], self.on_sl_notification)
        self.device.subscribe(MockDevice.UUID_MAP["LL"], self.on_ll_notification)
        self.device.subscribe(MockDevice.UUID_MAP["switch"], self.on_switch_notification)

    def _log_telemetry(self, event_type: str, event_name: str, duration_ms: Optional[int], payload: Dict[str, Any]):
        db_path = os.environ.get("DB_PATH", "data/test_telemetry.db")
        try:
            conn = sqlite3.connect(db_path, timeout=30.0)
            conn.execute("PRAGMA journal_mode=WAL;")
            cursor = conn.cursor()
            event_id = str(uuid.uuid4())
            timestamp = datetime.now(timezone.utc).isoformat().replace("+00:00", "") + "Z"
            cursor.execute("""
                INSERT INTO telemetry_logs (event_id, device_hash, event_type, event_name, duration_ms, payload, timestamp)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (event_id, self.device_hash, event_type, event_name, duration_ms, json.dumps(payload), timestamp))
            conn.commit()
            conn.close()
        except Exception as e:
            print(f"App Telemetry logging error: {e}")

    def _save_sensor(self, phase: str, key: str, data: Dict[str, Any]):
        set_name = "before_set" if phase == "before" else "after_set"
        if set_name not in self.snapshot:
            self.snapshot[set_name] = {}
        self.snapshot[set_name][key] = data
        self.recalculate_metrics(self.snapshot[set_name])

    def recalculate_metrics(self, set_data: Dict[str, Any]):
        if "calculations" not in set_data:
            set_data["calculations"] = {}
            
        ra = set_data.get("return_air")
        sa = set_data.get("supply_air")
        if ra and sa and ra.get("temp") is not None and sa.get("temp") is not None:
            set_data["calculations"]["evaporator_delta_t"] = round(ra["temp"] - sa["temp"], 1)
            
        sl = set_data.get("suction_line")
        if sl and sl.get("pipe_temp") is not None and sl.get("dialSatTemp") is not None:
            set_data["calculations"]["suction_saturation_temp"] = sl["dialSatTemp"]
            set_data["calculations"]["superheat"] = round(sl["pipe_temp"] - sl["dialSatTemp"], 1)
            
        ll = set_data.get("liquid_line")
        if ll and ll.get("pipe_temp") is not None and ll.get("dialSatTemp") is not None:
            set_data["calculations"]["liquid_saturation_temp"] = ll["dialSatTemp"]
            set_data["calculations"]["subcooling"] = round(ll["dialSatTemp"] - ll["pipe_temp"], 1)

    def on_ra_notification(self, char_uuid: str, value: bytes):
        if not value: return
        data = json.loads(value.decode('utf-8'))
        phase = self.device.active_phase
        self._save_sensor(phase, "return_air", {"temp": data["temp_f"], "humidity": data["humidity_pct"]})

    def on_sa_notification(self, char_uuid: str, value: bytes):
        if not value: return
        data = json.loads(value.decode('utf-8'))
        phase = self.device.active_phase
        self._save_sensor(phase, "supply_air", {"temp": data["temp_f"], "humidity": data["humidity_pct"]})

    def on_oa_notification(self, char_uuid: str, value: bytes):
        if not value: return
        data = json.loads(value.decode('utf-8'))
        phase = self.device.active_phase
        self._save_sensor(phase, "outdoor_ambient", {"temp": data["temp_f"], "humidity": data["humidity_pct"]})

    def on_da_notification(self, char_uuid: str, value: bytes):
        if not value: return
        data = json.loads(value.decode('utf-8'))
        phase = self.device.active_phase
        self._save_sensor(phase, "discharge_air", {"temp": data["temp_f"], "humidity": data["humidity_pct"]})

    def on_sl_notification(self, char_uuid: str, value: bytes):
        if not value: return
        data = json.loads(value.decode('utf-8'))
        phase = self.device.active_phase
        self._save_sensor(phase, "suction_line", {
            "pipe_temp": data["pipe_temp_f"],
            "dialSatTemp": data["saturation_temp_f"]
        })

    def on_ll_notification(self, char_uuid: str, value: bytes):
        if not value: return
        data = json.loads(value.decode('utf-8'))
        phase = self.device.active_phase
        self._save_sensor(phase, "liquid_line", {
            "pipe_temp": data["pipe_temp_f"],
            "dialSatTemp": data["saturation_temp_f"]
        })

    def on_switch_notification(self, char_uuid: str, value: bytes):
        pass

    def perform_ocr(self, model: str, serial: str, attempts: int = 1, bypass: bool = False):
        duration = 200 * attempts
        self.snapshot["equipment"] = {
            "model_number": model,
            "serial_number": serial
        }
        self._log_telemetry("OCR", "OCR_SCAN_COMPLETE", duration, {
            "scan_attempts": attempts,
            "scan_duration_ms": duration,
            "manual_bypass_triggered": bypass,
            "corrected_fields": []
        })

    def expand_notes_llm(self, notes: str, path: str):
        duration = 400
        status = "SUCCESS"
        if path == "LLM_OOM":
            status = "OOM"
        elif path == "LLM_CLOUD_FALLBACK":
            status = "CLOUD_FALLBACK"
            
        self.snapshot["technician_notes"] = notes + " (expanded by LLM)"
        self._log_telemetry("LLM", "LLM_EXPANSION", duration, {
            "input_char_length": len(notes),
            "output_char_length": len(self.snapshot["technician_notes"]),
            "status": status,
            "inference_duration_ms": duration
        })

    def submit_snapshot(self, status: str = "COMPLETED"):
        is_diagnostic = (status == "DIAGNOSTIC_COMPLETE")
        before_set = self.snapshot.get("before_set", {})
        after_set = self.snapshot.get("after_set", {})
        
        required_keys = ["return_air", "supply_air", "outdoor_ambient", "discharge_air", "suction_line", "liquid_line"]
        before_ok = all(k in before_set for k in required_keys)
        after_ok = all(k in after_set for k in required_keys)
        
        if is_diagnostic:
            if not before_ok:
                raise StepFailure("Cannot finalize. Missing: Before Set (needs all 6 sensors).")
            self.snapshot["status"] = "DIAGNOSTIC_COMPLETE"
            self.snapshot["after_set"] = None
            self.snapshot["performance_deltas"] = None
        else:
            if not before_ok or not after_ok:
                missing = []
                if not before_ok: missing.append("Before Set")
                if not after_ok: missing.append("After Set")
                raise StepFailure(f"Cannot finalize. Missing: {', '.join(missing)}.")
                
            self.snapshot["status"] = "COMPLETED"
            
            # Compute performance deltas
            calcB = before_set.get("calculations", {})
            calcA = after_set.get("calculations", {})
            self.snapshot["performance_deltas"] = {
                "evaporator_delta_t_change": round(calcA.get("evaporator_delta_t", 0.0) - calcB.get("evaporator_delta_t", 0.0), 1),
                "superheat_change": round(calcA.get("superheat", 0.0) - calcB.get("superheat", 0.0), 1),
                "subcooling_change": round(calcA.get("subcooling", 0.0) - calcB.get("subcooling", 0.0), 1),
                "return_air_temp_change": round(after_set["return_air"]["temp"] - before_set["return_air"]["temp"], 1)
            }
            
        self.snapshot["updated_at"] = datetime.now(timezone.utc).isoformat().replace("+00:00", "") + "Z"
        
        # Check idempotency violation before adding to outbox
        for item in self.outbox:
            if item["snapshot_id"] == self.snapshot["snapshot_id"]:
                raise IdempotencyViolation("idempotency_violation")
                
        self._log_telemetry("SYNC", "SNAPSHOT_FINALIZED", None, {
            "snapshot_id": self.snapshot["snapshot_id"],
            "outbox_depth": len(self.outbox) + 1
        })
        
        self.outbox.append(self.snapshot)

    def sync_outbox(self, retry_attempt: int = 1) -> bool:
        if self.config.network_cond == "NET_OFFLINE_2H":
            # Simulation of offline sync attempt failure
            self._log_telemetry("SYNC", "SYNC_ATTEMPT", None, {
                "outbox_depth": len(self.outbox),
                "api_endpoint": "/api/v1/snapshots",
                "http_status": 0,
                "retry_attempt": retry_attempt
            })
            return False
            
        success = True
        synced_ids = []
        for idx, item in enumerate(self.outbox):
            headers = {
                "Authorization": f"Bearer {os.environ.get('API_BEARER_TOKEN', 'test-token')}",
                "Idempotency-Key": f"ikey-{item['snapshot_id']}"
            }
            
            http_status = 202
            if self.api_base_url:
                try:
                    url = f"{self.api_base_url.rstrip('/')}/api/v1/snapshots"
                    response = requests.post(url, json=item, headers=headers, timeout=5)
                    http_status = response.status_code
                    if response.status_code not in (200, 202):
                        success = False
                        self._log_telemetry("SYNC", "SYNC_ATTEMPT", None, {
                            "outbox_depth": len(self.outbox) - idx,
                            "api_endpoint": "/api/v1/snapshots",
                            "http_status": response.status_code,
                            "retry_attempt": retry_attempt
                        })
                        continue
                except Exception as e:
                    success = False
                    self._log_telemetry("SYNC", "SYNC_ATTEMPT", None, {
                        "outbox_depth": len(self.outbox) - idx,
                        "api_endpoint": "/api/v1/snapshots",
                        "http_status": 0,
                        "retry_attempt": retry_attempt
                    })
                    continue
            
            # Record telemetry success
            self._log_telemetry("SYNC", "SYNC_ATTEMPT", 120, {
                "outbox_depth": len(self.outbox) - idx,
                "api_endpoint": "/api/v1/snapshots",
                "http_status": http_status,
                "retry_attempt": retry_attempt
            })
            synced_ids.append(item["snapshot_id"])
            self.synced_snapshots[item["snapshot_id"]] = item
            
        # Clean outbox
        self.outbox = [item for item in self.outbox if item["snapshot_id"] not in synced_ids]
        return success

@dataclass
class IntegrityResult:
    valid: bool
    reason: Optional[str] = None

def validate_data_integrity(snapshot: dict, config: SimulatorConfig) -> IntegrityResult:
    for set_name in ["before_set", "after_set"]:
        s_data = snapshot.get(set_name)
        if not s_data:
            continue
        calcs = s_data.get("calculations", {})
        
        ra = s_data.get("return_air")
        sa = s_data.get("supply_air")
        if ra and sa and ra.get("temp") is not None and sa.get("temp") is not None:
            expected_delta = round(ra["temp"] - sa["temp"], 1)
            actual_delta = calcs.get("evaporator_delta_t")
            if actual_delta is None or abs(actual_delta - expected_delta) >= 0.1:
                return IntegrityResult(False, f"Delta T mismatch in {set_name}: expected {expected_delta}, got {actual_delta}")
                
        sl = s_data.get("suction_line")
        if sl and sl.get("pipe_temp") is not None and sl.get("dialSatTemp") is not None:
            expected_sh = round(sl["pipe_temp"] - sl["dialSatTemp"], 1)
            actual_sh = calcs.get("superheat")
            if actual_sh is None or abs(actual_sh - expected_sh) >= 0.1:
                return IntegrityResult(False, f"Superheat mismatch in {set_name}: expected {expected_sh}, got {actual_sh}")
                
        ll = s_data.get("liquid_line")
        if ll and ll.get("pipe_temp") is not None and ll.get("dialSatTemp") is not None:
            expected_sc = round(ll["dialSatTemp"] - ll["pipe_temp"], 1)
            actual_sc = calcs.get("subcooling")
            if actual_sc is None or abs(actual_sc - expected_sc) >= 0.1:
                return IntegrityResult(False, f"Subcooling mismatch in {set_name}: expected {expected_sc}, got {actual_sc}")
                
    return IntegrityResult(True)

def run_scenario(config: SimulatorConfig, run_id: Optional[str] = None, api_base_url: Optional[str] = None) -> ScenarioResult:
    start_time = time.time()
    if not run_id:
        run_id = f"run-{int(start_time)}"
        
    device = MockDevice(config)
    app = MobileAppLogicDriver(config, api_base_url)
    
    try:
        app.connect_to(device)
        
        if config.workflow == "A":
            device.capture_button("RA")
            device.capture_button("SA")
            device.capture_button("OA")
            device.capture_button("DA")
            device.capture_encoder("SL", config.sensor_values.sl_sat)
            device.capture_encoder("LL", config.sensor_values.ll_sat)
            
            if config.ocr_path == "OCR_SUCCESS":
                app.perform_ocr("M12345", "S67890", attempts=1, bypass=False)
            else:
                app.perform_ocr("M12345", "S67890", attempts=3, bypass=True)
                
            app.expand_notes_llm("Diagnostic check only.", config.llm_path)
            app.submit_snapshot(status="DIAGNOSTIC_COMPLETE")
            app.sync_outbox()
            
        elif config.workflow == "B":
            device.capture_button("RA")
            device.capture_button("SA")
            device.capture_button("OA")
            device.capture_button("DA")
            device.capture_encoder("SL", config.sensor_values.sl_sat)
            device.capture_encoder("LL", config.sensor_values.ll_sat)
            
            if config.power_state in ("PWR_SLEEP_1", "PWR_SLEEP_3"):
                device.enter_deep_sleep()
                device.wake_from_deep_sleep()
                
            if config.ocr_path == "OCR_SUCCESS":
                app.perform_ocr("M12345", "S67890", attempts=1, bypass=False)
            else:
                app.perform_ocr("M12345", "S67890", attempts=3, bypass=True)
                
            app.expand_notes_llm("Full diagnostic and repair.", config.llm_path)
            
            device.toggle_switch()
            
            if config.power_state == "PWR_SLEEP_3":
                device.enter_deep_sleep()
                device.wake_from_deep_sleep()
                
            device.capture_button("RA")
            device.capture_button("SA")
            device.capture_button("OA")
            device.capture_button("DA")
            device.capture_encoder("SL", config.sensor_values.sl_sat)
            device.capture_encoder("LL", config.sensor_values.ll_sat)
            
            if config.power_state == "PWR_SLEEP_3":
                device.enter_deep_sleep()
                device.wake_from_deep_sleep()
                
            app.submit_snapshot(status="COMPLETED")
            app.sync_outbox()
            
        elif config.workflow == "C":
            device.capture_button("RA")
            device.capture_button("SA")
            device.capture_button("OA")
            device.capture_button("DA")
            device.capture_encoder("SL", config.sensor_values.sl_sat)
            device.capture_encoder("LL", config.sensor_values.ll_sat)
            
            if config.power_state in ("PWR_SLEEP_1", "PWR_SLEEP_3"):
                device.enter_deep_sleep()
                device.wake_from_deep_sleep()
                
            if config.ocr_path == "OCR_SUCCESS":
                app.perform_ocr("M12345", "S67890", attempts=1, bypass=False)
            else:
                app.perform_ocr("M12345", "S67890", attempts=3, bypass=True)
                
            app.expand_notes_llm("Offline capture scenario.", config.llm_path)
            
            device.toggle_switch()
            
            if config.power_state == "PWR_SLEEP_3":
                device.enter_deep_sleep()
                device.wake_from_deep_sleep()
                
            device.capture_button("RA")
            device.capture_button("SA")
            device.capture_button("OA")
            device.capture_button("DA")
            device.capture_encoder("SL", config.sensor_values.sl_sat)
            device.capture_encoder("LL", config.sensor_values.ll_sat)
            
            if config.power_state == "PWR_SLEEP_3":
                device.enter_deep_sleep()
                device.wake_from_deep_sleep()
                
            app.submit_snapshot(status="COMPLETED")
            
            # Sync fails
            app.sync_outbox(retry_attempt=1)
            
            # Mock Time Acceleration for offline delay
            if config.network_cond == "NET_OFFLINE_2H":
                for attempt in range(2, 122):
                    app.advance_clock(60)
                    if attempt == 121:
                        app.config.network_cond = "NET_NORMAL"
                    app.sync_outbox(retry_attempt=attempt)
            else:
                app.config.network_cond = "NET_NORMAL"
                app.sync_outbox(retry_attempt=2)
            
        elif config.workflow == "D":
            device.capture_button("RA")
            device.capture_button("SA")
            device.capture_button("OA")
            device.capture_button("DA")
            device.capture_encoder("SL", config.sensor_values.sl_sat)
            device.capture_encoder("LL", config.sensor_values.ll_sat)
            
            if config.ocr_path == "OCR_SUCCESS":
                app.perform_ocr("M12345", "S67890", attempts=1, bypass=False)
            else:
                app.perform_ocr("M12345", "S67890", attempts=3, bypass=True)
                
            app.expand_notes_llm("Parent snapshot notes.", config.llm_path)
            device.toggle_switch()
            
            device.capture_button("RA")
            device.capture_button("SA")
            device.capture_button("OA")
            device.capture_button("DA")
            device.capture_encoder("SL", config.sensor_values.sl_sat)
            device.capture_encoder("LL", config.sensor_values.ll_sat)
            
            app.submit_snapshot(status="COMPLETED")
            app.sync_outbox()
            
            parent_snapshot = app.synced_snapshots.get(app.snapshot["snapshot_id"])
            if not parent_snapshot:
                raise StepFailure("Parent snapshot failed to sync, cannot proceed with Workflow D.")
                
            parent_id = parent_snapshot["snapshot_id"]
            app._init_draft_snapshot(parent_id=parent_id, revision=parent_snapshot["revision"] + 1)
            
            app.snapshot["before_set"] = json.loads(json.dumps(parent_snapshot["before_set"]))
            app.snapshot["after_set"] = json.loads(json.dumps(parent_snapshot["after_set"]))
            
            app.snapshot["equipment"] = {
                "model_number": "M54321",
                "serial_number": parent_snapshot["equipment"]["serial_number"]
            }
            
            app.submit_snapshot(status="COMPLETED")
            app.sync_outbox()
            
        else:
            raise StepFailure(f"Unsupported workflow: {config.workflow}")
            
    except IdempotencyViolation as iv:
        elapsed = int((time.time() - start_time) * 1000)
        write_test_scenarios_row(config, run_id, "FAIL", elapsed, None, False, 0, str(iv))
        return ScenarioResult(outcome="FAIL", failure_reason="idempotency_violation", total_duration_ms=elapsed, data_integrity=False)
    except StepFailure as sf:
        elapsed = int((time.time() - start_time) * 1000)
        write_test_scenarios_row(config, run_id, "FAIL", elapsed, None, False, 0, str(sf))
        return ScenarioResult(outcome="FAIL", failure_reason=str(sf), total_duration_ms=elapsed)
    except Exception as e:
        elapsed = int((time.time() - start_time) * 1000)
        write_test_scenarios_row(config, run_id, "ERROR", elapsed, None, False, 0, str(e))
        return ScenarioResult(outcome="ERROR", failure_reason=str(e), total_duration_ms=elapsed)
        
    elapsed = int((time.time() - start_time) * 1000)
    final_snap = app.snapshot
    integrity = validate_data_integrity(final_snap, config)
    
    outcome = "PASS" if integrity.valid else "FAIL"
    reason = None if integrity.valid else integrity.reason
    
    write_test_scenarios_row(
        config, run_id, outcome, elapsed, 
        final_snap["snapshot_id"], integrity.valid, 
        1 if integrity.valid else 0, reason
    )
    
    return ScenarioResult(
        outcome=outcome,
        snapshot_id=final_snap["snapshot_id"],
        total_duration_ms=elapsed,
        data_integrity=integrity.valid,
        failure_reason=reason
    )

def write_test_scenarios_row(
    config: SimulatorConfig, run_id: str, outcome: str, duration_ms: int,
    snapshot_id: Optional[str], data_integrity: bool, integrity_int: int,
    failure_reason: Optional[str] = None
):
    db_path = os.environ.get("DB_PATH", "data/test_telemetry.db")
    try:
        conn = sqlite3.connect(db_path, timeout=30.0)
        conn.execute("PRAGMA journal_mode=WAL;")
        cursor = conn.cursor()
        created_at = datetime.now(timezone.utc).isoformat().replace("+00:00", "") + "Z"
        
        cursor.execute("""
            INSERT OR REPLACE INTO test_scenarios (
                scenario_id, run_id, workflow, network_cond, power_state, sensor_state,
                ocr_path, llm_path, outcome, failure_step, failure_reason, total_duration_ms,
                snapshot_id, data_integrity, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            config.scenario_id,
            run_id,
            config.workflow,
            config.network_cond,
            config.power_state,
            config.sensor_state,
            config.ocr_path,
            config.llm_path,
            outcome,
            None,
            failure_reason,
            duration_ms,
            snapshot_id,
            integrity_int,
            created_at
        ))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"Error writing test_scenarios: {e}")

def load_scenario(scenario_id: str, matrix_dir: str = "tests/scenarios/matrix") -> SimulatorConfig:
    filepath = os.path.join(matrix_dir, f"{scenario_id}.json")
    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    fixture = SensorValueFixture(
        ra_temp=75.0, ra_rh=50.0, sa_temp=55.0, oa_temp=95.0, da_temp=105.0,
        sl_sat=40.0, sl_pipe=50.0, ll_sat=110.0, ll_pipe=90.0
    )
    
    net_cond = data.get("network_cond", "NET_NORMAL")
    pwr_state = data.get("power_state", "PWR_CONTINUOUS")
    sens_state = data.get("sensor_state", "SENS_NORMAL")
    
    packet_loss = 0.0
    if net_cond == "NET_LOSS_5":
        packet_loss = 0.05
    elif net_cond == "NET_LOSS_20":
        packet_loss = 0.20
        
    rssi = -90 if net_cond == "NET_RF_INTERFERENCE" else None
    
    sleep_duration = 0
    if pwr_state == "PWR_SLEEP_1":
        sleep_duration = 500
    elif pwr_state == "PWR_SLEEP_3":
        sleep_duration = 300
        
    corrupt = (sens_state == "SENS_BOTH_FAULT")
    
    return SimulatorConfig(
        scenario_id=data["scenario_id"],
        workflow=data["workflow"],
        network_cond=net_cond,
        power_state=pwr_state,
        sensor_state=sens_state,
        sensor_values=fixture,
        ocr_path=data.get("ocr_path", "OCR_SUCCESS"),
        llm_path=data.get("llm_path", "LLM_SUCCESS"),
        packet_loss_pct=packet_loss,
        rssi_override_dbm=rssi,
        sleep_trigger_step=None,
        sleep_duration_ms=sleep_duration,
        corrupt_nvs_on_wake=corrupt
    )

def load_hypothesis(hypothesis_id: str) -> SimulatorConfig:
    db_path = os.environ.get("DB_PATH", "data/test_telemetry.db")
    conn = sqlite3.connect(db_path, timeout=30.0)
    cursor = conn.cursor()
    cursor.execute("SELECT scenario_json FROM agent_hypotheses WHERE hypothesis_id = ?;", (hypothesis_id,))
    row = cursor.fetchone()
    conn.close()
    if not row:
        raise ValueError(f"Hypothesis {hypothesis_id} not found in agent_hypotheses table.")
        
    data = json.loads(row[0])
    data["scenario_id"] = hypothesis_id
    
    fixture = SensorValueFixture(
        ra_temp=75.0, ra_rh=50.0, sa_temp=55.0, oa_temp=95.0, da_temp=105.0,
        sl_sat=40.0, sl_pipe=50.0, ll_sat=110.0, ll_pipe=90.0
    )
    
    net_cond = data.get("network_cond", "NET_NORMAL")
    pwr_state = data.get("power_state", "PWR_CONTINUOUS")
    sens_state = data.get("sensor_state", "SENS_NORMAL")
    
    packet_loss = 0.0
    if net_cond == "NET_LOSS_5":
        packet_loss = 0.05
    elif net_cond == "NET_LOSS_20":
        packet_loss = 0.20
        
    rssi = -90 if net_cond == "NET_RF_INTERFERENCE" else None
    
    sleep_duration = 0
    if pwr_state == "PWR_SLEEP_1":
        sleep_duration = 500
    elif pwr_state == "PWR_SLEEP_3":
        sleep_duration = 300
        
    corrupt = (sens_state == "SENS_BOTH_FAULT")
    
    return SimulatorConfig(
        scenario_id=hypothesis_id,
        workflow=data["workflow"],
        network_cond=net_cond,
        power_state=pwr_state,
        sensor_state=sens_state,
        sensor_values=fixture,
        ocr_path=data.get("ocr_path", "OCR_SUCCESS"),
        llm_path=data.get("llm_path", "LLM_SUCCESS"),
        packet_loss_pct=packet_loss,
        rssi_override_dbm=rssi,
        sleep_trigger_step=None,
        sleep_duration_ms=sleep_duration,
        corrupt_nvs_on_wake=corrupt
    )

def worker_run_scenario(scenario_id: str, run_id: str, api_base_url: Optional[str] = None) -> Dict[str, Any]:
    try:
        config = load_scenario(scenario_id)
        res = run_scenario(config, run_id=run_id, api_base_url=api_base_url)
        return {
            "scenario_id": scenario_id,
            "workflow": config.workflow,
            "network_cond": config.network_cond,
            "power_state": config.power_state,
            "sensor_state": config.sensor_state,
            "ocr_path": config.ocr_path,
            "llm_path": config.llm_path,
            "outcome": res.outcome,
            "failure_reason": res.failure_reason,
            "duration_ms": res.total_duration_ms,
            "data_integrity": res.data_integrity
        }
    except Exception as e:
        return {
            "scenario_id": scenario_id,
            "workflow": "Unknown",
            "network_cond": "Unknown",
            "power_state": "Unknown",
            "sensor_state": "Unknown",
            "ocr_path": "Unknown",
            "llm_path": "Unknown",
            "outcome": "ERROR",
            "failure_reason": str(e),
            "duration_ms": 0,
            "data_integrity": False
        }

def run_scenarios_parallel(scenario_ids: List[str], num_workers: int = 4, api_base_url: Optional[str] = None) -> List[Dict[str, Any]]:
    # Enable WAL mode first on DB
    db_path = os.environ.get("DB_PATH", "data/test_telemetry.db")
    try:
        conn = sqlite3.connect(db_path, timeout=30.0)
        conn.execute("PRAGMA journal_mode=WAL;")
        conn.close()
    except Exception as e:
        print(f"Error enabling WAL mode: {e}")
        
    run_id = f"run-{int(time.time())}"
    tasks = [(scen_id, run_id, api_base_url) for scen_id in scenario_ids]
    
    # We use spawn start method to match different platforms cleanly
    ctx = multiprocessing.get_context("spawn")
    with ctx.Pool(processes=num_workers) as pool:
        results = pool.starmap(worker_run_scenario, tasks)
    return results

def get_previous_outcomes(exclude_run_id: str) -> Dict[str, str]:
    db_path = os.environ.get("DB_PATH", "data/test_telemetry.db")
    outcomes = {}
    if not os.path.exists(db_path):
        return outcomes
    try:
        conn = sqlite3.connect(db_path, timeout=30.0)
        cursor = conn.cursor()
        cursor.execute("""
            SELECT t.scenario_id, t.outcome 
            FROM test_scenarios t
            INNER JOIN (
                SELECT scenario_id, MAX(created_at) as max_ts 
                FROM test_scenarios 
                WHERE run_id != ?
                GROUP BY scenario_id
            ) tm ON t.scenario_id = tm.scenario_id AND t.created_at = tm.max_ts;
        """, (exclude_run_id,))
        for row in cursor.fetchall():
            outcomes[row[0]] = row[1]
        conn.close()
    except Exception as e:
        print(f"Error getting previous outcomes: {e}")
    return outcomes

def get_dimension_stats(results: List[Dict[str, Any]]) -> Dict[str, Dict[str, Any]]:
    dimensions = ["network_cond", "power_state", "sensor_state", "ocr_path", "llm_path"]
    stats = {}
    for dim in dimensions:
        stats[dim] = {}
        for r in results:
            val = r.get(dim, "Unknown")
            if val not in stats[dim]:
                stats[dim][val] = {"total": 0, "passed": 0}
            stats[dim][val]["total"] += 1
            if r["outcome"] == "PASS":
                stats[dim][val]["passed"] += 1
    return stats

def get_top_failure_patterns(results: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    failures = [r for r in results if r["outcome"] != "PASS"]
    patterns = {}
    for f in failures:
        pat = (f["network_cond"], f["power_state"], f["sensor_state"], f["ocr_path"], f["llm_path"])
        if pat not in patterns:
            patterns[pat] = []
        patterns[pat].append(f["scenario_id"])
        
    sorted_patterns = sorted(patterns.items(), key=lambda item: len(item[1]), reverse=True)
    
    top_patterns = []
    for pat, scenario_ids in sorted_patterns[:10]:
        top_patterns.append({
            "pattern": pat,
            "count": len(scenario_ids),
            "scenario_ids": scenario_ids
        })
    return top_patterns

def write_summary_report(results: List[Dict[str, Any]], phase: str):
    report_dir = "/data/reports" if os.path.exists("/data") else "data/reports"
    os.makedirs(report_dir, exist_ok=True)
    
    date_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    filepath = os.path.join(report_dir, f"{date_str}-phase{phase}.md")
    
    total = len(results)
    passed = sum(1 for r in results if r["outcome"] == "PASS")
    failed = sum(1 for r in results if r["outcome"] == "FAIL")
    errored = sum(1 for r in results if r["outcome"] == "ERROR")
    integrity_passed = sum(1 for r in results if r["data_integrity"])
    
    content = []
    content.append(f"# Run Report - Phase {phase.upper()}")
    content.append(f"Date: {date_str} (UTC)")
    content.append("")
    content.append("## Summary")
    content.append(f"- **Total Scenarios**: {total}")
    content.append(f"- **Passed**: {passed} ({passed/total*100:.1f}%)" if total > 0 else "- **Passed**: 0")
    content.append(f"- **Failed**: {failed}")
    content.append(f"- **Errored**: {errored}")
    content.append(f"- **Data Integrity Passed**: {integrity_passed}/{total} ({integrity_passed/total*100:.1f}%)" if total > 0 else "- **Data Integrity Passed**: 0")
    content.append("")
    
    if phase == "1b":
        # Calculate dimension statistics
        stats = get_dimension_stats(results)
        content.append("## Pass Rate by Dimension")
        for dim, values in stats.items():
            content.append(f"### {dim.replace('_', ' ').title()}")
            content.append("| Value | Passed | Total | Pass Rate |")
            content.append("|---|---|---|---|")
            for val, counts in values.items():
                pass_pct = (counts["passed"] / counts["total"] * 100) if counts["total"] > 0 else 0.0
                content.append(f"| {val} | {counts['passed']} | {counts['total']} | {pass_pct:.1f}% |")
            content.append("")
            
        # Top 10 failure patterns
        failure_patterns = get_top_failure_patterns(results)
        content.append("## Top Failure Patterns")
        if failure_patterns:
            content.append("| Rank | Pattern (Network, Power, Sensor, OCR, LLM) | Fail Count |")
            content.append("|---|---|---|")
            for idx, pat in enumerate(failure_patterns):
                content.append(f"| {idx+1} | {pat['pattern']} | {pat['count']} |")
        else:
            content.append("No failures detected in this run.")
        content.append("")
        
        # Check for regressions
        # Find the current run_id used (if database test_scenarios exists)
        db_path = os.environ.get("DB_PATH", "data/test_telemetry.db")
        exclude_run_id = ""
        try:
            conn = sqlite3.connect(db_path, timeout=30.0)
            cursor = conn.cursor()
            cursor.execute("SELECT DISTINCT run_id FROM test_scenarios ORDER BY created_at DESC LIMIT 1;")
            row = cursor.fetchone()
            if row:
                exclude_run_id = row[0]
            conn.close()
        except Exception:
            pass
            
        previous = get_previous_outcomes(exclude_run_id)
        regressions = []
        for r in results:
            if r["outcome"] != "PASS" and previous.get(r["scenario_id"]) == "PASS":
                regressions.append(r)
                
        content.append("## Regressions (Passed in Phase 1A but Failed now)")
        if regressions:
            content.append("| Scenario ID | Workflow | Network | Power | Sensor | Outcome | Reason |")
            content.append("|---|---|---|---|---|---|---|")
            for reg in regressions:
                content.append(f"| {reg['scenario_id']} | {reg['workflow']} | {reg['network_cond']} | {reg['power_state']} | {reg['sensor_state']} | {reg['outcome']} | {reg['failure_reason'] or ''} |")
        else:
            content.append("No regressions detected.")
        content.append("")

    content.append("## Scenario Details")
    content.append("| Scenario ID | Workflow | Network | Power | Sensor | Outcome | Reason | Duration (ms) |")
    content.append("|---|---|---|---|---|---|---|---|")
    
    for r in results:
        content.append(f"| {r['scenario_id']} | {r['workflow']} | {r['network_cond']} | {r['power_state']} | {r['sensor_state']} | {r['outcome']} | {r['failure_reason'] or ''} | {r['duration_ms']} |")
        
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write("\n".join(content))
    print(f"Report written to {filepath}")

def main():
    parser = argparse.ArgumentParser(description="HVAC Helper Vertical Test Suite Runner")
    parser.add_argument("--phase", choices=["1a", "1b"], help="Execute phase 1A or 1B scenario suite")
    parser.add_argument("--scenario", help="Execute a single scenario ID by loading from matrix/")
    parser.add_argument("--hypothesis", help="Execute a single hypothesis ID from database")
    parser.add_argument("--api-base-url", default="http://localhost:8080", help="FastAPI Server Base URL")
    
    args = parser.parse_args()
    
    db_path = os.environ.get("DB_PATH", "data/test_telemetry.db")
    if not os.path.exists(db_path):
        print(f"Error: Database file not found at {db_path}", file=sys.stderr)
        sys.exit(2)
        
    run_id = f"run-{int(time.time())}"
    
    if args.phase:
        if args.phase == "1a":
            phase_file = "tests/scenarios/phase_1a.json"
            if not os.path.exists(phase_file):
                print(f"Error: Phase 1A definition file not found at {phase_file}", file=sys.stderr)
                sys.exit(1)
            with open(phase_file, 'r', encoding='utf-8') as f:
                scenario_ids = json.load(f)
        else:
            matrix_dir = "tests/scenarios/matrix"
            if not os.path.exists(matrix_dir):
                print(f"Error: Matrix directory not found at {matrix_dir}", file=sys.stderr)
                sys.exit(1)
            scenario_ids = [filename.replace(".json", "") for filename in os.listdir(matrix_dir) if filename.endswith(".json")]
            
        if args.phase == "1b":
            print(f"Running Phase 1B ({len(scenario_ids)} scenarios) in parallel...")
            # Detect number of CPU cores and use reasonable pool size (4-6 workers)
            num_workers = min(multiprocessing.cpu_count(), 4)
            results = run_scenarios_parallel(scenario_ids, num_workers=num_workers, api_base_url=args.api_base_url)
            write_summary_report(results, args.phase)
        else:
            results = []
            for idx, scenario_id in enumerate(scenario_ids):
                print(f"[{idx+1}/{len(scenario_ids)}] Running scenario {scenario_id}...")
                try:
                    config = load_scenario(scenario_id)
                    res = run_scenario(config, run_id=run_id, api_base_url=args.api_base_url)
                    results.append({
                        "scenario_id": scenario_id,
                        "workflow": config.workflow,
                        "network_cond": config.network_cond,
                        "power_state": config.power_state,
                        "sensor_state": config.sensor_state,
                        "ocr_path": config.ocr_path,
                        "llm_path": config.llm_path,
                        "outcome": res.outcome,
                        "failure_reason": res.failure_reason,
                        "duration_ms": res.total_duration_ms,
                        "data_integrity": res.data_integrity
                    })
                except Exception as e:
                    print(f"Unexpected error running scenario {scenario_id}: {e}", file=sys.stderr)
                    results.append({
                        "scenario_id": scenario_id,
                        "workflow": "Unknown",
                        "network_cond": "Unknown",
                        "power_state": "Unknown",
                        "sensor_state": "Unknown",
                        "ocr_path": "Unknown",
                        "llm_path": "Unknown",
                        "outcome": "ERROR",
                        "failure_reason": str(e),
                        "duration_ms": 0,
                        "data_integrity": False
                    })
            write_summary_report(results, args.phase)
        print("Suite execution completed.")
        
    elif args.scenario:
        print(f"Running single scenario {args.scenario}...")
        try:
            config = load_scenario(args.scenario)
            res = run_scenario(config, run_id=run_id, api_base_url=args.api_base_url)
            print(f"Scenario Result: {res.outcome} (Data integrity: {res.data_integrity}, Reason: {res.failure_reason})")
        except Exception as e:
            print(f"Error: {e}", file=sys.stderr)
            sys.exit(1)
            
    elif args.hypothesis:
        print(f"Running hypothesis scenario {args.hypothesis}...")
        try:
            config = load_hypothesis(args.hypothesis)
            res = run_scenario(config, run_id=run_id, api_base_url=args.api_base_url)
            print(f"Hypothesis Result: {res.outcome} (Data integrity: {res.data_integrity}, Reason: {res.failure_reason})")
            
            test_result_str = "CONFIRMED" if res.outcome == "PASS" else "REFUTED"
            conn = sqlite3.connect(db_path, timeout=30.0)
            conn.execute("PRAGMA journal_mode=WAL;")
            cursor = conn.cursor()
            executed_at = datetime.now(timezone.utc).isoformat().replace("+00:00", "") + "Z"
            cursor.execute("""
                UPDATE agent_hypotheses
                SET status = 'COMPLETE', test_result = ?, executed_at = ?
                WHERE hypothesis_id = ?
            """, (test_result_str, executed_at, args.hypothesis))
            conn.commit()
            conn.close()
        except Exception as e:
            print(f"Error: {e}", file=sys.stderr)
            sys.exit(1)
            
    else:
        parser.print_help()

if __name__ == "__main__":
    main()
