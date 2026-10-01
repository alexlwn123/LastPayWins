# Money Dev Kit: local development

## Production status — October 1, 2026

The MDK implementation is deployed at `https://lastpaywins.lwn.lol`, backed by the production Convex deployment `bright-butterfly-8`. Production bidding and MDK programmatic payouts are enabled; automatic sweeping remains off. New invoices charge 10,200 sats for a fixed 10,000-sat jackpot contribution and retain the 300-second timer. The memo is "Bid - Last Pay Wins — +2% for MDK routing fee". Previously issued invoices retain their original contribution rules. Newly created rounds reserve a 5% platform fee from the jackpot at payout; the existing open round and previously owed prizes retain their original no-cut terms.

Code was pushed to `main`, production secrets were configured, and the compatible Convex schema/functions were deployed. The pre-cutover database snapshot is saved locally at `.convex/backups/production-before-mdk-20261001.zip`. The user explicitly waived reconciliation of old LND invoices; existing records were preserved. Vercel uses Node 22 and a hoisted pnpm dependency layout so MDK native binaries package correctly.

Hosted verification passed: MDK dashboard ping, authenticated checkout lookup, signed non-payment webhook acceptance, rejection of invalid signatures/unauthorized bridge requests, and rejection of simulator controls. The prior 100-sat receive/93-sat payout test used the same MDK app with the isolated local backend. It is not a completed payment through the hosted deployment.

To pause new bids, set `PAYMENTS_ENABLED=false` on production Convex. Existing MDK receipt reconciliation and payout processing continue. Production credentials must remain in Vercel/Convex settings, never in Git. Future production deployments must update both the Vercel app and Convex functions when backend code changes.

Run `pnpm install`, then `pnpm dev:local`. The launcher starts an anonymous local Convex backend and Next.js at http://127.0.0.1:3000. It generates an ignored bridge secret, configures local services, and disables external notifications. It does not deploy to a Convex cloud project or change MDK/production settings. Node.js 22 is required.

The launcher allows two minutes for an existing local database to start. Override `CONVEX_LOCAL_BACKEND_STARTUP_TIMEOUT_SECS` if a larger database needs more time.

The default mode is a **local payment simulator**, with durable state in `.local-payments/`. Enter `alice@example.test` in the app and click **Simulate payment**. The normal Convex invoice, event, settlement, timer, and payout code runs; no Lightning payment occurs. Local controls require simulation mode, a loopback backend, a loopback host, and same-origin POST requests. Production rejects simulated receipts and disables these controls.

Run `pnpm test:local` in another terminal while the app is running and no round is active. It creates a payment without browser presence, submits the receipt twice, checks the jackpot changes once, then waits for one simulated winner payout (about one minute). `pnpm test`, `pnpm lint`, and `pnpm build` cover automated checks.

If port 3000 is occupied, use `LOCAL_PAYMENTS_PORT=3002 pnpm dev:local` and the same environment variable for `pnpm test:local`. The app and payment callbacks use that port together; the launcher fails if it is occupied.

## Current rules

- The server orders bids by the transaction that confirms them. The deadline is exclusive: a confirmation at or after it is late. Provider webhook timestamps are not treated as Lightning settlement timestamps.
- Each invoice belongs to the round for which it was issued. A late confirmation creates a return obligation to its stored Lightning address; it never changes a later round.
- `INVOICE_AMOUNT` is the fixed bid contribution (100 sats locally, 10,000 in production). New invoices add a 2% surcharge rounded up to whole sats. Store the bid amount and memo on each invoice so later configuration changes cannot change the promise. Late-payment returns repay the bid amount; fees are not refunded. Legacy invoices without a stored bid amount keep their original net-minus-reserves calculation.
- A 2% surcharge does not fully cover a 2% deduction from the gross invoice: 10,200 gross leaves 9,996 sats. The 4-sat difference plus outgoing routing fees come from retained platform fees or an operator-funded wallet buffer. The surcharge is not a guarantee that bids are self-funding.
- Payout status is internal only and has no public status UI. Public invoice queries return sanitized messages; provider diagnostics stay in backend records and server logs.
- The October 1 production prize of 19,590 sats to `southkorealn@coinos.io` was settled directly by Alex outside MDK, confirmed in chat and recorded with `payouts.markPaidExternally`. Its status is succeeded with an `externalSettlement` audit note; do not retry it. The original MDK failure was generic, with insufficient outgoing fee headroom the leading explanation (19,603 sats balance versus 19,525 sats estimated withdrawable). Keep an operating buffer for future payouts. External settlement is internal-only, accepts only terminally failed payouts, and schedules no transfer or notification.
- New rounds snapshot a 5% platform fee (`platformFeeBps=500`). The displayed jackpot remains the sum of full bid contributions. At round end, deduct 5% rounded down to whole sats once, store the gross jackpot and fee alongside the net payout, and leave the fee in the MDK wallet. The current/previous winner displays and winner notices use the net amount. Rounds without a stored fee retain 0%; existing payout obligations are never recalculated. On October 1, the still-empty production round was explicitly updated to 5% using `games.applyFeeToEmptyRound`, which refuses rounds that are live, finished, or have accepted a bid. Late-payment refunds have no platform deduction.
- Invoices are created in two steps: persist the unminted checkout ID, then mint a five-minute invoice. The actual provider expiry governs display and reconciliation.

## Real MDK development

Create a separate MDK development app. Put `MDK_ACCESS_TOKEN`, `MDK_MNEMONIC`, and `MDK_WEBHOOK_SECRET` in ignored `.env.mdk.local`; keep a secure mnemonic backup. Run `pnpm dev:local --mdk`. Use a separate clean checkout/local database for real-money testing so simulated rounds never share funds with live receipts.

To run that clean copy alongside the simulator, use `LOCAL_PAYMENTS_PORT=3003 LOCAL_CONVEX_PORT=3220 LOCAL_CONVEX_SITE_PORT=3221 pnpm dev:local --mdk`. Do not copy `.convex/`, `.local-payments/`, or the simulator's bridge secret into it. The launcher generates a separate bridge secret. Configure the test tunnel to reach this instance.

Expose the Next.js server with an HTTPS tunnel. Set the development MDK app URL to that tunnel, and subscribe its signed `checkout.completed` webhook to `/api/webhooks/mdk`. `/api/mdk` is the separate SDK infrastructure callback. Enable programmatic payouts and leave automatic sweeping off. The SDK requires a Node runtime, native Lightning binaries, outbound WebSockets, and a sufficiently long function lifetime.

Credentials are configured in `.env.mdk.local`; an authenticated read-only MDK API request succeeded on September 14, 2026. They belong to the app configured for the hosted domain, rather than a separate development app. Actual receipt and signed webhook delivery were verified on September 17. The real 93-sat prize payout was verified on October 1. Hosted webhook latency and MDK's recovery from a received payment not reflected in checkout status remain unverified.

On September 17, an isolated copy at `/Users/alex/Projects/last-pay-wins-mdk-local` started in real MDK mode on app port 3003 and Convex ports 3220/3221. The user approved temporarily routing the MDK app to a callback-only ngrok tunnel. MDK's dashboard health check succeeded. The user paid a real 100-sat invoice, and its signed completion webhook was persisted. Live provider data revealed that `invoice.amountSatsReceived` is net of the MDK fee (98 sats), while `invoice.amountSats` and `netAmount` both reported 100. The adapter now uses actual received sats to fund prizes, with regression coverage. Reconciliation settled the invoice, created one bid, and recorded a 93-sat prize for `alexlwn@strike.me`. Replaying the completion event returned 200 without duplicating the bid or prize. The initial payout failed with `programmatic_payouts_disabled`. The dashboard showed a 98-sat balance and 88 sats available for manual withdrawal; the programmatic payout subsequently succeeded for the full 93 sats.

On October 1, the user approved temporarily enabling programmatic payouts. The isolated app was restarted with a new SDK-callback-only tunnel, and the existing prize `jn7eq984gem04hddmgeeq6yh6x8em7kz` was retried using its original idempotency key (attempt 0). The local scheduler was delayed, so its normal payout action was also invoked directly; its claim and idempotency protections prevented duplicate dispatch. Convex recorded `succeeded`, and the MDK dashboard showed exactly one **93-sat SUCCESS** to the configured destination, `alexlwn@strike.me`. Payment hash: `c61b47dabddc4ce96ad16cdf806594319b30b2a2d711766008eff8d64ef72241`. MDK showed 3 sats remaining afterward.

After the test, Manual only was restored, the app domain returned to `https://lastpaywins.lwn.lol`, the original hosted webhook remained enabled, and the old temporary webhook remained disabled. The new tunnel and isolated real-payment services were stopped. The isolated database preserves the successful prize. No hosted application or cloud Convex deployment was changed. Production automation will require enabling programmatic payouts again during cutover.

The old simulator database had 14,600 pending scheduled jobs after the long offline interval and timed out on new invoices. Its backend and provider state were preserved at `.convex/backups/simulator-20261001-171209/`, then the simulator was restarted with a fresh database. This reset is only for disposable simulated funds; never reset a real-payment database to clear a backlog. The fresh simulator passed the full smoke test: invoice creation, settlement without presence, duplicate receipt handling, timer expiry, and exactly one confirmed payout. All 31 automated tests, lint/type-checking, and the production build passed on October 1. The simulator is available on port 3002. Stop local development services when finished to avoid leaving reconciliation running indefinitely.

## Payout comments

Winner LNURL payments carry `Congratulations! You've won the {amount} satoshi jackpot from LastPayWins!`. Fee-paying rounds append `(5% deducted for platform fees; {net} sats paid)` and use the gross jackpot in the congratulations message. Legacy no-cut rounds retain the message without a deduction suffix. Late returns use a distinct refund message. Recipient `commentAllowed` limits are respected, and comments are omitted when unsupported.

MDK's programmatic payout API has no comment argument. The server requests a recipient BOLT11 with the LNURL comment, persists that invoice on the payout attempt, then sends it through MDK with the existing idempotency key and exact amount. Lost responses reuse the same invoice. Only an explicit retry after authoritative terminal failure clears the invoice and advances the attempt. Legacy in-flight payouts keep their original destination until such a retry. Recipient requests require public HTTPS destinations, validate DNS at connection time, reject redirects, and enforce time/response-size limits.

## Invoice memo compatibility patch

The pinned `@moneydevkit/core@0.22.0` patch in `patches/` lets `createInvoiceNow` use the server-only `MDK_INVOICE_DESCRIPTION` setting. Production and the local launcher set it to `Bid - Last Pay Wins — +2% for MDK routing fee`. This affects BOLT11 invoices minted by this app's node. It does not change payment amounts, routing, or signing.

The hosted minting path returned `mdk invoice` despite the checkout's description metadata; the override applies the memo before the native node signs the invoice. Keep the patch until MDK's hosted path honors checkout descriptions, and verify decoded invoices before removing it or upgrading the SDK. The installed SDK adapter is covered by a regression test.

## Recovery and production handoff

The public app domain is `https://lastpaywins.lwn.lol`. Configure these values for the hosted MDK deployment:

| Setting | Value |
| --- | --- |
| MDK dashboard App URL | `https://lastpaywins.lwn.lol` |
| MDK dashboard webhook endpoint | `https://lastpaywins.lwn.lol/api/webhooks/mdk` |
| Webhook event | `checkout.completed` |
| Convex `PAYMENT_BRIDGE_URL` | `https://lastpaywins.lwn.lol` |

The SDK infrastructure callback remains `/api/mdk`. Keep `CONVEX_SITE_URL` and `NEXT_PUBLIC_CONVEX_URL` pointed at the intended Convex backend. Moving a webhook to a newly created endpoint requires that endpoint's signing secret in `MDK_WEBHOOK_SECRET`. Local development continues to use loopback backend URLs and needs its own public tunnel for actual Lightning callbacks.

The domain already resolves to Vercel, but both MDK routes returned 404 when checked on September 14, 2026. The MDK implementation must be deployed before hosted payments can work; changing the domain alone does not enable it.

Use the local Convex dashboard to inspect `invoices`, `paymentEvents`, and `payouts`. Unresolved invoices and received events reconcile independently of browser heartbeats. Paid invoices are deduplicated transactionally. Expired invoices continue to be checked for delayed settlement; mismatched payments remain in review.

Payout timeouts remain pending and retain their idempotency key. After fixing a failed payout's cause, the internal `payouts:retry` mutation retries it. A fresh dispatch key is allowed only after the provider confirmed a terminal payment failure; an uncertain outcome keeps the same key. Success notifications require a confirmed payout.

The known MDK receive-reporting gap cannot be repaired by repeatedly reading stale checkout state. An unconfirmed checkout with a signed completion event gets a diagnostic in the event inbox after one minute. Investigate with MDK and reconcile the actual wallet before manually resolving a discrepancy.

The October 1 production cutover is recorded above. Existing LND records remain readable, and a live legacy round is never combined with MDK funds. Any future changes to payment economics or timing should be confirmed before deployment.
