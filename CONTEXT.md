# HVAC Helper Pro

A handheld troubleshooting device and paired mobile application that captures and synchronizes HVAC system measurements to automate service record generation.

## Language

### Measurements & Lifecycle

**Snapshot**:
A complete set of measurements captured for a service call, consisting of a **Before Set** and an **After Set**.
_Avoid_: Sensor log, reading set

**Before Set**:
The group of system measurements taken at the start of a service call, which must be captured no older than 20 minutes before the first button press.
_Avoid_: Before data, initial readings

**After Set**:
The group of system measurements taken after repairs or maintenance are performed, which must be captured within 20 minutes of the final button press.
_Avoid_: After data, post-service readings

**Data Point**:
An individual raw sensor reading or manual entry value.
_Avoid_: Reading, measurement

**Timeout**:
The 20-minute window during which a captured measurement must be confirmed by the mobile application before it expires and must be recaptured.
_Avoid_: Expiration window

**Transfer Latency**:
The 3-second maximum duration allowed for a data point to be transmitted from the device and confirmed by the mobile application.
_Avoid_: Transmission delay

**Snapshot State**:
The lifecycle status of a **Snapshot**, progressing from **Draft** (local-only, editable) to **Finalized** (immutable, queued in the Outbox for upload) to **Synced** (successfully uploaded to the cloud).
_Avoid_: Sync status

**Outbox**:
The mobile app's local persistent queue of **Finalized** snapshots waiting for an internet connection to upload.
_Avoid_: Sync queue

**Revision**:
A copy of a **Finalized** snapshot created to apply corrections, linked to the original via a parent ID and uploaded as a new audit record.
_Avoid_: Snapshot edit, update

### Hardware Interface & Feedback

**Button**:
A physical tactile control on the handheld device (specifically for Return Air, Supply Air, Outdoor Ambient, and Discharge Air) that initiates a sensor read, transmits the data via Bluetooth, and updates the associated progress LED.
_Avoid_: Key, switch

**Rotary Encoder**:
An incremental digital input dial with an integrated push-button (specifically for Suction Line and Liquid Line) used to adjust manual saturation temperature (read directly from the physical gauge's refrigerant scale) and initiate a clamp probe temperature read, transmitting both data points via Bluetooth.
_Avoid_: Reostat, potentiometer

**Progress LED**:
The two-color (Yellow/Green) visual indicator next to a button or rotary encoder representing the capture state of that data point. It glows solid yellow if a reading is missing (needs capture), solid green when captured successfully, and flashes yellow if there is a sensor/probe fault.
_Avoid_: Light indicator, status light, transmission LED

**Top Display**:
The single high-contrast 128x64 display at the top of the handheld device displaying all raw measurements, saturation dials, calculations, and active target ranges.
_Avoid_: Mini-OLEDs, individual displays

**Sleep Caching**:
The local storage of captured measurements in the handheld device's memory, which is context-swapped based on the physical switch position and persisted through low-power sleep states.
_Avoid_: Local log, flash logs

**Target Ranges**:
The Superheat and Subcooling reference thresholds displayed on the screen. They default to generic HVAC values in standalone mode and sync to factory tolerances once a tag is scanned.
_Avoid_: Tolerance limits, range brackets

**Physical Switch**:
The BEFORE/AFTER toggle/slide switch on the handheld device that context-swaps display values and triggers a re-transmission of all cached measurements for the selected set to the app.
_Avoid_: Toggle slider, software focus switch

### Mobile App Features

**Photo Capture**:
The process of photographing equipment service tags with the mobile application to extract text using local on-device OCR (Apple Vision / Android ML Kit), which is then parsed into structured model and serial numbers by the on-device LLM (or backend cloud LLM fallback).
_Avoid_: Tag scan, image search

**OCR Status**:
The metadata field (`PENDING`, `OCR_SUCCESS`, `MANUAL_OVERRIDE`) in the snapshot record indicating how the equipment model/serial numbers were captured.
_Avoid_: OCR state, extraction signal

**Manual Override**:
The technician's manual entry of equipment details when OCR fails, which updates the OCR Status to `MANUAL_OVERRIDE` and triggers telemetry logging for product improvement.
_Avoid_: Manual type-in, override code

**LLM Interaction**:
The on-device (Apple/Android local model) or cloud-fallback feature that converts free-form technician notes or dictation into a structured service description and auto-itemizes consumables. Any cloud fallback execution enforces zero data retention to protect customer privacy.
_Avoid_: AI chat, note generation

**Performance Deltas**:
The calculated thermodynamic changes (Delta T, Superheat, Subcooling differences) between the Before Set and After Set included in the final office sync payload to demonstrate repair effectiveness.
_Avoid_: Improvement metrics, value deltas

### Domain Terms (Measurement Slots)

**Return Air (RA)**:
Temperature and relative humidity of the air entering the indoor evaporator coil, measured by the device's built-in sensor.
_Avoid_: Indoor Air, Return Temp

**Supply Air (SA)**:
Temperature of the air leaving the indoor evaporator coil, measured by the device's built-in sensor.
_Avoid_: Supply Temp

**Outdoor Ambient (OA)**:
Temperature of the air entering the outdoor condenser coil, measured by the device's built-in sensor.
_Avoid_: Ambient Temp, Outdoor Air

**Discharge Air (DA)**:
Temperature of the air leaving the outdoor condenser fan outlet, measured by the device's built-in sensor.
_Avoid_: Condenser Exhaust

**Suction Line (SL)**:
The low-pressure vapor line on which suction pipe temperature (via clamp probe) and suction saturation temperature (via left rotary encoder) are captured.
_Avoid_: Vapor Line, Suction Side

**Liquid Line (LL)**:
The high-pressure liquid line on which liquid pipe temperature (via clamp probe) and liquid saturation temperature (via right rotary encoder) are captured.
_Avoid_: High Side, Pressure Line

## Relationships

- A **Snapshot** consists of exactly one **Before Set** and exactly one **After Set**.
- A **Before Set** and an **After Set** each consist of six **Data Points** corresponding to the six measurement slots.
- **Return Air**, **Supply Air**, **Outdoor Ambient**, and **Discharge Air** capture data from the built-in sensor.
- **Suction Line** and **Liquid Line** capture temperature from external clamp probes and saturation temperature from their respective **Rotary Encoders**.
- Each **Data Point** updates its corresponding **LED Status**.

## Example dialogue

> **Dev:** "How does the device know which refrigerant to use for the **Suction Line** and **Liquid Line** superheat/subcooling calculations?"
> **Domain expert:** "The device doesn't need to know the refrigerant type. The technician reads the saturation temperature directly from the gauge's printed dial for their specific refrigerant and dials that temperature into the device. The ESP32 then does simple subtraction to find superheat and subcooling."

## Flagged ambiguities

- **Reostat vs. Rotary Encoder**: Resolved to use digital **Rotary Encoders** with integrated push-buttons to prevent ESP32 ADC noise/jitter.
- **Air Temperature Nomenclature**: Standardized on **Return Air (RA)**, **Supply Air (SA)**, **Outdoor Ambient (OA)**, and **Discharge Air (DA)**.
- **Measurement Slots**: Consolidated physical controls to 4 buttons (RA, SA, OA, DA) and 2 rotary encoders (SL, LL) to simplify one-handed glove operation and optimize GPIO pin usage. Pushing an encoder dial captures clamp probe temperature and confirms the dialed saturation temperature.
- **Accelerometer Wake-Up**: Removed. Wake-up is triggered via GPIO interrupt (EXT1) when any of the 4 physical buttons or 2 rotary encoder switches is pressed.
- **Device Form Factor**: Mobile phone is primary for on-person capture, while tablets/desktops are used for secondary administrative workflows.


