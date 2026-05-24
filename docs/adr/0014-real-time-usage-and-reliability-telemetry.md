# 14. Real-Time Usage and Reliability Telemetry

**Status**: Accepted  
**Date**: 2026-05-24  
**Deciders**: Antigravity (AI Assistant), User  
**Agent Roles**: `@agency-feedback-synthesizer` (Product Feedback) + `@agency-TODO-engineering-sre` (SRE) + `@agency-security-engineer` (Security) + `@agency-mobile-app-builder` (Mobile)

## Context

Technicians operate in high-friction settings (dark mechanical rooms, heavy sheet-metal cabinets, and areas with poor cellular service). When connections drop, on-device OCR fails, or sync queues lag, technicians may experience slowdowns or fail to submit service records, creating data discrepancies.

To support proactive customer success and rapid debugging, we need a standard telemetry framework to monitor:
1.  Bluetooth Low Energy (BLE) link dropouts and connection latencies.
2.  On-device OCR viewfinder failure rates, scan time, and manual bypasses.
3.  Local SQLite outbox synchronization backlogs and API request latencies.
4.  On-device LLM notes-expansion execution times, failures, and Out-of-Memory (OOM) fallbacks.
5.  Physical handheld device diagnostics (watchdog resets, battery level, and sensor failures).

## Decision

We will implement an operational telemetry system structured around the following rules:

### 1. Unified SQLite Telemetry Schema
All telemetry events will be buffered in a local SQLite table (`telemetry_logs`) with the following fields:
*   `event_id`: UUID (Primary Key)
*   `device_hash`: Salted SHA-256 hash of the unique device/technician ID (for anonymization)
*   `event_type`: VARCHAR (e.g., `CONNECTIVITY`, `OCR`, `SYNC`, `LLM`, `HARDWARE`)
*   `event_name`: VARCHAR (e.g., `BLE_DISCONNECT`, `SYNC_FAILURE`, `LLM_TIMEOUT`)
*   `duration_ms`: INTEGER (nullable - for performance metrics)
*   `payload`: JSON TEXT (containing event-specific keys like error codes, RSSI levels, or queue sizes)
*   `timestamp`: TIMESTAMP (millisecond precision, UTC)

### 2. Event Payload Specifications

*   **Connectivity (`CONNECTIVITY`)**:
    ```json
    {
      "rssi_dbm": -85,
      "disconnect_reason_code": 19,
      "reconnect_attempt_count": 2,
      "reconnect_duration_ms": 4200
    }
    ```
*   **OCR Funnel (`OCR`)**:
    ```json
    {
      "scan_attempts": 3,
      "scan_duration_ms": 2800,
      "manual_bypass_triggered": true,
      "corrected_fields": ["model_number", "seer"]
    }
    ```
*   **Sync Health (`SYNC`)**:
    ```json
    {
      "outbox_depth": 14,
      "api_endpoint": "/api/v1/snapshots",
      "http_status": 503,
      "retry_attempt": 4
    }
    ```
*   **Local LLM (`LLM`)**:
    ```json
    {
      "input_char_length": 45,
      "output_char_length": 320,
      "status": "OOM_FALLBACK",
      "inference_duration_ms": 5200
    }
    ```
*   **Hardware Diagnostic (`HARDWARE`)**:
    ```json
    {
      "watchdog_reset_count": 1,
      "battery_percentage": 14,
      "sensor_fault_code": "I2C_SHT_TIMEOUT"
    }
    ```

### 3. Privacy & Anonymization Policy
*   **No PII**: Under no circumstances will names, GPS coordinates, customer addresses, or equipment notes be captured in the telemetry schema.
*   **Hashing**: The technician/device ID is hashed using a server-provisioned salt, preventing reverse lookup.

### 4. Zero-UI-Impact Sync Strategy
*   **Queueing**: Telemetry events write directly to local SQLite off the main thread.
*   **Batching**: Logs are synced in batches of $\le$ 50 rows. They are coalesced with standard API snapshot sync calls to prevent extra cellular radio wake-ups, preserving phone battery.

## Hard Questions (5-Year Perspective)

> [!WARNING]
> **1. Database Growth and Disk Exhaustion**: If a device experiences high error rates (e.g., continuous BLE disconnect loop), will telemetry logs exhaust the phone's storage?
> *Recommended Answer*: Yes, unless capped. We will enforce a strict log-rotation policy: the local SQLite table is capped at 1,000 telemetry events. Once the limit is reached, the oldest unsynced events are overwritten (FIFO).
> 
> **2. High Ingestion Latency on Backend**: If thousands of technicians sync telemetry simultaneously during morning shift finalizations, will the telemetry API degrade snapshot processing performance?
> *Recommended Answer*: Telemetry endpoints are isolated on the server. The mobile app syncs snapshots first to a high-priority queue, then dispatches telemetry logs to a low-priority ingestion queue (e.g., AWS SQS or background worker processing) that runs asynchronously from the core snapshot database.

## Cost of Being Wrong

*   **API overhead**: If telemetry data structure changes, we must migrate both the mobile app SQLite schemas and the cloud backend API handlers, requiring 1-2 weeks of coordination.
*   **Battery Drain**: If the batching logic fails and transmits every log live, mobile battery life will degrade significantly, prompting users to disable permissions.
