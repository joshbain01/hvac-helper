// PROTOTYPE — throwaway. Delete or absorb when questions are answered.

const CHECKS = [
  { key: 'display',  label: 'I2C OLED responds',                   criticality: 'CRITICAL',   lockoutAlone: true  },
  { key: 'buttons',  label: 'Six tactile inputs debounce',          criticality: 'CRITICAL',   lockoutAlone: false },
  { key: 'encoders', label: 'Suction/liquid encoders report ticks', criticality: 'CRITICAL',   lockoutAlone: false },
  { key: 'ble',      label: 'BLE radio advertises service',         criticality: 'DEGRADABLE', lockoutAlone: false },
  { key: 'probes',   label: 'Clamp probes return plausible values', criticality: 'DEGRADABLE', lockoutAlone: false },
  { key: 'battery',  label: 'Battery and charger telemetry ok',     criticality: 'DEGRADABLE', lockoutAlone: false },
];

const state = {
  faults: new Set(),
  results: new Map(),
  mode: 'NOT_RUN',
  lockoutReason: null,
  logs: ['Power applied. POST has not run yet.'],
};

function log(msg) {
  state.logs.unshift(msg);
  state.logs = state.logs.slice(0, 8);
}

// Q3: combination-aware lockout rules — critical-alone, critical-pair, then count fallback
function computeMode() {
  const failed = CHECKS.filter(c => state.results.get(c.key) === 'FAIL');
  if (failed.length === 0) return ['FULL_SERVICE', null];

  if (state.results.get('display') === 'FAIL')
    return ['SERVICE_LOCKOUT', 'display failed — no output to technician'];

  if (state.results.get('buttons') === 'FAIL' && state.results.get('encoders') === 'FAIL')
    return ['SERVICE_LOCKOUT', 'buttons + encoders both failed — no input mechanism'];

  if (failed.length >= 3)
    return ['SERVICE_LOCKOUT', `${failed.length} components failed — too degraded for safe operation`];

  return ['DEGRADED_STANDALONE', null];
}

function runPost() {
  state.results.clear();
  for (const c of CHECKS) {
    state.results.set(c.key, state.faults.has(c.key) ? 'FAIL' : 'PASS');
  }
  const [mode, reason] = computeMode();
  state.mode = mode;
  state.lockoutReason = reason;
  const failCount = [...state.results.values()].filter(v => v === 'FAIL').length;
  if (failCount === 0) {
    log('[POST PASS] All 6 checks passed → FULL_SERVICE');
  } else {
    log(`[POST RESULT] ${failCount} failure(s) → ${mode}${reason ? ': ' + reason : ''}`);
  }
}

const MODE_DESC = {
  NOT_RUN:             'NOT_RUN — POST has not executed yet',
  FULL_SERVICE:        'FULL_SERVICE ✓ — all checks passed, normal operation',
  DEGRADED_STANDALONE: 'DEGRADED_STANDALONE ⚠ — partial failure, limited function',
  SERVICE_LOCKOUT:     'SERVICE_LOCKOUT ✗ — critical failure, device unusable',
};

function render() {
  console.clear();
  console.log('HVAC Helper Pro — Hardware POST Prototype');
  console.log('Question: which faults block normal operation, and which only degrade it?\n');

  // Q1 + Q4: check list with criticality visible to technician
  console.log('── POST Checks (Q1: CRITICAL = required for full-service  Q4: technician-readable output) ──');
  console.log('  #  Component  Criticality  Result    Fault     Description');
  console.log('  ─  ─────────  ───────────  ────────  ────────  ──────────────────────────────────');
  for (const [i, c] of CHECKS.entries()) {
    const result   = (state.results.get(c.key) || 'PENDING').padEnd(8);
    const injected = state.faults.has(c.key) ? '⚡ FAULT' : '       ';
    console.log(`  ${i + 1}  ${c.key.padEnd(9)}  ${c.criticality.padEnd(11)}  ${result}  ${injected}  ${c.label}`);
  }

  // Q2 + Q3: mode decision with lockout rules surfaced
  console.log('\n── Device Mode (Q2: failure tolerance  Q3: lockout combinations) ──────────────────────');
  console.log(`  Mode: ${MODE_DESC[state.mode]}`);
  if (state.lockoutReason) console.log(`  Lockout reason: ${state.lockoutReason}`);
  console.log('');
  console.log('  Lockout rules (Q3):');
  console.log('    display alone      → SERVICE_LOCKOUT  (no output to technician)');
  console.log('    buttons + encoders → SERVICE_LOCKOUT  (both input mechanisms lost)');
  console.log('    3+ any failures    → SERVICE_LOCKOUT  (too many subsystems compromised)');
  console.log('    1–2 non-critical   → DEGRADED_STANDALONE');
  console.log('    0 failures         → FULL_SERVICE');

  // Q5: mode reasoning visible before POST runs — shows projected mode from current faults
  const projected = state.mode === 'NOT_RUN' && state.faults.size > 0 ? (() => {
    const tmp = new Map(CHECKS.map(c => [c.key, state.faults.has(c.key) ? 'FAIL' : 'PASS']));
    const origResults = state.results;
    state.results = tmp;
    const [m, r] = computeMode();
    state.results = origResults;
    return `${m}${r ? ': ' + r : ''}`;
  })() : null;
  if (projected) console.log(`\n  Projected mode if POST ran now: ${projected}  (Q5: reason ahead)`);

  // Events
  console.log('\n── Events ────────────────────────────────────────────────────────────────────────────');
  state.logs.forEach(l => console.log(`  ${l}`));

  console.log('\nControls: [1-6] toggle fault  [p] run POST  [r] reset  [q] quit');
}

function reset() {
  state.faults.clear();
  state.results.clear();
  state.mode = 'NOT_RUN';
  state.lockoutReason = null;
  state.logs = ['Reset. POST has not run yet.'];
}

function toggleFault(index) {
  const c = CHECKS[index];
  if (!c) return;
  if (state.faults.has(c.key)) {
    state.faults.delete(c.key);
    log(`Fault cleared: ${c.key}`);
  } else {
    state.faults.add(c.key);
    log(`Fault injected: ${c.key}`);
  }
}

if (process.stdin.isTTY) process.stdin.setRawMode(true);
process.stdin.resume();
process.stdin.setEncoding('utf8');
process.stdin.on('data', (d) => {
  const k = d.toLowerCase();
  if (k === 'q') process.exit(0);
  if (k === 'p') { runPost(); render(); return; }
  if (k === 'r') { reset(); render(); return; }
  if ('123456'.includes(k)) { toggleFault(Number(k) - 1); render(); }
});
render();
