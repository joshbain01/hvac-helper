const model = {
  hardwareCost: 68,
  hardwarePrice: 179,
  monthlyPrice: 19,
  distributorMarginPct: 25,
  attachRatePct: 65,
  llmCostPerUser: 2.4,
  supportCostPerUser: 3.2,
  fixedMonthly: 1200,
  units: 250
};

function calc() {
  const subscribers = Math.round(model.units * model.attachRatePct / 100);
  const netHardwarePrice = model.hardwarePrice * (1 - model.distributorMarginPct / 100);
  const hardwareGross = model.units * (netHardwarePrice - model.hardwareCost);
  const monthlyGross = subscribers * (model.monthlyPrice - model.llmCostPerUser - model.supportCostPerUser);
  const breakEvenMonths = model.fixedMonthly / Math.max(1, monthlyGross);
  return { subscribers, hardwareGross, monthlyGross, breakEvenMonths };
}

function render() {
  console.clear();
  const result = calc();
  console.log('HVAC Helper Pro - Tiered SaaS and Pricing Prototype');
  console.log('Question: how do attach rate, LLM cost, and distributor margin affect break-even?\n');
  console.table(model);
  console.table({
    subscribers: result.subscribers,
    hardwareGross: `$${result.hardwareGross.toFixed(0)}`,
    monthlyGross: `$${result.monthlyGross.toFixed(0)}`,
    breakEvenMonths: result.breakEvenMonths.toFixed(1)
  });
  console.log('Controls: [a/z] attach +/- 5%  [m/n] margin +/- 5%  [l/k] LLM cost +/- $0.50  [u/j] units +/- 50  [q] quit');
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

if (process.stdin.isTTY) process.stdin.setRawMode(true);
process.stdin.resume();
process.stdin.setEncoding('utf8');
process.stdin.on('data', (data) => {
  const key = data.toLowerCase();
  if (key === 'q') process.exit(0);
  if (key === 'a') model.attachRatePct = clamp(model.attachRatePct + 5, 0, 100);
  if (key === 'z') model.attachRatePct = clamp(model.attachRatePct - 5, 0, 100);
  if (key === 'm') model.distributorMarginPct = clamp(model.distributorMarginPct + 5, 0, 60);
  if (key === 'n') model.distributorMarginPct = clamp(model.distributorMarginPct - 5, 0, 60);
  if (key === 'l') model.llmCostPerUser += 0.5;
  if (key === 'k') model.llmCostPerUser = Math.max(0, model.llmCostPerUser - 0.5);
  if (key === 'u') model.units += 50;
  if (key === 'j') model.units = Math.max(50, model.units - 50);
  render();
});

render();
