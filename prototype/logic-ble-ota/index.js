const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  blueBg: '\x1b[44m',
  white: '\x1b[37m'
};

class BleOtaSimulator {
  constructor() {
    this.reset();
  }

  reset() {
    this.imageBytes = 64 * 1024;
    this.mtuBytes = 244;
    this.windowSize = 4;
    this.maxRetries = 3;
    this.espBufferChunks = 8;
    this.dropEvery = 0;
    this.crcMismatchChunk = null;
    this.disconnectAfterChunks = 0;
    this.connected = true;
    this.paused = false;
    this.aborted = false;
    this.complete = false;
    this.timeMs = 0;
    this.sentCount = 0;
    this.acked = new Set();
    this.inFlight = [];
    this.retryCounts = new Map();
    this.flashOffset = 0;
    this.logs = ['Ready: firmware image staged on mobile app.'];
  }

  get totalChunks() {
    return Math.ceil(this.imageBytes / this.mtuBytes);
  }

  get nextChunk() {
    for (let i = 0; i < this.totalChunks; i += 1) {
      if (!this.acked.has(i) && !this.inFlight.some((p) => p.chunk === i)) {
        return i;
      }
    }
    return null;
  }

  log(message) {
    this.logs.unshift(`[${String(this.timeMs).padStart(5, '0')}ms] ${message}`);
    this.logs = this.logs.slice(0, 9);
  }

  step() {
    if (this.complete || this.aborted) return;
    this.timeMs += 120;

    if (!this.connected) {
      this.log('BLE disconnected: mobile holds window and waits for reconnect.');
      return;
    }

    if (this.paused) {
      this.log('Flow control pause: ESP32 flash writer is draining buffer.');
      this.drainEspBuffer(2);
      if (this.inFlight.length <= Math.floor(this.espBufferChunks / 2)) {
        this.paused = false;
        this.log('ESP32 buffer recovered: resume sending.');
      }
      return;
    }

    while (this.inFlight.length < this.windowSize && this.inFlight.length < this.espBufferChunks) {
      const chunk = this.nextChunk;
      if (chunk === null) break;
      this.sendChunk(chunk);
    }

    this.processAcks();
    this.drainEspBuffer(1);

    if (this.acked.size === this.totalChunks) {
      this.complete = true;
      this.log('OTA image transferred. ESP32 validates full-image CRC and marks pending boot partition.');
    }
  }

  sendChunk(chunk) {
    this.sentCount += 1;
    const retry = this.retryCounts.get(chunk) || 0;
    this.inFlight.push({ chunk, retry, age: 0 });
    this.log(`TX chunk ${chunk + 1}/${this.totalChunks}${retry > 0 ? ` retry ${retry}` : ''}.`);

    if (this.disconnectAfterChunks && this.sentCount >= this.disconnectAfterChunks) {
      this.connected = false;
      this.disconnectAfterChunks = 0;
      this.log('Injected disconnect fired after send.');
    }
  }

  processAcks() {
    const survivors = [];
    for (const packet of this.inFlight) {
      packet.age += 1;
      const shouldDrop = this.dropEvery > 0 && (packet.chunk + 1) % this.dropEvery === 0 && packet.retry === 0;
      const crcMismatch = this.crcMismatchChunk === packet.chunk && packet.retry === 0;

      if (shouldDrop && packet.age < 2) {
        survivors.push(packet);
        continue;
      }

      if (crcMismatch) {
        this.handleRetry(packet, 'CRC mismatch reported by ESP32');
        continue;
      }

      if (shouldDrop) {
        this.handleRetry(packet, 'ACK timeout');
        continue;
      }

      this.acked.add(packet.chunk);
      this.flashOffset = Math.max(this.flashOffset, (packet.chunk + 1) * this.mtuBytes);
      this.log(`ACK chunk ${packet.chunk + 1}; flash offset ${Math.min(this.flashOffset, this.imageBytes)} bytes.`);
    }
    this.inFlight = survivors;

    if (this.inFlight.length >= this.espBufferChunks) {
      this.paused = true;
      this.log('ESP32 buffer high-water mark reached: sending pause signal.');
    }
  }

  handleRetry(packet, reason) {
    const nextRetry = packet.retry + 1;
    this.retryCounts.set(packet.chunk, nextRetry);

    if (nextRetry > this.maxRetries) {
      this.aborted = true;
      this.log(`${reason}: chunk ${packet.chunk + 1} exceeded retry budget. OTA aborted; boot partition unchanged.`);
      return;
    }

    this.log(`${reason}: scheduling chunk ${packet.chunk + 1} retry ${nextRetry}.`);
  }

  drainEspBuffer(count) {
    if (this.inFlight.length <= 1) return;
    this.inFlight = this.inFlight.slice(0, Math.max(1, this.inFlight.length - count));
  }

  reconnect() {
    this.connected = true;
    this.log('BLE reconnected: resume from last ACKed chunk bitmap.');
  }

  toggleDrops() {
    this.dropEvery = this.dropEvery ? 0 : 7;
    this.log(this.dropEvery ? 'Fault injection: first-send drop every 7th chunk.' : 'Packet drop injection disabled.');
  }

  toggleCrc() {
    this.crcMismatchChunk = this.crcMismatchChunk === null ? Math.min(17, this.totalChunks - 1) : null;
    this.log(this.crcMismatchChunk === null ? 'CRC mismatch injection disabled.' : `Fault injection: chunk ${this.crcMismatchChunk + 1} returns one CRC mismatch.`);
  }

  injectDisconnect() {
    this.disconnectAfterChunks = this.sentCount + 3;
    this.log('Fault injection armed: disconnect after 3 more sends.');
  }

  changeWindow() {
    this.windowSize = this.windowSize === 4 ? 8 : this.windowSize === 8 ? 2 : 4;
    this.log(`Sliding window changed to ${this.windowSize} chunks.`);
  }
}

const sim = new BleOtaSimulator();

if (process.stdin.isTTY) process.stdin.setRawMode(true);
process.stdin.resume();
process.stdin.setEncoding('utf8');

function clear() {
  process.stdout.write('\x1Bc');
}

function bar(done, total, width = 42) {
  const filled = Math.round((done / total) * width);
  return `${C.green}${'#'.repeat(filled)}${C.dim}${'-'.repeat(width - filled)}${C.reset}`;
}

function stateLabel() {
  if (sim.complete) return `${C.green}COMPLETE${C.reset}`;
  if (sim.aborted) return `${C.red}ABORTED${C.reset}`;
  if (!sim.connected) return `${C.red}DISCONNECTED${C.reset}`;
  if (sim.paused) return `${C.yellow}FLOW-CONTROL PAUSED${C.reset}`;
  return `${C.green}TRANSFERRING${C.reset}`;
}

function render() {
  clear();
  const percent = ((sim.acked.size / sim.totalChunks) * 100).toFixed(1);
  const retryTotal = [...sim.retryCounts.values()].reduce((sum, n) => sum + n, 0);

  console.log(`${C.blueBg}${C.white}${C.bold}  HVAC HELPER PRO - BLE OTA UPDATE COORDINATOR PROTOTYPE  ${C.reset}`);
  console.log(`${C.dim}Question: Can chunking, sliding-window retries, CRC checks, and flow control stay understandable under failures?${C.reset}\n`);
  console.log(`State: ${stateLabel()}  Time: ${sim.timeMs}ms  Window: ${sim.windowSize}  MTU payload: ${sim.mtuBytes} bytes`);
  console.log(`Image: ${sim.imageBytes} bytes -> ${sim.totalChunks} chunks  ESP buffer: ${sim.inFlight.length}/${sim.espBufferChunks} chunks`);
  console.log(`Progress: [${bar(sim.acked.size, sim.totalChunks)}] ${percent}%  ACKed: ${sim.acked.size}/${sim.totalChunks}`);
  console.log(`Retries: ${retryTotal} total  Drop mode: ${sim.dropEvery ? `every ${sim.dropEvery}th first send` : 'off'}  CRC fault: ${sim.crcMismatchChunk === null ? 'off' : `chunk ${sim.crcMismatchChunk + 1}`}`);
  console.log(`${C.dim}─────────────────────────────────────────────────────────────────────────────${C.reset}`);
  console.log(`${C.bold}Mobile OTA queue:${C.reset}`);
  console.log(`  In flight: ${sim.inFlight.length ? sim.inFlight.map((p) => `${p.chunk + 1}(r${p.retry})`).join(', ') : 'none'}`);
  console.log(`  Next unsent chunk: ${sim.nextChunk === null ? 'none' : sim.nextChunk + 1}`);
  console.log(`${C.bold}ESP32 boot safety:${C.reset}`);
  console.log(`  Active partition remains unchanged during transfer.`);
  console.log(`  New partition is marked pending only after final full-image CRC.`);
  console.log(`  Physical rollback override remains outside this prototype.`);
  console.log(`${C.dim}─────────────────────────────────────────────────────────────────────────────${C.reset}`);
  console.log(`${C.bold}Recent events:${C.reset}`);
  sim.logs.forEach((line) => console.log(`  ${line}`));
  console.log(`${C.dim}─────────────────────────────────────────────────────────────────────────────${C.reset}`);
  console.log(`${C.bold}Controls:${C.reset}`);
  console.log('  [space] step transfer   [a] auto 20 steps   [d] toggle packet drops   [c] toggle CRC mismatch');
  console.log('  [x] inject disconnect   [r] reconnect       [w] change window size    [n] reset');
  console.log('  [q] quit');
}

function runSteps(count) {
  for (let i = 0; i < count; i += 1) sim.step();
}

process.stdin.on('data', (key) => {
  if (key === '\u0003' || key.toLowerCase() === 'q') {
    clear();
    console.log('BLE OTA prototype closed.');
    process.exit(0);
  }

  switch (key.toLowerCase()) {
    case ' ':
      sim.step();
      break;
    case 'a':
      runSteps(20);
      break;
    case 'd':
      sim.toggleDrops();
      break;
    case 'c':
      sim.toggleCrc();
      break;
    case 'x':
      sim.injectDisconnect();
      break;
    case 'r':
      sim.reconnect();
      break;
    case 'w':
      sim.changeWindow();
      break;
    case 'n':
      sim.reset();
      break;
  }

  render();
});

render();
