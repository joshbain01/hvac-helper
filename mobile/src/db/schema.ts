import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

/**
 * Snapshots Table
 * Houses core job context, status, and EPA compliance metrics.
 */
export const snapshots = sqliteTable('snapshots', {
  snapshotId: text('snapshot_id').primaryKey(),
  schemaVersion: integer('schema_version').default(1).notNull(),
  status: text('status', { enum: ['DRAFT', 'DIAGNOSTIC_COMPLETE', 'COMPLETED'] }).notNull(),
  revision: integer('revision').default(1).notNull(),
  technicianId: text('technician_id').notNull(),
  jobId: text('job_id').notNull(),
  customerId: text('customer_id').notNull(),
  siteId: text('site_id'),
  deviceId: text('device_id'), // BLE MAC
  refrigerant: text('refrigerant').notNull(),
  
  // EPA Section 608 Compliance fields
  technicianEpaLicenseNumber: text('technician_epa_license_number'),
  refrigerantAddedLbs: real('refrigerant_added_lbs'),
  refrigerantRecoveredLbs: real('refrigerant_recovered_lbs'),
  recoveryCylinderId: text('recovery_cylinder_id'),
  leakInspectionPerformed: integer('leak_inspection_performed', { mode: 'boolean' }),
  leakVerificationMethod: text('leak_verification_method'),
  initialVerificationStatus: text('initial_verification_status', { enum: ['PASSED', 'FAILED', 'NOT_APPLICABLE'] }),
  followupVerificationStatus: text('followup_verification_status', { enum: ['PASSED', 'FAILED', 'NOT_APPLICABLE'] }),

  // Technician notes & metadata
  ocrStatus: text('ocr_status', { enum: ['PENDING', 'OCR_SUCCESS', 'MANUAL_OVERRIDE'] }).default('PENDING').notNull(),
  technicianNotes: text('technician_notes'),
  consumablesItemizedJson: text('consumables_itemized_json'), // Serialized array of products/quantities

  createdAt: text('created_at').notNull(), // ISO8601 UTC
  updatedAt: text('updated_at').notNull(), // ISO8601 UTC
});

/**
 * Equipment Table
 * Linked to a snapshot, stores target system identifiers.
 */
export const equipment = sqliteTable('equipment', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  snapshotId: text('snapshot_id').references(() => snapshots.snapshotId, { onDelete: 'cascade' }).notNull(),
  unitId: text('unit_id'),
  modelNumber: text('model_number').notNull(),
  serialNumber: text('serial_number').notNull(),
  manufacturer: text('manufacturer'),
  equipmentType: text('equipment_type'), // Split system, heat pump, etc.
});

/**
 * Measurement Sets Table
 * Encapsulates before/after capture parameters and firmware-calculated performance metrics.
 */
export const measurementSets = sqliteTable('measurement_sets', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  snapshotId: text('snapshot_id').references(() => snapshots.snapshotId, { onDelete: 'cascade' }).notNull(),
  setType: text('set_type', { enum: ['BEFORE', 'AFTER'] }).notNull(),
  capturedAt: text('captured_at').notNull(),

  // Return Air (RA)
  raTemp: real('ra_temp'),
  raHumidity: real('ra_humidity'),
  raCapturedAt: text('ra_captured_at'),
  raSource: text('ra_source', { enum: ['sensor', 'manual_override'] }),

  // Supply Air (SA)
  saTemp: real('sa_temp'),
  saCapturedAt: text('sa_captured_at'),
  saSource: text('sa_source', { enum: ['sensor', 'manual_override'] }),

  // Outdoor Ambient (OA)
  oaTemp: real('oa_temp'),
  oaCapturedAt: text('oa_captured_at'),
  oaSource: text('oa_source', { enum: ['sensor', 'manual_override'] }),

  // Discharge Air (DA)
  daTemp: real('da_temp'),
  daCapturedAt: text('da_captured_at'),
  daSource: text('da_source', { enum: ['sensor', 'manual_override'] }),

  // Suction Line (SL)
  slPipeTemp: real('sl_pipe_temp'),
  slSatTemp: real('sl_sat_temp'),
  slCapturedAt: text('sl_captured_at'),
  slSource: text('sl_source', { enum: ['sensor', 'manual_override'] }),

  // Liquid Line (LL)
  llPipeTemp: real('ll_pipe_temp'),
  llSatTemp: real('ll_sat_temp'),
  llCapturedAt: text('ll_captured_at'),
  llSource: text('ll_source', { enum: ['sensor', 'manual_override'] }),

  // Thermodynamic Calculations (computed by ESP32 firmware)
  calcEvaporatorDeltaT: real('calc_evaporator_delta_t'),
  calcSuctionSaturationTemp: real('calc_suction_saturation_temp'),
  calcLiquidSaturationTemp: real('calc_liquid_saturation_temp'),
  calcSuperheat: real('calc_superheat'),
  calcSubcooling: real('calc_subcooling'),
});

/**
 * Outbox Sync Queue Table
 * Holds references to finalized snapshots waiting for background upload.
 */
export const outboxQueue = sqliteTable('outbox_queue', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  snapshotId: text('snapshot_id').references(() => snapshots.snapshotId, { onDelete: 'cascade' }).notNull(),
  revision: integer('revision').notNull(),
  attempts: integer('attempts').default(0).notNull(),
  lastAttemptAt: text('last_attempt_at'),
  status: text('status', { enum: ['QUEUED', 'SENDING', 'FAILED'] }).default('QUEUED').notNull(),
  errorMessage: text('error_message'),
  createdAt: text('created_at').notNull(),
});

/**
 * Service Tags Table
 * Stores references to uploaded physical service tags.
 */
export const serviceTags = sqliteTable('service_tags', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  snapshotId: text('snapshot_id').references(() => snapshots.snapshotId, { onDelete: 'cascade' }).notNull(),
  photoUri: text('photo_uri').notNull(),
  capturedAt: text('captured_at').notNull(),
  parsedText: text('parsed_text'),
});

/**
 * Custom Equipment Fields Table
 * Stores dynamic key-value parameters that vary between AC systems.
 */
export const customEquipmentFields = sqliteTable('custom_equipment_fields', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  snapshotId: text('snapshot_id').references(() => snapshots.snapshotId, { onDelete: 'cascade' }).notNull(),
  fieldName: text('field_name').notNull(),
  fieldValue: text('field_value').notNull(),
});
