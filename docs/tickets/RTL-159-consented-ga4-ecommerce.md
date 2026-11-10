# RTL-159 — connect consented Standard GA4 ecommerce events

Status: **Planned — awaiting owner review and later execution instruction.**\
Planning date: **19 October 2026**\
Depends on: [RTL-158 local routes and SEO](RTL-158-temporary-store-urls-and-public-seo.md)\
Blocks: RTL-160 final analytics-inclusive performance comparison

## Outcome and scope

Use free Standard GA4, one Web stream and a small optional browser adapter to observe actual demo shopping. Reports remain in Google. No custom analytics service/database, mandatory authentication, Ads/360/BigQuery, Measurement Protocol, backend analytics sender, Shopify or A/B testing. All observed purchases are sandbox demonstrations, not real revenue.

Read [the complete GA4 policy and numbered setup guide](../engineering/DEMO-IMPROVEMENTS-PLAN.md#1-standard-ga4-with-explicit-commerce-events), current controller/checkout/projection/money code, lifecycle/privacy docs and RTL-023/143 retained audit dispositions. Refresh official documentation when implementing. Create `docs/commit-plans/RTL-159.md` before edits.

## File and responsibility allocation to refine before edits

- Frontend analytics feature: one narrow optional sink, allow-listed event projection, safe page classification, tag/consent lifecycle and focused tests. No shared catch-all analytics framework.
- `features/session/controller.ts`/`projection.ts`: successful shopper mutations and verified `settleStripeOrder` hooks, bounded session-owned dispatch markers. Analytics cannot own shopping state or modify pure commerce authority.
- `app/layout.tsx`/shared UI: non-blocking tag/consent composition, accessible settings and privacy notice route; reserve its route slug and index it only when real. No raw application/provider exceptions enter analytics or UI.
- `apps/frontend/next.config.mjs`: minimal documented non-Ads CSP additions; retain origin/Turnstile/streaming controls.
- Frontend `.env.example`, Dockerfile build stage, README and release build-input instructions: blank `NEXT_PUBLIC_GA4_MEASUREMENT_ID`, safe validation, explicit public build argument/value. Record that public build value with the exact source/build/image proof; a different compiled ID needs matching image evidence. Do not read/copy secrets or treat a runtime-only Cloud Run variable as a build-time setting.
- `docs/validation/RTL-159.md`, product/privacy/setup docs, ticket/index: actual local checks and separate owner/Google receipt evidence. No account provisioning helper or API credential.

## Acceptance criteria

1. Blank/malformed ID, localhost/test/generated-service host, no consent, rejected consent or tag failure produce no Google collection by default. Valid ID enables only on canonical `tryretailor.com` after opt-in. Basic consent blocks all Google downloads/pings/cookies before acceptance; ad consent/signals/personalization stay off. Acceptance/rejection/settings/withdrawal work by keyboard/touch, preserve shopping and have clear focus. Storage failure fails closed on reload. One versioned consent preference expires after180 days/policy-version change, separate from workspace reset; GA cookies use browser-session expiry.
2. Configure `send_page_view: false` and require enhanced/history measurement off. Set safe global page location/title/referrer/campaign context **before** tag initialization; maintain it on all route changes and automatic events. Raw store-name paths, titles, URL query/hash, checkout attempt, search and arbitrary campaign text never leave in events, tag requests or HTTP referrers. Prove this from outbound requests, not only intended adapter arguments; keep collection disabled if proof fails.
3. Send `page_view`, `view_item`, `add_to_cart`, `remove_from_cart`, `begin_checkout`, `purchase` at the plan's accepted-state boundaries. Quantity events use deltas; no-op/failure/reset/purchase clearing sends no cart event. Variant/UI rerenders are not product views. Owner actions, seeded activity and local simulated orders create no purchase. A new checkout intent differs from retry/restore of an existing intent.
4. Only backend-verified sandbox completion followed by successful local order settlement can send purchase. A fabricated success query, decline/cancel/open/expired/stale attempt, missing photo, amount/currency mismatch or lost session cannot. Persist a bounded dispatch-attempt marker before optional send; duplicate returns/reload/remount/Back/Forward/consent changes do not resend. Stable nonempty `sandbox_<opaque-order-id>` transaction ID supplies GA4 deduplication. No durable queue/retry/exactly-once claim; blocked or lost events may undercount.
5. Strict payload allows only numeric money/quantities, opaque generated item IDs, fixed category-derived labels, page kinds and finite demo/payment/source categories. No editable product/store text, uploaded content/URLs/hashes, reviews/chat, contact/payment information, grants/tokens or Retailor workspace/security identity. Google's consented pseudonymous browser/session identifiers are disclosed separately. Preserve exact quote currency, discounted merchandise value, shipping/tax and cent allocations for USD/EUR/THREAD10; no independent floating-point calculation.
6. Tag/sink exceptions and script/network blocking never change bag, stock, checkout settlement, navigation or the existing private logs. No application technical browser-console logging or public error telemetry. No pre-consent event replay; withdrawal stops sends and clears GA cookies.
7. Privacy explanation identifies external Google event storage, consent/cookies/withdrawal/contact and retention separate from the two-hour demo; reset cannot erase already-sent events. Owner guide is executable as written, with Standard GA4/no billing, account/property/Web stream, Measurement ID location/build configuration, debug/developer filtering and Realtime/DebugView verification. Reports clearly describe sandbox activity.

## Verification and dependencies on the owner

Tests inject a deterministic sink and deny external networking. Cover successful/failed actions, actual serialized payloads, cents/residuals, session/consent races, duplicate checkout return and sink/storage exceptions. Browser interception must inspect first tag load, automatic engagement and all emitted requests, with a personal-looking store name, edited product/search text and checkout query sentinel. Exercise consent accept/reject/withdraw, storage unavailable, blocked/delayed script, navigation, reload, reset and two independent browser sessions; shopping remains usable throughout.

Run all six settled repo gates and complete a read-only full-ticket review, recording actual results in `docs/validation/RTL-159.md`. Account creation/login/terms, public Measurement ID, privacy-contact approval and any real Google/Stripe receipt test remain owner steps under later authorization. Locally verified event intent is not proof Google received it. Missing account access does not block independent disabled-by-default integration; external receipt stays pending. New build/CSP/image inputs need applicable refreshed Linux/scanner/raw-byte proof before release. This planning request authorizes no account action, provider call, deployment, staging/commit or push.
