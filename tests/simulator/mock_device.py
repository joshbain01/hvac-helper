import json
import uuid
import sqlite3
import hashlib
import os
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List, Callable

@dataclass
class SensorValueFixture:
    ra_temp: float
    ra_rh: float
    sa_temp: float
    oa_temp: float
    da_temp: float
    sl_sat: float
    sl_pipe: Optional[float]
    ll_sat: float
    ll_pipe: Optional[float]

@dataclass
class SimulatorConfig:
    scenario_id: str
    workflow: str               # "A" | "B" | "C" | "D"
    network_cond: str           # "NET_NORMAL" | "NET_LOSS_5" | ...
    power_state: str            # "PWR_CONTINUOUS" | "PWR_SLEEP_1" | ...
    sensor_state: str           # "SENS_NORMAL" | "SENS_SHT40_DRIFT" | ...
    sensor_values: SensorValueFixture
    ocr_path: str
    llm_path: str
    packet_loss_pct: float
    rssi_override_dbm: Optional[int]
    sleep_trigger_step: Optional[int]
    sleep_duration_ms: int
    corrupt_nvs_on_wake: bool

class MockDevice:
    UUID_MAP = {
        "RA": "e5c1e101-c97b-4835-ab3f-917462c95e1e",
        "SA": "e5c1e102-c97b-4835-ab3f-917462c95e1e",
        "OA": "e5c1e103-c97b-4835-ab3f-917462c95e1e",
        "DA": "e5c1e104-c97b-4835-ab3f-917462c95e1e",
        "SL": "e5c1e105-c97b-4835-ab3f-917462c95e1e",
        "LL": "e5c1e106-c97b-4835-ab3f-917462c95e1e",
        "switch": "e5c1e107-c97b-4835-ab3f-917462c95e1e",
    }
    
    # Reverse lookup map for UUIDs to keys
    REV_UUID_MAP = {v: k for k, v in UUID_MAP.items()}

    def __init__(self, config: SimulatorConfig):
        self.config = config
        self.service_uuid = "e5c1e100-c97b-4835-ab3f-917462c95e1e"
        self.is_advertising = True
        self.active_phase = "before"
        self.caches = {
            "before": {},
            "after": {}
        }
        self.char_values: Dict[str, bytes] = {}
        self.subscribers: Dict[str, List[Callable[[str, bytes], None]]] = {}
        self.notify_attempts = 0
        
        # Configure DB connection and hashing
        self.db_path = os.environ.get("DB_PATH", "data/test_telemetry.db")
        salt = "hvac-helper-salt"
        self.device_hash = hashlib.sha256((self.config.scenario_id + salt).encode('utf-8')).hexdigest()
        
        # Initialize characteristic values
        for key, val in self.UUID_MAP.items():
            self.char_values[val] = b""
            self.subscribers[val] = []
            
        # Initial status for switch
        self._update_switch_characteristic()
        
        # Log sensor fault if active on start
        if self.config.sensor_state != "SENS_NORMAL":
            self._log_telemetry("HARDWARE", "SENSOR_FAULT", None, {
                "sensor_fault_code": self.config.sensor_state,
                "battery_percentage": 98
            })

    def _log_telemetry(self, event_type: str, event_name: str, duration_ms: Optional[int], payload: Dict[str, Any]):
        try:
            conn = sqlite3.connect(self.db_path)
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
            print(f"Telemetry logging error: {e}")

    def connect(self):
        if self.config.network_cond == "NET_RF_INTERFERENCE":
            # Simulate 3 disconnect/reconnect cycles before stabilizing
            for i in range(3):
                self._log_telemetry("CONNECTIVITY", "BLE_DISCONNECT", None, {
                    "rssi_dbm": -90,
                    "disconnect_reason_code": 19,
                    "reconnect_attempt_count": i + 1
                })
                self._log_telemetry("CONNECTIVITY", "BLE_CONNECT", 150, {
                    "rssi_dbm": -90,
                    "connect_duration_ms": 150
                })
        
        rssi = self.config.rssi_override_dbm if self.config.rssi_override_dbm is not None else -50
        duration = 150
        payload = {
            "rssi_dbm": rssi,
            "connect_duration_ms": duration
        }
        self._log_telemetry("CONNECTIVITY", "BLE_CONNECT", duration, payload)

    def trigger_loss_reconnect(self):
        rssi = self.config.rssi_override_dbm if self.config.rssi_override_dbm is not None else -50
        self._log_telemetry("CONNECTIVITY", "BLE_DISCONNECT", None, {
            "rssi_dbm": rssi,
            "disconnect_reason_code": 8,
            "reconnect_attempt_count": 1
        })
        self.connect()

    def subscribe(self, char_uuid: str, callback: Callable[[str, bytes], None]):
        if char_uuid in self.subscribers:
            self.subscribers[char_uuid].append(callback)

    def _notify(self, char_uuid: str, value: bytes):
        # Handle packet loss dropping logic
        if self.config.packet_loss_pct > 0.0 or self.config.network_cond in ("NET_LOSS_5", "NET_LOSS_20"):
            self.notify_attempts += 1
            rate = self.config.packet_loss_pct
            if self.config.network_cond == "NET_LOSS_20":
                rate = 0.20
            elif self.config.network_cond == "NET_LOSS_5":
                rate = 0.05
                
            # Deterministic drop rate over 100 packets
            mod = int(1.0 / rate)
            if (self.notify_attempts % mod) == 0:
                # Drop the packet
                return

        for callback in self.subscribers.get(char_uuid, []):
            try:
                callback(char_uuid, value)
            except Exception:
                pass

    def read_characteristic(self, char_uuid: str) -> bytes:
        return self.char_values.get(char_uuid, b"")

    def _update_switch_characteristic(self):
        payload = {"phase": self.active_phase}
        payload_bytes = json.dumps(payload).encode('utf-8')
        char_uuid = self.UUID_MAP["switch"]
        self.char_values[char_uuid] = payload_bytes
        self._notify(char_uuid, payload_bytes)

    def toggle_switch(self):
        # Swap phase
        self.active_phase = "after" if self.active_phase == "before" else "before"
        
        # Update switch characteristic
        self._update_switch_characteristic()
        
        # Update characteristics values to reflect the newly active cache
        # and retransmit/notify them over BLE
        for slot in ["RA", "SA", "OA", "DA", "SL", "LL"]:
            char_uuid = self.UUID_MAP[slot]
            cached_val = self.caches[self.active_phase].get(slot, b"")
            self.char_values[char_uuid] = cached_val
            
            # Retransmit cached value if it was captured
            if cached_val:
                self._notify(char_uuid, cached_val)
            else:
                # If not captured, write empty bytes
                self._notify(char_uuid, b"")

    def capture_button(self, button_id: str) -> bytes:
        temp = 0.0
        rh = 0.0
        fixture = self.config.sensor_values
        
        if button_id == "RA":
            temp = fixture.ra_temp
            rh = fixture.ra_rh
            if self.config.sensor_state in ("SENS_SHT40_DRIFT", "SENS_BOTH_FAULT"):
                temp += 5.0
        elif button_id == "SA":
            temp = fixture.sa_temp
            if self.config.sensor_state in ("SENS_SHT40_DRIFT", "SENS_BOTH_FAULT"):
                temp -= 5.0
        elif button_id == "OA":
            temp = fixture.oa_temp
        elif button_id == "DA":
            temp = fixture.da_temp
            
        payload = {
            "button_id": button_id,
            "temp_f": temp,
            "humidity_pct": rh,
            "capture_ts": datetime.now(timezone.utc).isoformat().replace("+00:00", "") + "Z"
        }
        
        payload_bytes = json.dumps(payload).encode('utf-8')
        
        # Write to active cache
        self.caches[self.active_phase][button_id] = payload_bytes
        
        # Write to characteristic values and notify
        char_uuid = self.UUID_MAP[button_id]
        self.char_values[char_uuid] = payload_bytes
        self._notify(char_uuid, payload_bytes)
        
        # Log telemetry
        telemetry_payload = {
            "button_id": button_id,
            "sensor_value": {
                "temp_f": temp,
                "humidity_pct": rh
            },
            "capture_duration_ms": 50
        }
        self._log_telemetry("HARDWARE", "BUTTON_CAPTURE", 50, telemetry_payload)
        
        return payload_bytes

    def capture_encoder(self, encoder_id: str, saturation_temp_f: float) -> bytes:
        pipe_temp = 0.0
        fixture = self.config.sensor_values
        
        if encoder_id == "SL":
            if self.config.sensor_state in ("SENS_CLAMP_DISCONNECTED", "SENS_BOTH_FAULT"):
                pipe_temp = None
            else:
                pipe_temp = fixture.sl_pipe
        elif encoder_id == "LL":
            pipe_temp = fixture.ll_pipe
            
        payload = {
            "encoder_id": encoder_id,
            "saturation_temp_f": saturation_temp_f,
            "pipe_temp_f": pipe_temp,
            "capture_ts": datetime.now(timezone.utc).isoformat().replace("+00:00", "") + "Z"
        }
        
        payload_bytes = json.dumps(payload).encode('utf-8')
        
        # Write to active cache
        self.caches[self.active_phase][encoder_id] = payload_bytes
        
        # Write to characteristic values and notify
        char_uuid = self.UUID_MAP[encoder_id]
        self.char_values[char_uuid] = payload_bytes
        self._notify(char_uuid, payload_bytes)
        
        # Log telemetry
        telemetry_payload = {
            "button_id": encoder_id,
            "sensor_value": {
                "saturation_temp_f": saturation_temp_f,
                "pipe_temp_f": pipe_temp
            },
            "capture_duration_ms": 50
        }
        self._log_telemetry("HARDWARE", "BUTTON_CAPTURE", 50, telemetry_payload)
        
        return payload_bytes

    def enter_deep_sleep(self):
        self.is_advertising = False
        
        # Log DEEP_SLEEP_ENTER
        cached_count = len(self.caches["before"]) + len(self.caches["after"])
        self._log_telemetry("HARDWARE", "DEEP_SLEEP_ENTER", None, {
            "battery_percentage": 98,
            "cached_values_count": cached_count
        })
        
        # Serialize NVS cache to JSON file
        nvs_dir = "/data" if os.path.exists("/data") else "data"
        os.makedirs(nvs_dir, exist_ok=True)
        nvs_path = os.path.join(nvs_dir, f"nvs_cache_{self.config.scenario_id}.json")
        
        caches_str = {
            "before": {k: v.decode('utf-8') if isinstance(v, bytes) else v for k, v in self.caches["before"].items()},
            "after": {k: v.decode('utf-8') if isinstance(v, bytes) else v for k, v in self.caches["after"].items()},
        }
        
        crc = 999999 if self.config.corrupt_nvs_on_wake else 123456
        nvs_data = {
            "caches": caches_str,
            "active_phase": self.active_phase,
            "crc": crc
        }
        
        with open(nvs_path, 'w', encoding='utf-8') as f:
            json.dump(nvs_data, f)

    def wake_from_deep_sleep(self):
        self.is_advertising = True
        
        nvs_dir = "/data" if os.path.exists("/data") else "data"
        nvs_path = os.path.join(nvs_dir, f"nvs_cache_{self.config.scenario_id}.json")
        
        nvs_cache_valid = False
        if os.path.exists(nvs_path):
            try:
                with open(nvs_path, 'r', encoding='utf-8') as f:
                    nvs_data = json.load(f)
                    
                if nvs_data.get("crc") == 123456:
                    nvs_cache_valid = True
                    # Restore cache
                    self.caches = {
                        "before": {k: v.encode('utf-8') for k, v in nvs_data["caches"]["before"].items()},
                        "after": {k: v.encode('utf-8') for k, v in nvs_data["caches"]["after"].items()},
                    }
                    self.active_phase = nvs_data["active_phase"]
                    
                    # Update characteristics values
                    for slot in ["RA", "SA", "OA", "DA", "SL", "LL"]:
                        char_uuid = self.UUID_MAP[slot]
                        cached_val = self.caches[self.active_phase].get(slot, b"")
                        self.char_values[char_uuid] = cached_val
            except Exception:
                pass
                
        # If cache is invalid, clear caches and emit fault
        if not nvs_cache_valid:
            self.caches = {
                "before": {},
                "after": {}
            }
            # Clear characteristic values
            for slot in ["RA", "SA", "OA", "DA", "SL", "LL"]:
                self.char_values[self.UUID_MAP[slot]] = b""
            
            # Emit SENSOR_FAULT
            self._log_telemetry("HARDWARE", "SENSOR_FAULT", None, {
                "sensor_fault_code": "NVS_CRC_MISMATCH",
                "battery_percentage": 98
            })
            
        # Log DEEP_SLEEP_WAKE
        self._log_telemetry("HARDWARE", "DEEP_SLEEP_WAKE", None, {
            "sleep_duration_ms": self.config.sleep_duration_ms,
            "nvs_cache_valid": nvs_cache_valid
        })

    def simulate_ota(self, abort_pct: Optional[int] = None):
        if abort_pct is not None:
            # Emit WATCHDOG_RESET
            self._log_telemetry("HARDWARE", "WATCHDOG_RESET", None, {
                "watchdog_reset_count": 1,
                "reset_reason": "OTA_ABORT"
            })
            # Disconnect/reconnect
            self.is_advertising = False
            self.connect()
        else:
            # Successful OTA
            self._log_telemetry("HARDWARE", "OTA_COMPLETE", None, {
                "version": "1.1.0"
            })
