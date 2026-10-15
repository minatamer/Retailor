# RTL-092 — connect uploaded clothes to Stripe sandbox Checkout

Status: **Implemented and validated locally, with actual uploaded-photo Stripe sandbox payment/cancel/return evidence. External release acceptance remains pending.**

15 October 2026. The owner completed the RTL-091 ADC command, confirmed `STRIPE_API_KEY` in app-local `.env.local`, and instructed implementation to proceed. This follows the [RTL-090 scoped plan](../engineering/STRIPE-SANDBOX-CHECKOUT-PLAN.md): demonstrate a real hosted Stripe sandbox gateway and verified return using each visitor's chosen store name and actual cart, options and uploaded photos. Other ideas from the referenced chat remain excluded.

## Requirements

1. Optional deliberate Stripe sandbox action in the actual bag/checkout, explaining test payment and selected-photo sharing. Preserve local demo ordering. Default configuration remains off; enabled mode rejects live credentials/results and does not enable paid AI.
2. Use actual selected visitor-uploaded derivatives, existing raster/sanitizer bounds and exact photo/variant binding; private RTL-091 bucket, bounded expiring read URLs, failure/abandonment cleanup. No sample substitution, originals, public bucket or arbitrary remote fetch.
3. Shared exact commerce authority for validated graph/bag and captured USD/EUR scope, current stock/archival/photo checks, THREAD10, delivery and cent residuals. Stripe amount/currency must match; no uncontrolled tax/currency/promo/quantity changes.
4. Session-specific store name/supported colours and each item's visible size/colour, quantity, price and actual image. Genuine sandbox payment page, fixed return/cancel destinations and server-side status verification.
5. One controller owns persisted pending state. Restore the same store and bag; reject stale/reset/expired/revision/photo/currency mismatches and unrelated attempt IDs. Idempotent create/return; no replayed order or stock mutation. Cancellation, decline, timeout and missing storage remain recoverable.
6. Fixed guarded routes, trusted signed visitor identity, finite global/issued/initial/per-identity arrivals and active/attempt/state limits, no hidden retries/queue. Inert factories, bounded I/O/native work, cancellation and late-effect cleanup; private content-free diagnostics and safe visitor errors.
7. Focused behavior tests, six settled root gates, read-only validation/fix loop and actual sandbox/uploaded-photo/responsive checks where credentials/service access permit. Explicitly distinguish mocks/local evidence from external release acceptance. No staging/commit/push/deployment/delegation.

## Precision references

- [File allocation](../commit-plans/RTL-092.md), [private bucket and ADC](../operations/CHECKOUT-STORAGE.md), [RTL-091 actual access](../validation/RTL-091.md).
- [Shopping and money/session behavior](../engineering/SHOPPING.md), [security boundaries](../engineering/SECURITY.md), [RTL-023 quality](../audits/RTL-023-CODE-QUALITY.md) and [security dispositions](../audits/RTL-023-SECURITY.md).
- Current `packages/commerce/src/currency.ts` and allocation helpers, `features/bag/quote.ts`, `session/controller.ts`/`projection.ts`, shared native `catalogue/sanitize.ts`, fixed frontend bridge and backend ingress. Existing authority remains in force.

Expected first slice: sandbox completion verifies and confirms the gateway experience, preserving the bag and leaving the local commerce ledger unchanged. Reliable durable payment fulfilment/webhooks, merchant onboarding, real payments, refunds and deployment remain outside this ticket.

## Actual result

[Validation](../validation/RTL-092.md) records real uploaded synthetic clothing, custom store name, two selected sizes, exact promotion/amount, actual hosted sandbox test payment and verified unchanged-bag/stock return. Default-off/inert/unit isolation and finite guarded controls remain. Five code/build gates pass;588/589 units retain only the prior strict Linux source-proof mismatch. Docker is unavailable, so refreshed Linux image/native/scanner proof remains pending; the existing development advisory is retained honestly. No staging, commits, push, real payments, paid AI or deployment.
