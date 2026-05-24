const state = {
  slotA: { version: '1.0.0', valid: true, bootable: true },
  slotB: { version: '1.1.0-candidate', valid: false, bootable: true },
  active: 'A',
  pending: null,
  confirmed: 'A',
  watchdogCrashes: 0,
  signatureOk: false,
  selfTestOk: false,
  logs: ['Active slot A is confirmed. Slot B contains a staged update.']
};

function log(msg) {
  state.logs.unshift(msg);
  state.logs = state.logs.slice(0, 8);
}

function render() {
  console.clear();
  console.log('HVAC Helper Pro - Partition Swap and Rollback Prototype');
  console.log('Question: what boot flags and checks keep a bad update from bricking the handheld?\n');
  console.table({
    slotA: state.slotA,
    slotB: state.slotB
  });
  console.log(`Active=${state.active} Pending=${state.pending || 'none'} Confirmed=${state.confirmed}`);
  console.log(`Signature=${state.signatureOk ? 'PASS' : 'FAIL'} Self-test=${state.selfTestOk ? 'PASS' : 'FAIL'} Watchdog crashes=${state.watchdogCrashes}`);
  console.log('\nEvents:');
  state.logs.forEach((l) => console.log(`- ${l}`));
  console.log('\nControls: [s] verify signature  [b] boot pending  [t] self-test  [c] confirm  [w] watchdog crash  [h] hold RA+SA rollback  [r] reset  [q] quit');
}

function reset() {
  state.active = 'A';
  state.pending = null;
  state.confirmed = 'A';
  state.watchdogCrashes = 0;
  state.signatureOk = false;
  state.selfTestOk = false;
  state.slotB.valid = false;
  state.logs = ['Reset to confirmed slot A.'];
}

function key(k) {
  if (k === 'q') process.exit(0);
  if (k === 'r') reset();
  if (k === 's') {
    state.signatureOk = true;
    state.slotB.valid = true;
    state.pending = 'B';
    log('Signature verification passed. Slot B marked pending, not confirmed.');
  }
  if (k === 'b') {
    if (!state.pending) log('No pending slot to boot.');
    else {
      state.active = state.pending;
      state.selfTestOk = false;
      log(`Booted pending slot ${state.active}. Confirmation timer is running.`);
    }
  }
  if (k === 't') {
    if (state.active !== state.pending) log('Self-test ignored: active firmware is already confirmed.');
    else {
      state.selfTestOk = true;
      log('Power-on self-test passed: buttons, display, BLE, probes, and NVS are responsive.');
    }
  }
  if (k === 'c') {
    if (state.active === state.pending && state.signatureOk && state.selfTestOk) {
      state.confirmed = state.active;
      state.pending = null;
      log(`Slot ${state.confirmed} confirmed. Future watchdog resets stay on this slot.`);
    } else log('Cannot confirm until pending slot has valid signature and self-test pass.');
  }
  if (k === 'w') {
    state.watchdogCrashes += 1;
    if (state.pending && state.active === state.pending) {
      state.active = state.confirmed;
      state.pending = null;
      log('Watchdog crash during pending boot. Rolled back to last confirmed slot.');
    } else log('Watchdog crash logged, but active slot was already confirmed.');
  }
  if (k === 'h') {
    state.active = state.confirmed;
    state.pending = null;
    log('Physical RA+SA override held during power-up. Forced rollback to confirmed slot.');
  }
  render();
}

if (process.stdin.isTTY) process.stdin.setRawMode(true);
process.stdin.resume();
process.stdin.setEncoding('utf8');
process.stdin.on('data', (d) => key(d.toLowerCase()));
render();
