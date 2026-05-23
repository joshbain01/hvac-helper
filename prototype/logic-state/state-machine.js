// Using local generateUUID function instead of npm uuid package

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export class HvacStateMachine {
  constructor() {
    this.reset();
  }

  reset() {
    this.timeOffsetMinutes = 0;
    this.startTime = new Date('2026-05-23T18:00:00Z');
    
    // Connections & Environment
    this.bleConnected = true;
    this.networkConnected = true;
    this.simulateBleFailures = false;

    // Handheld Device State
    this.device = {
      slots: {
        return_air: { val: null, humidity: null, capturedAt: null, led: 'OFF', oled: 'OFFLINE' },
        supply_air: { val: null, capturedAt: null, led: 'OFF', oled: 'OFFLINE' },
        outdoor_ambient: { val: null, capturedAt: null, led: 'OFF', oled: 'OFFLINE' },
        discharge_air: { val: null, capturedAt: null, led: 'OFF', oled: 'OFFLINE' },
        suction_line: { pipeTemp: null, dialSatTemp: 40.0, capturedAt: null, led: 'OFF', oled: 'OFFLINE' },
        liquid_line: { pipeTemp: null, dialSatTemp: 105.0, capturedAt: null, led: 'OFF', oled: 'OFFLINE' }
      },
      lcd: {
        deltaT: 'N/A',
        superheat: 'N/A',
        subcooling: 'N/A'
      },
      nvsLogs: [] // Persistent logs in Non-Volatile Storage (resets, BLE errors)
    };

    // Mobile App State
    this.activeSet = 'before_set'; // 'before_set' or 'after_set'
    this.db = {
      snapshots: [], // Mock SQLite database
      outbox: []    // Mock persistent outbox
    };
    
    // Cloud Server State
    this.cloudSnapshots = [];

    // Initialize the first draft snapshot
    this.createNewDraft();
  }

  get currentTime() {
    return new Date(this.startTime.getTime() + this.timeOffsetMinutes * 60000);
  }

  createNewDraft(parentSnapshot = null) {
    const newSnapshot = {
      snapshot_id: parentSnapshot ? parentSnapshot.snapshot_id : generateUUID(),
      schema_version: 1,
      status: 'DRAFT',
      revision: parentSnapshot ? parentSnapshot.revision + 1 : 1,
      parent_id: parentSnapshot ? parentSnapshot.id_internal : null,
      technician_id: '8f8702b8-9366-4c74-8b65-bfd92a1012a4',
      job_id: parentSnapshot ? parentSnapshot.job_id : 'JOB-2026-991A',
      customer_id: parentSnapshot ? parentSnapshot.customer_id : 'CUST-8802',
      site_id: 'SITE-012',
      device_id: 'AA:BB:CC:DD:EE:FF',
      refrigerant: parentSnapshot ? parentSnapshot.refrigerant : 'R-410A',
      created_at: this.currentTime.toISOString(),
      updated_at: this.currentTime.toISOString(),
      equipment: parentSnapshot ? { ...parentSnapshot.equipment } : {
        model_number: '',
        serial_number: '',
        manufacturer: '',
        equipment_type: ''
      },
      before_set: parentSnapshot ? this.cloneMeasurementSet(parentSnapshot.before_set) : null,
      after_set: parentSnapshot ? this.cloneMeasurementSet(parentSnapshot.after_set) : null
    };

    // Assign internal unique ID to represent database key
    newSnapshot.id_internal = generateUUID();

    this.currentSnapshot = newSnapshot;
    this.syncDeviceFromDraft();
  }

  cloneMeasurementSet(set) {
    if (!set) return null;
    return JSON.parse(JSON.stringify(set));
  }

  // Set values on device and send via BLE
  captureAirMeasurement(slot, temp, humidity = null) {
    const slotState = this.device.slots[slot];
    slotState.capturedAt = this.currentTime.toISOString();

    // Start BLE Transmission simulation
    slotState.led = 'AMBER_PULSE';
    slotState.oled = 'TX...';

    // BLE transmission logic
    const success = this.transmitDataPoint(slot, {
      temp: parseFloat(temp.toFixed(1)),
      ...(humidity !== null ? { humidity: parseFloat(humidity.toFixed(1)) } : {})
    });

    if (success) {
      slotState.led = 'GREEN_SOLID';
      slotState.val = parseFloat(temp.toFixed(1));
      if (humidity !== null) slotState.humidity = parseFloat(humidity.toFixed(1));
      slotState.oled = `OK ${temp.toFixed(1)}°F`;
      this.recalculateDeviceMetrics();
    } else {
      slotState.led = 'RED_FLASH';
      slotState.oled = 'FAIL';
      this.device.nvsLogs.push({
        timestamp: this.currentTime.toISOString(),
        event: 'BLE_TX_FAILED',
        details: `Slot: ${slot}, retries: 3`
      });
    }

    this.currentSnapshot.updated_at = this.currentTime.toISOString();
  }

  capturePipeMeasurement(slot, pipeTemp) {
    const slotState = this.device.slots[slot];
    slotState.capturedAt = this.currentTime.toISOString();
    
    slotState.led = 'AMBER_PULSE';
    slotState.oled = 'TX...';

    const success = this.transmitDataPoint(slot, {
      pipe_temp: parseFloat(pipeTemp.toFixed(1)),
      dial_sat_temp: parseFloat(slotState.dialSatTemp.toFixed(1))
    });

    if (success) {
      slotState.led = 'GREEN_SOLID';
      slotState.pipeTemp = parseFloat(pipeTemp.toFixed(1));
      slotState.oled = `OK P:${pipeTemp.toFixed(1)} S:${slotState.dialSatTemp.toFixed(1)}`;
      this.recalculateDeviceMetrics();
    } else {
      slotState.led = 'RED_FLASH';
      slotState.oled = 'FAIL';
      this.device.nvsLogs.push({
        timestamp: this.currentTime.toISOString(),
        event: 'BLE_TX_FAILED',
        details: `Slot: ${slot}, retries: 3`
      });
    }

    this.currentSnapshot.updated_at = this.currentTime.toISOString();
  }

  dialSaturation(slot, temp) {
    const slotState = this.device.slots[slot];
    slotState.dialSatTemp = parseFloat(temp.toFixed(1));
    if (slotState.pipeTemp !== null) {
      // Re-trigger transmission to sync new dial temp
      this.capturePipeMeasurement(slot, slotState.pipeTemp);
    } else {
      slotState.oled = `DIAL ${slotState.dialSatTemp.toFixed(1)}°F`;
    }
  }

  transmitDataPoint(slot, data) {
    if (!this.bleConnected || this.simulateBleFailures) {
      return false;
    }

    // Save to App Snapshot Draft
    const setKey = this.activeSet;
    if (!this.currentSnapshot[setKey]) {
      this.currentSnapshot[setKey] = {
        captured_at: this.currentTime.toISOString()
      };
    }

    const set = this.currentSnapshot[setKey];
    set.captured_at = this.currentTime.toISOString();

    if (slot === 'return_air') {
      set.return_air = {
        temp: data.temp,
        humidity: data.humidity,
        captured_at: this.currentTime.toISOString(),
        source: 'sensor'
      };
    } else if (slot === 'supply_air') {
      set.supply_air = {
        temp: data.temp,
        captured_at: this.currentTime.toISOString(),
        source: 'sensor'
      };
    } else if (slot === 'outdoor_ambient') {
      set.outdoor_ambient = {
        temp: data.temp,
        captured_at: this.currentTime.toISOString(),
        source: 'sensor'
      };
    } else if (slot === 'discharge_air') {
      set.discharge_air = {
        temp: data.temp,
        captured_at: this.currentTime.toISOString(),
        source: 'sensor'
      };
    } else if (slot === 'suction_line') {
      set.suction_line = {
        pipe_temp: data.pipe_temp,
        captured_at: this.currentTime.toISOString(),
        source: 'sensor'
      };
      // calculations are stored in snapshot too
      this.recalculateSnapshotMetrics(set);
    } else if (slot === 'liquid_line') {
      set.liquid_line = {
        pipe_temp: data.pipe_temp,
        captured_at: this.currentTime.toISOString(),
        source: 'sensor'
      };
      // calculations are stored in snapshot too
      this.recalculateSnapshotMetrics(set);
    }

    this.recalculateSnapshotMetrics(set);
    return true;
  }

  recalculateDeviceMetrics() {
    const slots = this.device.slots;
    
    // Evaporator Delta T
    if (slots.return_air.val !== null && slots.supply_air.val !== null) {
      const dt = slots.return_air.val - slots.supply_air.val;
      this.device.lcd.deltaT = `${dt.toFixed(1)} °F`;
    } else {
      this.device.lcd.deltaT = 'N/A';
    }

    // Superheat
    if (slots.suction_line.pipeTemp !== null) {
      const sh = slots.suction_line.pipeTemp - slots.suction_line.dialSatTemp;
      this.device.lcd.superheat = `${sh.toFixed(1)} °F`;
    } else {
      this.device.lcd.superheat = 'N/A';
    }

    // Subcooling
    if (slots.liquid_line.pipeTemp !== null) {
      const sc = slots.liquid_line.dialSatTemp - slots.liquid_line.pipeTemp;
      this.device.lcd.subcooling = `${sc.toFixed(1)} °F`;
    } else {
      this.device.lcd.subcooling = 'N/A';
    }
  }

  recalculateSnapshotMetrics(set) {
    if (!set) return;

    const hasDeltaT = set.return_air && set.supply_air;
    const hasSH = set.suction_line;
    const hasSC = set.liquid_line;

    if (!set.calculations) {
      set.calculations = {};
    }

    if (hasDeltaT) {
      set.calculations.evaporator_delta_t = parseFloat((set.return_air.temp - set.supply_air.temp).toFixed(1));
    }
    
    if (hasSH) {
      const dialTemp = this.device.slots.suction_line.dialSatTemp;
      set.calculations.suction_saturation_temp = dialTemp;
      set.calculations.superheat = parseFloat((set.suction_line.pipe_temp - dialTemp).toFixed(1));
    }

    if (hasSC) {
      const dialTemp = this.device.slots.liquid_line.dialSatTemp;
      set.calculations.liquid_saturation_temp = dialTemp;
      set.calculations.subcooling = parseFloat((dialTemp - set.liquid_line.pipe_temp).toFixed(1));
    }
  }

  // Load physical device screen/LED states from the active set of current draft snapshot
  syncDeviceFromDraft() {
    const setKey = this.activeSet;
    const set = this.currentSnapshot[setKey];

    const resetSlot = (slot) => {
      this.device.slots[slot].val = null;
      this.device.slots[slot].humidity = null;
      this.device.slots[slot].pipeTemp = null;
      this.device.slots[slot].capturedAt = null;
      this.device.slots[slot].led = 'OFF';
      this.device.slots[slot].oled = 'NO DATA';
    };

    if (!set) {
      Object.keys(this.device.slots).forEach(resetSlot);
      this.recalculateDeviceMetrics();
      return;
    }

    // Return Air
    if (set.return_air) {
      this.device.slots.return_air.val = set.return_air.temp;
      this.device.slots.return_air.humidity = set.return_air.humidity;
      this.device.slots.return_air.capturedAt = set.return_air.captured_at;
      this.device.slots.return_air.led = 'GREEN_SOLID';
      this.device.slots.return_air.oled = `OK ${set.return_air.temp.toFixed(1)}°F`;
    } else {
      resetSlot('return_air');
    }

    // Supply Air
    if (set.supply_air) {
      this.device.slots.supply_air.val = set.supply_air.temp;
      this.device.slots.supply_air.capturedAt = set.supply_air.captured_at;
      this.device.slots.supply_air.led = 'GREEN_SOLID';
      this.device.slots.supply_air.oled = `OK ${set.supply_air.temp.toFixed(1)}°F`;
    } else {
      resetSlot('supply_air');
    }

    // Outdoor Ambient
    if (set.outdoor_ambient) {
      this.device.slots.outdoor_ambient.val = set.outdoor_ambient.temp;
      this.device.slots.outdoor_ambient.capturedAt = set.outdoor_ambient.captured_at;
      this.device.slots.outdoor_ambient.led = 'GREEN_SOLID';
      this.device.slots.outdoor_ambient.oled = `OK ${set.outdoor_ambient.temp.toFixed(1)}°F`;
    } else {
      resetSlot('outdoor_ambient');
    }

    // Discharge Air
    if (set.discharge_air) {
      this.device.slots.discharge_air.val = set.discharge_air.temp;
      this.device.slots.discharge_air.capturedAt = set.discharge_air.captured_at;
      this.device.slots.discharge_air.led = 'GREEN_SOLID';
      this.device.slots.discharge_air.oled = `OK ${set.discharge_air.temp.toFixed(1)}°F`;
    } else {
      resetSlot('discharge_air');
    }

    // Suction Line
    if (set.suction_line) {
      this.device.slots.suction_line.pipeTemp = set.suction_line.pipe_temp;
      this.device.slots.suction_line.capturedAt = set.suction_line.captured_at;
      if (set.calculations && set.calculations.suction_saturation_temp !== undefined) {
        this.device.slots.suction_line.dialSatTemp = set.calculations.suction_saturation_temp;
      }
      this.device.slots.suction_line.led = 'GREEN_SOLID';
      this.device.slots.suction_line.oled = `OK P:${set.suction_line.pipe_temp.toFixed(1)} S:${this.device.slots.suction_line.dialSatTemp.toFixed(1)}`;
    } else {
      resetSlot('suction_line');
    }

    // Liquid Line
    if (set.liquid_line) {
      this.device.slots.liquid_line.pipeTemp = set.liquid_line.pipe_temp;
      this.device.slots.liquid_line.capturedAt = set.liquid_line.captured_at;
      if (set.calculations && set.calculations.liquid_saturation_temp !== undefined) {
        this.device.slots.liquid_line.dialSatTemp = set.calculations.liquid_saturation_temp;
      }
      this.device.slots.liquid_line.led = 'GREEN_SOLID';
      this.device.slots.liquid_line.oled = `OK P:${set.liquid_line.pipe_temp.toFixed(1)} S:${this.device.slots.liquid_line.dialSatTemp.toFixed(1)}`;
    } else {
      resetSlot('liquid_line');
    }

    this.recalculateDeviceMetrics();
  }

  // Simulation time tick and individual point expiration check
  tickTime(minutes) {
    this.timeOffsetMinutes += minutes;
    const nowStr = this.currentTime.toISOString();
    
    // Check for expiration in current draft snapshot
    if (this.currentSnapshot && this.currentSnapshot.status === 'DRAFT') {
      const before = this.currentSnapshot.before_set;
      const after = this.currentSnapshot.after_set;

      const checkAndExpire = (set, slotName) => {
        if (!set || !set[slotName]) return;
        const capturedAt = new Date(set[slotName].captured_at);
        const diffMs = this.currentTime.getTime() - capturedAt.getTime();
        const diffMins = diffMs / 60000;

        if (diffMins > 20) {
          // Expired! Remove this data point
          delete set[slotName];
          this.device.nvsLogs.push({
            timestamp: nowStr,
            event: 'POINT_EXPIRED',
            details: `Set: ${set === before ? 'before' : 'after'}, slot: ${slotName}`
          });
        }
      };

      const slots = ['return_air', 'supply_air', 'outdoor_ambient', 'discharge_air', 'suction_line', 'liquid_line'];
      slots.forEach(slot => {
        checkAndExpire(before, slot);
        checkAndExpire(after, slot);
      });

      // Recalculate if anything changed
      if (before) this.recalculateSnapshotMetrics(before);
      if (after) this.recalculateSnapshotMetrics(after);

      // Sync physical display values from current state
      this.syncDeviceFromDraft();
    }
  }

  // Validate the active snapshot
  validateSnapshot() {
    const s = this.currentSnapshot;
    
    // Check if equipment is set
    if (!s.equipment || !s.equipment.model_number || !s.equipment.serial_number) {
      return { valid: false, reason: 'Equipment Model/Serial numbers are required.' };
    }

    const isSetComplete = (set) => {
      if (!set) return false;
      return (
        set.return_air &&
        set.supply_air &&
        set.outdoor_ambient &&
        set.discharge_air &&
        set.suction_line &&
        set.liquid_line
      );
    };

    const beforeComplete = isSetComplete(s.before_set);
    const afterComplete = isSetComplete(s.after_set);

    if (beforeComplete && afterComplete) {
      s.status = 'COMPLETED';
      return { valid: true, status: 'COMPLETED' };
    } else if (beforeComplete && !s.after_set) {
      s.status = 'DIAGNOSTIC_COMPLETE';
      return { valid: true, status: 'DIAGNOSTIC_COMPLETE' };
    } else {
      let missing = [];
      if (!beforeComplete) missing.push('Before Set (needs all 6 sensors)');
      if (s.after_set && !afterComplete) missing.push('After Set (partially filled but incomplete)');
      return { 
        valid: false, 
        reason: `Cannot finalize. Missing: ${missing.join(', ')}.` 
      };
    }
  }

  // Finalize Snapshot -> Immutable in SQLite, queue in Outbox
  finalizeSnapshot() {
    if (this.currentSnapshot.status !== 'DRAFT') {
      return { success: false, reason: 'Current snapshot is already finalized.' };
    }

    const validation = this.validateSnapshot();
    if (!validation.valid) {
      return { success: false, reason: validation.reason };
    }

    this.currentSnapshot.updated_at = this.currentTime.toISOString();
    
    // Save to local database (mock SQLite list)
    this.db.snapshots.push(this.currentSnapshot);

    // Queue in Outbox for sync
    this.db.outbox.push({
      snapshot_id: this.currentSnapshot.snapshot_id,
      id_internal: this.currentSnapshot.id_internal,
      revision: this.currentSnapshot.revision,
      payload: JSON.parse(JSON.stringify(this.currentSnapshot))
    });

    const finalizedSnap = this.currentSnapshot;

    // Reset device displays to OFFLINE since transaction is completed
    Object.keys(this.device.slots).forEach(slot => {
      this.device.slots[slot].val = null;
      this.device.slots[slot].pipeTemp = null;
      this.device.slots[slot].led = 'OFF';
      this.device.slots[slot].oled = 'OFFLINE';
    });
    this.recalculateDeviceMetrics();

    // The active draft is now locked. Create a placeholder to let the user review or create revision.
    this.currentSnapshot = null;

    return { 
      success: true, 
      status: finalizedSnap.status,
      snapshot_id: finalizedSnap.snapshot_id,
      revision: finalizedSnap.revision 
    };
  }

  // Trigger sync of outbox to cloud server
  syncOutbox() {
    if (!this.networkConnected) {
      return { success: false, reason: 'No internet connection. Synced failed.' };
    }

    if (this.db.outbox.length === 0) {
      return { success: true, count: 0, message: 'Outbox is empty.' };
    }

    // Sync all in outbox
    const syncCount = this.db.outbox.length;
    
    // Move to cloud server list
    this.db.outbox.forEach(item => {
      // Handle idempotency: if already on cloud, replace it (update)
      const existingIdx = this.cloudSnapshots.findIndex(s => s.snapshot_id === item.snapshot_id && s.revision === item.revision);
      if (existingIdx !== -1) {
        this.cloudSnapshots[existingIdx] = item.payload;
      } else {
        this.cloudSnapshots.push(item.payload);
      }
    });

    // Clear outbox
    this.db.outbox = [];

    return { success: true, count: syncCount };
  }

  // Create revision of a previously finalized snapshot
  createRevisionOf(snapshotId) {
    // Find latest snapshot with this ID in local db
    const matches = this.db.snapshots.filter(s => s.snapshot_id === snapshotId);
    if (matches.length === 0) {
      return { success: false, reason: 'Snapshot not found in local database.' };
    }

    // Sort by revision descending
    matches.sort((a, b) => b.revision - a.revision);
    const latest = matches[0];

    // Create new draft cloning this one
    this.createNewDraft(latest);
    this.currentSnapshot.status = 'DRAFT';
    this.activeSet = 'after_set'; // Focus after set since they are updating it
    this.syncDeviceFromDraft();

    return { success: true, revision: this.currentSnapshot.revision };
  }

  // Toggle active set
  toggleActiveSet() {
    this.activeSet = this.activeSet === 'before_set' ? 'after_set' : 'before_set';
    if (this.currentSnapshot) {
      this.syncDeviceFromDraft();
    }
  }

  // Update equipment info (Mock Photo OCR nameplate capture)
  mockPhotoCapture(model, serial, manufacturer = 'Carrier', type = 'Split AC Condenser') {
    if (!this.currentSnapshot) {
      return { success: false, reason: 'No active draft snapshot to edit.' };
    }
    this.currentSnapshot.equipment = {
      model_number: model,
      serial_number: serial,
      manufacturer: manufacturer,
      equipment_type: type
    };
    this.currentSnapshot.updated_at = this.currentTime.toISOString();
    return { success: true };
  }

  // Update notes & consumables (Mock LLM interaction)
  mockNotesExpansion(notesText, consumablesArray = []) {
    if (!this.currentSnapshot) {
      return { success: false, reason: 'No active draft snapshot.' };
    }
    this.currentSnapshot.technician_notes = notesText;
    this.currentSnapshot.consumables = consumablesArray;
    this.currentSnapshot.updated_at = this.currentTime.toISOString();
    return { success: true };
  }
}
