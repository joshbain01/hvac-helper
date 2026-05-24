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

*   Whether hardware gross margin stays positive after distributor margin.
*   Whether monthly gross margin covers fixed operating costs.
*   Whether high LLM fallback cost breaks the low subscription price.
*   Whether break-even timing is dominated by attach rate or unit volume.
