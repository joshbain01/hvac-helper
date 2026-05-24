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
  flags: 0b001011
};

function fixedPoint(value) {
  return Math.round(value * 10);
}

function encodeBinary() {
  const buffer = Buffer.alloc(20);
  const values = [reading.raTemp, reading.raRh, reading.saTemp, reading.oaTemp, reading.daTemp, reading.slPipe, reading.llPipe, reading.slSat, reading.llSat];
  values.forEach((value, index) => buffer.writeInt16LE(fixedPoint(value), index * 2));
  buffer.writeUInt16LE(reading.flags, 18);
  return buffer;
}

function render() {
  console.clear();
  const json = Buffer.from(JSON.stringify(reading));
  const binary = encodeBinary();
  console.log('HVAC Helper Pro - Compact BLE Binary Serialization Prototype');
  console.log('Question: can readings fit in one BLE payload without JSON overhead?\n');
  console.table(reading);
  console.log(`JSON bytes:   ${json.length}`);
  console.log(`Binary bytes: ${binary.length}`);
  console.log(`Savings:      ${json.length - binary.length} bytes (${Math.round((1 - binary.length / json.length) * 100)}%)`);
  console.log(`Binary hex:   ${binary.toString('hex')}`);
  console.log('\nControls: [r] randomize readings  [f] toggle flags  [q] quit');
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
  if (key === 'f') reading.flags = reading.flags ^ 0b000101;
  render();
});

render();
