// PROTOTYPE — throwaway. Delete or absorb when questions are answered.

const snapshot = {
  id: 'snap-1007',
  customer: 'CUST-8802',
  job: 'JOB-2026-991A',
  equipment: { model: 'GSXC160361', serial: '2405A99812' },
  deltas: { deltaT: '+4.8F', superheat: '-6.2F', subcooling: '+3.1F' },
  consumables: ['16x25x1 filter', 'R-410A 0.5 lb'],
};

const ALL_FIELDS = [
  ['Model',             snapshot.equipment.model],
  ['Serial',            snapshot.equipment.serial],
  ['Delta T Change',    snapshot.deltas.deltaT],
  ['Superheat Change',  snapshot.deltas.superheat],
  ['Subcooling Change', snapshot.deltas.subcooling],
];

// Q1: Each provider has a distinct schema shape (camelCase + customFields vs snake_case + tech_notes).
const PROVIDERS = {
  ServiceTitan: {
    supportsCustomFields: true,
    map(accepted, overflow, key) {
      return {
        idempotencyKey: key,
        workOrderId: snapshot.job,
        customerId: snapshot.customer,
        customFields: Object.fromEntries(accepted),
        ...(overflow.length && { noteBody: overflow.map(([k, v]) => `${k}: ${v}`).join('; ') }),
        invoiceItems: snapshot.consumables.map(d => ({ description: d, type: 'material' })),
      };
    },
  },
  'Housecall Pro': {
    // HCP has no custom-field concept — all structured data goes into tech_notes.
    supportsCustomFields: false,
    map(accepted, overflow, key) {
      const all = [...accepted, ...overflow];
      return {
        idempotency_key: key,
        job_id: snapshot.job,
        customer_id: snapshot.customer,
        tech_notes: all.map(([k, v]) => `${k}: ${v}`).join('\n'),
        line_items: snapshot.consumables.map(d => ({ name: d })),
      };
    },
  },
};

const state = {
  provider: 'ServiceTitan',
  tokenExpired: false,
  fieldLimit: 3,
  overflowMode: 'privateNote', // 'privateNote' | 'block' (Q3)
  outbox: [],
  sentCount: 0,
  logs: ['Snapshot loaded.'],
};

function log(msg) {
  state.logs.unshift(msg);
  state.logs = state.logs.slice(0, 8);
}

function splitFields() {
  const p = PROVIDERS[state.provider];
  if (!p.supportsCustomFields) return { accepted: ALL_FIELDS, overflow: [] };
  return { accepted: ALL_FIELDS.slice(0, state.fieldLimit), overflow: ALL_FIELDS.slice(state.fieldLimit) };
}

function buildPayload() {
  const { accepted, overflow } = splitFields();
  return PROVIDERS[state.provider].map(accepted, overflow, snapshot.id);
}

function idempotencyKey(payload) {
  return payload.idempotencyKey ?? payload.idempotency_key;
}

function syncStatus() {
  if (state.tokenExpired) return 'QUEUED';
  const { overflow } = splitFields();
  if (overflow.length > 0 && state.overflowMode === 'block') return 'BLOCKED';
  return 'READY';
}

function send() {
  const status = syncStatus();
  if (status === 'QUEUED') {
    const payload = buildPayload();
    state.outbox.push({ payload, provider: state.provider, queuedAt: new Date().toISOString() });
    log(`[QUEUED] Token expired. Payload ${snapshot.id} held (key=${idempotencyKey(payload)}).`);
    return;
  }
  if (status === 'BLOCKED') {
    const { overflow } = splitFields();
    log(`[BLOCKED] ${overflow.length} field(s) exceed ${state.provider} limit. Toggle overflow [o] or raise limit [l].`);
    return;
  }
  const payload = buildPayload();
  state.sentCount++;
  const fieldCount = payload.customFields ? Object.keys(payload.customFields).length : 'n/a (HCP)';
  log(`[SENT #${state.sentCount}] ${snapshot.id} → ${state.provider}. customFields=${fieldCount}.`);
}

function retry() {
  if (state.outbox.length === 0) { log('[RETRY] Outbox empty.'); return; }
  if (state.tokenExpired)        { log('[RETRY] Token still expired — refresh token first [t].'); return; }

  const item = state.outbox.shift();
  const fresh = buildPayload();
  const queuedKey = idempotencyKey(item.payload);
  const freshKey  = idempotencyKey(fresh);
  const keyMatch  = queuedKey === freshKey;
  const providerMatch = item.provider === state.provider;

  state.sentCount++;
  log(`[RETRY #${state.sentCount}] key: queued=${queuedKey} fresh=${freshKey} → ${keyMatch ? '✓ STABLE' : '✗ MISMATCH — duplicate risk'}`);
  if (!providerMatch) log(`  ⚠ Provider changed since queue (${item.provider} → ${state.provider}) — schema drift possible.`);
}

function render() {
  console.clear();
  const { accepted, overflow } = splitFields();
  const payload = buildPayload();
  const status = syncStatus();
  const p = PROVIDERS[state.provider];

  console.log('HVAC Helper Pro — FSM Sync Mapper Prototype');
  console.log('Question: how do snapshots map into FSM work orders despite token expiry and field limits?\n');

  console.log('── Source Snapshot ──────────────────────────────────────────────');
  console.log(`  id=${snapshot.id}  job=${snapshot.job}  customer=${snapshot.customer}`);
  console.log(`  equipment: ${snapshot.equipment.model} / ${snapshot.equipment.serial}`);
  console.log(`  deltas: ΔT ${snapshot.deltas.deltaT}  superheat ${snapshot.deltas.superheat}  subcooling ${snapshot.deltas.subcooling}`);
  console.log(`  consumables: ${snapshot.consumables.join(', ')}`);

  console.log('\n── FSM State ────────────────────────────────────────────────────');
  console.log(`  Provider:       ${state.provider}${!p.supportsCustomFields ? '  (no custom fields — all data → tech_notes)' : ''}`);
  console.log(`  Token:          ${state.tokenExpired ? 'EXPIRED ⚠' : 'valid'}`);
  if (p.supportsCustomFields) {
    console.log(`  Field limit:    ${state.fieldLimit} / ${ALL_FIELDS.length}  (${overflow.length} overflow)`);
    console.log(`  Overflow mode:  ${state.overflowMode === 'privateNote' ? 'privateNote → overflow goes into noteBody' : 'block → refuse to send if any overflow'}`);
  }
  const statusLabel = { READY: 'READY ✓', QUEUED: 'QUEUED (token expired)', BLOCKED: 'BLOCKED (overflow)' }[status];
  console.log(`  Sync status:    ${statusLabel}`);
  console.log(`  Outbox:         ${state.outbox.length} queued  |  ${state.sentCount} sent`);

  // Q2+Q3: Where do overflow fields go?
  if (p.supportsCustomFields) {
    console.log('\n── Field Routing (Q2+Q3: overflow strategy) ─────────────────────');
    accepted.forEach(([k]) => console.log(`  ✓  ${k.padEnd(22)} → customField`));
    overflow.forEach(([k]) => {
      const dest = state.overflowMode === 'privateNote' ? '→ noteBody (overflow)' : '→ BLOCKED ✗';
      console.log(`  ⬇  ${k.padEnd(22)} ${dest}`);
    });
  }

  // Q1: Actual provider payload shape
  console.log('\n── Mapped Payload (Q1: schema per provider) ─────────────────────');
  console.log(JSON.stringify(payload, null, 2).split('\n').map(l => '  ' + l).join('\n'));

  // Q4+Q5: Outbox with idempotency keys visible
  if (state.outbox.length > 0) {
    console.log('\n── Outbox (Q4+Q5: queued payload idempotency keys) ──────────────');
    state.outbox.forEach((item, i) => {
      console.log(`  [${i}] provider=${item.provider}  key=${idempotencyKey(item.payload)}  queued=${item.queuedAt}`);
    });
  }

  console.log('\n── Events ───────────────────────────────────────────────────────');
  state.logs.forEach(l => console.log(`  ${l}`));

  console.log('\nControls: [p] provider  [t] token  [l] field limit (+1)  [o] overflow mode  [s] send  [r] retry  [q] quit');
}

if (process.stdin.isTTY) process.stdin.setRawMode(true);
process.stdin.resume();
process.stdin.setEncoding('utf8');
process.stdin.on('data', (data) => {
  const key = data.toLowerCase();
  if (key === 'q') process.exit(0);
  if (key === 'p') state.provider = state.provider === 'ServiceTitan' ? 'Housecall Pro' : 'ServiceTitan';
  if (key === 't') state.tokenExpired = !state.tokenExpired;
  if (key === 'l') state.fieldLimit = (state.fieldLimit % ALL_FIELDS.length) + 1;
  if (key === 'o') state.overflowMode = state.overflowMode === 'privateNote' ? 'block' : 'privateNote';
  if (key === 's') send();
  if (key === 'r') retry();
  render();
});

render();
