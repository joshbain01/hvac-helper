# HVAC Helper Pro - FSM Webhook Mapper Prototype

This is a throwaway terminal simulator for mapping local SQLite snapshots into ServiceTitan or Housecall Pro style payloads.

## Questions This Prototype Is Testing

1. Can one normalized snapshot payload map cleanly into both ServiceTitan and Housecall Pro style work orders?
2. What happens when the FSM provider allows fewer custom fields than the snapshot wants to send?
3. Should overflow values move into a private note, or should sync block until the office maps more fields?
4. When an access token is expired, does the payload stay queued with a stable idempotency key?
5. Does retrying the queue preserve the same semantic payload instead of generating duplicate work-order updates?

---

## How to Run

```bash
npm run prototype:logic-fsm-sync
```

---

## Simulator Keyboard Shortcuts

*   `[p]` **Switch Provider**: Toggles between ServiceTitan and Housecall Pro payload shapes.
*   `[t]` **Toggle Token Expiry**: Forces sends into the local retry queue.
*   `[l]` **Toggle Field Limit**: Switches between constrained and expanded custom-field capacity.
*   `[s]` **Send Payload**: Sends immediately or queues if the token is expired.
*   `[r]` **Retry Queue**: Clears token expiry and drains queued payloads.
*   `[q]` **Quit**: Exits the simulator.

---

## What To Watch

*   The `idempotencyKey` should remain stable across retries.
*   Custom-field overflow should be visible in `privateNote`.
*   Switching providers should not change the source snapshot.
*   Token expiry should queue the mapped payload rather than dropping it.
