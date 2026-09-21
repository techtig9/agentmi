/**
 * Regenerates the figures in docs/UNIT_ECONOMICS.md.
 *
 * Reads the same configuration the product bills against, so the document
 * cannot drift from the code. Run it after changing plans, credit costs or
 * provider rates: `npx tsx scripts/unit-economics.ts`
 */
import { allPlanEconomics, plansAtRisk, freePlanCostUsd, DEFAULT_ASSUMPTIONS } from "../lib/pricing/unit-economics";
import { MODEL_RATES } from "../lib/pricing/model-costs";

const money = (value: number) => `$${value.toFixed(2)}`;

console.log(`Assumptions: ${DEFAULT_ASSUMPTIONS.inputTokensPerMessage} in / ${DEFAULT_ASSUMPTIONS.outputTokensPerMessage} out tokens per message`);
console.log(`Default provider: ${DEFAULT_ASSUMPTIONS.provider}:${DEFAULT_ASSUMPTIONS.model}\n`);

console.log("| Plan | Price/mo | Credits | Max messages | Provider cost | Gross margin | Margin % |");
console.log("|---|---|---|---|---|---|---|");
for (const plan of allPlanEconomics()) {
  console.log(
    `| ${plan.planName} | ${money(plan.monthlyPriceUsd)} | ${plan.creditsPerMonth.toLocaleString()} | ${plan.messagesPerAllowance.toLocaleString()} | ${money(plan.worstCaseProviderCostUsd)} | ${money(plan.grossMarginUsd)} | ${plan.grossMarginPct === null ? "n/a" : `${plan.grossMarginPct}%`} |`
  );
}

console.log(`\nFree-plan acquisition cost per fully-consuming signup: ${money(freePlanCostUsd())}`);

console.log("\nSensitivity across every priced model:");
for (const key of Object.keys(MODEL_RATES)) {
  const [provider, ...rest] = key.split(":");
  const assumptions = { ...DEFAULT_ASSUMPTIONS, provider, model: rest.join(":") };
  const margins = allPlanEconomics(assumptions)
    .filter((p) => p.grossMarginPct !== null)
    .map((p) => `${p.planName} ${p.grossMarginPct}%`)
    .join(", ");
  const risk = plansAtRisk(assumptions).map((p) => p.planName);
  console.log(`  ${key.padEnd(38)} ${margins}${risk.length ? `   NEGATIVE: ${risk.join(", ")}` : ""}`);
}

const atRisk = plansAtRisk();
if (atRisk.length > 0) {
  console.error(`\nWARNING: negative margin on the default provider: ${atRisk.map((p) => p.planName).join(", ")}`);
  process.exitCode = 1;
}
