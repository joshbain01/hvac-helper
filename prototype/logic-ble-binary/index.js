// PROTOTYPE — throwaway. Delete or absorb when questions are answered.

const FLAGS = {
  0: 'compressor-on',
  1: 'heat-mode',
  2: 'defrost-active',
  3: 'filter-alert',
  4: 'fault',
  5: 'low-pressure',
};

// BLE ATT payload budgets (ATT_MTU minus 3-byte ATT header)
const BLE_BUDGETS = {
  '4.2 (default MTU=23)': 20,
  '5.x (negotiated MTU=247)': 244,
};

const FIELDS = [
  { key: 'raTemp', label: 'Return Air Temp',      bytes: 2 },
  { key: 'raRh',   label: 'Return Air RH',        bytes: 2 },
  { key: 'saTemp', label: 'Supply Air Temp',      bytes: 2 },
  { key: 'oaTemp', label: 'Outdoor Air Temp',     bytes: 2 },
  { key: 'daTemp', label: 'Discharge Air Temp',   bytes: 2 },
  { key: 'slPipe', label: 'Suction Line Pipe',    bytes: 2 },
  { key: 'llPipe', label: 'Liquid Line Pipe',     bytes: 2 },
  { key: 'slSat',  label: 'Suction Line Sat',     bytes: 2 },
  { key: 'llSat',  label: 'Liquid Line Sat',      bytes: 2 },
  { key: 'flags',  label: 'State Flags',          bytes: 2 },
];

const reading = {
  raTemp: 75.4,
  raRh: 49,
  saTemp: 56.2,
  oaTemp: 94.8,
  daTemp: 108.1,
  slPipe: 52.2,
  llPipe: 92.4,
  slSat: 40,
  llSat: 105,
  flags: 0b001011,
};

let bleVersionIndex = 0;

function fixedPoint(value) {
  return Math.round(value * 10);
}

function fromFixedPoint(raw) {
  return raw / 10;
}

function encodeBinary() {
  const buffer = Buffer.alloc(20);
  const sensorFields = FIELDS.filter(f => f.key !== 'flags');
  sensorFields.forEach((f, i) => buffer.writeInt16LE(fixedPoint(reading[f.key]), i * 2));
  buffer.writeUInt16LE(reading.flags, 18);
  return buffer;
}

function decodeBinary(buffer) {
  const decoded = {};
  FIELDS.filter(f => f.key !== 'flags').forEach((f, i) => {
    decoded[f.key] = fromFixedPoint(buffer.readInt16LE(i * 2));
  });
  decoded.flags = buffer.readUInt16LE(18);
  return decoded;
}

function activeFlags(flags) {
  return Object.entries(FLAGS)
    .filter(([bit]) => flags & (1 << Number(bit)))
    .map(([, name]) => name);
}

function render() {
  console.clear();
  const json = Buffer.from(JSON.stringify(reading));
  const binary = encodeBinary();
  const decoded = decodeBinary(binary);

  const bleVersions = Object.keys(BLE_BUDGETS);
  const bleName = bleVersions[bleVersionIndex % bleVersions.length];
  const bleBudget = BLE_BUDGETS[bleName];
  const headroom = bleBudget - binary.length;

  console.log('HVAC Helper Pro — Compact BLE Binary Serialization Prototype');
  console.log('Question: can readings fit in one BLE payload without JSON overhead?\n');

  // Q4: Packet field map — where does each field live?
  console.log('── Packet Layout ──────────────────────────────────────────');
  let offset = 0;
  FIELDS.forEach(f => {
    const end = offset + f.bytes - 1;
    console.log(`  bytes [${String(offset).padStart(2,'0')}–${String(end).padStart(2,'0')}]  ${f.label}`);
    offset += f.bytes;
  });

  // Q3: Round-trip precision — does fixed-point encode/decode lose information?
  console.log('\n── Round-trip Precision (Q3: are tenths precise enough?) ──');
  let allOk = true;
  FIELDS.filter(f => f.key !== 'flags').forEach(f => {
    const orig = reading[f.key];
    const dec  = decoded[f.key];
    const delta = Math.abs(orig - dec);
    const ok = delta < 0.05;
    if (!ok) allOk = false;
    const tag = ok ? '✓' : '✗ PRECISION LOSS';
    console.log(`  ${f.label.padEnd(22)} ${String(orig).padStart(6)} → ${String(dec).padStart(6)}  Δ=${delta.toFixed(3)}  ${tag}`);
  });
  console.log(`  Verdict: ${allOk ? 'fixed-point x10 is lossless for these values' : 'PRECISION LOSS DETECTED'}`);

  // Q4: Active flags decoded
  const active = activeFlags(reading.flags);
  console.log('\n── State Flags (Q4: flags decoded) ────────────────────────');
  console.log(`  Raw:    0b${reading.flags.toString(2).padStart(6, '0')}  (hex: ${reading.flags.toString(16).padStart(2,'0')})`);
  console.log(`  Active: ${active.length ? active.join(', ') : '(none)'}`);

  // Q5: BLE payload budget
  console.log(`\n── BLE Payload Budget (Q5: room for headers/CRC?) ─────────`);
  console.log(`  Standard:      BLE ${bleName}`);
  console.log(`  ATT data cap:  ${bleBudget} bytes`);
  console.log(`  Sensor data:   ${binary.length} bytes`);
  if (headroom === 0) {
    console.log(`  Headroom:      0 bytes  ⚠ ZERO HEADROOM — no room for version or CRC`);
  } else {
    const canFit = headroom >= 3 ? `fits version(1)+CRC(2) with ${headroom - 3}B spare` : `tight — only ${headroom}B left`;
    console.log(`  Headroom:      ${headroom} bytes  → ${canFit}`);
  }

  // Q1+Q2: Size comparison
  console.log('\n── JSON vs Binary (Q1+Q2: overhead comparison) ────────────');
  console.log(`  JSON:   ${json.length} bytes`);
  console.log(`  Binary: ${binary.length} bytes  (${Math.round((1 - binary.length / json.length) * 100)}% smaller)`);
  console.log(`  Hex:    ${binary.toString('hex')}`);

  console.log('\nControls: [r] randomize readings  [f] toggle flags  [b] cycle BLE budget  [q] quit');
}

function randomize() {
  for (const key of Object.keys(reading)) {
    if (key === 'flags') continue;
    reading[key] = Number((reading[key] + (Math.random() * 6 - 3)).toFixed(1));
  }
}

if (process.stdin.isTTY) process.stdin.setRawMode(true);
process.stdin.resume();
process.stdin.setEncoding('utf8');
process.stdin.on('data', (data) => {
  const key = data.toLowerCase();
  if (key === 'q') process.exit(0);
  if (key === 'r') randomize();
  if (key === 'f') reading.flags ^= 0b000101;
  if (key === 'b') bleVersionIndex++;
  render();
});

render();
