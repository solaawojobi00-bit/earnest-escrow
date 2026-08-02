import { Horizon, Networks } from "@stellar/stellar-sdk";
import "dotenv/config";

export const HORIZON_URL =
  process.env.HORIZON_URL ?? "https://horizon-testnet.stellar.org";

export const NETWORK_PASSPHRASE =
  process.env.NETWORK_PASSPHRASE ?? Networks.TESTNET;

let server: Horizon.Server | undefined;

export function getServer(): Horizon.Server {
  if (!server) {
    server = new Horizon.Server(HORIZON_URL);
  }
  return server;
}
