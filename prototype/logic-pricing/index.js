// PROTOTYPE — throwaway. Delete or absorb when questions are answered.

const model = {
  hardwareCost:        68,
  hardwarePrice:       179,
  monthlyPrice:        19,
  distributorMarginPct: 25,
  attachRatePct:       65,
  llmCostPerUser:      2.4,
  supportCostPerUser:  3.2,
  fixedMonthly:        1200,
  units:               250,
};

function calc(m) {
  const netHardwarePrice    = m.hardwarePrice * (1 - m.distributorMarginPct / 100);
  const hardwareGrossPerUnit = netHardwarePrice - m.hardwareCost;
  const hardwareMarginPct    = (hardwareGrossPerUnit / netHardwarePrice) * 100;
  const hardwareGrossTotal   = m.units * hardwareGrossPerUnit;

  const saasGrossPerSub = m.monthlyPrice - m.llmCostPerUser - m.supportCostPerUser;
  const llmSharePct     = (m.llmCostPerUser / m.monthlyPrice) * 100;
  const subscribers     = Math.round(m.units * m.attachRatePct / 100);
  const monthlyGross    = subscribers * saasGrossPerSub;

  // Q4: minimum units so monthly SaaS gross >= fixed costs (not months — unit count)
  const expectedGrossPerUnit = saasGrossPerSub * (m.attachRatePct / 100);
  const breakEvenUnits  = expectedGrossPerUnit > 0
    ? Math.ceil(m.fixedMonthly / expectedGrossPerUnit)
    : Infinity;

  // Q1: months for current subscriber base to cover fixed costs each month
  const breakEvenMonths = monthlyGross > 0
    ? m.fixedMonthly / monthlyGross
    : Infinity;

  return {
    netHardwarePrice, hardwareGrossPerUnit, hardwareMarginPct, hardwareGrossTotal,
    saasGrossPerSub, llmSharePct, subscribers, monthlyGross,
    breakEvenUnits, breakEvenMonths,
  };
}

// Q5: rank each variable by impact on monthly gross for a standard one-step stress
function sensitivityRanking() {
  const base = calc(model);
  const stresses = [
    { label: 'Attach rate -10pp',       stressed: calc({ ...model, attachRatePct: model.attachRatePct - 10 }) },
    { label: 'Distributor margin +5pp', stressed: calc({ ...model, distributorMarginPct: model.distributorMarginPct + 5 }) },
    { label: 'LLM cost +$1.00/user',    stressed: calc({ ...model, llmCostPerUser: model.llmCostPerUser + 1 }) },
    { label: 'Units sold -50',          stressed: calc({ ...model, units: model.units - 50 }) },
  ];
  return stresses
    .map(s => ({
      label:         s.label,
      grossDelta:    s.stressed.monthlyGross - base.monthlyGross,
      beMonthDelta:  s.stressed.breakEvenMonths - base.breakEvenMonths,
    }))
    .sort((a, b) => a.grossDelta - b.grossDelta); // worst first
}

function warn(condition, msg) { return condition ? `  ⚠ ${msg}` : ''; }
function inf(n, unit)         { return n === Infinity ? '∞' : `${n.toFixed(1)}${unit}`; }

function render() {
  console.clear();
  const r    = calc(model);
  const rank = sensitivityRanking();

  console.log('HVAC Helper Pro — Tiered SaaS and Pricing Prototype');
  console.log('Question: how do attach rate, LLM cost, and distributor margin affect break-even?\n');

  console.log('── Assumptions ────────────────────────────────────────────────────');
  console.log(`  Hardware MSRP $${model.hardwarePrice}  |  COGS $${model.hardwareCost}  |  Distributor margin ${model.distributorMarginPct}%`);
  console.log(`  SaaS price $${model.monthlyPrice}/mo  |  LLM cost $${model.llmCostPerUser}/user  |  Support $${model.supportCostPerUser}/user`);
  console.log(`  Units sold: ${model.units}  |  Attach rate: ${model.attachRatePct}%  |  Fixed monthly costs: $${model.fixedMonthly}`);

  // Q2: hardware margin tolerance
  console.log('\n── Hardware (Q2: how much distributor margin can hardware tolerate?) ──');
  console.log(`  Net price after distributor cut:  $${r.netHardwarePrice.toFixed(2)}`);
  console.log(`  Gross per unit:                   $${r.hardwareGrossPerUnit.toFixed(2)}  (${r.hardwareMarginPct.toFixed(1)}% margin)${warn(r.hardwareMarginPct < 20, 'MARGIN THIN — below 20% viability threshold')}`);
  console.log(`  Total hardware gross (${model.units} units):   $${r.hardwareGrossTotal.toFixed(0)}${warn(r.hardwareGrossTotal < 0, 'NEGATIVE — distributor cut exceeds room above COGS')}`);

  // Q3: per-subscriber LLM erosion
  console.log('\n── SaaS per Subscriber (Q3: how much does LLM cost erode margin?) ───');
  console.log(`  Revenue:      $${model.monthlyPrice.toFixed(2)}/mo  (100%)`);
  console.log(`  LLM cost:    -$${model.llmCostPerUser.toFixed(2)}/mo  (${r.llmSharePct.toFixed(1)}% of revenue)${warn(r.llmSharePct > 20, 'HIGH — LLM consuming >20% of subscription revenue')}`);
  console.log(`  Support:     -$${model.supportCostPerUser.toFixed(2)}/mo`);
  console.log(`  Gross/sub:    $${r.saasGrossPerSub.toFixed(2)}/mo${warn(r.saasGrossPerSub <= 0, 'NEGATIVE — losing money on every subscriber')}`);

  // Q1 + Q4: scale and break-even
  console.log('\n── Scale (Q1: attach-rate sensitivity, Q4: break-even unit count) ──');
  console.log(`  Subscribers at ${model.attachRatePct}% attach:    ${r.subscribers}`);
  console.log(`  Monthly SaaS gross:             $${r.monthlyGross.toFixed(0)}${warn(r.monthlyGross < model.fixedMonthly, `below $${model.fixedMonthly} fixed costs — not covering opex`)}`);
  console.log(`  Months to cover fixed costs:    ${inf(r.breakEvenMonths, ' mo')}`);
  const beGap = r.breakEvenUnits === Infinity ? '' : r.breakEvenUnits > model.units
    ? `  ⚠ need ${r.breakEvenUnits - model.units} more units to reach monthly break-even`
    : `  ✓ ${model.units - r.breakEvenUnits} units above break-even floor`;
  console.log(`  Break-even unit count (Q4):     ${r.breakEvenUnits === Infinity ? '∞ (SaaS margin ≤ 0)' : r.breakEvenUnits + ' units'}${beGap}`);

  // Q5: sensitivity ranking
  console.log('\n── Sensitivity Ranking (Q5: which variable creates the most pressure?) ─');
  console.log('  One-step stress on each variable — impact on monthly gross and break-even:\n');
  const ordinals = ['1st (worst)', '2nd        ', '3rd        ', '4th (least)'];
  rank.forEach((s, i) => {
    const grossStr = s.grossDelta < 0
      ? `-$${Math.abs(s.grossDelta).toFixed(0)}/mo`
      : `+$${s.grossDelta.toFixed(0)}/mo`;
    const beStr = s.beMonthDelta === Infinity
      ? '+∞ mo'
      : `${s.beMonthDelta > 0 ? '+' : ''}${s.beMonthDelta.toFixed(1)} mo`;
    console.log(`  ${ordinals[i]}  ${s.label.padEnd(26)}  gross ${grossStr.padStart(10)}   break-even ${beStr}`);
  });

  console.log('\nControls: [a/z] attach ±5%  [m/n] dist. margin ±5%  [l/k] LLM ±$0.50  [u/j] units ±50  [q] quit');
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

if (process.stdin.isTTY) process.stdin.setRawMode(true);
process.stdin.resume();
process.stdin.setEncoding('utf8');
process.stdin.on('data', (data) => {
  const key = data.toLowerCase();
  if (key === 'q') process.exit(0);
  if (key === 'a') model.attachRatePct       = clamp(model.attachRatePct + 5, 5, 100);
  if (key === 'z') model.attachRatePct       = clamp(model.attachRatePct - 5, 5, 100);
  if (key === 'm') model.distributorMarginPct = clamp(model.distributorMarginPct + 5, 0, 60);
  if (key === 'n') model.distributorMarginPct = clamp(model.distributorMarginPct - 5, 0, 60);
  if (key === 'l') model.llmCostPerUser       = Math.min(model.monthlyPrice, model.llmCostPerUser + 0.5);
  if (key === 'k') model.llmCostPerUser       = Math.max(0, model.llmCostPerUser - 0.5);
  if (key === 'u') model.units               += 50;
  if (key === 'j') model.units                = Math.max(50, model.units - 50);
  render();
});

render();
