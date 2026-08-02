# PRD: Earnest Escrow

## Problem

Real estate earnest money deposits (typically 1-5% of purchase price) are
handled today by wiring funds to a title company, brokerage, or attorney trust
account, where they sit as an opaque line item until closing or the deal falls
through. Buyers have no way to verify the funds are actually held, sellers
have no visibility into whether a deposit was ever funded, and disputes over
"who is entitled to the deposit" are resolved by phone calls and paper trails
after the fact. Wire fraud targeting real estate closings is also a
well-documented, expensive problem precisely because the transfer of funds is
opaque and manually coordinated.

None of this requires a new financial primitive. It requires a
publicly-verifiable, conditionally-releasable escrow with rules set at
deposit time — which is exactly what a Stellar Claimable Balance already is.

## Target Users

- **Buyers** — want proof their deposit is locked under agreed conditions,
  and a transparent path to reclaim it if the deal falls through.
- **Sellers** — want confidence a deposit genuinely exists and is
  claimable once a deal closes, without relying on the buyer's or their own
  agent's say-so.
- **Agents / title companies** — want a single source of truth for deposit
  status across many active deals, replacing manual trust-account
  reconciliation with a dashboard backed by on-chain state.

## Core Scope (v1)

Single-deal deposit lifecycle, end to end:

1. **Create** — buyer funds a Stellar Claimable Balance for the deposit
   amount, with claim conditions derived from the deal's terms (a closing
   deadline).
2. **Track** — a backend service records the deal (parties, deposit amount,
   deadline, milestone state) and continuously monitors the corresponding
   claimable balance via Horizon.
3. **Resolve** — one of two outcomes, both driven by real, submitted Stellar
   operations (not simulated):
   - **Successful claim** — the deal closes before the deadline; the seller
     claims the deposit.
   - **Reclaim after deadline** — the deadline passes without closing; the
     buyer reclaims the deposit.
4. **Dashboard** — a read view of deal/deposit status (single deal in v1;
   multi-deal listing is Phase 2+) sourced from the backend's tracked state
   and reconciled against live Horizon data.

Deal state is tracked off-chain by the backend (deals, parties, milestones
are not Stellar-native concepts); the claimable balance is the on-chain
enforcement mechanism for the money movement itself.

## Out of Scope (v2+)

- **Property tokenization or title representation** — this project does not
  represent real property, deeds, or ownership on-chain in any form.
- **Legal enforceability / compliance** — no attempt to satisfy state escrow
  licensing, RESPA, or trust-accounting law. This is a technical
  demonstration of transparent fund-holding, not a licensed escrow product.
- **Multi-party arbitration** — disputes where buyer and seller disagree on
  the outcome (e.g. contested inspection results) require a human/legal
  arbiter and are not resolved by this system in v1.
- **Multi-deal dashboard, auth, and multi-tenant accounts** — v1 is a single
  simulated deal proving the lifecycle works; a real dashboard across many
  concurrent deals, user accounts, and access control is Phase 2+.
- **Fiat on/off ramp** — funding the buyer's Stellar account from a bank
  account, or cashing out proceeds to fiat, is out of scope.
- **Partial claims / installment deposits** — v1 assumes a single lump-sum
  deposit per deal.

## Success Criteria (v1 / Phase 1)

- A claimable balance can be created on Stellar testnet for a simulated deal
  with real claim predicates tied to a deadline.
- A backend process monitors that balance via Horizon and reflects its
  state (pending/claimed/reclaimed) accurately.
- Both resolution paths are demonstrated against testnet with real,
  confirmed transactions: a successful claim by the seller, and a reclaim by
  the buyer after the deadline has passed.
