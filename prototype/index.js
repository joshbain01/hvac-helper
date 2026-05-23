import { HvacStateMachine } from './state-machine.js';
import readline from 'readline';

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
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgGray: '\x1b[100m',
  bgBlue: '\x1b[44m'
};

function clearScreen() {
  process.stdout.write('\x1Bc'); // Clear terminal and reset cursor
}

function ledStr(status) {
  switch (status) {
    case 'GREEN_SOLID':
      return `${C.green}● SOLID GREEN${C.reset}`;
    case 'AMBER_PULSE':
      return `${C.yellow}☼ PULSING AMBER (TX)${C.reset}`;
    case 'RED_FLASH':
      return `${C.red}♦ FLASHING RED (ERR)${C.reset}`;
    case 'OFF':
    default:
      return `${C.dim}○ OFF${C.reset}`;
  }
}

function oledStr(status, text) {
  if (status === 'OFFLINE') return `${C.dim}[ OFFLINE ]${C.reset}`;
  if (status === 'TX...') return `${C.yellow}[ TX...   ]${C.reset}`;
  if (status === 'FAIL') return `${C.red}[ FAIL    ]${C.reset}`;
  return `${C.cyan}[ ${text.padEnd(7)} ]${C.reset}`;
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

  console.log(`${C.bgBlue}${C.white}${C.bold}  HVAC HELPER PRO — LOGIC STATE MACHINE SIMULATOR  ${C.reset}  Time: ${C.bold}${dateStr} ${timeStr}${C.reset} (+${sim.timeOffsetMinutes} min)`);
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
  
  console.log(`  ${C.bold}ENV STATUS:${C.reset}  BLE Link: [${bleLink}]  |  Internet: [${internetLink}]  |  BLE Noise: [${bleFailMode}]`);
  console.log(`${C.dim}─────────────────────────────────────────────────────────────────────────────${C.reset}`);

  // Physical Handheld Device Panel
  console.log(`  ${C.bgGray}${C.white}${C.bold} 🖥️  HANDHELD TROUBLESHOOTING DEVICE VIEW ${C.reset}`);
  
  const slots = sim.device.slots;
  console.log(`  ┌─────────────────────────┬─────────────────────────┬──────────────────────┐`);
  console.log(`  │ ${C.bold}Return Air (RA)${C.reset}          │ ${C.bold}Supply Air (SA)${C.reset}          │ ${C.bold}Outdoor Ambient (OA)${C.reset} │`);
  console.log(`  │ LED: ${ledStr(slots.return_air.led).padEnd(28)} │ LED: ${ledStr(slots.supply_air.led).padEnd(28)} │ LED: ${ledStr(slots.outdoor_ambient.led).padEnd(28)} │`);
  console.log(`  │ OLED: ${oledStr(slots.return_air.led, slots.return_air.oled).padEnd(29)} │ OLED: ${oledStr(slots.supply_air.led, slots.supply_air.oled).padEnd(29)} │ OLED: ${oledStr(slots.outdoor_ambient.led, slots.outdoor_ambient.oled).padEnd(29)} │`);
  console.log(`  ├─────────────────────────┼─────────────────────────┼──────────────────────┤`);
  console.log(`  │ ${C.bold}Discharge Air (DA)${C.reset}       │ ${C.bold}Suction Line (SL)${C.reset}        │ ${C.bold}Liquid Line (LL)${C.reset}      │`);
  console.log(`  │ LED: ${ledStr(slots.discharge_air.led).padEnd(28)} │ LED: ${ledStr(slots.suction_line.led).padEnd(28)} │ LED: ${ledStr(slots.liquid_line.led).padEnd(28)} │`);
  console.log(`  │ OLED: ${oledStr(slots.discharge_air.led, slots.discharge_air.oled).padEnd(29)} │ OLED: ${oledStr(slots.suction_line.led, slots.suction_line.oled).padEnd(29)} │ OLED: ${oledStr(slots.liquid_line.led, slots.liquid_line.oled).padEnd(29)} │`);
  console.log(`  └─────────────────────────┴─────────────────────────┴──────────────────────┘`);

  // Device Main LCD Screen Calculations
  console.log(`  ┌──────────────────────────────────────────────────────────────────────────┐`);
  console.log(`  │ ${C.bold}MAIN LCD METRICS (ESP32 calculations):${C.reset}                                    │`);
  console.log(`  │   ${C.bold}Evaporator Delta T:${C.reset} ${sim.device.lcd.deltaT.padEnd(8)} (RA Temp - SA Temp)                  │`);
  console.log(`  │   ${C.bold}Superheat:${C.reset}          ${sim.device.lcd.superheat.padEnd(8)} (Suction Pipe - Saturation Temp)      │`);
  console.log(`  │   ${C.bold}Subcooling:${C.reset}         ${sim.device.lcd.subcooling.padEnd(8)} (Liquid Saturation - Liquid Pipe)     │`);
  console.log(`  └──────────────────────────────────────────────────────────────────────────┘`);
  console.log(`${C.dim}─────────────────────────────────────────────────────────────────────────────${C.reset}`);

  // Mobile App View
  console.log(`  ${C.bgGray}${C.white}${C.bold} 📱 MOBILE COMPANION APP VIEW ${C.reset}  [Active Set Focus: ${C.bold}${sim.activeSet.toUpperCase()}${C.reset}]`);
  
  if (sim.currentSnapshot) {
    const snap = sim.currentSnapshot;
    const reqText = snap.refrigerant;
    const eqModel = snap.equipment.model_number || `${C.dim}PENDING (Mock Photo OCR)${C.reset}`;
    const eqSerial = snap.equipment.serial_number || `${C.dim}PENDING (Mock Photo OCR)${C.reset}`;
    const notes = snap.technician_notes ? `${C.green}CAPTURED${C.reset}` : `${C.dim}PENDING (Mock LLM Notes)${C.reset}`;
    const consumablesText = snap.consumables && snap.consumables.length > 0 
      ? `${C.green}${snap.consumables.join(', ')}${C.reset}` 
      : `${C.dim}NONE (LLM itemized)${C.reset}`;

    console.log(`  Current Draft Snapshot ID:  ${C.bold}${snap.snapshot_id}${C.reset}`);
    console.log(`  Status:    ${C.cyan}${C.bold}${snap.status}${C.reset}  |  Revision: ${C.bold}${snap.revision}${C.reset}  |  Refrigerant: ${C.bold}${reqText}${C.reset}`);
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
      
      // Calculate elapsed time for warning
      const elapsedMins = (sim.currentTime.getTime() - new Date(data.captured_at).getTime()) / 60000;
      let warning = '';
      if (elapsedMins > 15) {
        warning = ` ${C.red}(Expires in ${Math.ceil(20 - elapsedMins)}m)${C.reset}`;
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

  } else {
    console.log(`  ${C.dim}No active Draft snapshot in progress. Press [r] to create a Revision or [c] to start fresh.${C.reset}`);
  }

  // Database stats
  const outboxSize = sim.db.outbox.length;
  const localDbSize = sim.db.snapshots.length;
  const cloudDbSize = sim.cloudSnapshots.length;

  console.log(`  Local Database: [${C.bold}${localDbSize}${C.reset} snapshots stored]  |  Outbox Queue: [${outboxSize > 0 ? C.red + C.bold : C.green}${outboxSize}${C.reset} pending upload]`);
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
  console.log(`   [TAB] Toggle Active Set (${C.bold}Before / After${C.reset})`);
  console.log(`  ${C.bold}MOBILE APP & CLOUD SERVICES:${C.reset}`);
  console.log(`   [e] Photo Capture (OCR Model)   [n] LLM Notes / Consumables     [f] Finalize Snapshot`);
  console.log(`   [s] Sync Outbox to Cloud        [b] Toggle BLE Connection       [x] Toggle BLE Failure Mode`);
  console.log(`   [w] Toggle Network Connection   [t] Tick +1 Minute              [m] Tick +21 Minutes (Expire)`);
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

  // Handle Tab key
  if (key === '\t') {
    sim.toggleActiveSet();
    setNotification(`Swapped active snapshot set focus to: ${sim.activeSet.toUpperCase()}`);
    render();
    return;
  }

  switch (key) {
    case '1':
      // Return air: temp ~74-78, humidity ~45-55%
      sim.captureAirMeasurement('return_air', getRandomTemp(74.0, 78.0), getRandomTemp(45.0, 55.0));
      setNotification('RA button pressed: Captured Return Air temperature & humidity over BLE.');
      break;
    case '2':
      // Supply air: temp ~52-62
      sim.captureAirMeasurement('supply_air', getRandomTemp(52.0, 62.0));
      setNotification('SA button pressed: Captured Supply Air temperature over BLE.');
      break;
    case '3':
      // Outdoor Ambient: temp ~90-98
      sim.captureAirMeasurement('outdoor_ambient', getRandomTemp(90.0, 98.0));
      setNotification('OA button pressed: Captured Outdoor Ambient temperature over BLE.');
      break;
    case '4':
      // Discharge Air: temp ~102-112
      sim.captureAirMeasurement('discharge_air', getRandomTemp(102.0, 112.0));
      setNotification('DA button pressed: Captured Discharge Air temperature over BLE.');
      break;
    case '5':
      // Dial Suction Saturation temp
      suctionSat -= 2.0;
      if (suctionSat < 10) suctionSat = 50.0; // wrap
      sim.dialSaturation('suction_line', suctionSat);
      setNotification(`SL encoder turned: Adjusted Suction Saturation temperature dial to ${suctionSat.toFixed(1)}°F.`);
      break;
    case '6':
      // Confirm SL and capture pipe temperature
      // Pipe temp should be close to saturation + superheat (e.g. saturation 40 + superheat 12 = 52)
      sim.capturePipeMeasurement('suction_line', suctionSat + getRandomTemp(6.0, 18.0));
      setNotification('SL encoder pushed: Captured clamp probe temperature & confirmed saturation dial over BLE.');
      break;
    case '7':
      // Dial Liquid Saturation temp
      liquidSat -= 5.0;
      if (liquidSat < 60) liquidSat = 120.0; // wrap
      sim.dialSaturation('liquid_line', liquidSat);
      setNotification(`LL encoder turned: Adjusted Liquid Saturation temperature dial to ${liquidSat.toFixed(1)}°F.`);
      break;
    case '8':
      // Confirm LL and capture pipe temperature
      // Pipe temp should be close to saturation - subcooling (e.g. saturation 105 - subcooling 8 = 97)
      sim.capturePipeMeasurement('liquid_line', liquidSat - getRandomTemp(5.0, 15.0));
      setNotification('LL encoder pushed: Captured clamp probe temperature & confirmed saturation dial over BLE.');
      break;
    case 'e':
    case 'E':
      // OCR Model info
      const models = ['GSXC160361', 'MCH4321A', 'N2H436G', 'PA13NA036'];
      const manufacturers = ['Goodman', 'Carrier', 'Amana', 'Payne'];
      const idx = Math.floor(Math.random() * models.length);
      const resOCR = sim.mockPhotoCapture(models[idx], Math.floor(Math.random() * 900000000 + 100000000).toString(), manufacturers[idx], 'Split AC System');
      if (resOCR.success) {
        setNotification('Photo Capture OCR triggered: Parsed and saved unit nameplate details locally.');
      } else {
        setNotification(`OCR Failed: ${resOCR.reason}`, C.red);
      }
      break;
    case 'n':
    case 'N':
      // LLM Notes expansion
      const mockNotes = 'Cleaned indoor evaporator coil. Replaced 16x25x1 filter. Dialed in refrigerant sat temps and verified superheat and subcooling are within factory specs.';
      const resNotes = sim.mockNotesExpansion(mockNotes, ['16x25x1 Filter', 'Refrigerant R-410A (0.5 lbs)']);
      if (resNotes.success) {
        setNotification('LLM Notes expansion completed: Structured service record and auto-itemized consumables.');
      } else {
        setNotification(`Notes failed: ${resNotes.reason}`, C.red);
      }
      break;
    case 'f':
    case 'F':
      // Finalize
      const resFinal = sim.finalizeSnapshot();
      if (resFinal.success) {
        setNotification(`Snapshot finalized! Status: ${resFinal.status}. ID: ${resFinal.snapshot_id} (Rev ${resFinal.revision}) queued in local Outbox SQLite table.`, C.green);
      } else {
        setNotification(`Finalization Rejected: ${resFinal.reason}`, C.red);
      }
      break;
    case 's':
    case 'S':
      // Sync outbox
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
      // If BLE disconnected, device displays should reflect offline status
      if (!sim.bleConnected) {
        Object.keys(sim.device.slots).forEach(slot => {
          sim.device.slots[slot].led = 'RED_FLASH';
          sim.device.slots[slot].oled = 'OFFLINE';
        });
      } else {
        sim.syncDeviceFromDraft();
      }
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
      sim.tickTime(21);
      setNotification('Time simulation advanced by +21 minutes. Checked for sensor readings expiration (>20 mins).', C.yellow);
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
console.log(`\n  ${C.bold}Simulator initialized!${C.reset} Press any key listed in the menu to interact.`);
