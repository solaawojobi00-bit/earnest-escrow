import "dotenv/config";
import { setupDemoDeal, sleep } from "./demoSetup";
import { claimEarnestDeposit } from "../stellar/claimableBalance";
import { watchDealUntilResolved } from "../monitor";

// Short deadline: this demo waits for it to actually pass in real time.
const DEADLINE_SECONDS = Number(process.env.DEMO_DEADLINE_SECONDS ?? 15);

async function main() {
  console.log("=== Demo: deadline passes without closing -> buyer reclaims deposit ===\n");

  const { deal, buyer } = await setupDemoDeal(DEADLINE_SECONDS);

  const waitMs = (DEADLINE_SECONDS + 2) * 1000;
  console.log(`\nWaiting ${waitMs / 1000}s for the closing deadline to pass...`);
  await sleep(waitMs);

  console.log(`Buyer (${buyer.publicKey()}) submitting claimClaimableBalance...`);
  await claimEarnestDeposit(buyer, deal.claimableBalanceId);
  console.log("Reclaim transaction confirmed.");

  console.log("\nMonitor confirming resolution via Horizon...");
  const resolved = await watchDealUntilResolved(deal.id, {
    onTick: () => console.log("  ...balance still pending"),
  });

  console.log(`\nDeal ${resolved.id} final status: ${resolved.status}`);
  if (resolved.status !== "RECLAIMED") {
    throw new Error(`Expected RECLAIMED, got ${resolved.status}`);
  }
  console.log("Success: buyer reclaimed the earnest deposit after the deadline passed.");
}

main().catch((err) => {
  console.error("Demo failed:", err);
  process.exitCode = 1;
});
