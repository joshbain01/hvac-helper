import os
import sqlite3
import argparse

def init_db(db_path: str):
    # Ensure directory exists
    db_dir = os.path.dirname(db_path)
    if db_dir:
        os.makedirs(db_dir, exist_ok=True)
        
    # Read schema
    schema_path = os.path.join(os.path.dirname(__file__), 'schema.sql')
    with open(schema_path, 'r', encoding='utf-8') as f:
        schema_sql = f.read()
        
    # Connect and execute
    conn = sqlite3.connect(db_path)
    try:
        conn.executescript(schema_sql)
        conn.commit()
    finally:
        conn.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Initialize the SQLite database for telemetry.")
    parser.add_argument("--path", type=str, default="data/test_telemetry.db", help="Path to SQLite database file.")
    args = parser.parse_args()
    init_db(args.path)
    print(f"Database initialized at: {args.path}")
