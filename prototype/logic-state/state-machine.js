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
    this.timeoutDurationMinutes = 20;

    // Handheld Device State
    this.device = {
      physicalSwitchPosition: 'before', // 'before' or 'after'
      
      // Hardware-level local cache representing values currently stored in device memory
      cache: {
        before: {
          return_air: { val: null, humidity: null, capturedAt: null },
          supply_air: { val: null, capturedAt: null },
          outdoor_ambient: { val: null, capturedAt: null },
          discharge_air: { val: null, capturedAt: null },
          suction_line: { pipeTemp: null, dialSatTemp: 40.0, capturedAt: null },
          liquid_line: { pipeTemp: null, dialSatTemp: 105.0, capturedAt: null }
        },
        after: {
          return_air: { val: null, humidity: null, capturedAt: null },
          supply_air: { val: null, capturedAt: null },
          outdoor_ambient: { val: null, capturedAt: null },
          discharge_air: { val: null, capturedAt: null },
          suction_line: { pipeTemp: null, dialSatTemp: 40.0, capturedAt: null },
          liquid_line: { pipeTemp: null, dialSatTemp: 105.0, capturedAt: null }
        }
      },
      
      // Active calculations and references currently on display
      display: {
        returnAir: 'N/A',
        supplyAir: 'N/A',
        outdoorAmbient: 'N/A',
        dischargeAir: 'N/A',
        suctionPipe: 'N/A',
        suctionSat: '40.0',
        liquidPipe: 'N/A',
        liquidSat: '105.0',
        
        deltaT: 'N/A',
        superheat: 'N/A',
        subcooling: 'N/A',
        
        targetSH: '8-15 (Gen)',
        targetSC: '8-12 (Gen)',
        refrigerant: 'Gen (No tag)',
        bleIcon: '📶' // '📶' (connected) or empty (disconnected)
      },

      // Sensor health status (false = normal, true = fault/disconnected sensor)
      sensorFaults: {
        return_air: false,
        supply_air: false,
        outdoor_ambient: false,
        discharge_air: false,
        suction_line: false,
        liquid_line: false
      },

      nvsLogs: [] // Persistent logs in Non-Volatile Storage (resets, BLE errors, timeouts)
    };

    // Mobile App Database State
    this.activeSet = 'before_set'; // Syncs with device.physicalSwitchPosition
    this.db = {
      snapshots: [], // Mock SQLite database
      outbox: []    // Mock Outbox table
    };
    
    // Cloud Server Database State
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
      refrigerant: parentSnapshot ? parentSnapshot.refrigerant : 'PENDING',
      created_at: this.currentTime.toISOString(),
      updated_at: this.currentTime.toISOString(),
      equipment: parentSnapshot ? { ...parentSnapshot.equipment } : {
        model_number: '',
        serial_number: '',
        manufacturer: '',
        equipment_type: ''
      },
      technician_notes: parentSnapshot ? parentSnapshot.technician_notes : '',
      consumables: parentSnapshot ? [ ...parentSnapshot.consumables ] : [],
      before_set: parentSnapshot ? this.cloneMeasurementSet(parentSnapshot.before_set) : null,
      after_set: parentSnapshot ? this.cloneMeasurementSet(parentSnapshot.after_set) : null
    };

    newSnapshot.id_internal = generateUUID();
    this.currentSnapshot = newSnapshot;
    
    this.syncDeviceTargetsFromApp();
    this.syncDeviceDisplayFromCache();
  }

  cloneMeasurementSet(set) {
    if (!set) return null;
    return JSON.parse(JSON.stringify(set));
  }

  // Push target ranges and refrigerant from App back to Device
  syncDeviceTargetsFromApp() {
    if (!this.currentSnapshot) return;
    const snap = this.currentSnapshot;

    if (snap.refrigerant && snap.refrigerant !== 'PENDING') {
      this.device.display.refrigerant = snap.refrigerant;
    } else {
      this.device.display.refrigerant = 'Gen (No tag)';
    }

    if (snap.equipment && snap.equipment.model_number) {
      // Model-specific targets
      const model = snap.equipment.model_number;
      if (model.startsWith('GSX')) {
        this.device.display.targetSH = '10-14 (Fact)';
        this.device.display.targetSC = '9-11 (Fact)';
      } else {
        this.device.display.targetSH = '8-12 (Fact)';
        this.device.display.targetSC = '10-13 (Fact)';
      }
    } else {
      // Generic fallback ranges
      this.device.display.targetSH = '8-15 (Gen)';
      this.device.display.targetSC = '8-12 (Gen)';
    }
  }

  // Swap display context based on active set (Option A)
  syncDeviceDisplayFromCache() {
    const activeSet = this.device.physicalSwitchPosition;
    const cache = this.device.cache[activeSet];
    const disp = this.device.display;

    // Load raw reading values
    disp.returnAir = cache.return_air.val !== null ? `${cache.return_air.val.toFixed(1)}°F / ${cache.return_air.humidity.toFixed(1)}%` : 'N/A';
    disp.supplyAir = cache.supply_air.val !== null ? `${cache.supply_air.val.toFixed(1)}°F` : 'N/A';
    disp.outdoorAmbient = cache.outdoor_ambient.val !== null ? `${cache.outdoor_ambient.val.toFixed(1)}°F` : 'N/A';
    disp.dischargeAir = cache.discharge_air.val !== null ? `${cache.discharge_air.val.toFixed(1)}°F` : 'N/A';
    
    disp.suctionPipe = cache.suction_line.pipeTemp !== null ? `${cache.suction_line.pipeTemp.toFixed(1)}°F` : 'N/A';
    disp.suctionSat = cache.suction_line.dialSatTemp.toFixed(1);
    
    disp.liquidPipe = cache.liquid_line.pipeTemp !== null ? `${cache.liquid_line.pipeTemp.toFixed(1)}°F` : 'N/A';
    disp.liquidSat = cache.liquid_line.dialSatTemp.toFixed(1);

    // Load BLE icon status
    disp.bleIcon = this.bleConnected ? '📶' : '';

    // Calculate metrics
    this.recalculateDeviceMetrics();
  }

  // Perform calculations on-device
  recalculateDeviceMetrics() {
    const activeSet = this.device.physicalSwitchPosition;
    const cache = this.device.cache[activeSet];
    const disp = this.device.display;

    // Evaporator Delta T
    if (cache.return_air.val !== null && cache.supply_air.val !== null) {
      const dt = cache.return_air.val - cache.supply_air.val;
      disp.deltaT = `${dt.toFixed(1)}°F`;
    } else {
      disp.deltaT = 'N/A';
    }

    // Superheat
    if (cache.suction_line.pipeTemp !== null) {
      const sh = cache.suction_line.pipeTemp - cache.suction_line.dialSatTemp;
      disp.superheat = `${sh.toFixed(1)}°F`;
    } else {
      disp.superheat = 'N/A';
    }

    // Subcooling
    if (cache.liquid_line.pipeTemp !== null) {
      const sc = cache.liquid_line.dialSatTemp - cache.liquid_line.pipeTemp;
      disp.subcooling = `${sc.toFixed(1)}°F`;
    } else {
      disp.subcooling = 'N/A';
    }
  }

  // Toggle physical Before/After switch on device
  togglePhysicalSwitch(position) {
    if (position !== 'before' && position !== 'after') return;
    this.device.physicalSwitchPosition = position;
    
    // Sync active set target in app
    this.activeSet = position === 'before' ? 'before_set' : 'after_set';
    
    // Context-swap screen values
    this.syncDeviceDisplayFromCache();

    // Re-transmit cached readings to app (Option A)
    if (this.bleConnected && this.currentSnapshot) {
      const cache = this.device.cache[position];
      
      // Clear app active set first so it completely synchronizes
      this.currentSnapshot[this.activeSet] = null;
      
      // Re-transmit any populated sensor value in cache
      if (cache.return_air.val !== null) {
        this.transmitDataPoint('return_air', { temp: cache.return_air.val, humidity: cache.return_air.humidity }, cache.return_air.capturedAt);
      }
      if (cache.supply_air.val !== null) {
        this.transmitDataPoint('supply_air', { temp: cache.supply_air.val }, cache.supply_air.capturedAt);
      }
      if (cache.outdoor_ambient.val !== null) {
        this.transmitDataPoint('outdoor_ambient', { temp: cache.outdoor_ambient.val }, cache.outdoor_ambient.capturedAt);
      }
      if (cache.discharge_air.val !== null) {
        this.transmitDataPoint('discharge_air', { temp: cache.discharge_air.val }, cache.discharge_air.capturedAt);
      }
      if (cache.suction_line.pipeTemp !== null) {
        this.transmitDataPoint('suction_line', { pipe_temp: cache.suction_line.pipeTemp, dial_sat_temp: cache.suction_line.dialSatTemp }, cache.suction_line.capturedAt);
      }
      if (cache.liquid_line.pipeTemp !== null) {
        this.transmitDataPoint('liquid_line', { pipe_temp: cache.liquid_line.pipeTemp, dial_sat_temp: cache.liquid_line.dialSatTemp }, cache.liquid_line.capturedAt);
      }
    }
  }

  // Capture Air temperature on device
  captureAirMeasurement(slot, temp, humidity = null) {
    const activeSet = this.device.physicalSwitchPosition;
    const cache = this.device.cache[activeSet];

    // Check for simulated sensor fault
    if (this.device.sensorFaults[slot]) {
      this.device.nvsLogs.push({
        timestamp: this.currentTime.toISOString(),
        event: 'SENSOR_FAULT',
        details: `Slot: ${slot} reports open-circuit failure.`
      });
      return false;
    }

    // Save to device-side memory cache (standalone mode support)
    cache[slot].val = parseFloat(temp.toFixed(1));
    if (humidity !== null) cache[slot].humidity = parseFloat(humidity.toFixed(1));
    cache[slot].capturedAt = this.currentTime.toISOString();

    // Push over BLE
    this.transmitDataPoint(slot, {
      temp: cache[slot].val,
      ...(humidity !== null ? { humidity: cache[slot].humidity } : {})
    }, cache[slot].capturedAt);

    this.syncDeviceDisplayFromCache();
    if (this.currentSnapshot) {
      this.currentSnapshot.updated_at = this.currentTime.toISOString();
    }
    return true;
  }

  // Capture Pipe temperature on device
  capturePipeMeasurement(slot, pipeTemp) {
    const activeSet = this.device.physicalSwitchPosition;
    const cache = this.device.cache[activeSet];

    if (this.device.sensorFaults[slot]) {
      this.device.nvsLogs.push({
        timestamp: this.currentTime.toISOString(),
        event: 'SENSOR_FAULT',
        details: `Slot: ${slot} reports open-circuit probe failure.`
      });
      return false;
    }

    // Save to device-side memory cache (standalone mode support)
    cache[slot].pipeTemp = parseFloat(pipeTemp.toFixed(1));
    cache[slot].capturedAt = this.currentTime.toISOString();

    // Push over BLE
    this.transmitDataPoint(slot, {
      pipe_temp: cache[slot].pipeTemp,
      dial_sat_temp: cache[slot].dialSatTemp
    }, cache[slot].capturedAt);

    this.syncDeviceDisplayFromCache();
    if (this.currentSnapshot) {
      this.currentSnapshot.updated_at = this.currentTime.toISOString();
    }
    return true;
  }

  dialSaturation(slot, temp) {
    const activeSet = this.device.physicalSwitchPosition;
    const cache = this.device.cache[activeSet];
    
    cache[slot].dialSatTemp = parseFloat(temp.toFixed(1));
    
    if (cache[slot].pipeTemp !== null) {
      // Re-transmit clamp calculations
      this.capturePipeMeasurement(slot, cache[slot].pipeTemp);
    } else {
      this.syncDeviceDisplayFromCache();
    }
  }

  transmitDataPoint(slot, data, capturedAt = null) {
    // If no draft exists, auto-initialize (V1 patch)
    if (!this.currentSnapshot) {
      this.createNewDraft();
    }

    if (!this.bleConnected || this.simulateBleFailures) {
      return false;
    }

    const setKey = this.activeSet;
    if (!this.currentSnapshot[setKey]) {
      this.currentSnapshot[setKey] = {
        captured_at: capturedAt || this.currentTime.toISOString()
      };
    }

    const set = this.currentSnapshot[setKey];
    set.captured_at = capturedAt || this.currentTime.toISOString();

    const timestamp = capturedAt || this.currentTime.toISOString();

    if (slot === 'return_air') {
      set.return_air = {
        temp: data.temp,
        humidity: data.humidity,
        captured_at: timestamp,
        source: 'sensor'
      };
    } else if (slot === 'supply_air') {
      set.supply_air = {
        temp: data.temp,
        captured_at: timestamp,
        source: 'sensor'
      };
    } else if (slot === 'outdoor_ambient') {
      set.outdoor_ambient = {
        temp: data.temp,
        captured_at: timestamp,
        source: 'sensor'
      };
    } else if (slot === 'discharge_air') {
      set.discharge_air = {
        temp: data.temp,
        captured_at: timestamp,
        source: 'sensor'
      };
    } else if (slot === 'suction_line') {
      set.suction_line = {
        pipe_temp: data.pipe_temp,
        captured_at: timestamp,
        source: 'sensor'
      };
    } else if (slot === 'liquid_line') {
      set.liquid_line = {
        pipe_temp: data.pipe_temp,
        captured_at: timestamp,
        source: 'sensor'
      };
    }

    this.recalculateSnapshotMetrics(set);
    return true;
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
      const dialTemp = this.device.physicalSwitchPosition === 'before' 
        ? this.device.cache.before.suction_line.dialSatTemp 
        : this.device.cache.after.suction_line.dialSatTemp;
      set.calculations.suction_saturation_temp = dialTemp;
      set.calculations.superheat = parseFloat((set.suction_line.pipe_temp - dialTemp).toFixed(1));
    }

    if (hasSC) {
      const dialTemp = this.device.physicalSwitchPosition === 'before'
        ? this.device.cache.before.liquid_line.dialSatTemp
        : this.device.cache.after.liquid_line.dialSatTemp;
      set.calculations.liquid_saturation_temp = dialTemp;
      set.calculations.subcooling = parseFloat((dialTemp - set.liquid_line.pipe_temp).toFixed(1));
    }
  }

  // Simulation time tick & expiration check (Option A: mark expired, keep others)
  tickTime(minutes) {
    this.timeOffsetMinutes += minutes;
    const nowStr = this.currentTime.toISOString();

    const checkAndExpireDeviceCache = (cache) => {
      Object.keys(cache).forEach(slot => {
        if (cache[slot].capturedAt) {
          const capTime = new Date(cache[slot].capturedAt);
          const elapsed = (this.currentTime.getTime() - capTime.getTime()) / 60000;
          if (elapsed > this.timeoutDurationMinutes) {
            // Expire on device-side cache
            if (slot === 'suction_line' || slot === 'liquid_line') {
              cache[slot].pipeTemp = null;
            } else {
              cache[slot].val = null;
              cache[slot].humidity = null;
            }
            cache[slot].capturedAt = null;
          }
        }
      });
    };

    checkAndExpireDeviceCache(this.device.cache.before);
    checkAndExpireDeviceCache(this.device.cache.after);

    // Check for expiration in current draft snapshot
    if (this.currentSnapshot && this.currentSnapshot.status === 'DRAFT') {
      const before = this.currentSnapshot.before_set;
      const after = this.currentSnapshot.after_set;

      const checkAndExpireSnapshot = (set, slotName) => {
        if (!set || !set[slotName]) return;
        const capturedAt = new Date(set[slotName].captured_at);
        const elapsedMins = (this.currentTime.getTime() - capturedAt.getTime()) / 60000;

        if (elapsedMins > this.timeoutDurationMinutes) {
          // Expire! Remove this data point (Option A)
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
        checkAndExpireSnapshot(before, slot);
        checkAndExpireSnapshot(after, slot);
      });

      if (before) this.recalculateSnapshotMetrics(before);
      if (after) this.recalculateSnapshotMetrics(after);
    }

    this.syncDeviceDisplayFromCache();
  }

  // Validate Snapshot (Mandatory notes + Before/After completeness)
  validateSnapshot() {
    const s = this.currentSnapshot;
    
    // Strictly require notes (Item 7)
    if (!s.technician_notes || s.technician_notes.trim() === '') {
      return { valid: false, reason: 'Technician notes are mandatory before finalization.' };
    }

    // Require equipment model/serial info
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

  // Finalize Snapshot -> Compute performance deltas (Item 9)
  finalizeSnapshot() {
    if (!this.currentSnapshot) {
      return { success: false, reason: 'No active draft snapshot to finalize.' };
    }

    if (this.currentSnapshot.status !== 'DRAFT') {
      return { success: false, reason: 'Current snapshot is already finalized.' };
    }

    const validation = this.validateSnapshot();
    if (!validation.valid) {
      return { success: false, reason: validation.reason };
    }

    this.currentSnapshot.updated_at = this.currentTime.toISOString();
    
    // Compute comparative Performance Deltas (Item 9)
    const before = this.currentSnapshot.before_set;
    const after = this.currentSnapshot.after_set;

    if (before && after && before.calculations && after.calculations) {
      const calcB = before.calculations;
      const calcA = after.calculations;
      
      this.currentSnapshot.performance_deltas = {
        evaporator_delta_t_change: parseFloat((calcA.evaporator_delta_t - calcB.evaporator_delta_t).toFixed(1)),
        superheat_change: parseFloat((calcA.superheat - calcB.superheat).toFixed(1)),
        subcooling_change: parseFloat((calcA.subcooling - calcB.subcooling).toFixed(1)),
        return_air_temp_change: parseFloat((after.return_air.temp - before.return_air.temp).toFixed(1))
      };
    } else {
      // Diagnostic only, no performance change calculation possible
      this.currentSnapshot.performance_deltas = null;
    }

    // Save to local database
    this.db.snapshots.push(this.currentSnapshot);

    // Queue in Outbox for sync
    this.db.outbox.push({
      snapshot_id: this.currentSnapshot.snapshot_id,
      id_internal: this.currentSnapshot.id_internal,
      revision: this.currentSnapshot.revision,
      payload: JSON.parse(JSON.stringify(this.currentSnapshot))
    });

    const finalizedSnap = this.currentSnapshot;

    // Reset device local caches to start fresh for next service call
    this.device.cache.before = {
      return_air: { val: null, humidity: null, capturedAt: null },
      supply_air: { val: null, capturedAt: null },
      outdoor_ambient: { val: null, capturedAt: null },
      discharge_air: { val: null, capturedAt: null },
      suction_line: { pipeTemp: null, dialSatTemp: 40.0, capturedAt: null },
      liquid_line: { pipeTemp: null, dialSatTemp: 105.0, capturedAt: null }
    };
    this.device.cache.after = JSON.parse(JSON.stringify(this.device.cache.before));

    this.syncDeviceDisplayFromCache();
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

    const syncCount = this.db.outbox.length;
    
    this.db.outbox.forEach(item => {
      const existingIdx = this.cloudSnapshots.findIndex(s => s.snapshot_id === item.snapshot_id && s.revision === item.revision);
      if (existingIdx !== -1) {
        this.cloudSnapshots[existingIdx] = item.payload;
      } else {
        this.cloudSnapshots.push(item.payload);
      }
    });

    this.db.outbox = [];
    return { success: true, count: syncCount };
  }

  // Create revision of a previously finalized snapshot
  createRevisionOf(snapshotId) {
    const matches = this.db.snapshots.filter(s => s.snapshot_id === snapshotId);
    if (matches.length === 0) {
      return { success: false, reason: 'Snapshot not found in local database.' };
    }

    matches.sort((a, b) => b.revision - a.revision);
    const latest = matches[0];

    // Create new draft cloning this one
    this.createNewDraft(latest);
    this.currentSnapshot.status = 'DRAFT';
    
    // Set switch position to AFTER to focus revisions
    this.togglePhysicalSwitch('after');

    return { success: true, revision: this.currentSnapshot.revision };
  }

  // Configure timeout duration dynamically in simulation
  updateTimeoutDuration(minutes) {
    this.timeoutDurationMinutes = minutes;
    this.device.nvsLogs.push({
      timestamp: this.currentTime.toISOString(),
      event: 'TIMEOUT_CONFIG_CHANGED',
      details: `Timeout set to: ${minutes} minutes.`
    });
  }

  // Update equipment info (OCR Nameplate capture)
  mockPhotoCapture(model, serial, manufacturer = 'Carrier', type = 'Split AC Condenser') {
    if (!this.currentSnapshot) {
      return { success: false, reason: 'No active draft snapshot to edit.' };
    }
    
    this.currentSnapshot.refrigerant = 'R-410A'; // Loaded from tag lookup
    this.currentSnapshot.equipment = {
      model_number: model,
      serial_number: serial,
      manufacturer: manufacturer,
      equipment_type: type
    };
    
    this.currentSnapshot.updated_at = this.currentTime.toISOString();
    
    // Sync targets and display
    this.syncDeviceTargetsFromApp();
    this.syncDeviceDisplayFromCache();
    
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
