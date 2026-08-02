import * as fs from "fs";
import * as path from "path";
import "dotenv/config";
import { Deal, DealStatus } from "./types";

const STORE_PATH = path.resolve(
  process.env.DEAL_STORE_PATH ?? "./data/deals.json"
);

function readAll(): Deal[] {
  if (!fs.existsSync(STORE_PATH)) {
    return [];
  }
  const raw = fs.readFileSync(STORE_PATH, "utf-8").trim();
  return raw.length === 0 ? [] : JSON.parse(raw);
}

function writeAll(deals: Deal[]): void {
  fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
  fs.writeFileSync(STORE_PATH, JSON.stringify(deals, null, 2));
}

export function createDeal(deal: Deal): Deal {
  const deals = readAll();
  deals.push(deal);
  writeAll(deals);
  return deal;
}

export function getDeal(id: string): Deal | undefined {
  return readAll().find((d) => d.id === id);
}

export function listDeals(): Deal[] {
  return readAll();
}

export function updateDealStatus(id: string, status: DealStatus): Deal {
  const deals = readAll();
  const deal = deals.find((d) => d.id === id);
  if (!deal) {
    throw new Error(`Unknown deal: ${id}`);
  }
  deal.status = status;
  deal.updatedAt = new Date().toISOString();
  writeAll(deals);
  return deal;
}
