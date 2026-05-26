import os
import sqlite3
import subprocess
import sys
import pytest
from tests.db.init_db import init_db

def test_db_initialization(tmp_path):
    db_file = tmp_path / "test_telemetry.db"
    db_path = str(db_file)
    
    # Run the init
    init_db(db_path)
    
    # Assert database file exists
    assert os.path.exists(db_path)
    
    # Assert we can connect and query the tables
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Get all tables
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = [row[0] for row in cursor.fetchall()]
    conn.close()
    
    assert "telemetry_logs" in tables
    assert "test_scenarios" in tables
    assert "agent_hypotheses" in tables

def assert_index_exists(cursor, table_name, column_name):
    # Query index list
    cursor.execute(f"PRAGMA index_list({table_name});")
    indexes = cursor.fetchall()
    
    # Look through all indexes on the table
    for idx in indexes:
        idx_name = idx[1]
        cursor.execute(f"PRAGMA index_info({idx_name});")
        cols = [col[2] for col in cursor.fetchall()]
        if column_name in cols:
            return
            
    # Check if it's the primary key (automatically indexed by SQLite)
    cursor.execute(f"PRAGMA table_info({table_name});")
    for col in cursor.fetchall():
        if col[1] == column_name and col[5] > 0:
            return
            
    pytest.fail(f"No index found on table '{table_name}' for column '{column_name}'")

def test_db_indexes(tmp_path):
    db_file = tmp_path / "test_telemetry.db"
    db_path = str(db_file)
    
    init_db(db_path)
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Required indexes
    assert_index_exists(cursor, "telemetry_logs", "event_type")
    assert_index_exists(cursor, "telemetry_logs", "event_name")
    assert_index_exists(cursor, "telemetry_logs", "timestamp")
    assert_index_exists(cursor, "test_scenarios", "scenario_id")
    assert_index_exists(cursor, "test_scenarios", "outcome")
    assert_index_exists(cursor, "test_scenarios", "run_id")
    
    conn.close()

def test_db_idempotency(tmp_path):
    db_file = tmp_path / "test_telemetry_idempotency.db"
    db_path = str(db_file)
    
    # Init first time
    init_db(db_path)
    
    # Write some dummy data to verify it isn't wiped or doesn't cause constraint failures when re-running
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO telemetry_logs (event_id, device_hash, event_type, event_name, payload, timestamp)
        VALUES ('1', 'hash1', 'CONNECTIVITY', 'BLE_CONNECT', '{}', '2026-05-24T12:00:00Z');
    """)
    conn.commit()
    conn.close()
    
    # Init second time (idempotency check)
    init_db(db_path)
    
    # Verify data is still there
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT count(*) FROM telemetry_logs;")
    count = cursor.fetchone()[0]
    conn.close()
    
    assert count == 1

def test_cli_integration(tmp_path):
    db_file = tmp_path / "cli_test.db"
    db_path = str(db_file)
    
    # Call the CLI script
    result = subprocess.run([
        sys.executable,
        "tests/db/init_db.py",
        "--path",
        db_path
    ], capture_output=True, text=True)
    
    # Assert successful exit code
    assert result.returncode == 0
    assert os.path.exists(db_path)
    
    # Assert tables are queryable
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = [row[0] for row in cursor.fetchall()]
    conn.close()
    
    assert "telemetry_logs" in tables
