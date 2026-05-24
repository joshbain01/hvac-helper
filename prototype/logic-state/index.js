import { HvacStateMachine } from './state-machine.js';

const sim = new HvacStateMachine();

// Configure stdin to read raw keystrokes if in a TTY environment
if (process.stdin.isTTY) {
  process.stdin.setRawMode(true);
}
process.stdin.resume();
process.stdin.setEncoding('utf8');

// Color Utilities
const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34' + 'm',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgGray: '\x1b[100m',
  bgBlue: '\x1b[44m',
  bgGreen: '\x1b[42m',
  bgRed: '\x1b[41m'
};

function clearScreen() {
  process.stdout.write('\x1Bc'); // Clear terminal and reset cursor
}

function ledStatusStr(active) {
  return active ? `${C.green}● ON${C.reset}` : `${C.dim}○ OFF${C.reset}`;
}

function sensorLedStr(fault) {
  return fault ? `${C.red}♦ FAULT (RED)${C.reset}` : `${C.green}● HEALTHY (GRN)${C.reset}`;
}

// Generate random temperatures in range
function getRandomTemp(min, max) {
  return Math.random() * (max - min) + min;
}

let notificationMessage = '';
let notificationColor = C.cyan;

function setNotification(msg, color = C.cyan) {
  notificationMessage = msg;
  notificationColor = color;
  setTimeout(() => {
    if (notificationMessage === msg) {
      notificationMessage = '';
      render();
    }
  }, 4000);
}

function render() {
  clearScreen();
  const timeStr = sim.currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateStr = sim.currentTime.toISOString().split('T')[0];

  console.log(`${C.bgBlue}${C.white}${C.bold}  HVAC HELPER PRO — LOGIC STATE MACHINE SIMULATOR (V2)  ${C.reset}  Time: ${C.bold}${dateStr} ${timeStr}${C.reset} (+${sim.timeOffsetMinutes} min)`);
  console.log(`${C.dim}─────────────────────────────────────────────────────────────────────────────${C.reset}`);

  // System Environment Panel
  const bleLink = sim.bleConnected 
    ? `${C.green}CONNECTED${C.reset}` 
    : `${C.red}DISCONNECTED${C.reset}`;
  const internetLink = sim.networkConnected 
    ? `${C.green}ONLINE${C.reset}` 
    : `${C.red}OFFLINE${C.reset}`;
  const bleFailMode = sim.simulateBleFailures 
    ? `${C.red}SIMULATED DROPS ACTIVE${C.reset}` 
    : `${C.green}NORMAL${C.reset}`;
  
  console.log(`  ${C.bold}ENV STATUS:${C.reset}  BLE Link: [${bleLink}]  |  Internet: [${internetLink}]  |  BLE Noise: [${bleFailMode}]  |  Timeout: [${C.bold}${sim.timeoutDurationMinutes} min${C.reset}]`);
  console.log(`${C.dim}─────────────────────────────────────────────────────────────────────────────${C.reset}`);

  // Physical Handheld Device Display (Single top screen)
  console.log(`  ${C.bgGray}${C.white}${C.bold} 🖥️  HANDHELD DEVICE SINGLE SCREEN (128x64 OLED) ${C.reset}  BLE Icon: [${sim.device.display.bleIcon || C.dim + 'OFF' + C.reset}]`);
  
  const disp = sim.device.display;
  console.log(`  ┌──────────────────────────────────────┬───────────────────────────────────┐`);
  console.log(`  │ ${C.bold}Return:${C.reset} ${disp.returnAir.padEnd(20)} │ ${C.bold}Delta T:${C.reset} ${disp.deltaT.padEnd(19)} │`);
  console.log(`  │ ${C.bold}Supply:${C.reset} ${disp.supplyAir.padEnd(20)} │ ${C.bold}Superht:${C.reset} ${`${disp.superheat} (${disp.targetSH})`.padEnd(19)} │`);
  console.log(`  │ ${C.bold}Ambint:${C.reset} ${disp.outdoorAmbient.padEnd(20)} │ ${C.bold}Subcool:${C.reset} ${`${disp.subcooling} (${disp.targetSC})`.padEnd(19)} │`);
  console.log(`  │ ${C.bold}Dischg:${C.reset} ${disp.dischargeAir.padEnd(20)} │ ${C.bold}Refrig :${C.reset} ${disp.refrigerant.padEnd(19)} │`);
  console.log(`  │ ${C.bold}Suctn :${C.reset} ${`${disp.suctionPipe} (S:${disp.suctionSat})`.padEnd(20)} │                                   │`);
  console.log(`  │ ${C.bold}Liquid:${C.reset} ${`${disp.liquidPipe} (S:${disp.liquidSat})`.padEnd(20)} │                                   │`);
  console.log(`  └──────────────────────────────────────┴───────────────────────────────────┘`);

  // Physical Hardware Controls & LEDs
  const switchPos = sim.device.physicalSwitchPosition;
  console.log(`  ${C.bold}Hardware LEDs:${C.reset}   BEFORE: [${ledStatusStr(switchPos === 'before')}]     AFTER: [${ledStatusStr(switchPos === 'after')}]   (Toggled by TAB switch)`);
  
  const faults = sim.device.sensorFaults;
  console.log(`  ${C.bold}Sensor Faults:${C.reset} Return: [${sensorLedStr(faults.return_air)}]  Supply: [${sensorLedStr(faults.supply_air)}]  Outdoor: [${sensorLedStr(faults.outdoor_ambient)}]`);
  console.log(`                 Dischg: [${sensorLedStr(faults.discharge_air)}]  Suctn : [${sensorLedStr(faults.suction_line)}]  Liquid : [${sensorLedStr(faults.liquid_line)}]`);
  console.log(`${C.dim}─────────────────────────────────────────────────────────────────────────────${C.reset}`);

  // Mobile App View
  console.log(`  ${C.bgGray}${C.white}${C.bold} 📱 MOBILE COMPANION APP VIEW ${C.reset}  [Focused Target Set: ${C.bold}${sim.activeSet.toUpperCase()}${C.reset}]`);
  
  if (sim.currentSnapshot) {
    const snap = sim.currentSnapshot;
    const reqText = snap.refrigerant === 'PENDING' ? `${C.dim}PENDING (Scan tag)${C.reset}` : `${C.green}${snap.refrigerant}${C.reset}`;
    const eqModel = snap.equipment.model_number || `${C.dim}PENDING (Scan nameplate)${C.reset}`;
    const eqSerial = snap.equipment.serial_number || `${C.dim}PENDING (Scan nameplate)${C.reset}`;
    const notes = snap.technician_notes ? `${C.green}CAPTURED${C.reset}` : `${C.red}${C.bold}REQUIRED (Missing)${C.reset}`;
    const consumablesText = snap.consumables && snap.consumables.length > 0 
      ? `${C.green}${snap.consumables.join(', ')}${C.reset}` 
      : `${C.dim}NONE (LLM itemized)${C.reset}`;

    console.log(`  Current Draft Snapshot ID:  ${C.bold}${snap.snapshot_id}${C.reset}`);
    console.log(`  Status:    ${C.cyan}${C.bold}${snap.status}${C.reset}  |  Revision: ${C.bold}${snap.revision}${C.reset}  |  Refrigerant: ${reqText}`);
    console.log(`  Equipment: Model: ${eqModel}  |  Serial: ${eqSerial}`);
    console.log(`  LLM Notes: [${notes}]  |  Consumables: [${consumablesText}]`);
    
    // Render status of each data point in the active set
    const setKey = sim.activeSet;
    const set = snap[setKey];
    console.log(`  Captured Data Points in ${C.bold}${setKey}${C.reset}:`);
    const ptStatus = (slot) => {
      if (!set || !set[slot]) return `${C.red}Missing${C.reset}`;
      const data = set[slot];
      const timeStr = new Date(data.captured_at).toLocaleTimeString([], { minute: '2-digit', second: '2-digit' });
      
      const elapsedMins = (sim.currentTime.getTime() - new Date(data.captured_at).getTime()) / 60000;
      let warning = '';
      if (elapsedMins > sim.timeoutDurationMinutes * 0.75) {
        warning = ` ${C.red}(Expires in ${Math.ceil(sim.timeoutDurationMinutes - elapsedMins)}m)${C.reset}`;
      } else if (elapsedMins > 0) {
        warning = ` ${C.yellow}(${Math.floor(elapsedMins)}m old)${C.reset}`;
      }

      if (slot === 'return_air') {
        return `${C.green}OK: ${data.temp}°F / ${data.humidity}%RH${C.reset} at ${timeStr}${warning}`;
      } else if (slot === 'suction_line' || slot === 'liquid_line') {
        return `${C.green}OK: Pipe ${data.pipe_temp}°F${C.reset} at ${timeStr}${warning}`;
      } else {
        return `${C.green}OK: ${data.temp}°F${C.reset} at ${timeStr}${warning}`;
      }
    };

    console.log(`    RA: ${ptStatus('return_air').padEnd(45)} SA: ${ptStatus('supply_air')}`);
    console.log(`    OA: ${ptStatus('outdoor_ambient').padEnd(45)} DA: ${ptStatus('discharge_air')}`);
    console.log(`    SL: ${ptStatus('suction_line').padEnd(45)} LL: ${ptStatus('liquid_line')}`);

    // Performance Delta Summary (Item 9 / Option A)
    const beforeSet = snap.before_set;
    const afterSet = snap.after_set;
    if (beforeSet && afterSet && beforeSet.calculations && afterSet.calculations) {
      const calcB = beforeSet.calculations;
      const calcA = afterSet.calculations;
      
      const dtDiff = calcA.evaporator_delta_t - calcB.evaporator_delta_t;
      const shDiff = calcA.superheat - calcB.superheat;
      const scDiff = calcA.subcooling - calcB.subcooling;

      const formatDiff = (val, targetName) => {
        const sign = val > 0 ? '+' : '';
        const color = val < 0 && targetName !== 'deltaT' ? C.green : val > 0 && targetName === 'deltaT' ? C.green : C.yellow;
        return `${color}${sign}${val.toFixed(1)}°F${C.reset}`;
      };

      console.log(`\n  📈 ${C.bold}THERMODYNAMIC PERFORMANCE DELTA SUMMARY (Before vs After):${C.reset}`);
      console.log(`    Evap Delta T: Before: ${calcB.evaporator_delta_t}°F  =>  After: ${calcA.evaporator_delta_t}°F  (Change: ${formatDiff(dtDiff, 'deltaT')})`);
      console.log(`    Superheat:    Before: ${calcB.superheat}°F   =>  After: ${calcA.superheat}°F   (Change: ${formatDiff(shDiff, 'superheat')})`);
      console.log(`    Subcooling:   Before: ${calcB.subcooling}°F  =>  After: ${calcA.subcooling}°F  (Change: ${formatDiff(scDiff, 'subcooling')})`);
    }

  } else {
    console.log(`  ${C.dim}No active Draft snapshot in progress. Press [r] to create a Revision or [c] to start fresh.${C.reset}`);
  }

  // Database stats
  const outboxSize = sim.db.outbox.length;
  const localDbSize = sim.db.snapshots.length;
  const cloudDbSize = sim.cloudSnapshots.length;

  console.log(`\n  Local Database: [${C.bold}${localDbSize}${C.reset} snapshots stored]  |  Outbox Queue: [${outboxSize > 0 ? C.red + C.bold : C.green}${outboxSize}${C.reset} pending upload]`);
  console.log(`  Cloud Server Database: [${C.bold}${cloudDbSize}${C.reset} snapshots synchronized]`);
  console.log(`${C.dim}─────────────────────────────────────────────────────────────────────────────${C.reset}`);

  // Display notification if any
  if (notificationMessage) {
    console.log(`  ${C.bold}SYSTEM EVENT:${C.reset} ${notificationColor}${notificationMessage}${C.reset}`);
  } else {
    console.log(`  ${C.dim}Use keyboard shortcuts below to trigger hardware & software operations...${C.reset}`);
  }
  console.log(`${C.dim}─────────────────────────────────────────────────────────────────────────────${C.reset}`);

  // Controls menu
  console.log(`  ${C.bold}HARDWARE CAPTURE (Active Set):${C.reset}`);
  console.log(`   [1] Return Air (RA: Sensor)     [2] Supply Air (SA: Sensor)     [3] Outdoor Ambient (OA)`);
  console.log(`   [4] Discharge Air (DA)          [5] Dial SL Sat Saturation -2°  [6] SL Clamp Push (Confirm/Probe)`);
  console.log(`   [7] Dial LL Sat Saturation -5°  [8] LL Clamp Push (Confirm/Probe)`);
  console.log(`   [TAB] Toggle Physical Switch (${C.bold}BEFORE / AFTER${C.reset})`);
  console.log(`  ${C.bold}MOCKS, LOGS & DIAGNOSTICS:${C.reset}`);
  console.log(`   [e] Photo Capture (OCR Model)   [n] Add/Mock Required Notes     [f] Finalize Snapshot`);
  console.log(`   [s] Sync Outbox to Cloud        [b] Toggle BLE Connection       [x] Toggle BLE Failure Mode`);
  console.log(`   [w] Toggle Network Connection   [t] Tick +1 Minute              [m] Tick +21 Minutes (Expire)`);
  console.log(`   [o] Change Timeout Duration     [y] Toggle simulated Sensor Faults`);
  console.log(`   [r] Create Snapshot Revision    [c] Reset Simulator State       [q] Quit Simulation`);
}

// Dial adjustments
let suctionSat = 40.0;
let liquidSat = 105.0;

process.stdin.on('data', (key) => {
  // Exit handling
  if (key === '\u0003' || key === 'q' || key === 'Q') {
    clearScreen();
    console.log('Quitting simulator. Goodbye!');
    process.exit();
  }

  // Handle Tab key (Physical Switch Toggle)
  if (key === '\t') {
    const nextPos = sim.device.physicalSwitchPosition === 'before' ? 'after' : 'before';
    sim.togglePhysicalSwitch(nextPos);
    setNotification(`Physical switch slid to: ${nextPos.toUpperCase()}. Swapped display context and re-transmitted cache.`, C.yellow);
    render();
    return;
  }

  switch (key) {
    case '1':
      sim.captureAirMeasurement('return_air', getRandomTemp(74.0, 78.0), getRandomTemp(45.0, 55.0));
      setNotification('RA button pressed: Captured Return Air temperature & humidity.');
      break;
    case '2':
      sim.captureAirMeasurement('supply_air', getRandomTemp(52.0, 62.0));
      setNotification('SA button pressed: Captured Supply Air temperature.');
      break;
    case '3':
      sim.captureAirMeasurement('outdoor_ambient', getRandomTemp(90.0, 98.0));
      setNotification('OA button pressed: Captured Outdoor Ambient temperature.');
      break;
    case '4':
      sim.captureAirMeasurement('discharge_air', getRandomTemp(102.0, 112.0));
      setNotification('DA button pressed: Captured Discharge Air temperature.');
      break;
    case '5':
      suctionSat -= 2.0;
      if (suctionSat < 10) suctionSat = 50.0;
      sim.dialSaturation('suction_line', suctionSat);
      setNotification(`SL encoder turned: Adjusted Suction Saturation temperature dial to ${suctionSat.toFixed(1)}°F.`);
      break;
    case '6':
      sim.capturePipeMeasurement('suction_line', suctionSat + getRandomTemp(6.0, 18.0));
      setNotification('SL encoder pushed: Captured clamp probe temperature.');
      break;
    case '7':
      liquidSat -= 5.0;
      if (liquidSat < 60) liquidSat = 120.0;
      sim.dialSaturation('liquid_line', liquidSat);
      setNotification(`LL encoder turned: Adjusted Liquid Saturation temperature dial to ${liquidSat.toFixed(1)}°F.`);
      break;
    case '8':
      sim.capturePipeMeasurement('liquid_line', liquidSat - getRandomTemp(5.0, 15.0));
      setNotification('LL encoder pushed: Captured clamp probe temperature.');
      break;
    case 'e':
    case 'E':
      const models = ['GSXC160361', 'MCH4321A', 'N2H436G'];
      const manufacturers = ['Goodman', 'Carrier', 'Amana'];
      const idx = Math.floor(Math.random() * models.length);
      const resOCR = sim.mockPhotoCapture(models[idx], Math.floor(Math.random() * 900000000 + 100000000).toString(), manufacturers[idx], 'Split AC System');
      if (resOCR.success) {
        setNotification('Photo Capture OCR triggered: Synced model-specific target ranges to hardware screen over BLE.', C.green);
      } else {
        setNotification(`OCR Failed: ${resOCR.reason}`, C.red);
      }
      break;
    case 'n':
    case 'N':
      const mockNotes = 'Cleaned indoor evaporator coil. Replaced 16x25x1 filter. Dialed in refrigerant sat temps and verified superheat and subcooling are within factory specs.';
      const resNotes = sim.mockNotesExpansion(mockNotes, ['16x25x1 Filter', 'Refrigerant R-410A (0.5 lbs)']);
      if (resNotes.success) {
        setNotification('LLM Notes expansion completed: Structured service record notes captured successfully.', C.green);
      } else {
        setNotification(`Notes failed: ${resNotes.reason}`, C.red);
      }
      break;
    case 'f':
    case 'F':
      const resFinal = sim.finalizeSnapshot();
      if (resFinal.success) {
        setNotification(`Snapshot finalized! Status: ${resFinal.status}. ID: ${resFinal.snapshot_id} (Rev ${resFinal.revision}) queued in local Outbox SQLite table.`, C.green);
      } else {
        setNotification(`Finalization Rejected: ${resFinal.reason}`, C.red);
      }
      break;
    case 's':
    case 'S':
      const resSync = sim.syncOutbox();
      if (resSync.success) {
        if (resSync.count > 0) {
          setNotification(`Sync Success! Transmitted ${resSync.count} finalized snapshot(s) from local Outbox to cloud backend gateway.`, C.green);
        } else {
          setNotification('Sync completed: Outbox was empty, nothing to upload.');
        }
      } else {
        setNotification(`Sync Failed: ${resSync.reason}`, C.red);
      }
      break;
    case 'b':
    case 'B':
      sim.bleConnected = !sim.bleConnected;
      setNotification(`BLE Link connection state toggled to: ${sim.bleConnected ? 'CONNECTED' : 'DISCONNECTED'}`);
      sim.syncDeviceDisplayFromCache();
      break;
    case 'x':
    case 'X':
      sim.simulateBleFailures = !sim.simulateBleFailures;
      setNotification(`BLE failure simulation state toggled to: ${sim.simulateBleFailures ? 'ACTIVE (Failures simulated)' : 'INACTIVE (Normal operation)'}`);
      break;
    case 'w':
    case 'W':
      sim.networkConnected = !sim.networkConnected;
      setNotification(`Internet / Cloud Sync connection state toggled to: ${sim.networkConnected ? 'ONLINE' : 'OFFLINE'}`);
      break;
    case 't':
    case 'T':
      sim.tickTime(1);
      setNotification('Time simulation advanced by +1 minute.');
      break;
    case 'm':
    case 'M':
      sim.tickTime(sim.timeoutDurationMinutes + 1);
      setNotification(`Time simulation advanced by +${sim.timeoutDurationMinutes + 1} minutes. Checked for sensor readings expiration.`, C.yellow);
      break;
    case 'o':
    case 'O':
      let nextTimeout = 20;
      if (sim.timeoutDurationMinutes === 20) nextTimeout = 30;
      else if (sim.timeoutDurationMinutes === 30) nextTimeout = 60;
      else if (sim.timeoutDurationMinutes === 60) nextTimeout = 10;
      else nextTimeout = 20;
      sim.updateTimeoutDuration(nextTimeout);
      setNotification(`Timeout configuration updated: Snapshot timeout window set to ${nextTimeout} minutes.`, C.yellow);
      break;
    case 'y':
    case 'Y':
      // Toggle a sensor fault (Suction Line)
      sim.device.sensorFaults.suction_line = !sim.device.sensorFaults.suction_line;
      setNotification(`Simulated sensor fault toggled for Suction Line: [${sim.device.sensorFaults.suction_line ? 'FAULT ACTIVE' : 'NORMAL HEALTH'}].`, C.yellow);
      break;
    case 'r':
    case 'R':
      if (sim.db.snapshots.length === 0) {
        setNotification('Cannot revise: Local SQLite database contains no finalized snapshots yet.', C.red);
      } else {
        const lastSnap = sim.db.snapshots[sim.db.snapshots.length - 1];
        const resRev = sim.createRevisionOf(lastSnap.snapshot_id);
        if (resRev.success) {
          setNotification(`Created Revision draft of Snapshot ${lastSnap.snapshot_id.substring(0, 8)}... (Revision #${resRev.revision}).`, C.green);
        } else {
          setNotification(`Revision Failed: ${resRev.reason}`, C.red);
        }
      }
      break;
    case 'c':
    case 'C':
      sim.reset();
      suctionSat = 40.0;
      liquidSat = 105.0;
      setNotification('Reset simulator! All states cleared. Fresh active snapshot draft initialized.', C.yellow);
      break;
  }

  render();
});

// Initial Render
render();
console.log(`\n  ${C.bold}Simulator V2 initialized!${C.reset} Press any key listed in the menu to interact.`);
