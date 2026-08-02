import assert from "node:assert";
import { test } from "node:test";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "earnest-escrow-test-"));
process.env.DEAL_STORE_PATH = path.join(tmpDir, "deals.json");

import { createDeal, getDeal, listDeals, updateDealStatus } from "../src/deals/dealStore";
import { Deal } from "../src/deals/types";

function sampleDeal(id: string): Deal {
  return {
    id,
    buyerPublicKey: "GBUYER",
    sellerPublicKey: "GSELLER",
    depositAmount: "50",
    closingDeadlineUnix: Math.floor(Date.now() / 1000) + 60,
    claimableBalanceId: "00000000deadbeef",
    status: "PENDING",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

test("createDeal persists and getDeal retrieves it", () => {
  const deal = createDeal(sampleDeal("test-1"));
  const found = getDeal(deal.id);
  assert.ok(found);
  assert.strictEqual(found?.status, "PENDING");
});

test("updateDealStatus transitions status and updatedAt", () => {
  const deal = createDeal(sampleDeal("test-2"));
  const before = deal.updatedAt;
  const updated = updateDealStatus(deal.id, "CLAIMED");
  assert.strictEqual(updated.status, "CLAIMED");
  assert.ok(updated.updatedAt >= before);
});

test("updateDealStatus throws for unknown deal", () => {
  assert.throws(() => updateDealStatus("does-not-exist", "CLAIMED"));
});

test("listDeals returns all created deals", () => {
  createDeal(sampleDeal("test-3"));
  createDeal(sampleDeal("test-4"));
  const ids = listDeals().map((d) => d.id);
  assert.ok(ids.includes("test-3"));
  assert.ok(ids.includes("test-4"));
});
