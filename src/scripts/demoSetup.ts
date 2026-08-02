import "dotenv/config";
import { Keypair } from "@stellar/stellar-sdk";
import { getServer } from "../stellar/client";
import { createEarnestDeposit } from "../stellar/claimableBalance";
import { createDeal } from "../deals/dealStore";
import { Deal } from "../deals/types";

const DEMO_DEPOSIT_AMOUNT = "50";

export interface DemoDealSetup {
  deal: Deal;
  buyer: Keypair;
  seller: Keypair;
}

/**
 * Funds a fresh buyer/seller keypair pair via Friendbot, creates a real
 * claimable balance on testnet with a near-term closing deadline, and
 * records the resulting Deal. Shared by both demo scripts so the only
 * difference between "successful claim" and "reclaim after deadline" is
 * who claims and when.
 */
export async function setupDemoDeal(deadlineSeconds: number): Promise<DemoDealSetup> {
  const server = getServer();
  const buyer = Keypair.random();
  const seller = Keypair.random();

  console.log(`Funding buyer (${buyer.publicKey()}) via Friendbot...`);
  await server.friendbot(buyer.publicKey()).call();
  console.log(`Funding seller (${seller.publicKey()}) via Friendbot...`);
  await server.friendbot(seller.publicKey()).call();

  const closingDeadlineUnix = Math.floor(Date.now() / 1000) + deadlineSeconds;

  console.log(
    `Creating claimable balance: ${DEMO_DEPOSIT_AMOUNT} XLM, deadline in ${deadlineSeconds}s ` +
      `(seller may claim before it, buyer may reclaim at/after it)...`
  );
  const claimableBalanceId = await createEarnestDeposit({
    depositor: buyer,
    buyerPublicKey: buyer.publicKey(),
    sellerPublicKey: seller.publicKey(),
    amount: DEMO_DEPOSIT_AMOUNT,
    closingDeadlineUnix,
  });

  const deal = createDeal({
    id: `demo-${Date.now()}`,
    buyerPublicKey: buyer.publicKey(),
    sellerPublicKey: seller.publicKey(),
    depositAmount: DEMO_DEPOSIT_AMOUNT,
    closingDeadlineUnix,
    claimableBalanceId,
    status: "PENDING",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  console.log(`Deal ${deal.id} created. Claimable balance: ${claimableBalanceId}`);
  return { deal, buyer, seller };
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
