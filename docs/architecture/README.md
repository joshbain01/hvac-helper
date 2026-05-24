# HVAC Helper Pro System Architecture Diagrams

This directory contains system architecture diagrams and structural documentation for the HVAC Helper Pro system, showing the end-to-end telemetry flow from physical device sensors through BLE to mobile SQLite, and up to the cloud.

---

## 1. End-to-End System Architecture Diagram

```mermaid
graph TD
    %% Hardware Layer
    subgraph Hardware ["Handheld Physical Device (ESP32)"]
        Sensors["Built-in Sensor (RA, SA, OA, DA)<br/>& Ext. Clamp Probes (SL, LL)"]
        Inputs["4x Buttons & 2x Rotary Encoders<br/>(Sat Temp Adjustment & Push-to-Read)"]
        OLED["Top Display (128x64)<br/>(Raw values, SH/SC/Delta T, Target ranges)"]
        LEDs["6x Progress LEDs (Yellow/Green)<br/>(Checklist Capture State)"]
        Switch["Before/After Switch<br/>(Context-Swap Display & BLE Tx)"]
        Firmware["ESP-IDF C++ Firmware<br/>(Calculations, Sleep Cache, Watchdog, BLE Service)"]
        
        Inputs --> Firmware
        Sensors --> Firmware
        Firmware --> OLED
        Firmware --> LEDs
        Switch --> Firmware
    end

    %% BLE Transport
    Firmware <-->|BLE 5.0 Transport<br/>(3s Latency Window,<br/>3 Retries, MTU-sized packets)| BLEManager

    %% Mobile Application Layer
    subgraph Mobile ["Mobile Application (iOS/Android / React-Native)"]
        BLEManager["BLE Plx Manager<br/>(Telemetry parsing & Backpressure queue)"]
        SQLite["Local SQLite DB (Drizzle ORM)<br/>(Snapshots, Measurement Sets, Outbox Queue)"]
        UI["UI Layer (SwiftUI / Jetpack Compose)<br/>(Guided/Expert Capture Grid, Notes, Outbox)"]
        OCR["On-Device OCR<br/>(Apple Vision / Android ML Kit)"]
        LocalLLM["Local LLM note expansion<br/>(AICore / Apple native)"]
        SyncWorker["Background Sync Worker<br/>(App Refresh / WorkManager)"]
        
        BLEManager -->|Writes telemetry| SQLite
        BLEManager -->|Pushes target sync| Firmware
        UI -->|Finalization check| SQLite
        OCR -->|Parses tags| UI
        LocalLLM -->|Expands notes| UI
        SQLite --> SyncWorker
    end

    %% Cloud Backend Layer
    subgraph Cloud ["Cloud Backend System"]
        API["Node/Express Snapshots API<br/>(/api/v1/snapshots via JWT Auth)"]
        DB["Cloud Database (PostgreSQL)<br/>(Service records, Audit trail)"]
        Logging["Structured JSON Logging & Metrics<br/>(Prometheus / healthz)"]
        
        SyncWorker <-->|HTTPS / TLS 1.3<br/>(Finalized Snapshot Sync)| API
        API --> DB
        API --> Logging
    end

    classDef hardware fill:#ffe3e3,stroke:#e66464,stroke-width:2px;
    classDef mobile fill:#e3f2fd,stroke:#2196f3,stroke-width:2px;
    classDef cloud fill:#e8f5e9,stroke:#4caf50,stroke-width:2px;
    
    class Sensors,Inputs,OLED,LEDs,Switch,Firmware hardware;
    class BLEManager,SQLite,UI,OCR,LocalLLM,SyncWorker mobile;
    class API,DB,Logging cloud;
```

---

## 2. Telemetry Capture and State Transition Lifecycle

The diagram below details the sequence of a single data point capture (e.g., Return Air button press) and how it propagates through the state machine.

```mermaid
sequenceDiagram
    autonumber
    actor Tech as Technician
    participant Button as RA Button (Hardware)
    participant ESP32 as ESP32 Firmware
    participant OLED as OLED Top Display
    participant LEDs as Progress LEDs
    participant App as Mobile BLE Manager
    participant DB as Mobile Drizzle SQLite
    
    Tech->>Button: Press Button
    Button->>ESP32: Trigger GPIO Interrupt
    ESP32->>ESP32: Read Built-in Temperature/Humidity
    ESP32->>OLED: Draw captured RA value (e.g. 76.2°F / 55.4%)
    ESP32->>ESP32: Package BLE Payload
    ESP32->>App: Transmit data point over BLE
    App->>DB: Check if Snapshot exists; Create DRAFT if not
    App->>DB: Save data point in SQLite `measurement_sets`
    App-->>ESP32: Send confirmation packet over BLE (Within 3s)
    alt Confirmation Received
        ESP32->>LEDs: Update RA Progress LED to Solid Green
        ESP32->>ESP32: Reset BLE retry count
    else Confirmation Fails (3s Timeout)
        ESP32->>LEDs: Retain Solid Yellow LED (needs capture)
        ESP32->>ESP32: Log BLE transmission failure in NVS
    end
```
