import os
import sys
import json
import time
import requests
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List

def check_budget(spend_log_path: str, estimated_cost: float = 0.05) -> bool:
    if not os.path.exists(spend_log_path):
        # Create empty log
        os.makedirs(os.path.dirname(os.path.abspath(spend_log_path)), exist_ok=True)
        initial_data = {
            "month": datetime.now(timezone.utc).strftime("%Y-%m"),
            "total_usd": 0.0,
            "runs": []
        }
        with open(spend_log_path, "w") as f:
            json.dump(initial_data, f)
            
    try:
        with open(spend_log_path, "r") as f:
            data = json.load(f)
    except Exception as e:
        print(f"Error reading spend log: {e}", file=sys.stderr)
        return True # Default to allowed if log is corrupted to avoid blocking critical runs
        
    total_usd = data.get("total_usd", 0.0)
    
    # Halt at $19.50 (leave buffer for estimation)
    if total_usd + estimated_cost > 19.50:
        print(f"Error: Monthly budget ceiling would be exceeded. Current spend: ${total_usd:.2f}", file=sys.stderr)
        return False
        
    # Warn at $18.00 (90% ceiling)
    if total_usd >= 18.00:
        print(f"WARNING: Monthly budget spend is at ${total_usd:.2f} (90% ceiling)", file=sys.stderr)
        
    return True

def parse_kimi_response(content: str) -> dict:
    cleaned = content.strip()
    if cleaned.startswith("```"):
        # Remove code blocks
        lines = cleaned.splitlines()
        if lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].startswith("```"):
            lines = lines[:-1]
        cleaned = "\n".join(lines).strip()
        
    try:
        return json.loads(cleaned)
    except Exception as e:
        print(f"Error parsing Kimi JSON response: {e}\nRaw content:\n{content}", file=sys.stderr)
        return {"anomalies": [], "follow_up_queries": [], "hypotheses": []}

def run_analysis_pipeline(api_base_url: str, spend_log_path: str, report_dir: Optional[str] = None) -> bool:
    if not report_dir:
        report_dir = "/data/reports" if os.path.exists("/data") else "data/reports"
    os.makedirs(report_dir, exist_ok=True)
    
    # 1. Budget check
    estimated_cost = 0.05
    if not check_budget(spend_log_path, estimated_cost):
        # Write skipped report
        date_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        skip_report_path = os.path.join(report_dir, f"{date_str}-skipped.md")
        with open(skip_report_path, "w") as f:
            f.write(f"# Daily AI Analysis Skipped\nDate: {date_str}\n\nMonthly budget limit reached. LLM call skipped.\n")
        print("Analysis skipped due to budget halt.", file=sys.stderr)
        return True # Return True to exit 0 successfully
        
    # Get authorization header
    token = os.getenv("API_BEARER_TOKEN", "test-token")
    headers = {"Authorization": f"Bearer {token}"}
    
    try:
        # 2. Fetch latest run
        runs_url = f"{api_base_url.rstrip('/')}/runs"
        resp = requests.get(runs_url, headers=headers, timeout=10)
        if resp.status_code != 200:
            print(f"Failed to fetch runs: {resp.status_code} {resp.text}", file=sys.stderr)
            return False
        runs = resp.json()
        if not runs:
            print("No test runs found to analyze.", file=sys.stderr)
            return True
        latest_run_id = runs[0]["run_id"]
        
        # 3. Fetch FAIL scenarios for this run_id
        query_url = f"{api_base_url.rstrip('/')}/query"
        fail_query = {
            "sql": f"SELECT scenario_id, workflow, network_cond, power_state, sensor_state, ocr_path, llm_path, failure_reason FROM test_scenarios WHERE run_id = '{latest_run_id}' AND outcome != 'PASS';"
        }
        resp = requests.post(query_url, json=fail_query, headers=headers, timeout=10)
        if resp.status_code != 200:
            print(f"Failed to query failures: {resp.status_code} {resp.text}", file=sys.stderr)
            return False
            
        fail_rows = resp.json().get("rows", [])
        if not fail_rows:
            print(f"No failed scenarios found for run {latest_run_id}. Writing empty report.")
            # Write empty report
            date_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
            write_empty_report(report_dir, date_str, latest_run_id)
            return True
            
        # 4. For each FAIL scenario, fetch telemetry logs
        failures_bundle = []
        for idx, row in enumerate(fail_rows):
            scen_id = row["scenario_id"]
            # Salted device hash matching MockDevice / MobileAppLogicDriver
            salt = "hvac-helper-salt"
            import hashlib
            device_hash = hashlib.sha256((scen_id + salt).encode('utf-8')).hexdigest()
            
            logs_query = {
                "sql": f"SELECT event_type, event_name, duration_ms, payload, timestamp FROM telemetry_logs WHERE device_hash = '{device_hash}' ORDER BY timestamp ASC;"
            }
            resp_logs = requests.post(query_url, json=logs_query, headers=headers, timeout=10)
            logs = resp_logs.json().get("rows", []) if resp_logs.status_code == 200 else []
            
            failures_bundle.append({
                "scenario_info": row,
                "telemetry_logs": logs
            })
            
        # 5. Submit to Kimi K2.5 via OpenRouter
        api_key = os.getenv("OPENROUTER_API_KEY")
        if not api_key:
            print("Error: OPENROUTER_API_KEY environment variable is not set.", file=sys.stderr)
            return False
            
        model_name = os.getenv("KIMI_MODEL", "moonshotai/kimi-k2.5")
        
        system_prompt = (
            "You are an expert QA analyst for an IoT hardware product. You receive telemetry from automated test scenarios and must identify:\n"
            "1. Anomalous patterns that will affect real technicians in the field\n"
            "2. Correlations between environmental conditions (BLE signal strength, power state, sensor faults) and failure outcomes\n"
            "3. New test hypotheses to validate\n\n"
            "You must respond ONLY with valid JSON in this exact structure:\n"
            "{\n"
            "  \"anomalies\": [\n"
            "    { \"title\": \"string (max 80 chars)\", \"description\": \"string (max 200 chars)\", \"affected_scenarios\": [\"id1\"], \"severity\": \"CRITICAL|HIGH|MEDIUM|LOW\", \"user_impact\": \"string (max 150 chars)\" }\n"
            "  ],\n"
            "  \"follow_up_queries\": [\n"
            "    { \"description\": \"string\", \"sql\": \"SELECT ...\" }\n"
            "  ],\n"
            "  \"hypotheses\": [\n"
            "    { \"hypothesis_text\": \"string (max 300 chars)\", \"scenario_json\": { \"workflow\": \"B\", \"network_cond\": \"...\", \"power_state\": \"...\", \"sensor_state\": \"...\", \"ocr_path\": \"...\", \"llm_path\": \"...\", \"repeat_count\": 20 } }\n"
            "  ]\n"
            "}"
        )
        
        user_message = f"Here is the bundle of failed scenarios and their telemetry logs:\n{json.dumps(failures_bundle, indent=2)}"
        
        payload = {
            "model": model_name,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message}
            ],
            "temperature": 0.2,
            "max_tokens": 1500
        }
        
        openrouter_headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        
        print(f"Calling Kimi model '{model_name}' on OpenRouter...")
        or_url = "https://openrouter.ai/api/v1/chat/completions"
        resp_kimi = requests.post(or_url, json=payload, headers=openrouter_headers, timeout=60)
        if resp_kimi.status_code != 200:
            print(f"OpenRouter call failed: {resp_kimi.status_code} {resp_kimi.text}", file=sys.stderr)
            return False
            
        kimi_data = resp_kimi.json()
        content = kimi_data["choices"][0]["message"]["content"]
        usage = kimi_data.get("usage", {})
        prompt_tokens = usage.get("prompt_tokens", 0)
        completion_tokens = usage.get("completion_tokens", 0)
        
        # 6. Parse structured response
        kimi_analysis = parse_kimi_response(content)
        
        # 7. Execute follow-up queries
        executed_queries = []
        for q in kimi_analysis.get("follow_up_queries", []):
            q_desc = q.get("description", "Query")
            q_sql = q.get("sql", "")
            if not q_sql: continue
            
            print(f"Executing follow-up query: {q_desc}")
            q_payload = {"sql": q_sql}
            resp_q = requests.post(query_url, json=q_payload, headers=headers, timeout=10)
            q_rows = resp_q.json().get("rows", []) if resp_q.status_code == 200 else []
            executed_queries.append({
                "description": q_desc,
                "sql": q_sql,
                "row_count": len(q_rows),
                "rows": q_rows[:10] # limit to 10 rows in report
            })
            
        # 8. Submit hypotheses
        hyp_url = f"{api_base_url.rstrip('/')}/hypotheses"
        submitted_hypotheses = []
        for h in kimi_analysis.get("hypotheses", []):
            h_text = h.get("hypothesis_text", "")
            h_scen = h.get("scenario_json", {})
            if not h_text or not h_scen: continue
            
            print(f"Submitting hypothesis: {h_text}")
            h_payload = {
                "proposed_by": f"kimi-k2.5-{model_name}",
                "hypothesis_text": h_text,
                "scenario_json": h_scen
            }
            resp_h = requests.post(hyp_url, json=h_payload, headers=headers, timeout=10)
            if resp_h.status_code == 201:
                submitted_hypotheses.append({
                    "hypothesis_text": h_text,
                    "hypothesis_id": resp_h.json().get("hypothesis_id"),
                    "status": "QUEUED"
                })
            else:
                print(f"Failed to submit hypothesis: {resp_h.status_code} {resp_h.text}", file=sys.stderr)
                
        # 9. Write report files
        date_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        
        report_data = {
            "date": date_str,
            "run_id": latest_run_id,
            "failures_analyzed": len(failures_bundle),
            "anomalies": kimi_analysis.get("anomalies", []),
            "follow_up_queries": executed_queries,
            "submitted_hypotheses": submitted_hypotheses,
            "token_usage": {
                "prompt_tokens": prompt_tokens,
                "completion_tokens": completion_tokens
            }
        }
        
        # Write JSON report
        json_report_path = os.path.join(report_dir, f"{date_str}.json")
        with open(json_report_path, "w", encoding="utf-8") as f:
            json.dump(report_data, f, indent=2)
            
        # Write Markdown report
        md_report_path = os.path.join(report_dir, f"{date_str}.md")
        write_markdown_report_file(md_report_path, report_data)
        
        # 10. Update spend_log.json
        # Input: $0.60 per Million; Output: $3.00 per Million
        cost = prompt_tokens * 0.0000006 + completion_tokens * 0.0000030
        update_spend_log(spend_log_path, prompt_tokens, completion_tokens, cost)
        
        return True
        
    except Exception as e:
        print(f"Exception during pipeline execution: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        return False

def write_empty_report(report_dir: str, date_str: str, run_id: str):
    report_data = {
        "date": date_str,
        "run_id": run_id,
        "failures_analyzed": 0,
        "anomalies": [],
        "follow_up_queries": [],
        "submitted_hypotheses": [],
        "token_usage": {"prompt_tokens": 0, "completion_tokens": 0}
    }
    with open(os.path.join(report_dir, f"{date_str}.json"), "w", encoding="utf-8") as f:
        json.dump(report_data, f, indent=2)
    with open(os.path.join(report_dir, f"{date_str}.md"), "w", encoding="utf-8") as f:
        f.write(f"# Daily AI Analysis Report\nDate: {date_str}\nRun ID: {run_id}\n\nNo failures detected. System is 100% healthy.\n")

def write_markdown_report_file(filepath: str, data: Dict[str, Any]):
    content = []
    content.append(f"# Daily AI Analysis Report - {data['date']}")
    content.append(f"Run ID: `{data['run_id']}`")
    content.append(f"Failures Analyzed: {data['failures_analyzed']}")
    content.append("")
    
    content.append("## Anomalies Detected")
    if data["anomalies"]:
        for idx, a in enumerate(data["anomalies"]):
            content.append(f"### {idx+1}. {a['title']} ({a['severity']})")
            content.append(f"- **Description**: {a['description']}")
            content.append(f"- **User Impact**: {a['user_impact']}")
            content.append(f"- **Affected Scenarios**: {', '.join(a['affected_scenarios'])}")
            content.append("")
    else:
        content.append("No anomalies detected.")
        content.append("")
        
    content.append("## Follow-up Investigation Queries")
    if data["follow_up_queries"]:
        for q in data["follow_up_queries"]:
            content.append(f"### {q['description']}")
            content.append("```sql")
            content.append(q["sql"])
            content.append("```")
            content.append(f"Result count: {q['row_count']}")
            if q["rows"]:
                content.append("| Row Data |")
                content.append("|---|")
                for r in q["rows"]:
                    content.append(f"| {json.dumps(r)} |")
            content.append("")
    else:
        content.append("No follow-up queries executed.")
        content.append("")
        
    content.append("## Submitted Hypotheses")
    if data["submitted_hypotheses"]:
        for h in data["submitted_hypotheses"]:
            content.append(f"- **Hypothesis**: {h['hypothesis_text']}")
            content.append(f"  - ID: `{h['hypothesis_id']}` (Status: {h['status']})")
    else:
        content.append("No hypotheses submitted.")
    content.append("")
    
    with open(filepath, "w", encoding="utf-8") as f:
        f.write("\n".join(content))

def update_spend_log(spend_log_path: str, prompt_tokens: int, completion_tokens: int, cost: float):
    try:
        with open(spend_log_path, "r") as f:
            data = json.load(f)
    except Exception:
        data = {
            "month": datetime.now(timezone.utc).strftime("%Y-%m"),
            "total_usd": 0.0,
            "runs": []
        }
        
    # Check if month matches current month, reset if new month
    curr_month = datetime.now(timezone.utc).strftime("%Y-%m")
    if data.get("month") != curr_month:
        data["month"] = curr_month
        data["total_usd"] = 0.0
        data["runs"] = []
        
    data["total_usd"] = round(data.get("total_usd", 0.0) + cost, 4)
    data["runs"].append({
        "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "input_tokens": prompt_tokens,
        "output_tokens": completion_tokens,
        "cost_usd": round(cost, 4)
    })
    
    with open(spend_log_path, "w") as f:
        json.dump(data, f, indent=2)

def main():
    parser = argparse_parser = argparse_ArgumentParser = argparse = None
    import argparse
    parser = argparse.ArgumentParser(description="Kimi K2.5 Daily Telemetry Analysis Pipeline")
    parser.add_argument("--api-base-url", default="http://localhost:8080", help="FastAPI Server Base URL")
    parser.add_argument("--spend-log", default="tests/analysis/spend_log.json", help="Path to spend log file")
    args = parser.parse_args()
    
    success = run_analysis_pipeline(
        api_base_url=args.api_base_url,
        spend_log_path=args.spend_log
    )
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
