export type DealStatus = "PENDING" | "CLAIMED" | "RECLAIMED";

export interface Deal {
  id: string;
  buyerPublicKey: string;
  sellerPublicKey: string;
  depositAmount: string;
  closingDeadlineUnix: number;
  claimableBalanceId: string;
  status: DealStatus;
  createdAt: string;
  updatedAt: string;
}
