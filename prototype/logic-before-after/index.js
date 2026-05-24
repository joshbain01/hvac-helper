// PROTOTYPE — TUI shell (throwaway, do not ship)
// Run: npm run prototype:logic-before-after
import { initialState, reduce, SLOTS, SLOT_LABELS } from './logic.js';

const C = {
  reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m',
  green: '\x1b[32m', yellow: '\x1b[33m', red: '\x1b[31m',
};
const B = s => `${C.bold}${s}${C.reset}`;
const D = s => `${C.dim}${s}${C.reset}`;
const G = s => `${C.green}${s}${C.reset}`;
const Y = s => `${C.yellow}${s}${C.reset}`;
const R = s => `${C.red}${s}${C.reset}`;

let state = initialState();

function fmtVal(slot, val) {
  if (!val) return '---';
  if (slot === 'RA') return `${val.temp}F/${val.rh}%`;
  if (slot === 'SL' || slot === 'LL') return `${val.pipe}F sat${val.sat}F`;
  return `${val.temp}F`;
}

function slotLed(s, side, slot) {
  if (s.faultedSlot === slot) return Y('⚡');
  return s.cache[side][slot] ? G('●') : D('○');
}

function mirrorLed(s, side, slot) {
  return s.appMirror[side][slot] ? G('●') : D('○');
}

function render() {
  const s = state;
  const syncStale = s.appMirror.seq < s.notificationSeq;
  const bleStr = s.bleConnected ? G('CONNECTED') : R('DISCONNECTED');
  const syncStr = syncStale
    ? R(`${s.appMirror.seq}/${s.notificationSeq} STALE`)
    : G(`${s.appMirror.seq}/${s.notificationSeq} IN SYNC`);
  const faultStr = s.faultedSlot ? `   ${Y('⚡ fault: ' + s.faultedSlot)}` : '';

  const lines = [
    B('BEFORE/AFTER Switch Prototype') + '  ' + D('THROWAWAY'),
    D('Q: does the handheld swap display caches and recover BLE sync without confusing the technician?'),
    '',
    `${B('Switch:')} ${B(s.active.toUpperCase())}   ${B('BLE:')} ${bleStr}   ${B('App sync:')} ${syncStr}${faultStr}`,
    '',
    B('Active display') + D(`  (${s.active.toUpperCase()} cache)`),
  ];

  for (const slot of SLOTS) {
    const val = s.cache[s.active][slot];
    const raw = fmtVal(slot, val);
    const icon = s.faultedSlot === slot ? Y('⚡') : val ? G('●') : D('○');
    const label = D(SLOT_LABELS[slot].padEnd(17));
    const value = val ? raw : D(raw);
    lines.push(`  ${icon} ${B(slot)}  ${label} ${value}`);
  }

  lines.push('', B('Cache comparison'), D('  Slot  Before              After'));

  for (const slot of SLOTS) {
    const bVal = s.cache.before[slot];
    const aVal = s.cache.after[slot];
    const bRaw = fmtVal(slot, bVal);
    const aRaw = fmtVal(slot, aVal);
    const pad = ' '.repeat(Math.max(0, 20 - bRaw.length));
    const bRendered = bVal ? bRaw : D(bRaw);
    const aRendered = aVal ? aRaw : D(aRaw);
    lines.push(`  ${B(slot)}    ${bRendered}${pad}${aRendered}`);
  }

  lines.push('', B('Mobile app mirror'));
  for (const side of ['before', 'after']) {
    const leds = SLOTS.map(sl => `${D(sl)} ${mirrorLed(s, side, sl)}`).join('  ');
    lines.push(`  ${side.toUpperCase().padEnd(7)} ${leds}`);
  }

  lines.push('', B('Events'));
  s.eventLog.slice(0, 5).forEach(line => lines.push(`  ${D('>')} ${line}`));

  lines.push(
    '',
    D('[tab] switch  [1] RA  [2] SA  [3] OA  [4] DA  [5] SL  [6] LL  [b] BLE  [r] replay  [f] fault  [c] reset  [q] quit'),
  );

  process.stdout.write('\x1Bc');
  console.log(lines.join('\n'));
}

if (process.stdin.isTTY) process.stdin.setRawMode(true);
process.stdin.resume();
process.stdin.setEncoding('utf8');

process.stdin.on('data', data => {
  const key = data.toLowerCase();
  if (key === 'q' || key === '') process.exit(0);
  if (data === '\t')   state = reduce(state, { type: 'SWITCH' });
  else if (key === '1') state = reduce(state, { type: 'CAPTURE', slot: 'RA' });
  else if (key === '2') state = reduce(state, { type: 'CAPTURE', slot: 'SA' });
  else if (key === '3') state = reduce(state, { type: 'CAPTURE', slot: 'OA' });
  else if (key === '4') state = reduce(state, { type: 'CAPTURE', slot: 'DA' });
  else if (key === '5') state = reduce(state, { type: 'CAPTURE', slot: 'SL' });
  else if (key === '6') state = reduce(state, { type: 'CAPTURE', slot: 'LL' });
  else if (key === 'b') state = reduce(state, { type: 'TOGGLE_BLE' });
  else if (key === 'r') state = reduce(state, { type: 'REPLAY' });
  else if (key === 'f') state = reduce(state, { type: 'CYCLE_FAULT' });
  else if (key === 'c') state = reduce(state, { type: 'RESET' });
  render();
});

render();
