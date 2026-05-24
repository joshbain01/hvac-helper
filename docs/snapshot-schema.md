# HVAC Helper Pro: Snapshot Schema Specification

This document defines the canonical data structure for the **Snapshot**, the central data object of the HVAC Helper Pro system. 

The Snapshot is captured by the handheld troubleshooting device, synchronized to the mobile application, and sent to the cloud backend.

---

## 1. Domain Design & Rules

### A. Measurement Units & Precision
* **Temperature**: Represented in Fahrenheit (`°F`) as a decimal number with exactly one decimal place of precision (enforced via `multipleOf: 0.1`, e.g., `72.5`). 
* **Humidity**: Represented as a percentage (`%RH`) from `0.0` to `100.0` with up to one decimal place of precision.
* **Calculations**: Calculated on-device by the ESP32 firmware and transmitted in the payload. The phone app displays these values but does not compute them. These include:
  * **Evaporator Delta T** ($\Delta T$)
  * **Suction Saturation Temperature** (derived from local PT tables)
  * **Liquid Saturation Temperature** (derived from local PT tables)
  * **Superheat**
  * **Subcooling**

### B. Refrigerant Extensibility
* The refrigerant field is a top-level field (cannot vary between Before and After sets).
* It is represented as a string. Supported defaults include `R-410A` and `R-22`.
* The field is open-ended (no strict enum validator in the core schema) to allow the mobile app and backend to accept new refrigerants added to the ESP32 via OTA updates as government regulations change.

### C. Lifecycle & Completeness States
* **Status Enum**:
  * `DRAFT`: A snapshot in progress. Some data points or sets may be missing or partially populated.
  * `DIAGNOSTIC_COMPLETE`: A snapshot submitted with a fully captured `before_set` but no `after_set` (diagnostic-only service call).
  * `COMPLETED`: A snapshot submitted with both `before_set` and `after_set` fully captured.
* **Conditional Validation**:
  * If status is `DRAFT`, properties within the measurement sets are optional to allow incremental synchronization.
  * If status is `DIAGNOSTIC_COMPLETE`, the `before_set` and `equipment` objects are required, and the `before_set` must contain all 6 completed measurements plus device calculations.
  * If status is `COMPLETED`, both `before_set` and `after_set` are required, and both must contain all 6 completed measurements plus device calculations.
* **Individual Point Expiration**:
  * The timeout window is configurable in the mobile app.
  * If the window is exceeded, only the individual measurements that have expired (determined by comparing their `captured_at` timestamp to the current time) are discarded locally. Valid measurements are retained.

---

## 2. JSON Schema (Draft 2020-12)

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "HVAC_Snapshot",
  "description": "The central data record containing technician, job, equipment, and before/after sensor measurement sets.",
  "type": "object",
  "required": [
    "snapshot_id",
    "schema_version",
    "status",
    "revision",
    "technician_id",
    "job_id",
    "customer_id",
    "refrigerant",
    "created_at",
    "updated_at"
  ],
  "properties": {
    "snapshot_id": {
      "type": "string",
      "format": "uuid",
      "description": "Client-generated unique ID for idempotency."
    },
    "schema_version": {
      "type": "integer",
      "const": 1,
      "description": "Integer representation of the schema version."
    },
    "status": {
      "type": "string",
      "enum": ["DRAFT", "DIAGNOSTIC_COMPLETE", "COMPLETED"],
      "description": "The current lifecycle state of the snapshot."
    },
    "revision": {
      "type": "integer",
      "minimum": 1,
      "description": "Increments every time the snapshot is updated in the mobile app."
    },
    "technician_id": {
      "type": "string",
      "format": "uuid",
      "description": "UUID of the technician capturing the data. Derived from the technician's auth session."
    },
    "job_id": {
      "type": "string",
      "description": "Identifier for the dispatch job or service ticket."
    },
    "customer_id": {
      "type": "string",
      "description": "CRM customer identifier. Resolved via job details."
    },
    "site_id": {
      "type": "string",
      "description": "Optional physical site/location identifier."
    },
    "device_id": {
      "type": "string",
      "description": "Hardware identifier (BLE MAC address or serial) of the handheld device."
    },
    "refrigerant": {
      "type": "string",
      "description": "Refrigerant type. Extensible string (e.g., 'R-410A', 'R-22')."
    },
    "technician_epa_license_number": {
      "type": "string",
      "description": "EPA Section 608 universal or specific certification license number."
    },
    "refrigerant_added_lbs": {
      "type": "number",
      "minimum": 0.0,
      "description": "Quantity of refrigerant added to the system in pounds."
    },
    "refrigerant_recovered_lbs": {
      "type": "number",
      "minimum": 0.0,
      "description": "Quantity of refrigerant recovered from the system in pounds."
    },
    "recovery_cylinder_id": {
      "type": "string",
      "description": "DOT recovery cylinder serial number or ID."
    },
    "leak_inspection_performed": {
      "type": "boolean",
      "description": "Indicates if a leak inspection was conducted on the system."
    },
    "leak_verification_method": {
      "type": "string",
      "description": "Method used for leak verification (e.g., electronic, bubble, pressure test)."
    },
    "initial_verification_status": {
      "type": "string",
      "enum": ["PASSED", "FAILED", "NOT_APPLICABLE"],
      "description": "Status of the initial leak verification test."
    },
    "followup_verification_status": {
      "type": "string",
      "enum": ["PASSED", "FAILED", "NOT_APPLICABLE"],
      "description": "Status of the follow-up leak verification test."
    },
    "created_at": {
      "type": "string",
      "format": "date-time",
      "description": "ISO 8601 UTC timestamp of snapshot initialization."
    },
    "updated_at": {
      "type": "string",
      "format": "date-time",
      "description": "ISO 8601 UTC timestamp of last modification."
    },
    "equipment": {
      "type": "object",
      "required": ["model_number", "serial_number"],
      "properties": {
        "unit_id": {
          "type": "string",
          "description": "Database key of the equipment if known."
        },
        "model_number": {
          "type": "string",
          "description": "Extracted via Photo Capture OCR or manual input."
        },
        "serial_number": {
          "type": "string",
          "description": "Extracted via Photo Capture OCR or manual input."
        },
        "manufacturer": {
          "type": "string"
        },
        "equipment_type": {
          "type": "string",
          "description": "E.g., Heat Pump, Split AC System."
        }
      }
    },
    "before_set": {
      "$ref": "#/$defs/draft_measurement_set"
    },
    "after_set": {
      "$ref": "#/$defs/draft_measurement_set"
    },
    "service_tags": {
      "type": "array",
      "items": {
        "$ref": "#/$defs/service_tag_item"
      }
    },
    "custom_equipment_fields": {
      "type": "array",
      "items": {
        "$ref": "#/$defs/custom_equipment_field_item"
      }
    }
  },
  "allOf": [
    {
      "if": {
        "properties": { "status": { "const": "COMPLETED" } }
      },
      "then": {
        "required": ["before_set", "after_set", "equipment"],
        "properties": {
          "before_set": { "$ref": "#/$defs/complete_measurement_set" },
          "after_set": { "$ref": "#/$defs/complete_measurement_set" }
        }
      }
    },
    {
      "if": {
        "properties": { "status": { "const": "DIAGNOSTIC_COMPLETE" } }
      },
      "then": {
        "required": ["before_set", "equipment"],
        "properties": {
          "before_set": { "$ref": "#/$defs/complete_measurement_set" }
        }
      }
    }
  ],
  "$defs": {
    "draft_measurement_set": {
      "type": "object",
      "properties": {
        "captured_at": {
          "type": "string",
          "format": "date-time"
        },
        "return_air": {
          "type": "object",
          "required": ["temp", "humidity", "captured_at", "source"],
          "properties": {
            "temp": { "$ref": "#/$defs/temp_point" },
            "humidity": { "$ref": "#/$defs/humidity_point" },
            "captured_at": { "type": "string", "format": "date-time" },
            "source": { "$ref": "#/$defs/source_type" }
          }
        },
        "supply_air": {
          "type": "object",
          "required": ["temp", "captured_at", "source"],
          "properties": {
            "temp": { "$ref": "#/$defs/temp_point" },
            "captured_at": { "type": "string", "format": "date-time" },
            "source": { "$ref": "#/$defs/source_type" }
          }
        },
        "outdoor_ambient": {
          "type": "object",
          "required": ["temp", "captured_at", "source"],
          "properties": {
            "temp": { "$ref": "#/$defs/temp_point" },
            "captured_at": { "type": "string", "format": "date-time" },
            "source": { "$ref": "#/$defs/source_type" }
          }
        },
        "discharge_air": {
          "type": "object",
          "required": ["temp", "captured_at", "source"],
          "properties": {
            "temp": { "$ref": "#/$defs/temp_point" },
            "captured_at": { "type": "string", "format": "date-time" },
            "source": { "$ref": "#/$defs/source_type" }
          }
        },
        "suction_line": {
          "type": "object",
          "required": ["pipe_temp", "captured_at", "source"],
          "properties": {
            "pipe_temp": { "$ref": "#/$defs/temp_point" },
            "captured_at": { "type": "string", "format": "date-time" },
            "source": { "$ref": "#/$defs/source_type" }
          }
        },
        "liquid_line": {
          "type": "object",
          "required": ["pipe_temp", "captured_at", "source"],
          "properties": {
            "pipe_temp": { "$ref": "#/$defs/temp_point" },
            "captured_at": { "type": "string", "format": "date-time" },
            "source": { "$ref": "#/$defs/source_type" }
          }
        },
        "calculations": {
          "$ref": "#/$defs/calculations_set"
        }
      }
    },
    "complete_measurement_set": {
      "allOf": [
        { "$ref": "#/$defs/draft_measurement_set" }
      ],
      "required": [
        "captured_at",
        "return_air",
        "supply_air",
        "outdoor_ambient",
        "discharge_air",
        "suction_line",
        "liquid_line",
        "calculations"
      ]
    },
    "calculations_set": {
      "type": "object",
      "required": [
        "evaporator_delta_t",
        "suction_saturation_temp",
        "liquid_saturation_temp",
        "superheat",
        "subcooling"
      ],
      "properties": {
        "evaporator_delta_t": {
          "type": "number",
          "multipleOf": 0.1,
          "description": "RA temp - SA temp. Enforced one decimal precision."
        },
        "suction_saturation_temp": {
          "type": "number",
          "multipleOf": 0.1,
          "description": "Saturation temperature of suction line based on PT table. Enforced one decimal precision."
        },
        "liquid_saturation_temp": {
          "type": "number",
          "multipleOf": 0.1,
          "description": "Saturation temperature of liquid line based on PT table. Enforced one decimal precision."
        },
        "superheat": {
          "type": "number",
          "multipleOf": 0.1,
          "description": "Suction pipe temp - Suction Saturation temp. Enforced one decimal precision."
        },
        "subcooling": {
          "type": "number",
          "multipleOf": 0.1,
          "description": "Liquid Saturation temp - Liquid pipe temp. Enforced one decimal precision."
        }
      }
    },
    "temp_point": {
      "type": "number",
      "minimum": -40.0,
      "maximum": 200.0,
      "multipleOf": 0.1,
      "description": "Temperature in Fahrenheit. Exact one decimal precision."
    },
    "humidity_point": {
      "type": "number",
      "minimum": 0.0,
      "maximum": 100.0,
      "multipleOf": 0.1,
      "description": "Relative humidity percentage."
    },
    "source_type": {
      "type": "string",
      "enum": ["sensor", "manual_override"]
    },
    "service_tag_item": {
      "type": "object",
      "required": ["photo_uri", "captured_at", "captured_by"],
      "properties": {
        "photo_uri": {
          "type": "string",
          "description": "Local URI or cloud URL of the service tag photo."
        },
        "captured_at": {
          "type": "string",
          "format": "date-time",
          "description": "ISO 8601 UTC timestamp of tag photo capture."
        },
        "captured_by": {
          "type": "string",
          "description": "Technician ID who captured the service tag photo."
        },
        "parsed_text": {
          "type": "string"
        }
      }
    },
    "custom_equipment_field_item": {
      "type": "object",
      "required": ["field_name", "field_value"],
      "properties": {
        "field_name": {
          "type": "string"
        },
        "field_value": {
          "type": "string"
        }
      }
    }
  }
}
```

---

## 3. Example Payload: Complete Snapshot (`status: COMPLETED`)

```json
{
  "snapshot_id": "4b725c89-2917-48f8-b391-4c125df8e4d2",
  "schema_version": 1,
  "status": "COMPLETED",
  "revision": 2,
  "technician_id": "8f8702b8-9366-4c74-8b65-bfd92a1012a4",
  "job_id": "JOB-99281-2026",
  "customer_id": "CUST-77491",
  "site_id": "SITE-0012",
  "device_id": "AA:BB:CC:DD:EE:FF",
  "refrigerant": "R-410A",
  "created_at": "2026-05-22T14:10:00Z",
  "updated_at": "2026-05-22T14:35:12Z",
  "equipment": {
    "unit_id": "EQ-88371",
    "model_number": "GSXC160361",
    "serial_number": "1608298711",
    "manufacturer": "Goodman",
    "equipment_type": "Split AC Condenser"
  },
  "before_set": {
    "captured_at": "2026-05-22T14:15:30Z",
    "return_air": {
      "temp": 76.2,
      "humidity": 55.4,
      "captured_at": "2026-05-22T14:10:15Z",
      "source": "sensor"
    },
    "supply_air": {
      "temp": 64.8,
      "captured_at": "2026-05-22T14:11:02Z",
      "source": "sensor"
    },
    "outdoor_ambient": {
      "temp": 91.5,
      "captured_at": "2026-05-22T14:12:20Z",
      "source": "sensor"
    },
    "discharge_air": {
      "temp": 105.1,
      "captured_at": "2026-05-22T14:12:45Z",
      "source": "sensor"
    },
    "suction_line": {
      "pipe_temp": 58.0,
      "captured_at": "2026-05-22T14:14:10Z",
      "source": "sensor"
    },
    "liquid_line": {
      "pipe_temp": 88.0,
      "captured_at": "2026-05-22T14:15:30Z",
      "source": "sensor"
    },
    "calculations": {
      "evaporator_delta_t": 11.4,
      "suction_saturation_temp": 40.0,
      "liquid_saturation_temp": 105.0,
      "superheat": 18.0,
      "subcooling": 17.0
    }
  },
  "after_set": {
    "captured_at": "2026-05-22T14:34:00Z",
    "return_air": {
      "temp": 75.0,
      "humidity": 48.2,
      "captured_at": "2026-05-22T14:30:10Z",
      "source": "sensor"
    },
    "supply_air": {
      "temp": 55.2,
      "captured_at": "2026-05-22T14:30:50Z",
      "source": "sensor"
    },
    "outdoor_ambient": {
      "temp": 91.8,
      "captured_at": "2026-05-22T14:32:00Z",
      "source": "sensor"
    },
    "discharge_air": {
      "temp": 108.5,
      "captured_at": "2026-05-22T14:32:15Z",
      "source": "sensor"
    },
    "suction_line": {
      "pipe_temp": 49.5,
      "captured_at": "2026-05-22T14:33:10Z",
      "source": "sensor"
    },
    "liquid_line": {
      "pipe_temp": 95.0,
      "captured_at": "2026-05-22T14:34:00Z",
      "source": "sensor"
    },
    "calculations": {
      "evaporator_delta_t": 19.8,
      "suction_saturation_temp": 43.0,
      "liquid_saturation_temp": 101.0,
      "superheat": 6.5,
      "subcooling": 6.0
    }
  },
  "service_tags": [
    {
      "photo_uri": "ph://assets-library/id=1002-3929-1",
      "captured_at": "2026-05-22T14:12:00Z",
      "captured_by": "8f8702b8-9366-4c74-8b65-bfd92a1012a4",
      "parsed_text": "Goodman MFG CO MODEL: GSXC160361 SERIAL: 1608298711"
    }
  ],
  "custom_equipment_fields": [
    {
      "field_name": "Tonnage",
      "field_value": "3.0 Ton"
    },
    {
      "field_name": "SEER",
      "field_value": "16 SEER"
    }
  ]
}
```

---

## 4. Example Payload: Diagnostic Complete (`status: DIAGNOSTIC_COMPLETE`)

```json
{
  "snapshot_id": "9d817b12-1102-4d2b-aa90-b18cc625a1ff",
  "schema_version": 1,
  "status": "DIAGNOSTIC_COMPLETE",
  "revision": 1,
  "technician_id": "8f8702b8-9366-4c74-8b65-bfd92a1012a4",
  "job_id": "JOB-99282-2026",
  "customer_id": "CUST-10492",
  "site_id": "SITE-0012",
  "device_id": "AA:BB:CC:DD:EE:FF",
  "refrigerant": "R-22",
  "created_at": "2026-05-22T15:00:00Z",
  "updated_at": "2026-05-22T15:16:40Z",
  "equipment": {
    "unit_id": "EQ-44910",
    "model_number": "MCH4321A",
    "serial_number": "887102941",
    "manufacturer": "Carrier",
    "equipment_type": "Split AC Condenser"
  },
  "before_set": {
    "captured_at": "2026-05-22T15:15:00Z",
    "return_air": {
      "temp": 78.0,
      "humidity": 62.0,
      "captured_at": "2026-05-22T15:01:00Z",
      "source": "sensor"
    },
    "supply_air": {
      "temp": 68.5,
      "captured_at": "2026-05-22T15:02:10Z",
      "source": "sensor"
    },
    "outdoor_ambient": {
      "temp": 95.0,
      "captured_at": "2026-05-22T15:04:00Z",
      "source": "sensor"
    },
    "discharge_air": {
      "temp": 110.0,
      "captured_at": "2026-05-22T15:04:30Z",
      "source": "sensor"
    },
    "suction_line": {
      "pipe_temp": 62.0,
      "captured_at": "2026-05-22T15:10:00Z",
      "source": "sensor"
    },
    "liquid_line": {
      "pipe_temp": 102.0,
      "captured_at": "2026-05-22T15:15:00Z",
      "source": "sensor"
    },
    "calculations": {
      "evaporator_delta_t": 9.5,
      "suction_saturation_temp": 45.0,
      "liquid_saturation_temp": 110.0,
      "superheat": 17.0,
      "subcooling": 8.0
    }
  }
}
```

---

## 5. Example Payload: Active Draft (`status: DRAFT`)
Shows a snapshot with incomplete measurements in the before set during active capture.

```json
{
  "snapshot_id": "c0e9b921-872b-4221-88aa-fc9d102919aa",
  "schema_version": 1,
  "status": "DRAFT",
  "revision": 1,
  "technician_id": "8f8702b8-9366-4c74-8b65-bfd92a1012a4",
  "job_id": "JOB-99283-2026",
  "customer_id": "CUST-88301",
  "refrigerant": "R-410A",
  "created_at": "2026-05-22T16:00:00Z",
  "updated_at": "2026-05-22T16:01:30Z",
  "before_set": {
    "captured_at": "2026-05-22T16:01:30Z",
    "return_air": {
      "temp": 74.5,
      "humidity": 50.0,
      "captured_at": "2026-05-22T16:00:15Z",
      "source": "sensor"
    },
    "supply_air": {
      "temp": 62.0,
      "captured_at": "2026-05-22T16:01:30Z",
      "source": "sensor"
    }
  }
}
```
