# RTL-168 — Choose the store on Shopify

## Status and authority

**Local store selection and OAuth verified, 10 November 2026; all six local gates pass (791 tests). See [actual validation](../validation/RTL-168.md) for manual visual/lifecycle and external acceptance limits.** The owner explicitly requests removing Retailor's store-address field and implementing Shopify-owned selection, locally first without review submission. Preserve the unstaged RTL-166 setup and RTL-167 card edits. No distribution choice, tunnel, certificate, deployment, paid call or review submission is authorized.

## Precision references

- Current `shopify/service.ts`, `model.ts`, `provider.ts`, `fixture.ts`, fixed routes and encrypted ledger; existing RTL-162 security/session acceptance remains required.
- `packages/contracts/src/shopify.ts`, frontend Shopify controller/request/card and session controller. Preserve tab proof, original two-hour expiry, photo recovery before navigation, and fixed no-referrer callback/install bridge.
- [Shopify Dev Dashboard installation](https://shopify.dev/docs/apps/build/dev-dashboard/create-apps-using-dev-dashboard#step-3-install-your-app): app Home/Overview → Install app → choose/create a dev store. Use the actual link generated for this app, never an invented account-store discovery endpoint.
- [Authorization code grant](https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens/authorization-code-grant): authenticate signed App URL entry before using its shop, then per-shop authorization and single-use callback exchange.
- [Shopify explanation of generated development install links](https://community.shopify.dev/t/cannot-install-app-from-dev-dashboard-during-local-oauth-testing/34621): this entry uses the released App URL. Public distribution/review eligibility remains separate and pending.

## Acceptance

1. Onboarding and Connections offer one Connect CTA with no shop-address field or shop in the public Connect request. Shopify owns the real store picker. Skip stays usable.
   After successful onboarding connection, hide Refresh, Disconnect and redundant success feedback; keep Continue to storefront. Dashboard Connections retains management actions and error recovery stays available.
   Latest layout correction: put the onboarding Continue/Skip CTA first, with About this demo directly below it; both aligned left. Keep disclosure expansion usable and remove the extra divider between these controls.
   Replace the default disclosure triangle with an info icon from the existing icon system and clear hover/focus styling; retain native keyboard and expanded-state semantics.
   Dashboard follow-up: hide Refresh for a verified connected store. Style Disconnect like the onboarding CTA and place the same info disclosure directly below it. Preserve Refresh for recovery, busy disabling and explicit disconnect confirmation.
2. Begin a bounded, cookie/tab-proof-bound unknown-shop attempt. Accept the selected shop only from a fresh HMAC-verified install entry in that same browser. At most one live pending attempt per browser cookie prevents cross-tab ambiguity. Signed entry reserves the shop atomically under existing capacity/conflict rules; one selected shop cannot replace another or another workspace's installation.
3. Preserve nonce expiry/replay protection, one-time durable exchange, dev-store identity/scope checks, encrypted tokens, reconnect/cleanup access and original fixed demo expiry. No products are written on connection.
4. Exact generated development install link is non-secret source configuration and unavailable in production. Missing/unsafe link fails closed with Skip available. No merchant-specific token or store is hardcoded. Real public merchant installation remains pending review/distribution, not implied by the local dev-store test.
5. Explicit simulation and injected tests traverse selection → verified install → callback. Meaningful tests cover no premature reservation, forged/missing/cross-cookie/expired/ambiguous install, conflicting shops, replay, cancellation and normal frontend recovery/navigation.
6. Run focused checks and applicable six gates; perform actual responsive/card and local CTA checks. Record native login/consent/callback results only when observed; user completes native access approval. Document progress and remaining setup plainly.
