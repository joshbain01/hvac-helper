const SLOT_ORDER = ['RA', 'SA', 'OA', 'DA', 'SL', 'LL'];

const SLOT_LABELS = {
  RA: 'Return Air',
  SA: 'Supply Air',
  OA: 'Outdoor Ambient',
  DA: 'Discharge Air',
  SL: 'Suction Line',
  LL: 'Liquid Line'
};

const state = {
  active: 'before',
  bleConnected: true,
  faultedSlot: null,
  notificationSeq: 0,
  cache: emptyCache(),
  appDraft: { before: emptySet(), after: emptySet(), lastNotificationSeq: 0 },
  nvsLogs: ['Boot: restored BEFORE/AFTER cache pointers from NVS.'],
  eventLog: ['BEFORE cache active. Display and progress LEDs point to BEFORE set.']
};

function emptySet() {
  return Object.fromEntries(SLOT_ORDER.map((slot) => [slot, null]));
}

function emptyCache() {
  return {
    before: emptySet(),
    after: emptySet()
  };
}

function log(message) {
  state.eventLog.unshift(message);
  state.eventLog = state.eventLog.slice(0, 10);
}

function nvs(message) {
  state.nvsLogs.unshift(message);
  state.nvsLogs = state.nvsLogs.slice(0, 6);
}

function activeSet() {
  return state.cache[state.active];
}

function displayValue(slot) {
  const value = activeSet()[slot];
  if (value === null) return '---';
  if (slot === 'RA') return `${value.temp}F/${value.rh}%`;
  if (slot === 'SL' || slot === 'LL') return `${value.pipe}F sat ${value.sat}F`;
  return `${value.temp}F`;
}

function ledStatus(slot) {
  if (state.faultedSlot === slot) return 'FLASH_YELLOW';
  return activeSet()[slot] ? 'GREEN_SOLID' : 'YELLOW_SOLID';
}

function retransmit(reason) {
  if (!state.bleConnected) {
    log(`BLE offline: ${state.active.toUpperCase()} cache retained locally; app mirror not updated.`);
    nvs(`BLE_MISS ${state.active.toUpperCase()} ${reason}`);
    return;
  }

  state.notificationSeq += 1;
  state.appDraft[state.active] = JSON.parse(JSON.stringify(activeSet()));
  state.appDraft.lastNotificationSeq = state.notificationSeq;
  log(`BLE notification ${state.notificationSeq}: retransmitted ${state.active.toUpperCase()} cache after ${reason}.`);
}

function capture(slot) {
  if (state.faultedSlot === slot) {
    log(`${SLOT_LABELS[slot]} capture blocked: simulated sensor fault.`);
    nvs(`SENSOR_FAULT ${slot}`);
    return;
  }

  const base = 50 + Math.random() * 55;
  activeSet()[slot] = slot === 'RA'
    ? { temp: Number(base.toFixed(1)), rh: Math.round(42 + Math.random() * 18), seq: state.notificationSeq + 1 }
    : slot === 'SL' || slot === 'LL'
      ? { pipe: Number(base.toFixed(1)), sat: slot === 'SL' ? 40 : 105, seq: state.notificationSeq + 1 }
      : { temp: Number(base.toFixed(1)), seq: state.notificationSeq + 1 };

  log(`Captured ${SLOT_LABELS[slot]} into ${state.active.toUpperCase()} device cache.`);
  retransmit(`${slot} capture`);
}

function switchContext() {
  state.active = state.active === 'before' ? 'after' : 'before';
  log(`Physical switch moved to ${state.active.toUpperCase()}; display pointer swapped immediately.`);
  retransmit('physical switch movement');
}

function replayActiveSet() {
  log(`Manual recovery replay requested for ${state.active.toUpperCase()} cache.`);
  retransmit('manual replay');
}

function toggleFault() {
  const currentIndex = state.faultedSlot ? SLOT_ORDER.indexOf(state.faultedSlot) : -1;
  state.faultedSlot = currentIndex === SLOT_ORDER.length - 1 ? null : SLOT_ORDER[currentIndex + 1];
  log(state.faultedSlot ? `Fault injected on ${SLOT_LABELS[state.faultedSlot]}; LED should flash yellow.` : 'All simulated sensor faults cleared.');
}

function reset() {
  state.active = 'before';
  state.bleConnected = true;
  state.faultedSlot = null;
  state.notificationSeq = 0;
  state.cache = emptyCache();
  state.appDraft = { before: emptySet(), after: emptySet(), lastNotificationSeq: 0 };
  state.nvsLogs = ['Reset: cache pointers and BLE sequence cleared.'];
  state.eventLog = ['Simulator reset. BEFORE cache active.'];
}

function renderTable(title, set) {
  console.log(title);
  for (const slot of SLOT_ORDER) {
    const value = set[slot];
    const rendered = value ? JSON.stringify(value) : 'missing';
    console.log(`  ${slot.padEnd(2)} ${SLOT_LABELS[slot].padEnd(17)} ${rendered}`);
  }
}

function render() {
  console.clear();
  console.log('HVAC Helper Pro - BEFORE/AFTER Switch Context-Swap Prototype (V1)');
  console.log('Question: can the handheld swap display caches and recover mobile sync without confusing the technician?\n');
  console.log(`Active switch: ${state.active.toUpperCase()} | BLE: ${state.bleConnected ? 'CONNECTED' : 'DISCONNECTED'} | Last app notification: ${state.appDraft.lastNotificationSeq}`);
  console.log('\nTop display pointer:');
  console.log(`  RA ${displayValue('RA').padEnd(12)} SA ${displayValue('SA').padEnd(8)} OA ${displayValue('OA').padEnd(8)} DA ${displayValue('DA').padEnd(8)}`);
  console.log(`  SL ${displayValue('SL').padEnd(18)} LL ${displayValue('LL').padEnd(18)}`);
  console.log('\nProgress LEDs for active set:');
  console.log(SLOT_ORDER.map((slot) => `${slot}:${ledStatus(slot)}`).join('  '));
  console.log('\nDevice cache:');
  renderTable('  BEFORE', state.cache.before);
  renderTable('  AFTER', state.cache.after);
  console.log('\nMobile app mirror:');
  renderTable('  BEFORE', state.appDraft.before);
  renderTable('  AFTER', state.appDraft.after);
  console.log('\nNVS / recovery log:');
  state.nvsLogs.forEach((line) => console.log(`  - ${line}`));
  console.log('\nRecent events:');
  state.eventLog.forEach((line) => console.log(`  - ${line}`));
  console.log('\nControls: [tab] switch BEFORE/AFTER  [1] RA  [2] SA  [3] OA  [4] DA  [5] SL  [6] LL');
  console.log('          [b] BLE connect/disconnect  [r] replay active cache  [f] cycle fault  [c] reset  [q] quit');
}

if (process.stdin.isTTY) process.stdin.setRawMode(true);
process.stdin.resume();
process.stdin.setEncoding('utf8');
process.stdin.on('data', (data) => {
  const key = data.toLowerCase();
  if (key === 'q' || key === '\u0003') process.exit(0);
  if (data === '\t') switchContext();
  if (key === '1') capture('RA');
  if (key === '2') capture('SA');
  if (key === '3') capture('OA');
  if (key === '4') capture('DA');
  if (key === '5') capture('SL');
  if (key === '6') capture('LL');
  if (key === 'b') {
    state.bleConnected = !state.bleConnected;
    log(`BLE ${state.bleConnected ? 'reconnected' : 'disconnected'}.`);
  }
  if (key === 'r') replayActiveSet();
  if (key === 'f') toggleFault();
  if (key === 'c') reset();
  render();
});

render();
