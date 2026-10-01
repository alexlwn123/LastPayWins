# Money Dev Kit implementation plan

Replace LND for incoming bids and winner payouts. Keep Convex for game state and scheduling, run MDK in Next.js, and preserve the existing QR/WebLN payment UI.

Start with the [migration assessment](../research/money-dev-kit-migration.md). Consult the [provider research](../research/money-dev-kit-provider.md) for SDK APIs and known integration gaps. Read `convex/_generated/ai/guidelines.md` before changing Convex code.

1. **Prove the integration.** Pin compatible MDK packages, configure the Next.js plugin and Node route, and establish server-only credentials. Verify invoice creation, receipt, and programmatic payout on an isolated deployment. Resolve invoice expiry, runtime requirements, and the documented payment-reporting recovery gap before production cutover.

2. **Set game rules.** Resolve payment ordering, deadline finalization, and late-payment handling; webhook arrival time is not established Lightning settlement time. Resolve how provider fees and payout routing costs affect the jackpot. Record these decisions and apply them consistently to game logic and UI.

3. **Add payment records and the server bridge.** Extend Convex with provider references, payment attempts, gross/net amounts, verified events, and payout status. Preserve historical LND records. Add authenticated Next.js/Convex communication for checkout creation, status lookup, and payout execution; keep game mutations internal.

4. **Replace invoice creation.** Update `convex/invoiceActions.ts` to use MDK through the bridge. Reserve attempts before external calls, prevent concurrent duplicate creation, and bind each checkout to its session and payout address. Return BOLT11 invoices through the existing subscription/UI flow and respect provider expiry.

5. **Implement reliable settlement.** Verify MDK completion webhooks, validate payment references and amounts, reject sandbox payments in production, and persist events before acknowledging them. Deduplicate settlement and update the invoice, bid, and game atomically. Add server-side reconciliation for unresolved payments; keep presence heartbeats responsible for online counts. Handle delayed and out-of-order events under the chosen game rules.

6. **Replace winner payouts.** Persist each winner's payout obligation and execute it with a stable idempotency key. Track pending, successful, failed, and uncertain outcomes; reconcile retries without double-paying. Retain prize funds by disabling automatic sweeping, account for fees/limits, and send payment-success notifications only after confirmed payout.

7. **Remove LND coupling.** Separate Lightning-address validation from node credentials. Remove obsolete LND adapters, routes, dependencies, and environment variables once their replacements work. Update setup documentation, fee copy, and payment/payout failure states.

8. **Validate and prepare cutover.** Test duplicate/invalid events, disconnected browsers, concurrent bids, expiry and deadline races, and payout failures/timeouts. Run lint, type checks, and production build. Prepare a cutover that pauses new bids, resolves the active round and outstanding LND liabilities, and switches new payments to MDK while preserving history.

Complete when a payment resets the game exactly once without a connected browser, the final winner receives one confirmed payout, failures remain recoverable, and the app runs without LND configuration. Document any remaining deployment or credential prerequisites in the handoff.
