import os
import re
import time
import sqlite3
import uuid
import json
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, field_validator
from fastapi import FastAPI, HTTPException, status, Request
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

app = FastAPI()
API_BEARER_TOKEN = os.getenv("API_BEARER_TOKEN")
DB_PATH = os.getenv("DB_PATH", "data/test_telemetry.db")

# In-memory rate limiting dictionary: {ip: [timestamps]}
rate_limits: Dict[str, List[float]] = {}

@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    client_ip = request.client.host if request.client else "unknown"
    now = time.time()
    
    # Clean up old timestamps
    if client_ip in rate_limits:
        rate_limits[client_ip] = [t for t in rate_limits[client_ip] if now - t < 60]
    else:
        rate_limits[client_ip] = []
        
    if len(rate_limits[client_ip]) >= 60:
        return JSONResponse(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            content={"detail": "Rate limit exceeded. Max 60 requests per minute."}
        )
        
    rate_limits[client_ip].append(now)
    response = await call_next(request)
    return response



@app.get("/schema")
def get_schema():
    if not os.path.exists(DB_PATH):
        raise HTTPException(status_code=500, detail=f"Database file not found at {DB_PATH}")
    try:
        conn = sqlite3.connect(f"file:{DB_PATH}?mode=ro", uri=True)
        cursor = conn.cursor()
        cursor.execute("SELECT name, sql FROM sqlite_master WHERE type='table' AND name IN ('telemetry_logs', 'test_scenarios', 'agent_hypotheses');")
        tables = {row[0]: row[1] for row in cursor.fetchall()}
        conn.close()
        return tables
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/scenarios")
def get_scenarios(limit: int = 100, offset: int = 0):
    if not os.path.exists(DB_PATH):
        raise HTTPException(status_code=500, detail=f"Database file not found at {DB_PATH}")
    try:
        conn = sqlite3.connect(f"file:{DB_PATH}?mode=ro", uri=True)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM test_scenarios LIMIT ? OFFSET ?;", (limit, offset))
        rows = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return rows
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/runs")
def get_runs():
    if not os.path.exists(DB_PATH):
        raise HTTPException(status_code=500, detail=f"Database file not found at {DB_PATH}")
    try:
        conn = sqlite3.connect(f"file:{DB_PATH}?mode=ro", uri=True)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("""
            SELECT run_id, COUNT(*) as total_scenarios, 
                   SUM(CASE WHEN outcome = 'PASS' THEN 1 ELSE 0 END) as passed_count,
                   MIN(created_at) as started_at
            FROM test_scenarios 
            GROUP BY run_id
            ORDER BY started_at DESC;
        """)
        rows = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return rows
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/hypotheses")
def get_hypotheses():
    if not os.path.exists(DB_PATH):
        raise HTTPException(status_code=500, detail=f"Database file not found at {DB_PATH}")
    try:
        conn = sqlite3.connect(f"file:{DB_PATH}?mode=ro", uri=True)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM agent_hypotheses ORDER BY created_at DESC;")
        rows = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return rows
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class QueryRequest(BaseModel):
    sql: str
    description: Optional[str] = None

# Progress handler callback to interrupt query execution
def make_progress_handler(start_time: float, timeout: float = 5.0):
    def progress_handler():
        if time.time() - start_time > timeout:
            return 1  # returns non-zero to abort
        return 0
    return progress_handler

@app.post("/query")
def execute_query(request: QueryRequest):
    if not os.path.exists(DB_PATH):
        raise HTTPException(status_code=500, detail=f"Database file not found at {DB_PATH}")
        
    sql = request.sql.strip()
    normalized_sql = re.sub(r'\s+', ' ', sql).lower()
    
    # Must start with SELECT or WITH
    if not (normalized_sql.startswith("select") or normalized_sql.startswith("with")):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only SELECT or WITH statements allowed"
        )
        
    # Block writing keywords
    forbidden_pattern = r"\b(insert|update|delete|drop|attach|pragma|create|alter|replace)\b"
    if re.search(forbidden_pattern, normalized_sql):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Modifying queries forbidden"
        )
        
    start_time = time.time()
    try:
        conn = sqlite3.connect(f"file:{DB_PATH}?mode=ro", uri=True)
        conn.row_factory = sqlite3.Row
        
        # Register progress handler to interrupt queries taking > 5 seconds
        conn.set_progress_handler(make_progress_handler(start_time, 5.0), 100)
        
        cursor = conn.cursor()
        cursor.execute(sql)
        
        raw_rows = cursor.fetchmany(1001)
        execution_ms = int((time.time() - start_time) * 1000)
        
        row_count = len(raw_rows)
        if row_count > 1000:
            raw_rows = raw_rows[:1000]
            row_count = 1000
            
        rows = [dict(r) for r in raw_rows]
        conn.close()
        
        return {
            "rows": rows,
            "row_count": row_count,
            "execution_ms": execution_ms,
            "schema_version": "1.0.0"
        }
    except sqlite3.OperationalError as oe:
        # Check if the query was aborted by progress handler
        if "interrupted" in str(oe).lower() or "callback" in str(oe).lower() or (time.time() - start_time >= 5.0):
            raise HTTPException(
                status_code=status.HTTP_408_REQUEST_TIMEOUT,
                detail="Query execution exceeded 5-second timeout."
            )
        raise HTTPException(status_code=400, detail=str(oe))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

class ScenarioJson(BaseModel):
    workflow: str
    network_cond: str
    power_state: str
    sensor_state: str
    ocr_path: str
    llm_path: str
    repeat_count: Optional[int] = 1

    @field_validator("workflow")
    @classmethod
    def validate_workflow(cls, v):
        if v not in ["A", "B", "C", "D"]:
            raise ValueError("workflow must be A, B, C, or D")
        return v

    @field_validator("network_cond")
    @classmethod
    def validate_network(cls, v):
        allowed = ["NET_NORMAL", "NET_LOSS_5", "NET_LOSS_20", "NET_OFFLINE_2H", "NET_RF_INTERFERENCE"]
        if v not in allowed:
            raise ValueError(f"network_cond must be one of {allowed}")
        return v

    @field_validator("power_state")
    @classmethod
    def validate_power(cls, v):
        allowed = ["PWR_CONTINUOUS", "PWR_SLEEP_1", "PWR_SLEEP_3"]
        if v not in allowed:
            raise ValueError(f"power_state must be one of {allowed}")
        return v

    @field_validator("sensor_state")
    @classmethod
    def validate_sensor(cls, v):
        allowed = ["SENS_NORMAL", "SENS_SHT40_DRIFT", "SENS_CLAMP_DISCONNECTED", "SENS_BOTH_FAULT"]
        if v not in allowed:
            raise ValueError(f"sensor_state must be one of {allowed}")
        return v

    @field_validator("ocr_path")
    @classmethod
    def validate_ocr(cls, v):
        allowed = ["OCR_SUCCESS", "OCR_BYPASS"]
        if v not in allowed:
            raise ValueError(f"ocr_path must be one of {allowed}")
        return v

    @field_validator("llm_path")
    @classmethod
    def validate_llm(cls, v):
        allowed = ["LLM_SUCCESS", "LLM_OOM", "LLM_CLOUD_FALLBACK"]
        if v not in allowed:
            raise ValueError(f"llm_path must be one of {allowed}")
        return v

class HypothesisRequest(BaseModel):
    proposed_by: str
    hypothesis_text: str
    scenario_json: ScenarioJson
    evidence_query: Optional[str] = None
    evidence_result: Optional[Dict[str, Any]] = None

@app.post("/hypotheses", status_code=status.HTTP_201_CREATED)
def submit_hypothesis(request: HypothesisRequest):
    if not os.path.exists(DB_PATH):
        raise HTTPException(status_code=500, detail=f"Database file not found at {DB_PATH}")
        
    try:
        hypothesis_id = str(uuid.uuid4())
        created_at = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
        scenario_json_str = json.dumps(request.scenario_json.model_dump())
        evidence_result_str = json.dumps(request.evidence_result) if request.evidence_result else None
        
        # Connect read-write to insert
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        query = """
            INSERT INTO agent_hypotheses (
                hypothesis_id, proposed_by, hypothesis_text, scenario_json, 
                status, evidence_query, evidence_result, created_at
            ) VALUES (?, ?, ?, ?, 'QUEUED', ?, ?, ?);
        """
        cursor.execute(query, (
            hypothesis_id,
            request.proposed_by,
            request.hypothesis_text,
            scenario_json_str,
            request.evidence_query,
            evidence_result_str,
            created_at
        ))
        conn.commit()
        conn.close()
        
        return {"hypothesis_id": hypothesis_id, "status": "QUEUED"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error inserting hypothesis: {str(e)}")

# Memory store for snapshots and idempotency keys
uploaded_snapshots = {}
idempotency_keys = {}

@app.post("/api/v1/snapshots")
async def upload_snapshot(request: Request):
    idempotency_key = request.headers.get("Idempotency-Key")
    if not idempotency_key:
        raise HTTPException(status_code=400, detail="Missing Idempotency-Key header")
        
    # Check idempotency cache
    if idempotency_key in idempotency_keys:
        cached = idempotency_keys[idempotency_key]
        return JSONResponse(
            status_code=200,
            headers={"X-Cache-Lookup": "HIT", "Idempotency-Key": idempotency_key},
            content=cached
        )
        
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")
        
    snapshot_id = body.get("snapshot_id")
    revision = body.get("revision")
    status_str = body.get("status")
    
    if not snapshot_id or revision is None or not status_str:
        raise HTTPException(status_code=400, detail="Missing required snapshot fields (snapshot_id, revision, status)")
        
    # Check revision and status locking
    if snapshot_id in uploaded_snapshots:
        existing = uploaded_snapshots[snapshot_id]
        if revision <= existing["revision"]:
            raise HTTPException(
                status_code=409,
                detail="Conflict: newer or same revision already exists."
            )
        if existing["status"] in ("COMPLETED", "DIAGNOSTIC_COMPLETE"):
            raise HTTPException(
                status_code=409,
                detail="Conflict: snapshot is sealed/completed."
            )
            
    # Save snapshot
    uploaded_snapshots[snapshot_id] = body
    
    # Save response to idempotency cache
    response_body = {"snapshot_id": snapshot_id, "status": status_str, "revision": revision}
    idempotency_keys[idempotency_key] = response_body
    
    return JSONResponse(
        status_code=202,
        headers={"Idempotency-Key": idempotency_key},
        content=response_body
    )

# Clear endpoint for test suite resets
@app.post("/api/v1/reset")
def reset_snapshots():
    uploaded_snapshots.clear()
    idempotency_keys.clear()
    return {"status": "reset"}

# Mount the static UI at the root directory
# This MUST be at the bottom so it doesn't intercept defined API routes
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UI_DIR = os.path.join(BASE_DIR, "ui")
if os.path.isdir(UI_DIR):
    app.mount("/", StaticFiles(directory=UI_DIR, html=True), name="ui")
