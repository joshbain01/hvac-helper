import os
import json
import sqlite3
import glob
from datetime import datetime, timedelta, timezone
from typing import Dict, Any, List

def run_queries(db_path: str) -> Dict[str, Any]:
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    # 1. Overall pass rate
    cursor.execute("""
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN outcome = 'PASS' THEN 1 ELSE 0 END) as passed
        FROM test_scenarios
        WHERE created_at >= date('now', '-7 days');
    """)
    row = cursor.fetchone()
    overall = {"total": row["total"] or 0, "passed": row["passed"] or 0}
    overall["pass_rate_pct"] = round(100.0 * overall["passed"] / overall["total"], 1) if overall["total"] > 0 else 0.0
    
    # 2. Dimension breakdown
    dimensions = ["network_cond", "power_state", "sensor_state", "ocr_path", "llm_path"]
    dimension_stats = {}
    for dim in dimensions:
        cursor.execute(f"""
            SELECT
              {dim} as value,
              COUNT(*) as total,
              SUM(CASE WHEN outcome = 'PASS' THEN 1 ELSE 0 END) as passed,
              ROUND(100.0 * SUM(CASE WHEN outcome = 'PASS' THEN 1 ELSE 0 END) / COUNT(*), 1) as pass_rate_pct
            FROM test_scenarios
            WHERE created_at >= date('now', '-7 days')
            GROUP BY {dim}
            ORDER BY pass_rate_pct ASC;
        """)
        dimension_stats[dim] = [dict(r) for r in cursor.fetchall()]
        
    # 3. Top 5 failure patterns
    cursor.execute("""
        SELECT
          failure_reason,
          failure_step,
          COUNT(*) as pattern_count
        FROM test_scenarios
        WHERE created_at >= date('now', '-7 days') AND outcome != 'PASS'
        GROUP BY failure_reason, failure_step
        ORDER BY pattern_count DESC
        LIMIT 5;
    """)
    failures = [dict(r) for r in cursor.fetchall()]
    
    # 4. Hypothesis queue status
    cursor.execute("""
        SELECT status, COUNT(*) as count
        FROM agent_hypotheses
        GROUP BY status;
    """)
    hypotheses = {row["status"]: row["count"] for row in cursor.fetchall()}
    for status in ["QUEUED", "RUNNING", "COMPLETE", "REJECTED"]:
        if status not in hypotheses:
            hypotheses[status] = 0
            
    conn.close()
    
    # 5. Scan for critical anomalies in report JSONs from past 7 days
    report_dir = "/data/reports" if os.path.exists("/data") else "data/reports"
    critical_anomalies = []
    
    cutoff_date = datetime.now(timezone.utc) - timedelta(days=7)
    json_files = glob.glob(os.path.join(report_dir, "*.json"))
    for file in json_files:
        filename = os.path.basename(file)
        # Parse date from name YYYY-MM-DD.json
        try:
            date_str = filename.replace(".json", "")
            file_date = datetime.strptime(date_str, "%Y-%m-%d").replace(tzinfo=timezone.utc)
            if file_date >= cutoff_date:
                with open(file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                for anomaly in data.get("anomalies", []):
                    if anomaly.get("severity") == "CRITICAL":
                        anomaly["date"] = date_str
                        critical_anomalies.append(anomaly)
        except Exception:
            pass
            
    return {
        "overall": overall,
        "dimensions": dimension_stats,
        "failures": failures,
        "hypotheses": hypotheses,
        "critical_anomalies": critical_anomalies
    }

def generate_markdown(data: Dict[str, Any], filepath: str):
    content = []
    content.append("# Weekly Summary Report")
    content.append(f"Generated: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')} (UTC)")
    content.append("")
    
    overall = data["overall"]
    content.append("## Overall Pass Rate")
    content.append(f"- **Passed / Total**: {overall['passed']} / {overall['total']}")
    content.append(f"- **Pass Rate**: {overall['pass_rate_pct']}%")
    content.append("")
    
    content.append("## Pass Rate by Dimension")
    for dim, rows in data["dimensions"].items():
        content.append(f"### {dim.replace('_', ' ').title()}")
        content.append("| Dimension Value | Passed | Total | Pass Rate |")
        content.append("|---|---|---|---|")
        for r in rows:
            content.append(f"| {r['value']} | {r['passed']} | {r['total']} | {r['pass_rate_pct']}% |")
        content.append("")
        
    content.append("## Top 5 Failure Patterns")
    if data["failures"]:
        content.append("| Failure Reason | Failure Step | Count |")
        content.append("|---|---|---|")
        for f in data["failures"]:
            content.append(f"| {f['failure_reason'] or 'N/A'} | {f['failure_step'] or 'N/A'} | {f['pattern_count']} |")
    else:
        content.append("No failures detected in the past 7 days.")
    content.append("")
    
    content.append("## Agent Hypothesis Queue")
    hyp = data["hypotheses"]
    content.append(f"- **QUEUED**: {hyp.get('QUEUED', 0)}")
    content.append(f"- **RUNNING**: {hyp.get('RUNNING', 0)}")
    content.append(f"- **COMPLETE**: {hyp.get('COMPLETE', 0)}")
    content.append(f"- **REJECTED**: {hyp.get('REJECTED', 0)}")
    content.append("")
    
    content.append("## Critical Anomalies")
    if data["critical_anomalies"]:
        for ca in data["critical_anomalies"]:
            content.append(f"### {ca['title']} (Detected: {ca['date']})")
            content.append(f"- **Description**: {ca['description']}")
            content.append(f"- **User Impact**: {ca['user_impact']}")
            content.append(f"- **Affected Scenarios**: {', '.join(ca['affected_scenarios'])}")
            content.append("")
    else:
        content.append("No critical anomalies detected in the past 7 days.")
        
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write("\n".join(content))
    print(f"Markdown report written to {filepath}")

def generate_html(data: Dict[str, Any], filepath: str, tokens_path: str):
    # Load design tokens
    with open(tokens_path, 'r', encoding='utf-8') as f:
        tokens = json.load(f)
        
    sunlight = tokens["colors"]["semantic"]["sunlight"]
    palette = tokens["colors"]["palette"]
    
    # Simple token replacement to resolve variables like "var(--palette-gray-900)"
    def resolve_color(val):
        if val.startswith("var(--palette-"):
            key = val.replace("var(--palette-", "").replace(")", "")
            return palette.get(key, "#000000")
        return val
        
    bg_main = resolve_color(sunlight["color-bg-main"])
    text_primary = resolve_color(sunlight["color-text-primary"])
    border_color = resolve_color(sunlight["color-border"])
    color_primary = resolve_color(sunlight["color-primary"])
    color_success = resolve_color(sunlight["color-success"])
    color_error = resolve_color(sunlight["color-error"])
    font_family = tokens["typography"]["font-family"]
    
    # HTML layout
    overall = data["overall"]
    
    dimension_sections = []
    for dim, rows in data["dimensions"].items():
        table_rows = []
        for r in rows:
            table_rows.append(f"""
            <tr>
                <td>{r['value']}</td>
                <td>{r['passed']}</td>
                <td>{r['total']}</td>
                <td style="font-weight: bold;">{r['pass_rate_pct']}%</td>
            </tr>
            """)
        dimension_sections.append(f"""
        <div class="card">
            <h3>{dim.replace('_', ' ').title()}</h3>
            <table>
                <thead>
                    <tr>
                        <th>Value</th>
                        <th>Passed</th>
                        <th>Total</th>
                        <th>Pass Rate</th>
                    </tr>
                </thead>
                <tbody>
                    {''.join(table_rows)}
                </tbody>
            </table>
        </div>
        """)
        
    failure_rows = []
    for f in data["failures"]:
        failure_rows.append(f"""
        <tr>
            <td>{f['failure_reason'] or 'N/A'}</td>
            <td>{f['failure_step'] or 'N/A'}</td>
            <td>{f['pattern_count']}</td>
        </tr>
        """)
        
    critical_anomaly_items = []
    for ca in data["critical_anomalies"]:
        critical_anomaly_items.append(f"""
        <div class="anomaly-item">
            <h4>{ca['title']} <span style="font-size: 12px; font-weight: normal; color: {color_error};">({ca['date']})</span></h4>
            <p><strong>Description:</strong> {ca['description']}</p>
            <p><strong>User Impact:</strong> {ca['user_impact']}</p>
            <p><small>Affected Scenarios: {', '.join(ca['affected_scenarios'])}</small></p>
        </div>
        """)
    if not critical_anomaly_items:
        critical_anomaly_items.append("<p>No critical anomalies detected in the past 7 days.</p>")
        
    hyp = data["hypotheses"]
    
    html_content = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>HVAC Helper Weekly Dashboard</title>
    <style>
        body {{
            background-color: {bg_main};
            color: {text_primary};
            font-family: {font_family};
            margin: 0;
            padding: 24px;
        }}
        h1, h2, h3, h4 {{
            color: {color_primary};
            margin-top: 0;
        }}
        .header {{
            border-bottom: 3px solid {border_color};
            padding-bottom: 12px;
            margin-bottom: 24px;
        }}
        .grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 16px;
            margin-bottom: 24px;
        }}
        .card {{
            border: 2px solid {border_color};
            border-radius: 8px;
            padding: 16px;
            background-color: #FFFFFF;
        }}
        .stat {{
            font-size: 36px;
            font-weight: bold;
            color: {color_primary};
        }}
        table {{
            width: 100%;
            border-collapse: collapse;
            margin-top: 8px;
        }}
        th, td {{
            border: 1px solid {border_color};
            padding: 8px;
            text-align: left;
        }}
        th {{
            background-color: {bg_main};
            font-weight: bold;
        }}
        .anomaly-item {{
            border-left: 4px solid {color_error};
            padding-left: 12px;
            margin-bottom: 16px;
        }}
    </style>
</head>
<body>
    <div class="header">
        <h1>Weekly Summary Dashboard</h1>
        <p>Generated on {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')} (UTC)</p>
    </div>
    
    <div class="grid">
        <div class="card">
            <h2>Overall Pass Rate</h2>
            <div class="stat">{overall['pass_rate_pct']}%</div>
            <p>Passed: {overall['passed']} / {overall['total']}</p>
        </div>
        <div class="card">
            <h2>Hypothesis Queue</h2>
            <ul>
                <li>QUEUED: {hyp.get('QUEUED', 0)}</li>
                <li>RUNNING: {hyp.get('RUNNING', 0)}</li>
                <li>COMPLETE: {hyp.get('COMPLETE', 0)}</li>
                <li>REJECTED: {hyp.get('REJECTED', 0)}</li>
            </ul>
        </div>
    </div>
    
    <h2>Pass Rates by Scenario Dimension</h2>
    <div class="grid">
        {''.join(dimension_sections)}
    </div>
    
    <div class="grid">
        <div class="card">
            <h2>Top Failure Patterns</h2>
            <table>
                <thead>
                    <tr>
                        <th>Failure Reason</th>
                        <th>Step</th>
                        <th>Count</th>
                    </tr>
                </thead>
                <tbody>
                    {''.join(failure_rows) if failure_rows else '<tr><td colspan="3">No failures detected.</td></tr>'}
                </tbody>
            </table>
        </div>
        <div class="card" style="border-color: {color_error};">
            <h2>Critical Anomalies</h2>
            {''.join(critical_anomaly_items)}
        </div>
    </div>
</body>
</html>
"""
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(html_content)
    print(f"HTML dashboard written to {filepath}")

def main():
    db_path = os.environ.get("DB_PATH", "data/test_telemetry.db")
    report_dir = "tests/reports"
    os.makedirs(report_dir, exist_ok=True)
    
    tokens_path = "tokens/design-tokens.json"
    if not os.path.exists(tokens_path):
        # Fallback path if we are run in /opt/hvac-tests/
        tokens_path = "tests/tokens/design-tokens.json"
        
    data = run_queries(db_path)
    generate_markdown(data, os.path.join(report_dir, "weekly-summary.md"))
    generate_html(data, os.path.join(report_dir, "weekly-summary.html"), tokens_path)

if __name__ == "__main__":
    main()
