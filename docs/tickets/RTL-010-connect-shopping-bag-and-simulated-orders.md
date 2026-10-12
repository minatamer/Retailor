# RTL-010 — Connect shopping, the bag and simulated orders

Status: **Locally complete — connected shopping verified; physical/zoom/owner visual evidence pending RTL-019**\
Planning date: **11 October 2026**\
Milestone: **Connected shopping**\
Depends on: [RTL-004](RTL-004-build-exact-commerce-commands-and-fact-engine.md), [RTL-007](RTL-007-deliver-three-complete-clothing-store-templates.md), [RTL-008](RTL-008-deliver-tailor-chat-led-styling-and-owner-overrides.md), [RTL-009](RTL-009-deliver-automatic-usd-eur-storefront-pricing.md)\
Blocks directly: [RTL-011](RTL-011-deliver-three-scenarios-and-owner-operations.md), [RTL-013](RTL-013-deliver-grounded-tailor-conversation-tools-and-tours.md)\
Suggested commit: `RTL-010: connect shopping, the bag and simulated orders`\
Parent authority: [Retailor blueprint](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md)\
Queue and execution rules: [Ticket index](README.md)

## Outcome and standalone context

Connect the attractive store to real local shopping effects. A visitor browses actual garments, selects an available variant, builds a bag and places a clearly simulated order. The same order and stock movement later appear in the owner workspace. No payment, shipping, address collection or Shopify API is involved.

The bag is not a stock reservation. Price/stock changes from owner forms, Tailor or a scenario switch must be revalidated before confirmation. USD is canonical while optional EUR is an exact display quote. Shopper traffic records capture meaningful nested stages, not inflated counts from button clicks or owner/designer preview activity.

## Dependency evidence and entry conditions

RTL-004 command/stock/money invariants, RTL-007 actual products, RTL-008 accepted setup design and RTL-009 display currency must be verified locally. Use one existing session controller and current catalogue selectors. No new backend CRUD route or commerce SDK is needed. A working verified development catalogue supports local testing without live provider calls.

Dependency completion means required local behavior, owning contracts and checks actually exist. A planned checkbox or ticket-named commit alone is insufficient. Verified local dependencies may support local follow-on work while separately recorded live, owner-visual or hosted evidence remains pending. Never turn a fake pass into live acceptance.

## Files and responsibility boundaries

| Area                                    | Responsibility owned here                                    |
| --------------------------------------- | ------------------------------------------------------------ |
| `apps/frontend/src/features/bag`        | Bag state, effect review and demo checkout                   |
| `apps/frontend/src/features/storefront` | Available variant selection and actual shopping entry points |
| `apps/frontend/src/features/session`    | Shopper-stage records and receipt/quote recovery integration |
| `docs/engineering/SHOPPING.md`          | Bag, quote, traffic and simulated purchase behavior          |

Paths describe future ownership. Create modules/directories only with real behavior; reuse contracts, commands, assets and session state rather than a parallel authority.

## Implementation plan

1. **Derive bag entries from variants.** Use exact product/variant IDs and bounded quantities: eight lines, five units per line. Add/change/remove must honor currently sellable photo-backed items; display unknown/unavailable options honestly. Bag selections do not deduct stock.

2. **Make detail-to-bag smooth.** Size/colour selection is clear, buying action is named and result feedback links to the actual bag. Templates share semantics while varying layout. Missing photo or archived item cannot be silently substituted with a sample product.

3. **Review current exact totals.** Use shared commands/projections for merchandise, discounts, delivery, simulated tax and selected currency. Default sample delivery may be $6 with $0 simulated tax; explain these as demo assumptions. Retain merchandise-versus-delivered budget meaning.

4. **Keep checkout brief and honest.** Collect no real payment details, email or shipping address. State Place demo order and show exact quantities, price/stock effect and total. Treat delivered quote/display snapshot as review context, not a carrier rate or settlement amount.

5. **Revalidate before placement.** Compare current variant price/stock and quote identity with reviewed values. On changes, keep selections, show corrected bag and require review; do not place against stale availability. One unavailable line rejects the whole placement.

6. **Apply one atomic order.** Invoke the pure order command once with stable command ID and immutable line/cost/discount snapshots. Double click or refreshed receipt cannot deduct twice. Clear/adjust bag after success and show the actual order reference with a useful owner-dashboard link.

7. **Keep USD/EUR coherent.** Use the accepted dated snapshot for all displayed components and confirmation. Canonical order/refund values remain USD. Currency changes or expired/unavailable rates show explicit price context and never silently rewrite a submitted order.

8. **Record meaningful local shopper activity.** Begin an eligible session only when exploring the accepted storefront, excluding Style/design previews and owner activity. Track engagement, bag, checkout and placed-order stages as idempotent nested facts. Multiple orders in one eligible visit count once for conversion.

9. **Preserve identity and recovery.** Restore eligible bag/order confirmation without replaying placement or inference. Product archive/deletion, stock correction or scenario replacement revalidates bag and invalidates stale confirmation. Reset/expiry clears owned pending effects and event callbacks.

10. **Prove the connected result.** Walk through actual shopping on phone/desktop, inspect resulting immutable order and stock movement, then confirm owner selectors/facts see the same values. Use meaningful duplicate/stale/oversell/currency/cohort checks, not just a screenshot of a success toast.

## Acceptance criteria — required local outcome

- [x] All families share usable variant selection and a bounded real bag.
- [x] Price/quantity/stock are validated against the current graph at placement.
- [x] Checkout clearly simulates a purchase and collects no real PII/payment details.
- [x] One placed order creates one coherent stock/economic effect.
- [x] USD/EUR bag components and confirmation reconcile from the same quote.
- [x] Archived/missing-photo/sold-out/stale items recover without substitution.
- [x] Nested local traffic excludes owner/designer activity and counts one conversion per session.
- [x] Refresh/duplicate actions cannot replay placement.
- [x] The actual order reference and stock result are available to owner views.

## Focused verification and evidence

| Case                          | Required observable evidence                                      |
| ----------------------------- | ----------------------------------------------------------------- |
| Two shirts with discount      | Exact allocated cents, delivery total and once-only deduction     |
| Concurrent stock/price change | Corrected bag review, no stale order                              |
| Duplicate Place action        | Same command receipt and no second stock movement                 |
| EUR confirmation              | Displayed components sum; canonical USD snapshot unchanged        |
| Photo/archive failure         | Affected item unavailable and selections recover usefully         |
| Traffic repetition            | Repeated bag clicks/orders count stages once; owner view excluded |
| Refresh after success         | Receipt returns without placement/provider replay                 |

Run meaningful focused tests during iteration. At the settled implementation snapshot run the applicable root gates established by RTL-001: `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm check:boundaries`, `pnpm test:unit` and `pnpm build`. Record actual commands/results and revision. UI acceptance needs real browser observations where available; DOM simulations or animation declarations alone do not prove appearance/movement. Do not add tests that merely mirror CSS or static labels.

## External evidence and scope limits

No paid or hosted acceptance belongs to this packet. Record visual/device checks not actually performed separately.

No real payment/carrier/tax integration, real address/contact collection, checkout marketing trick or cart abandonment automation. A bag does not reserve inventory. Do not add backend persistence or independently edit dashboard sales. Order lifecycle/owner registers arrive in RTL-011.

## Precision references

- [6. Routes, shell and navigation](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#6-routes-shell-and-navigation)
- [9. Storefront and product experience](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#9-storefront-and-product-experience)
- [10. Bag and simulated checkout](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#10-bag-and-simulated-checkout)
- [12. Synthetic collection and activity](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#12-synthetic-collection-and-activity)
- [13. Commerce domain and exact calculations](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#13-commerce-domain-and-exact-calculations)
- [14. Commands, revision control and proposals](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#14-commands-revision-control-and-proposals)
- [16. Guest state, recovery and cleanup](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#16-guest-state-recovery-and-cleanup)
- [25. Verification and evidence](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#25-verification-and-evidence)

## Completion handoff and commit boundary

Keep this outcome under `RTL-010:`; adjacent cohesive commits may be planned when useful. At execution write file allocations under `docs/commit-plans/RTL-010.md` and actual check/review evidence under `docs/validation/RTL-010.md`. These are future records, not fabricated by this planning pass.

Report files, delivered behavior, settled checks, browser/device observations, deviations and every deferred external check with its prerequisite. Update owning documentation and queue status together. All required local criteria now have evidence in the validation record; physical/device/zoom acceptance remains separately pending. Ticket creation does not implement the feature, authorize Git mutations, start services, call paid runtime providers or publish cloud resources. Follow the user’s actual execution authorization when work starts.

## Executed completion

12 October 2026: [Validation and actual browser evidence](../validation/RTL-010.md) records 207 passing tests, all settled root gates and a clean final read-only third pass after the independently reproduced amount-limit repair. [Shopping behavior](../engineering/SHOPPING.md) owns exact review, traffic and recovery semantics. Four cohesive commits follow [the allocation](../commit-plans/RTL-010.md). RTL-011 is next.
