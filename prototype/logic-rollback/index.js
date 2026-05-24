// PROTOTYPE — throwaway. Delete or absorb when questions are answered.

const state = {
  slotA: { version: '1.0.0' },
  slotB: { version: '1.1.0-candidate' },
  active: 'A',
  pending: null,
  confirmed: 'A',
  staged: false,
  signatureOk: false,
  selfTestOk: false,
  watchdogCrashes: 0,
  blockedBootAttempts: 0,
  logs: ['Active slot A confirmed. Slot B has a candidate image ready to stage.'],
};

function log(msg) {
  state.logs.unshift(msg);
  state.logs = state.logs.slice(0, 8);
}

// Q1: the named FSM phases make each state transition explicit
function phase() {
  if (!state.staged && !state.pending && state.active === state.confirmed) return 'CONFIRMED';
  if (state.staged && !state.signatureOk)                                  return 'STAGED_UNVERIFIED';
  if (state.signatureOk && state.pending && state.active !== state.pending) return 'AWAITING_BOOT';
  if (state.pending && state.active === state.pending && !state.selfTestOk) return 'PENDING_BOOT';
  if (state.pending && state.active === state.pending && state.selfTestOk)  return 'SELF_TEST_PASSED';
  return 'CONFIRMED';
}

const PHASE_DESC = {
  CONFIRMED:        'CONFIRMED — stable, no update in flight',
  STAGED_UNVERIFIED:'STAGED_UNVERIFIED — image downloaded, signature not yet checked  ← Q1: not pending yet',
  AWAITING_BOOT:    'AWAITING_BOOT — signature verified, not yet booted  ← Q1: this is the pending transition',
  PENDING_BOOT:     'PENDING_BOOT — running new firmware, confirmation window open',
  SELF_TEST_PASSED: 'SELF_TEST_PASSED — self-test clear, awaiting software confirmation',
};

const NEXT_ACTION = {
  CONFIRMED:        '[d] download image to slot B',
  STAGED_UNVERIFIED:'[s] verify signature  –or–  [h] physical rollback',
  AWAITING_BOOT:    '[b] boot pending slot',
  PENDING_BOOT:     '[t] run self-test  –or–  [w] watchdog crash  –or–  [h] physical rollback (Q5: works even here)',
  SELF_TEST_PASSED: '[c] confirm  –or–  [w] watchdog crash  –or–  [h] physical rollback',
};

function render() {
  console.clear();
  const p = phase();

  console.log('HVAC Helper Pro — Partition Swap and Rollback Prototype');
  console.log('Question: what boot flags and checks keep a bad update from bricking the handheld?\n');

  // Slot display
  console.log('── Partitions ────────────────────────────────────────────────────');
  const tagA = [state.active === 'A' ? '◀ active' : '', state.confirmed === 'A' ? '★ confirmed' : ''].filter(Boolean).join('  ');
  const tagB = [state.active === 'B' ? '◀ active' : '', state.confirmed === 'B' ? '★ confirmed' : '', state.pending === 'B' ? '⏳ pending' : ''].filter(Boolean).join('  ');
  console.log(`  Slot A  v${state.slotA.version.padEnd(22)} ${tagA}`);
  console.log(`  Slot B  v${state.slotB.version.padEnd(22)} ${tagB}`);

  // Q1: FSM phase — makes the pending transition visible
  console.log('\n── FSM Phase (Q1: which transition marks pending?) ───────────────');
  console.log(`  Phase:  ${PHASE_DESC[p]}`);
  console.log(`  Next:   ${NEXT_ACTION[p]}`);

  // Q2 + Q3: safety gates
  console.log('\n── Safety Gates (Q2: sig blocks boot, Q3: self-test blocks confirm) ─');
  console.log(`  Staged:                     ${state.staged ? 'yes — image in slot B' : 'no'}`);
  console.log(`  Signature:                  ${state.signatureOk ? 'VERIFIED ✓' : 'not verified'}`);
  console.log(`  Self-test:                  ${state.selfTestOk ? 'PASSED ✓' : 'not run'}`);
  console.log(`  Blocked boot attempts (Q2): ${state.blockedBootAttempts}  ← boots refused due to missing signature`);

  // Q4 + Q5: rollback
  console.log('\n── Rollback (Q4: watchdog, Q5: physical RA+SA override) ─────────');
  const unconfirmedWarning = state.active !== state.confirmed ? '  ⚠ not confirmed — watchdog will roll back here' : '  (matches confirmed)';
  console.log(`  Active slot:    ${state.active}${unconfirmedWarning}`);
  console.log(`  Confirmed slot: ${state.confirmed}  ← both watchdog and physical override always land here`);
  console.log(`  Watchdog crashes: ${state.watchdogCrashes}`);

  // Events
  console.log('\n── Events ────────────────────────────────────────────────────────');
  state.logs.forEach(l => console.log(`  ${l}`));

  console.log('\nControls: [d] download  [s] verify sig  [b] boot  [t] self-test  [c] confirm  [w] watchdog  [h] RA+SA override  [r] reset  [q] quit');
}

function clearUpdateState() {
  state.staged = false;
  state.signatureOk = false;
  state.selfTestOk = false;
  state.pending = null;
}

function reset() {
  Object.assign(state, {
    active: 'A', pending: null, confirmed: 'A',
    staged: false, signatureOk: false, selfTestOk: false,
    watchdogCrashes: 0, blockedBootAttempts: 0,
    logs: ['Reset to confirmed slot A.'],
  });
}

function key(k) {
  if (k === 'q') process.exit(0);
  if (k === 'r') { reset(); render(); return; }

  const p = phase();

  // [d] Download/stage image — Q1: this enters STAGED_UNVERIFIED, NOT pending yet
  if (k === 'd') {
    if (p !== 'CONFIRMED') { log('Cannot download: an update is already in flight.'); }
    else { state.staged = true; log('[STAGED] Slot B image downloaded. No signature check yet — not pending.'); }
  }

  // [s] Verify signature — Q1: this is the transition that sets pending
  if (k === 's') {
    if (!state.staged)         { log('No staged image. Download first [d].'); }
    else if (state.signatureOk){ log('Signature already verified.'); }
    else {
      state.signatureOk = true;
      state.pending = 'B';
      log('[PENDING SET] Signature verified. Slot B is now pending — eligible to boot, not yet confirmed.');
    }
  }

  // [b] Boot pending — Q2: blocked if staged but signature not verified
  if (k === 'b') {
    if (!state.staged && !state.pending) {
      log('Nothing staged or pending. Download an image first [d].');
    } else if (state.staged && !state.signatureOk) {
      state.blockedBootAttempts++;
      log(`[BLOCKED Q2] Boot refused — slot B has not passed signature verification. Attempt #${state.blockedBootAttempts}.`);
    } else if (state.pending) {
      state.active = state.pending;
      state.selfTestOk = false;
      log(`[PENDING BOOT] Booted slot ${state.active}. Watchdog armed — confirmation window open.`);
    }
  }

  // [t] Self-test — Q3: must pass before confirm is allowed
  if (k === 't') {
    if (state.active !== state.pending) { log('Self-test only applies to pending firmware. Active slot is already confirmed.'); }
    else {
      state.selfTestOk = true;
      log('[SELF-TEST PASS] Buttons, display, BLE, probes, NVS all responsive.');
    }
  }

  // [c] Confirm — Q3: gated on signature + self-test
  if (k === 'c') {
    if (state.active === state.pending && state.signatureOk && state.selfTestOk) {
      state.confirmed = state.active;
      clearUpdateState();
      log(`[CONFIRMED] Slot ${state.confirmed} confirmed. Watchdog resets will stay on this slot.`);
    } else {
      const missing = [];
      if (state.active !== state.pending) missing.push('must be booted into pending slot');
      if (!state.signatureOk)             missing.push('signature not verified');
      if (!state.selfTestOk)              missing.push('self-test not passed');
      log(`[BLOCKED Q3] Cannot confirm — missing: ${missing.join('; ')}.`);
    }
  }

  // [w] Watchdog crash — Q4: rolls back to last confirmed from any pending state
  if (k === 'w') {
    state.watchdogCrashes++;
    if (state.active !== state.confirmed) {
      const from = state.active;
      state.active = state.confirmed;
      clearUpdateState();
      log(`[WATCHDOG Q4] Crashed on slot ${from} → rolled back to confirmed slot ${state.confirmed}.`);
    } else {
      log(`[WATCHDOG] Fired on already-confirmed slot ${state.active}. No rollback needed.`);
    }
  }

  // [h] Physical RA+SA override — Q5: works in any phase, bypasses software confirmation entirely
  if (k === 'h') {
    const from = state.active;
    state.active = state.confirmed;
    clearUpdateState();
    log(`[PHYSICAL OVERRIDE Q5] RA+SA held at power-up. Forced ${from} → slot ${state.confirmed}. Software state ignored.`);
  }

  render();
}

if (process.stdin.isTTY) process.stdin.setRawMode(true);
process.stdin.resume();
process.stdin.setEncoding('utf8');
process.stdin.on('data', (d) => key(d.toLowerCase()));
render();
