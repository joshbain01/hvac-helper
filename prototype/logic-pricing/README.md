# HVAC Helper Pro - Tiered SaaS and Pricing Prototype

This is a throwaway terminal calculator for exploring unit economics sensitivity before committing to a pricing model.

## Questions This Prototype Is Testing

1. How sensitive is break-even timing to technician subscription attach rate?
2. How much distributor margin can the hardware tolerate before hardware gross margin becomes too weak?
3. How much do LLM fallback costs erode monthly gross margin at the current subscription price?
4. How many units need to ship before monthly SaaS margin covers fixed operating costs?
5. Which variable creates the most pressure: attach rate, distributor margin, LLM cost, or sales volume?

---

## How to Run

```bash
npm run prototype:logic-pricing
```

---

## Simulator Keyboard Shortcuts

*   `[a]` / `[z]` **Attach Rate**: Increase or decrease subscriber attach rate by 5%.
*   `[m]` / `[n]` **Distributor Margin**: Increase or decrease distributor margin by 5%.
*   `[l]` / `[k]` **LLM Cost**: Increase or decrease LLM fallback cost by $0.50 per user.
*   `[u]` / `[j]` **Units Sold**: Increase or decrease hardware unit volume by 50.
*   `[q]` **Quit**: Exits the simulator.

---

## What To Watch

*   **Q1**: Watch `Months to cover fixed costs` as you cycle `[a/z]` — how much does break-even move per 5pp of attach rate?
*   **Q2**: Push distributor margin up with `[m]` until the hardware section shows a `⚠ MARGIN THIN` warning — that's your tolerance ceiling.
*   **Q3**: Raise LLM cost with `[l]` and watch `LLM cost` % of revenue climb — at what percentage does gross/sub go negative?
*   **Q4**: Compare `Break-even unit count` against `Units sold` — the `✓/⚠` indicator tells you whether you're above or below the floor.
*   **Q5**: Read the Sensitivity Ranking table on first load — the `1st (worst)` row names the variable with the most leverage over monthly gross. Note that distributor margin scores `+$0/mo` here because it only affects one-time hardware gross, not recurring SaaS margin.
