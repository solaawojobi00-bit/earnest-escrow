# Architecture: Earnest Escrow

## Why Claimable Balances (not a Soroban contract)

A [Claimable Balance](https://developers.stellar.org/docs/learn/encyclopedia/transactions-specialized/claimable-balance)
is a native Stellar ledger entry, created by a `createClaimableBalance`
operation, that locks an amount of an asset until one of its named
claimants satisfies that claimant's **claim predicate** — a small boolean
expression over ledger close time (`before`/`not`/`and`/`or` combinators).
Claiming requires the claimant's signature; if no claimant's predicate is
satisfied yet, the balance simply sits on the ledger, publicly visible via
Horizon to anyone who looks it up.

This maps onto earnest money almost exactly as-is:

- **Escrow without a custodian.** The deposit isn't held by a title company
  or a smart contract's admin key — it's a ledger entry only the buyer and
  seller's accounts (as named claimants) can ever move.
- **Conditions are enforced by consensus, not by trusting a backend.** The
  deadline-based predicate is validated by every validator on every ledger
  close, not by our service. Our backend can go down entirely and the
  claimable balance's rules don't change.
- **No custom contract, no audit surface.** `createClaimableBalance`,
  `claimClaimableBalance`, and the claim-predicate primitives have existed
  in Stellar core since CAP-0023 and are exercised by wallets and exchanges
  today. We inherit that maturity instead of writing and auditing new
  Soroban contract code for a problem the base ledger already solves.
- **Public verifiability.** Anyone — buyer, seller, agent, or an outside
  auditor — can query `GET /claimable_balances/{id}` on Horizon directly and
  see the exact amount, asset, claimants, and predicates. No API keys, no
  backend trust required to verify the deposit is real.

The tradeoff, and why it's acceptable for v1: claim predicates only reason
about **ledger close time**. They cannot natively express "inspection
contingency passed" or "seller approved closing documents" — those are
off-chain, real-world facts. The backend is the system of record for deal
milestones and *decides when to submit a claim operation* on behalf of the
appropriate party once a milestone occurs; the on-chain predicate is the
safety-net boundary that guarantees a party can only ever claim within the
time window their role permits, even if the backend is wrong, offline, or
malicious. See "Predicate mapping" below for the precise rule.

## Backend Service: Node.js + TypeScript

Proposed stack: **Node.js, TypeScript, `@stellar/stellar-sdk`**, thin CLI
scripts for Phase 1 (no web framework yet — that lands with the dashboard in
Phase 2).

Justification:

- **`@stellar/stellar-sdk` is Stellar's first-party, most actively
  maintained SDK.** Claimable balance operations, claimant predicate
  builders (`Claimant.predicateBeforeAbsoluteTime`, `predicateNot`, etc.),
  and Horizon response typings are all first-class and well-documented.
- **One language across backend and future dashboard.** Phase 2's dashboard
  will consume the same deal-state types and Horizon client code; sharing a
  language (and eventually a monorepo package) avoids duplicating the
  claimable-balance domain logic in two runtimes.
- **Wave contributor accessibility.** TypeScript has the largest pool of
  open-source contributors of any option realistically available here,
  which matters directly for this repo's purpose: generating a backlog that
  contributors can actually pick up.
- **Horizon SSE streaming is a natural fit for Node's event-driven I/O** —
  the monitor service in Phase 1 uses Horizon's streaming endpoint
  (`.stream()`) rather than polling in a loop, so watching a balance for a
  state change is cheap and near-real-time.

## Deal State and Predicate Mapping

A **Deal** (backend-tracked, not on-chain) has:

```
Deal {
  id
  buyerPublicKey
  sellerPublicKey
  depositAmount        // in the chosen asset (native XLM for v1)
  closingDeadline       // ISO 8601 timestamp
  claimableBalanceId    // set once the balance is created
  status                // PENDING | CLAIMED | RECLAIMED
}
```

When a deal is created, the backend submits `createClaimableBalance` with
**two claimants** and complementary time-bound predicates:

| Claimant | Predicate | Real-world meaning |
|---|---|---|
| Seller | `beforeAbsoluteTime(closingDeadline)` | Seller may claim only **before** the deadline — representing the deal having closed successfully ahead of schedule. |
| Buyer | `not(beforeAbsoluteTime(closingDeadline))` | Buyer may reclaim only **at/after** the deadline — representing the deal failing to close in time. |

These two predicates are mutually exclusive and jointly exhaustive over
time, so the balance always has exactly one valid claimant at any given
moment — there is no ambiguous window and no way for both parties to race
each other. This is a deliberate v1 simplification (see PRD "Out of Scope":
multi-party arbitration, contested outcomes, and human-adjudicated milestones
like a disputed inspection are not modeled by an on-chain predicate here —
they're Phase 2+ concerns layered on top of the backend's own deal-state
machine, not the ledger).

## Data Flow: Full Deposit Lifecycle

```
 1. CREATE
    Buyer keypair signs createClaimableBalance(
      asset: native, amount: depositAmount,
      claimants: [seller w/ before(deadline), buyer w/ not(before(deadline))]
    )
    -> submitted to Horizon -> ledger confirms -> balanceId recorded on Deal

 2. MONITOR
    Backend opens a Horizon SSE stream on
      GET /claimable_balances?claimant=<buyer|seller>
    (falls back to polling GET /claimable_balances/{id} if streaming is
    unavailable) and updates Deal.status whenever the balance disappears
    from the ledger (claimed or reclaimed) or a deadline passes.

 3a. RESOLVE — successful claim
     Before closingDeadline: seller keypair signs
       claimClaimableBalance(balanceId) -> Horizon -> ledger confirms
     -> balance no longer exists -> monitor observes removal
     -> Deal.status = CLAIMED

 3b. RESOLVE — reclaim after deadline
     At/after closingDeadline: buyer keypair signs
       claimClaimableBalance(balanceId) -> Horizon -> ledger confirms
     -> Deal.status = RECLAIMED
```

Phase 1 demonstrates both 3a and 3b against Stellar testnet with real,
confirmed transactions (short deadlines, e.g. tens of seconds out, so both
paths can be exercised in a single demo run without waiting on a real
closing timeline).

## Phase 2+ (not built now, tracked as issues)

- Persistent deal store (SQLite/Postgres) replacing the Phase 1 JSON file.
- Multi-deal dashboard (web UI) reading deal + Horizon state.
- Non-native assets (e.g. USDC) as the deposit asset.
- Webhook/notification on state change.
- Basic auth so a deal's buyer/seller/agent can view (not sign for) status.
