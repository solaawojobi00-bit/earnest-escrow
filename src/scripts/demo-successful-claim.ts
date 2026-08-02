import "dotenv/config";
import { setupDemoDeal } from "./demoSetup";
import { claimEarnestDeposit } from "../stellar/claimableBalance";
import { watchDealUntilResolved } from "../monitor";

const DEADLINE_SECONDS = Number(process.env.DEMO_DEADLINE_SECONDS ?? 30);

async function main() {
  console.log("=== Demo: deal closes before deadline -> seller claims deposit ===\n");

  const { deal, seller } = await setupDemoDeal(DEADLINE_SECONDS);

  console.log("\nSimulating the deal closing (inspection passed, docs signed)...");
  console.log(`Seller (${seller.publicKey()}) submitting claimClaimableBalance...`);
  await claimEarnestDeposit(seller, deal.claimableBalanceId);
  console.log("Claim transaction confirmed.");

  console.log("\nMonitor confirming resolution via Horizon...");
  const resolved = await watchDealUntilResolved(deal.id, {
    onTick: () => console.log("  ...balance still pending"),
  });

  console.log(`\nDeal ${resolved.id} final status: ${resolved.status}`);
  if (resolved.status !== "CLAIMED") {
    throw new Error(`Expected CLAIMED, got ${resolved.status}`);
  }
  console.log("Success: seller claimed the earnest deposit before the deadline.");
}

main().catch((err) => {
  console.error("Demo failed:", err);
  process.exitCode = 1;
});
