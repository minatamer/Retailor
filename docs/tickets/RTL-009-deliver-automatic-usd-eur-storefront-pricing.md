# RTL-009 — Deliver exact automatic USD/EUR storefront pricing

Status: **Planned — not started**\
Planning date: **11 October 2026**\
Milestone: **Currency display**\
Depends on: [RTL-004](RTL-004-build-exact-commerce-commands-and-fact-engine.md), [RTL-005](RTL-005-build-one-page-workspace-review-and-recovery.md), [RTL-007](RTL-007-deliver-three-complete-clothing-store-templates.md)\
Blocks directly: [RTL-010](RTL-010-connect-shopping-bag-and-simulated-orders.md), [RTL-016](RTL-016-complete-export-reset-expiry-and-session-lifecycle.md), [RTL-018](RTL-018-harden-privacy-abuse-spend-and-runtime-boundaries.md), [RTL-020](RTL-020-evaluate-live-ai-and-audit-release-acceptance.md)\
Suggested commit: `RTL-009: deliver exact automatic USD/EUR storefront pricing`\
Parent authority: [Retailor blueprint](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md)\
Queue and execution rules: [Ticket index](README.md)

## Outcome and standalone context

Add optional EUR display to the English/USD clothing store. USD cents remain canonical product prices, owner forms and ledger amounts. Choosing EUR automatically converts cards, detail, filters, Tailor budgets, bag, delivery and confirmation from one dated reference quote; visitors never type a rate or maintain a separate price catalogue.

The intended adapter is Frankfurter v2 with the ECB provider explicitly selected. Its documentation was researched, but the actual USD/EUR response was not verified during blueprint preparation. This packet must verify the current official pair route/schema/date behavior rather than hardcode a remembered rate or mistake a blended quote for ECB data. FX is unpaid public reference data, independent of AI capability.

## Dependency evidence and entry conditions

RTL-004 owns exact money/fact primitives, RTL-005 display scope/persistence and RTL-007 current catalogue renderers. Verify the selected official endpoint and response before implementing its schema. Missing paid AI credentials must not disable public FX. Use injected deterministic quotes in tests; no actual numerical rate is asserted by this planned packet.

Dependency completion means required local behavior, owning contracts and checks actually exist. A planned checkbox or ticket-named commit alone is insufficient. Verified local dependencies may support local follow-on work while separately recorded live, owner-visual or hosted evidence remains pending. Never turn a fake pass into live acceptance.

## Files and responsibility boundaries

| Area | Responsibility owned here |
| --- | --- |
| `packages/commerce/src or narrow browser-safe monetary projection` | Exact rational conversion and component remainder allocation |
| `packages/contracts/src` | Strict fixed-pair dated quote shape |
| `apps/backend/src/currency and providers` | Fixed public-data adapter and bounded process cache |
| `apps/frontend/src/features/currency` | USD/EUR selection, dated snapshot and storefront projection |
| `docs/engineering/CURRENCY.md` | Provider verification, rounding, scope and failure behavior |

Paths describe future ownership. Create modules/directories only with real behavior; reuse contracts, commands, assets and session state rather than a parallel authority.

## Implementation plan

1. **Verify source and adapter contract.** Read current Frankfurter/ECB documentation and inspect an actual USD→EUR provider-specific response when network access permits. Validate base/quote/source/date and positive bounded rate. Pin one fixed destination/pair; never accept a user or model URL/currency pair.

2. **Parse rate exactly.** Normalize the validated decimal into an integer rational numerator/denominator with bounded precision/magnitude. Convert USD cents to EUR cents using exact integer arithmetic and documented half-up rounding. Float geometry/formatting cannot become ledger authority.

3. **Provide a bounded unpaid route.** Expose GET /v1/currency/usd-eur through the existing relative fixed bridge. Limit output to 8 KiB, upstream timeout to five seconds, cache to fifteen minutes and one concurrent refresh/process. No API key, guest data, broad proxy or AI admission grant.

4. **Own the accepted snapshot.** Default USD. On deliberate EUR selection or a bounded prefetch, accept one dated quote into display scope and the allow-listed session projection. Proposed maximum rate age is seven calendar days. Do not refresh bag prices silently mid-session; a new workspace can obtain a newer snapshot.

5. **Convert every shopping surface.** Cards, detail, original/sale prices, bag quantities, discounts, delivery and confirmation must share the same projection. Owner finance/product-price forms stay visibly USD. No geolocation, nationality inference or unsupported third currency is needed.

6. **Make filters and Tailor budgets currency-aware.** Compare actual rounded displayed EUR unit prices with inclusive € bounds. A symbol change cannot keep an unchanged numeric filter. Reproject or explicitly clear it with a notice. Pass currency/snapshot identity to shopper context; Tailor cannot invent exchange rates.

7. **Reconcile displayed order components.** Convert canonical total once, then allocate cent remainder deterministically across displayed components or a visible rounding adjustment so the components sum to the exact EUR total. Preserve quote/snapshot metadata on confirmation; later display changes never rewrite historic USD order/refund amounts.

8. **Handle working-day/outage behavior.** Display source/rate date in a compact detail panel. Unavailable, invalid or stale upstream leaves USD usable with clear Euro-pricing-unavailable copy. Continue an accepted unexpired snapshot; never use an invented fixed live fallback or an automatic retry loop.

9. **Fence stale display results.** Bind requests/results to current workspace/generation, reject reset/expired response application and invalidate observations tied to a changed currency budget. Cache contains only public source data; clear per-tab snapshot on reset without clearing unrelated global state.

10. **Prove cent and boundary cases.** Test decimal parsing, half-cent rounding, multi-line remainders, negative display values where supported, zero/unsafe rates, date/freshness and filter equality. Inspect real USD/EUR UI strings and bag sums. Record actual endpoint evidence separately from injected arithmetic tests.

## Acceptance criteria — required local outcome

- [ ] USD remains authoritative for product inputs, orders, costs and dashboard.
- [ ] EUR storefront prices convert automatically from a dated validated quote.
- [ ] The provider is explicitly identified and actual route/schema verification is recorded.
- [ ] Exact rounding/remainder rules keep displayed components and total consistent.
- [ ] Price filters and € Tailor budgets use the same selected display snapshot.
- [ ] FX works independently of fake/paid AI settings and sends no visitor data upstream.
- [ ] Outage/invalid/stale rates preserve usable USD without invented conversion.
- [ ] Accepted quote persists safely without invisible mid-bag changes.

## Focused verification and evidence

| Case | Required observable evidence |
| --- | --- |
| Rate decimals and half-cent | Exact rational parser and documented rounding cases |
| Multi-line quote | EUR components equal converted canonical total |
| € boundary filter | Displayed equality/inclusion matches real rounded product prices |
| USD owner operations | Storefront choice does not mutate source amounts |
| Stale/invalid/upstream timeout | Safe USD fallback message and bounded fetch count |
| Provider identity | Current official fixed-pair response/source/date checked |
| Reset/refresh | Snapshot restores only when valid; late quote cannot attach |

Run meaningful focused tests during iteration. At the settled implementation snapshot run the applicable root gates established by RTL-001: `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm check:boundaries`, `pnpm test:unit` and `pnpm build`. Record actual commands/results and revision. UI acceptance needs real browser observations where available; DOM simulations or animation declarations alone do not prove appearance/movement. Do not add tests that merely mirror CSS or static labels.

## External evidence and scope limits

Actual free endpoint/source/date verification is required before live EUR availability. It does not require paid AI authorization. Record availability/network limitations honestly rather than copying a rate from the blueprint or HTML.

No bank/payment/FX trading integration, manually entered rate, currency pricing editor or geolocation. ECB reference data is display context, not a settlement promise. No model computes prices or rates. If endpoint verification is unavailable, finish exact local behavior with injected quotes and leave that external check explicitly pending.

## Precision references

- [3. Decisions and scope](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#3-decisions-and-scope)
- [9. Storefront and product experience](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#9-storefront-and-product-experience)
- [10. Bag and simulated checkout](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#10-bag-and-simulated-checkout)
- [13. Commerce domain and exact calculations](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#13-commerce-domain-and-exact-calculations)
- [14. Commands, revision control and proposals](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#14-commands-revision-control-and-proposals)
- [16. Guest state, recovery and cleanup](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#16-guest-state-recovery-and-cleanup)
- [19. Data contracts and API](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#19-data-contracts-and-api)
- [23. Resource limits and cost control](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#23-resource-limits-and-cost-control)
- [25. Verification and evidence](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#25-verification-and-evidence)
- [29. Decisions to settle during implementation](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#29-decisions-to-settle-during-implementation)

## Completion handoff and commit boundary

Keep this outcome under `RTL-009:`; adjacent cohesive commits may be planned when useful. At execution write file allocations under `docs/commit-plans/RTL-009.md` and actual check/review evidence under `docs/validation/RTL-009.md`. These are future records, not fabricated by this planning pass.

Report files, delivered behavior, settled checks, browser/device observations, deviations and every deferred external check with its prerequisite. Update owning documentation and queue status together. All boxes are currently unchecked. Ticket creation does not implement the feature, authorize Git mutations, start services, call paid runtime providers or publish cloud resources. Follow the user’s actual execution authorization when work starts.
