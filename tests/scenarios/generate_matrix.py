import os
import json
import uuid
from typing import List

NETWORK_CONDS = ["NET_NORMAL", "NET_LOSS_5", "NET_LOSS_20", "NET_OFFLINE_2H", "NET_RF_INTERFERENCE"]
POWER_STATES = ["PWR_CONTINUOUS", "PWR_SLEEP_1", "PWR_SLEEP_3"]
SENSOR_STATES = ["SENS_NORMAL", "SENS_SHT40_DRIFT", "SENS_CLAMP_DISCONNECTED", "SENS_BOTH_FAULT"]
OCR_PATHS = ["OCR_SUCCESS", "OCR_BYPASS"]
LLM_PATHS = ["LLM_SUCCESS", "LLM_OOM", "LLM_CLOUD_FALLBACK"]

def generate_matrix(matrix_dir: str, phase_1a_file: str):
    os.makedirs(matrix_dir, exist_ok=True)
    
    scenarios = []
    
    # We want idempotency, so we use uuid.uuid5 with a namespace and a deterministic name
    namespace = uuid.UUID("12345678-1234-5678-1234-567812345678")
    
    for net in NETWORK_CONDS:
        for pwr in POWER_STATES:
            for sens in SENSOR_STATES:
                for ocr in OCR_PATHS:
                    for llm in LLM_PATHS:
                        # Determine workflow
                        if net == "NET_OFFLINE_2H":
                            workflow = "C"
                        elif net == "NET_NORMAL" and sens == "SENS_NORMAL" and ocr == "OCR_SUCCESS" and llm == "LLM_SUCCESS":
                            workflow = "C"
                        else:
                            workflow = "B"
                            
                        # Deterministic ID
                        name = f"{workflow}-{net}-{pwr}-{sens}-{ocr}-{llm}"
                        scenario_id = str(uuid.uuid5(namespace, name))
                        
                        scenario = {
                            "scenario_id": scenario_id,
                            "workflow": workflow,
                            "network_cond": net,
                            "power_state": pwr,
                            "sensor_state": sens,
                            "ocr_path": ocr,
                            "llm_path": llm,
                            "phase": "1b",
                            "repeat_count": 1
                        }
                        scenarios.append(scenario)
                        
    # Write matrix files
    for scen in scenarios:
        filepath = os.path.join(matrix_dir, f"{scen['scenario_id']}.json")
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(scen, f, indent=2)
            
    # Select Phase 1A (exactly 60 scenarios)
    phase_1a_ids = []
    
    # Group 1: All 5 network conditions
    g1 = [s for s in scenarios if s["power_state"] == "PWR_CONTINUOUS" and s["sensor_state"] == "SENS_NORMAL" and s["ocr_path"] == "OCR_SUCCESS" and s["llm_path"] == "LLM_SUCCESS"]
    # Group 2: All 3 power states
    g2 = [s for s in scenarios if s["network_cond"] == "NET_NORMAL" and s["sensor_state"] == "SENS_NORMAL" and s["ocr_path"] == "OCR_SUCCESS" and s["llm_path"] == "LLM_SUCCESS"]
    # Group 3: Complete 6x6 fault matrix (20 scenarios)
    g3 = [s for s in scenarios if s["power_state"] == "PWR_CONTINUOUS" and s["ocr_path"] == "OCR_SUCCESS" and s["llm_path"] == "LLM_SUCCESS"]
    # Group 4: Full LLM fallback paths (12 scenarios)
    g4 = [s for s in scenarios if s["network_cond"] in ("NET_NORMAL", "NET_LOSS_5") and s["power_state"] == "PWR_CONTINUOUS" and s["sensor_state"] == "SENS_NORMAL"]
    # Group 5: Offline sync edge cases (6 scenarios)
    g5 = [s for s in scenarios if s["network_cond"] == "NET_OFFLINE_2H" and s["sensor_state"] == "SENS_NORMAL" and s["llm_path"] == "LLM_SUCCESS"]
    
    # Combine lists preserving order, use dict to keep unique
    seen = set()
    for s in g1 + g2 + g3 + g4 + g5:
        if s["scenario_id"] not in seen:
            seen.add(s["scenario_id"])
            phase_1a_ids.append(s["scenario_id"])
            
    # Group 6: remaining to total 60
    # Let's pull from net_loss_20 and pwr_sleep_1
    g6 = [s for s in scenarios if s["network_cond"] == "NET_LOSS_20" and s["power_state"] == "PWR_SLEEP_1"]
    for s in g6:
        if len(phase_1a_ids) >= 60:
            break
        if s["scenario_id"] not in seen:
            seen.add(s["scenario_id"])
            phase_1a_ids.append(s["scenario_id"])
            
    # If still not 60, pull from anywhere
    for s in scenarios:
        if len(phase_1a_ids) >= 60:
            break
        if s["scenario_id"] not in seen:
            seen.add(s["scenario_id"])
            phase_1a_ids.append(s["scenario_id"])
            
    # Update phase to "1a" in those 60 files
    for scen_id in phase_1a_ids:
        filepath = os.path.join(matrix_dir, f"{scen_id}.json")
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
        data["phase"] = "1a"
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2)
            
    # Ensure parent directory for phase_1a_file exists
    os.makedirs(os.path.dirname(os.path.abspath(phase_1a_file)), exist_ok=True)
    with open(phase_1a_file, 'w', encoding='utf-8') as f:
        json.dump(phase_1a_ids, f, indent=2)

if __name__ == "__main__":
    generate_matrix("tests/scenarios/matrix", "tests/scenarios/phase_1a.json")
    print("Matrix generated successfully.")
