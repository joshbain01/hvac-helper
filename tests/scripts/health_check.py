import os
import sys
import json
import sqlite3
import requests
from datetime import datetime, timezone

def check_db(db_path: str) -> bool:
    if not os.path.exists(db_path):
        print(f"✗ SQLite DB missing or unreachable: {db_path}", file=sys.stderr)
        return False
    try:
        conn = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)
        cursor = conn.cursor()
        cursor.execute("SELECT 1;")
        cursor.fetchone()
        conn.close()
        print(f"✓ SQLite DB accessible ({db_path})")
        return True
    except Exception as e:
        print(f"✗ SQLite DB error: {e}", file=sys.stderr)
        return False

def check_api(base_url: str, token: str) -> bool:
    url = f"{base_url.rstrip('/')}/schema"
    headers = {"Authorization": f"Bearer {token}"}
    try:
        resp = requests.get(url, headers=headers, timeout=5)
        if resp.status_code == 200:
            print(f"✓ FastAPI middleware responding (GET /schema → 200)")
            return True
        else:
            print(f"✗ FastAPI middleware returned status {resp.status_code}: {resp.text}", file=sys.stderr)
            return False
    except Exception as e:
        print(f"✗ FastAPI middleware connection failed: {e}", file=sys.stderr)
        return False

def check_stale_run(db_path: str) -> int:
    # Returns 0 for healthy, 1 for warning/stale
    try:
        conn = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)
        cursor = conn.cursor()
        cursor.execute("SELECT MAX(created_at) FROM test_scenarios;")
        row = cursor.fetchone()
        conn.close()
        
        if not row or not row[0]:
            print("⚠ Last run: None found in database")
            return 1
            
        ts_str = row[0]
        # Parse ISO8601 timestamp (e.g. 2026-05-24T12:00:00Z)
        # Resilient to millisecond fraction
        if ts_str.endswith("Z"):
            ts_str = ts_str[:-1] + "+00:00"
        dt = datetime.fromisoformat(ts_str)
        now = datetime.now(timezone.utc)
        elapsed = now - dt
        elapsed_hours = elapsed.total_seconds() / 3600.0
        
        if elapsed_hours > 26.0:
            print(f"⚠ Last run: {elapsed_hours:.1f} hours ago (expected: ≤ 26h)")
            return 1
        else:
            print(f"✓ Last run: {elapsed_hours:.1f} hours ago")
            return 0
    except Exception as e:
        print(f"⚠ Failed to check last run age: {e}", file=sys.stderr)
        return 1

def check_spend(spend_log_path: str) -> int:
    # Returns 0 for healthy, 1 for warning (80%+ budget used)
    if not os.path.exists(spend_log_path):
        print("✓ Monthly AI spend: $0.00 / $20.00 (0.0%)")
        return 0
        
    try:
        with open(spend_log_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        total_usd = data.get("total_usd", 0.0)
        percentage = (total_usd / 20.00) * 100.0
        
        if total_usd >= 16.00:
            print(f"⚠ Monthly AI spend: ${total_usd:.2f} / $20.00 ({percentage:.1f}%) [Over 80%!]")
            return 1
        else:
            print(f"✓ Monthly AI spend: ${total_usd:.2f} / $20.00 ({percentage:.1f}%)")
            return 0
    except Exception as e:
        print(f"⚠ Failed to check AI spend log: {e}", file=sys.stderr)
        return 1

def main():
    db_path = os.environ.get("DB_PATH", "data/test_telemetry.db")
    api_url = os.environ.get("API_BASE_URL", "http://localhost:8080")
    token = os.environ.get("API_BEARER_TOKEN", "test-token")
    
    spend_log_path = "tests/analysis/spend_log.json"
    if not os.path.exists(spend_log_path):
        # Check fallback
        spend_log_path = "data/spend_log.json"
        
    # Check SQLite DB
    if not check_db(db_path):
        print("Exit: 2 (critical)")
        sys.exit(2)
        
    # Check API middleware
    # If base url is configured, we check it.
    # Note: during testing or offline runs, if API server is not running, we alert.
    if not check_api(api_url, token):
        print("Exit: 2 (critical)")
        sys.exit(2)
        
    exit_code = 0
    
    # Check last run stale status
    if check_stale_run(db_path) == 1:
        exit_code = 1
        
    # Check AI budget spend
    if check_spend(spend_log_path) == 1:
        exit_code = 1
        
    print(f"Exit: {exit_code}")
    sys.exit(exit_code)

if __name__ == "__main__":
    main()
