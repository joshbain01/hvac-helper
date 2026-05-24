/**
 * @file test-schema.js
 * @brief Script to extract JSON schema from snapshot-schema.md and validate mock payloads.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SCHEMA_PATH = path.join(__dirname, '../docs/snapshot-schema.md');

// 1. Extract JSON schema from Markdown
function extractSchema() {
  const content = fs.readFileSync(SCHEMA_PATH, 'utf-8');
  const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
  if (!jsonMatch) {
    throw new Error("Could not find JSON schema block in snapshot-schema.md");
  }
  return JSON.parse(jsonMatch[1]);
}

// 2. Simple Schema Validator Implementation (checks types, required fields, and EPA entries)
function validatePayload(schema, payload) {
  const errors = [];

  // Check required root fields
  for (const req of schema.required) {
    if (payload[req] === undefined) {
      errors.push(`Missing required root property: ${req}`);
    }
  }

  // Type check core properties
  const properties = schema.properties;
  for (const [key, val] of Object.entries(payload)) {
    const propSchema = properties[key];
    if (!propSchema) continue;

    if (propSchema.type === 'string') {
      if (typeof val !== 'string') {
        errors.push(`Property '${key}' must be a string, got ${typeof val}`);
      }
    } else if (propSchema.type === 'number') {
      if (typeof val !== 'number') {
        errors.push(`Property '${key}' must be a number, got ${typeof val}`);
      }
    } else if (propSchema.type === 'integer') {
      if (!Number.isInteger(val)) {
        errors.push(`Property '${key}' must be an integer, got ${val}`);
      }
    } else if (propSchema.type === 'boolean') {
      if (typeof val !== 'boolean') {
        errors.push(`Property '${key}' must be a boolean, got ${typeof val}`);
      }
    }
  }

  // Validate EPA-specific fields (Initial and Followup status enums)
  const epaStatusFields = ['initial_verification_status', 'followup_verification_status'];
  for (const field of epaStatusFields) {
    if (payload[field] !== undefined) {
      const allowed = properties[field].enum;
      if (!allowed.includes(payload[field])) {
        errors.push(`Property '${field}' must be one of [${allowed.join(', ')}], got '${payload[field]}'`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

// Test cases
try {
  const schema = extractSchema();
  console.log("Successfully extracted JSON schema from markdown specifications.");

  // Mock valid payload containing new EPA compliance fields
  const mockValidPayload = {
    snapshot_id: "8c7f3922-b918-4bf8-aa02-8f19da32ff98",
    schema_version: 1,
    status: "COMPLETED",
    revision: 1,
    technician_id: "77a802b1-0988-4c12-99ab-cf119a0098f4",
    job_id: "JOB-12345",
    customer_id: "CUST-9988",
    refrigerant: "R-410A",
    created_at: "2026-05-24T12:00:00Z",
    updated_at: "2026-05-24T12:30:00Z",
    
    // EPA fields
    technician_epa_license_number: "EPA-608-1234567",
    refrigerant_added_lbs: 3.5,
    refrigerant_recovered_lbs: 0.0,
    recovery_cylinder_id: "CYL-99812",
    leak_inspection_performed: true,
    leak_verification_method: "electronic bubble check",
    initial_verification_status: "PASSED",
    followup_verification_status: "NOT_APPLICABLE"
  };

  // Mock invalid payload with wrong EPA verification status enum
  const mockInvalidPayload = {
    ...mockValidPayload,
    initial_verification_status: "UNKNOWN_STATUS" // Invalid enum option
  };

  console.log("\n--- Running Validation: Valid Mock Snapshot ---");
  const resultValid = validatePayload(schema, mockValidPayload);
  if (resultValid.valid) {
    console.log("SUCCESS: Mock snapshot passed all schema checks.");
  } else {
    console.error("FAIL: Valid mock snapshot failed validation:", resultValid.errors);
    process.exit(1);
  }

  console.log("\n--- Running Validation: Invalid Mock Snapshot ---");
  const resultInvalid = validatePayload(schema, mockInvalidPayload);
  if (!resultInvalid.valid) {
    console.log("SUCCESS: Invalid mock snapshot was successfully rejected. Errors caught:");
    resultInvalid.errors.forEach(err => console.log(`  - ${err}`));
  } else {
    console.error("FAIL: Invalid mock snapshot passed validation unexpectedly.");
    process.exit(1);
  }

  console.log("\nAll schema verification tests passed successfully!");
} catch (err) {
  console.error("Test execution failed:", err.message);
  process.exit(1);
}
