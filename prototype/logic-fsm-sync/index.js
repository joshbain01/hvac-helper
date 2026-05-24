const snapshot = {
  id: 'snap-1007',
  customer: 'CUST-8802',
  job: 'JOB-2026-991A',
  equipment: { model: 'GSXC160361', serial: '2405A99812' },
  deltas: { deltaT: '+4.8F', superheat: '-6.2F', subcooling: '+3.1F' },
  consumables: ['16x25x1 filter', 'R-410A 0.5 lb']
};

const state = {
  provider: 'ServiceTitan',
  tokenExpired: false,
  fieldLimit: 3,
  outbox: [],
  logs: ['Snapshot loaded from local SQLite mock.']
};

function log(message) {
  state.logs.unshift(message);
  state.logs = state.logs.slice(0, 8);
}

function mapPayload() {
  const fields = [
    ['Model', snapshot.equipment.model],
    ['Serial', snapshot.equipment.serial],
    ['Delta T Change', snapshot.deltas.deltaT],
    ['Superheat Change', snapshot.deltas.superheat],
    ['Subcooling Change', snapshot.deltas.subcooling]
  ];
  const accepted = fields.slice(0, state.fieldLimit);
  const overflow = fields.slice(state.fieldLimit);
  return {
    provider: state.provider,
    idempotencyKey: snapshot.id,
    workOrderId: snapshot.job,
    customFields: Object.fromEntries(accepted),
    privateNote: overflow.map(([k, v]) => `${k}: ${v}`).join('; '),
    invoiceLines: snapshot.consumables
  };
}

function send() {
  const payload = mapPayload();
  if (state.tokenExpired) {
    state.outbox.push(payload);
    log('Token expired. Payload remains queued with snapshot idempotency key.');
  } else {
    log(`Sent ${snapshot.id} to ${state.provider} with ${Object.keys(payload.customFields).length} custom fields.`);
  }
}

function render() {
  console.clear();
  console.log('HVAC Helper Pro - FSM Sync Mapper Prototype');
  console.log('Question: how do snapshots map into FSM work orders despite token expiry and custom field limits?\n');
  console.log(`Provider=${state.provider} Token=${state.tokenExpired ? 'expired' : 'valid'} Field limit=${state.fieldLimit} Queued=${state.outbox.length}`);
  console.log('\nMapped payload preview:');
  console.log(JSON.stringify(mapPayload(), null, 2));
  console.log('\nEvents:');
  state.logs.forEach((line) => console.log(`- ${line}`));
  console.log('\nControls: [p] switch provider  [t] toggle token  [l] field limit  [s] send  [r] retry queue  [q] quit');
}

if (process.stdin.isTTY) process.stdin.setRawMode(true);
process.stdin.resume();
process.stdin.setEncoding('utf8');
process.stdin.on('data', (data) => {
  const key = data.toLowerCase();
  if (key === 'q') process.exit(0);
  if (key === 'p') state.provider = state.provider === 'ServiceTitan' ? 'Housecall Pro' : 'ServiceTitan';
  if (key === 't') state.tokenExpired = !state.tokenExpired;
  if (key === 'l') state.fieldLimit = state.fieldLimit === 3 ? 5 : 3;
  if (key === 's') send();
  if (key === 'r') {
    const count = state.outbox.length;
    state.outbox = [];
    state.tokenExpired = false;
    log(`Retried and drained ${count} queued payload(s).`);
  }
  render();
});

render();
