import { fetchBalanceStatus } from "./stellar/claimableBalance";
import { getDeal, updateDealStatus } from "./deals/dealStore";
import { Deal } from "./deals/types";

export interface WatchOptions {
  intervalMs?: number;
  timeoutMs?: number;
  onTick?: (deal: Deal) => void;
}

/**
 * Polls Horizon for a deal's claimable balance until it is claimed
 * (either resolution path). Because the seller/buyer claim predicates are
 * mutually exclusive by closingDeadline, a balance disappearing tells us
 * which side must have claimed it without needing to inspect effects.
 */
export async function watchDealUntilResolved(
  dealId: string,
  options: WatchOptions = {}
): Promise<Deal> {
  const intervalMs = options.intervalMs ?? 3000;
  const timeoutMs = options.timeoutMs ?? 5 * 60 * 1000;
  const startedAt = Date.now();

  while (true) {
    const deal = getDeal(dealId);
    if (!deal) {
      throw new Error(`Unknown deal: ${dealId}`);
    }

    const status = await fetchBalanceStatus(deal.claimableBalanceId);

    if (!status.exists) {
      const resolvedAsClaimed = Date.now() / 1000 < deal.closingDeadlineUnix;
      return updateDealStatus(dealId, resolvedAsClaimed ? "CLAIMED" : "RECLAIMED");
    }

    options.onTick?.(deal);

    if (Date.now() - startedAt > timeoutMs) {
      throw new Error(
        `Timed out after ${timeoutMs}ms waiting for deal ${dealId} to resolve`
      );
    }

    await sleep(intervalMs);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
