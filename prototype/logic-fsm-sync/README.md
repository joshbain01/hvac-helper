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

*   `[p]` **Switch Provider**: Toggles between ServiceTitan (camelCase, `customFields` object, `invoiceItems`) and Housecall Pro (snake_case, `tech_notes`, `line_items`) payload shapes.
*   `[t]` **Toggle Token Expiry**: Forces sends into the local outbox queue.
*   `[l]` **Cycle Field Limit**: Steps through 1–5 custom-field slots one at a time.
*   `[o]` **Toggle Overflow Mode**: Switches between `privateNote` (overflow fields go into `noteBody`) and `block` (send refuses if any fields overflow).
*   `[s]` **Send Payload**: Sends immediately, queues if token is expired, or blocks if overflow mode is `block` and fields overflow.
*   `[r]` **Retry Queue**: Drains the next queued payload and logs whether its idempotency key matches a freshly-built payload (proving or disproving stability).
*   `[q]` **Quit**: Exits the simulator.

---

## What To Watch

*   **Q1**: Switch provider with `[p]` — confirm the schema structure (key names, nesting, `invoiceItems` vs `line_items`) changes, while the source snapshot stays the same.
*   **Q2**: Cycle field limit with `[l]` — watch the Field Routing section show which fields are accepted vs overflow.
*   **Q3**: Toggle overflow mode with `[o]` — compare `privateNote` (overflow lands in `noteBody`) vs `block` (send is refused). Decide which behaviour is right for the product.
*   **Q4**: Expire the token with `[t]`, send with `[s]`, then check the Outbox section — the queued payload's idempotency key should be visible and stable.
*   **Q5**: With a payload in the outbox, refresh the token with `[t]` and retry with `[r]` — the log will show `✓ STABLE` if the key matches a fresh build, or `✗ MISMATCH` if not. Also try changing the provider between queue and retry to surface schema-drift risk.
