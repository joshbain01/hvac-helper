const checks = [
  ['display', 'I2C OLED responds'],
  ['buttons', 'Six tactile inputs debounce'],
  ['encoders', 'Suction and liquid encoders report ticks'],
  ['ble', 'BLE radio advertises service'],
  ['probes', 'Clamp probes return plausible readings'],
  ['battery', 'Battery and charger telemetry available']
];

const state = { faults: new Set(), results: new Map(), mode: 'NOT_RUN', logs: ['Power applied. POST has not run yet.'] };

function log(message) {
  state.logs.unshift(message);
  state.logs = state.logs.slice(0, 8);
}

function runPost() {
  state.results.clear();
  for (const [key, label] of checks) {
    const ok = !state.faults.has(key);
    state.results.set(key, ok ? 'PASS' : 'FAIL');
    log(`${label}: ${ok ? 'PASS' : 'FAIL'}`);
  }
  const failed = [...state.results.values()].filter((v) => v === 'FAIL').length;
  state.mode = failed === 0 ? 'FULL_SERVICE' : failed <= 2 ? 'DEGRADED_STANDALONE' : 'SERVICE_LOCKOUT';
  log(`POST complete. Device mode: ${state.mode}.`);
}

function render() {
  console.clear();
  console.log('HVAC Helper Pro - Hardware POST Prototype');
  console.log('Question: how should firmware detect component faults and choose degraded modes?\n');
  console.log(`Current mode: ${state.mode}`);
  for (const [i, [key, label]] of checks.entries()) {
    const result = state.results.get(key) || 'PENDING';
    const fault = state.faults.has(key) ? 'FAULT INJECTED' : 'normal';
    console.log(`${i + 1}. ${key.padEnd(8)} ${result.padEnd(8)} ${fault.padEnd(15)} ${label}`);
  }
  console.log('\nEvents:');
  state.logs.forEach((line) => console.log(`- ${line}`));
  console.log('\nControls: [1-6] toggle fault  [p] run POST  [r] reset  [q] quit');
}

function reset() {
  state.faults.clear();
  state.results.clear();
  state.mode = 'NOT_RUN';
  state.logs = ['Reset POST simulator.'];
}

function toggleFault(index) {
  const item = checks[index];
  if (!item) return;
  if (state.faults.has(item[0])) {
    state.faults.delete(item[0]);
    log(`Fault cleared: ${item[0]}`);
  } else {
    state.faults.add(item[0]);
    log(`Fault injected: ${item[0]}`);
  }
}

if (process.stdin.isTTY) process.stdin.setRawMode(true);
process.stdin.resume();
process.stdin.setEncoding('utf8');
process.stdin.on('data', (data) => {
  const key = data.toLowerCase();
  if (key === 'q') process.exit(0);
  if (key === 'p') runPost();
  if (key === 'r') reset();
  if ('123456'.includes(key)) toggleFault(Number(key) - 1);
  render();
});

render();
