# Earnest Escrow

Transparent real estate earnest money / deposit escrow built on Stellar's
native Claimable Balances — no custom smart contract, no custodian holding
the funds.

See [PRD.md](./PRD.md) for the problem and scope, and
[ARCHITECTURE.md](./ARCHITECTURE.md) for how it works and why Claimable
Balances fit this use case.

## Status

**Phase 1** (this repo, in progress): a working end-to-end deposit lifecycle
against Stellar testnet — create a claimable balance for a simulated deal,
monitor it via Horizon, and demonstrate both a successful claim and a
reclaim-after-deadline path.

## Requirements

- Node.js 20+
- npm

## Setup

```bash
npm install
cp .env.example .env
```

## Demo scripts

Each demo script funds two fresh testnet keypairs via Friendbot, creates a
claimable balance with a near-term deadline, starts the monitor, and then
exercises one resolution path with real, submitted testnet transactions.

```bash
# Deal closes in time -> seller claims the deposit
npm run demo:claim

# Deadline passes without closing -> buyer reclaims the deposit
npm run demo:reclaim
```

## Project layout

```
src/
  stellar/       Horizon client, network config, claimable balance helpers
  deals/         Deal domain types and a simple JSON-file-backed store
  monitor.ts     Horizon-backed monitor that updates deal status
  scripts/       Runnable end-to-end demo scripts
```
