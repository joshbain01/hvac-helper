// PROTOTYPE — logic module (pure, no I/O)
// Q: does the handheld swap display caches and recover BLE sync without confusing the technician?
// Lift this reducer into the real firmware model once the question is answered; delete the TUI shell.

export const SLOTS = ['RA', 'SA', 'OA', 'DA', 'SL', 'LL'];

export const SLOT_LABELS = {
  RA: 'Return Air', SA: 'Supply Air', OA: 'Outdoor Ambient',
  DA: 'Discharge Air', SL: 'Suction Line', LL: 'Liquid Line',
};

function emptySet() {
  return Object.fromEntries(SLOTS.map(s => [s, null]));
}

function fakeReading(slot) {
  const base = +(50 + Math.random() * 55).toFixed(1);
  if (slot === 'RA') return { temp: base, rh: Math.round(42 + Math.random() * 18) };
  if (slot === 'SL' || slot === 'LL') return { pipe: base, sat: slot === 'SL' ? 40 : 105 };
  return { temp: base };
}

export function initialState() {
  return {
    active: 'before',
    bleConnected: true,
    faultedSlot: null,
    notificationSeq: 0,
    cache: { before: emptySet(), after: emptySet() },
    appMirror: { before: emptySet(), after: emptySet(), seq: 0 },
    eventLog: ['Boot: BEFORE cache active.'],
  };
}

export function reduce(state, action) {
  const s = structuredClone(state);
  const events = [];

  function sync(reason) {
    if (!s.bleConnected) {
      events.push(`BLE offline — ${s.active.toUpperCase()} retained locally (${reason})`);
      return;
    }
    s.notificationSeq++;
    s.appMirror[s.active] = structuredClone(s.cache[s.active]);
    s.appMirror.seq = s.notificationSeq;
    events.push(`Notification #${s.notificationSeq}: sent ${s.active.toUpperCase()} cache (${reason})`);
  }

  switch (action.type) {
    case 'CAPTURE': {
      const { slot } = action;
      if (s.faultedSlot === slot) {
        events.push(`${SLOT_LABELS[slot]}: SENSOR FAULT — capture blocked`);
        break;
      }
      s.cache[s.active][slot] = fakeReading(slot);
      events.push(`Captured ${SLOT_LABELS[slot]} → ${s.active.toUpperCase()} cache`);
      sync(`${slot} capture`);
      break;
    }
    case 'SWITCH':
      s.active = s.active === 'before' ? 'after' : 'before';
      events.push(`Switch → ${s.active.toUpperCase()} — display pointer swapped immediately`);
      sync('switch');
      break;
    case 'TOGGLE_BLE':
      s.bleConnected = !s.bleConnected;
      events.push(`BLE ${s.bleConnected ? 'RECONNECTED' : 'DISCONNECTED'}`);
      break;
    case 'REPLAY':
      events.push(`Manual replay: ${s.active.toUpperCase()} cache`);
      sync('manual replay');
      break;
    case 'CYCLE_FAULT': {
      const idx = s.faultedSlot ? SLOTS.indexOf(s.faultedSlot) : -1;
      s.faultedSlot = idx >= SLOTS.length - 1 ? null : SLOTS[idx + 1];
      events.push(s.faultedSlot ? `Fault → ${SLOT_LABELS[s.faultedSlot]}` : 'Fault cleared');
      break;
    }
    case 'RESET':
      return initialState();
  }

  s.eventLog = [...events.reverse(), ...s.eventLog].slice(0, 8);
  return s;
}
