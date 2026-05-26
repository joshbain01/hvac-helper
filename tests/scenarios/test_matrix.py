import os
import json
import shutil
import pytest
from tests.scenarios.generate_matrix import generate_matrix

def test_generate_matrix(tmp_path):
    # Setup test directories
    matrix_dir = tmp_path / "matrix"
    phase_1a_file = tmp_path / "phase_1a.json"
    
    # Run the generator function
    generate_matrix(str(matrix_dir), str(phase_1a_file))
    
    # Assert directory exists and has 360 files
    assert os.path.isdir(matrix_dir)
    files = os.listdir(matrix_dir)
    assert len(files) == 360
    
    # Assert phase_1a.json exists
    assert os.path.isfile(phase_1a_file)
    with open(phase_1a_file, 'r', encoding='utf-8') as f:
        phase_1a_data = json.load(f)
    assert isinstance(phase_1a_data, list)
    assert len(phase_1a_data) == 60
    
    # Assert uniqueness and schema validation
    scenario_ids = set()
    combinations = set()
    
    allowed_workflows = {"A", "B", "C", "D"}
    allowed_net_conds = {"NET_NORMAL", "NET_LOSS_5", "NET_LOSS_20", "NET_OFFLINE_2H", "NET_RF_INTERFERENCE"}
    allowed_power_states = {"PWR_CONTINUOUS", "PWR_SLEEP_1", "PWR_SLEEP_3"}
    allowed_sensor_states = {"SENS_NORMAL", "SENS_SHT40_DRIFT", "SENS_CLAMP_DISCONNECTED", "SENS_BOTH_FAULT"}
    allowed_ocr_paths = {"OCR_SUCCESS", "OCR_BYPASS"}
    allowed_llm_paths = {"LLM_SUCCESS", "LLM_OOM", "LLM_CLOUD_FALLBACK"}
    
    for filename in files:
        filepath = os.path.join(matrix_dir, filename)
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
            
        # Schema assertions
        assert "scenario_id" in data
        assert data["workflow"] in allowed_workflows
        assert data["network_cond"] in allowed_net_conds
        assert data["power_state"] in allowed_power_states
        assert data["sensor_state"] in allowed_sensor_states
        assert data["ocr_path"] in allowed_ocr_paths
        assert data["llm_path"] in allowed_llm_paths
        
        # Check uniqueness of scenario_id
        scen_id = data["scenario_id"]
        assert scen_id not in scenario_ids
        scenario_ids.add(scen_id)
        
        # Check uniqueness of combinatoric dimension tuple
        combo = (
            data["workflow"],
            data["network_cond"],
            data["power_state"],
            data["sensor_state"],
            data["ocr_path"],
            data["llm_path"]
        )
        assert combo not in combinations
        combinations.add(combo)
        
    # Verify that all 60 scenarios in phase_1a exist in the matrix files
    for p1a_id in phase_1a_data:
        # Find file with this scenario_id
        found = False
        for filename in files:
            filepath = os.path.join(matrix_dir, filename)
            with open(filepath, 'r', encoding='utf-8') as f:
                data = json.load(f)
            if data["scenario_id"] == p1a_id:
                found = True
                break
        assert found, f"Scenario ID {p1a_id} in phase_1a.json not found in matrix/"

    # Idempotency check: run generator again to verify it produces the exact same scenario_ids
    matrix_dir_2 = tmp_path / "matrix_2"
    phase_1a_file_2 = tmp_path / "phase_1a_2.json"
    
    generate_matrix(str(matrix_dir_2), str(phase_1a_file_2))
    
    files_2 = os.listdir(matrix_dir_2)
    assert len(files_2) == 360
    
    # Map combinations to scenario_ids for both runs and assert they are identical
    combo_map_1 = {}
    for filename in files:
        with open(os.path.join(matrix_dir, filename), 'r', encoding='utf-8') as f:
            data = json.load(f)
        combo = (data["workflow"], data["network_cond"], data["power_state"], data["sensor_state"], data["ocr_path"], data["llm_path"])
        combo_map_1[combo] = data["scenario_id"]
        
    combo_map_2 = {}
    for filename in files_2:
        with open(os.path.join(matrix_dir_2, filename), 'r', encoding='utf-8') as f:
            data = json.load(f)
        combo = (data["workflow"], data["network_cond"], data["power_state"], data["sensor_state"], data["ocr_path"], data["llm_path"])
        combo_map_2[combo] = data["scenario_id"]
        
    assert combo_map_1 == combo_map_2
