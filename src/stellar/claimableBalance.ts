import {
  Asset,
  BASE_FEE,
  Claimant,
  Keypair,
  Operation,
  TransactionBuilder,
  xdr,
} from "@stellar/stellar-sdk";
import { getServer, NETWORK_PASSPHRASE } from "./client";

export interface CreateDepositParams {
  depositor: Keypair;
  sellerPublicKey: string;
  buyerPublicKey: string;
  amount: string;
  closingDeadlineUnix: number;
}

/**
 * Creates a claimable balance for an earnest money deposit with two
 * complementary time-bound claimants:
 *  - seller can claim only BEFORE the closing deadline (deal closed in time)
 *  - buyer can reclaim only AT/AFTER the closing deadline (deal did not close)
 * See ARCHITECTURE.md "Predicate mapping" for the full rationale.
 */
export async function createEarnestDeposit(
  params: CreateDepositParams
): Promise<string> {
  const { depositor, sellerPublicKey, buyerPublicKey, amount, closingDeadlineUnix } =
    params;
  const server = getServer();

  const sellerPredicate = Claimant.predicateBeforeAbsoluteTime(
    String(closingDeadlineUnix)
  );
  const buyerPredicate = Claimant.predicateNot(sellerPredicate);

  const claimants = [
    new Claimant(sellerPublicKey, sellerPredicate),
    new Claimant(buyerPublicKey, buyerPredicate),
  ];

  const account = await server.loadAccount(depositor.publicKey());
  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      Operation.createClaimableBalance({
        asset: Asset.native(),
        amount,
        claimants,
      })
    )
    .setTimeout(60)
    .build();

  tx.sign(depositor);
  const response = await server.submitTransaction(tx);
  return extractBalanceId(response.result_xdr);
}

export async function claimEarnestDeposit(
  claimant: Keypair,
  balanceId: string
): Promise<void> {
  const server = getServer();
  const account = await server.loadAccount(claimant.publicKey());
  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(Operation.claimClaimableBalance({ balanceId }))
    .setTimeout(60)
    .build();

  tx.sign(claimant);
  await server.submitTransaction(tx);
}

export interface BalanceStatus {
  exists: boolean;
  amount?: string;
  claimants?: { destination: string }[];
}

/** Looks up a claimable balance's current on-ledger state via Horizon. */
export async function fetchBalanceStatus(
  balanceId: string
): Promise<BalanceStatus> {
  const server = getServer();
  try {
    const record = await server
      .claimableBalances()
      .claimableBalance(balanceId)
      .call();
    return {
      exists: true,
      amount: record.amount,
      claimants: record.claimants,
    };
  } catch (err: any) {
    if (err?.response?.status === 404) {
      return { exists: false };
    }
    throw err;
  }
}

function extractBalanceId(resultXdr: string): string {
  const txResult = xdr.TransactionResult.fromXDR(resultXdr, "base64");
  const opResults = txResult.result().results();
  const createResult = opResults[0]
    .tr()
    .createClaimableBalanceResult()
    .balanceId();
  return createResult.toXDR("hex");
}
