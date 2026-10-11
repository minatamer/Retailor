# RTL-004 — Build exact commerce commands, invariants and metric facts

Status: **Complete**\
Planning date: **11 October 2026**\
Milestone: **Domain authority**\
Depends on: [RTL-001](RTL-001-initialize-workspace-contracts-and-safe-runtime.md)\
Blocks directly: [RTL-005](RTL-005-build-one-page-workspace-review-and-recovery.md), [RTL-009](RTL-009-deliver-automatic-usd-eur-storefront-pricing.md), [RTL-010](RTL-010-connect-shopping-bag-and-simulated-orders.md), [RTL-011](RTL-011-deliver-three-scenarios-and-owner-operations.md)\
Suggested commit: `RTL-004: build exact commerce commands, invariants and metric facts`\
Parent authority: [Retailor blueprint](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md)\
Queue and execution rules: [Ticket index](README.md)

## Outcome and standalone context

Build the one calculation and mutation authority shared by storefront, dashboard, scenario generator and Tailor. Retailor uses temporary browser state, but its stock, order adjustments, costs and metrics must behave like coherent commerce. There is no independent sales array, dashboard-only inventory or chatbot ledger. Publicly attractive charts are invalid if they contradict the garments the visitor can shop.

Use exact bounded integer USD cents. Product/variant IDs, mandatory photo references, immutable placed snapshots, independent physical returns/financial refunds, synthetic costs/expenses and nested traffic cohorts belong in one valid graph. This packet owns the pure engine and contracts, not dozens of UI screens. It is larger than a form ticket because every later feature needs the same trustworthy authority.

## Dependency evidence and entry conditions

RTL-001’s package boundaries, strict schemas, exact amount parser and test isolation must pass. Read the complete domain/fact registry and worked examples. Use independent synthetic fixtures; importing frontend caches, provider SDKs or environment into commerce is forbidden. Photo availability is a validated browser asset witness, while pure code verifies required accepted photo IDs and relationship integrity.

Dependency completion means required local behavior, owning contracts and checks actually exist. A planned checkbox or ticket-named commit alone is insufficient. Verified local dependencies may support local follow-on work while separately recorded live, owner-visual or hosted evidence remains pending. Never turn a fake pass into live acceptance.

## Files and responsibility boundaries

| Area | Responsibility owned here |
| --- | --- |
| `packages/commerce/src` | Records, commands, graph invariants, effect previews and computed facts |
| `packages/contracts/src` | Only cross-boundary graph/command/fact/proposal shapes |
| `test/fixtures or owning package test fixtures` | Independent expected financial/stock/cohort cases |
| `docs/engineering/COMMERCE.md` | Formula/date basis, lifecycle and replay/Undo rules |

Paths describe future ownership. Create modules/directories only with real behavior; reuse contracts, commands, assets and session state rather than a parallel authority.

## Implementation plan

1. **Define explicit bounded entities.** Model products, variants, accepted image descriptors, placed/draft orders, cancellation, returns, refunds, movements, unit costs, expense drafts/postings/corrections, writeoffs, buyers, traffic, feedback and receipts. Keep runtime Blob/controller/persistence fields outside pure commerce.

2. **Implement product commands.** Create/update require clothing identity and at least one accepted photo; final browser dispatch rechecks available decoded bytes. Prices/costs enter USD. Deletes apply only without protected references; otherwise archive. Changes preserve stable IDs and old order snapshots. Options respect retained product/variant bounds.

3. **Implement atomic order placement.** Revalidate active variants/current prices and available stock, allocate discounts deterministically and capture unit-level price/discount/cost snapshots. Deduct all lines once or reject all. Drafts and bags reserve nothing; fulfilment transitions cannot deduct stock a second time.

4. **Separate financial and physical adjustments.** Placed-only cancellation before return/refund restores units and discounted charges once. Returns receive only shipped, not-already-received units. Restock applies only inspected eligible units. Refund limits use remaining discounted merchandise/delivery/tax and never imply restock.

5. **Compute cost and loss correctly.** Cost settings affect future snapshots. Cancellation/eligible restock reverse sold cost once; goodwill refund alone does not. Write off only available units and snapshot cost. A sold damaged return retains sold cost and must not incur a second warehouse-loss charge.

6. **Make expense lifecycle explicit.** Unposted expense drafts have no result effect and can be edited/deleted. Posted entries are immutable; correction/void uses linked bounded signed adjustments. Prevent an inbound-stock cost being counted immediately as expense and again as sold cost. No general ledger or cash-flow fiction.

7. **Build the fact registry.** Implement net merchandise sales, included orders, pre-refund AOV, sold cost, gross/result margins, expenses, inventory loss, stock and all specified cohort facts. Each result exposes formula, date/as-of basis, exact numerator/denominator, availability and contributing references.

8. **Validate traffic/cohort semantics.** Visits, engagement, bag, checkout and conversion form one nested known cohort. Owner/designer activity is excluded. A session counts once even after repeated clicks/orders. New/repeat and return/refund rates use matching cohorts; zero denominators are unavailable, not guessed zero.

9. **Fence commands and proposals.** Bind workspace/scenario IDs, expected data revision, command/payload identity and expiry. Same command ID/payload returns previous references; changed payload rejects. Receipt cap fails clearly. Latest eligible draft/copy/bag Undo creates a new revision; posted ledger events need permitted transitions, not erasure.

10. **Prove independent expectations.** Use the blueprint’s shirt/tee and refund/restock examples plus negative-period, proportional-discount remainder, oversell, archive and cohort cases. Return immutable valid graphs and typed rejections with no partial mutation. Measure worst-case graph size against 512 KiB and report any justified bound correction before consumers depend on it.

## Packet-specific contracts and cases

Required lifecycle distinctions:

| Object/action | Permitted meaning | Forbidden shortcut |
| --- | --- | --- |
| Order draft | Editable, no financial/stock effect | Count draft as sales |
| Placed order | Immutable snapshots plus allowed transitions | Edit old price or delete ledger |
| Return receipt | Physical quantity/disposition | Automatically issue money |
| Refund | Bounded financial adjustment | Automatically restore stock/cost |
| Available-stock writeoff | One linked stock and cost loss | Charge sold damaged returns twice |
| Expense correction | Linked signed posting | Rewrite original posted amount |

The initial limits include 20 active/40 retained products, 24 variants/product and 288 retained variants; 30 placed orders plus four drafts; 60 returns/60 refunds/256 movements; 40 posted expense/adjustment records plus four drafts, 24 writeoffs and 160 receipts. Array caps and graph size are independent constraints.

## Acceptance criteria — required local outcome

- [x] All product/commerce changes use one pure command/effect path.
- [x] Photo-backed clothing creation and relationship/cap invariants are enforced.
- [x] Order placement/stock/discount allocation are exact and atomic.
- [x] Cancellation, fulfilment, return, refund and restock cannot double apply.
- [x] Refund-only loss and eligible cost reversals reconcile correctly.
- [x] Posted expense/writeoff history is preserved through linked corrections.
- [x] Metrics expose precise basis and contributing records; negative/zero/unavailable remain distinct.
- [x] Cohorts exclude owner/designer events and never exceed 100% through repeated actions.
- [x] Idempotency, revision conflicts, bounded receipts and latest eligible Undo work.
- [x] No platform/provider/storage dependency enters pure code.

## Focused verification and evidence

| Case | Required observable evidence |
| --- | --- |
| Shirt order A and tee cancellation B | Gross 146, discounts 10, cancellation 38, refund 49 yields net 49; AOV basis remains 98 |
| Refund without physical return | Revenue reverses while sold cost/stock remain until eligible receipt/restock |
| Damaged sold return | No available stock and no second inventory-loss cost |
| Atomic oversell | One insufficient line rejects the entire order |
| Cent remainder | Allocated discounts/refunds sum exactly and repeated adjustments stay bounded |
| Historical edits | Current title/price/cost changes leave placed snapshots intact |
| Replay/stale/Undo | One effect, safe conflict and only eligible latest reversal |
| Traffic/date edges | Known cohort, owner exclusions, negative refund period and unavailable denominator |
| Maximum graph | Valid capped fixture fits serialized bound without silent history truncation |

Run meaningful focused tests during iteration. At the settled implementation snapshot run the applicable root gates established by RTL-001: `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm check:boundaries`, `pnpm test:unit` and `pnpm build`. Record actual commands/results and revision. UI acceptance needs real browser observations where available; DOM simulations or animation declarations alone do not prove appearance/movement. Do not add tests that merely mirror CSS or static labels.

## External evidence and scope limits

No paid or hosted acceptance belongs to this packet. Record visual/device checks not actually performed separately.

No database, cash/bank model, real tax, payment API, arbitrary sales-total editor or erase-history Undo. Conversion and customer labels remain fictional. Photo decoding remains outside pure code. Complete the deterministic engine here; consumer UI belongs to later packets and cannot redefine formulas.

## Precision references

- [8. Catalogue recognition and review](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#8-catalogue-recognition-and-review)
- [11. Owner workspace](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#11-owner-workspace)
- [12. Synthetic collection and activity](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#12-synthetic-collection-and-activity)
- [13. Commerce domain and exact calculations](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#13-commerce-domain-and-exact-calculations)
- [14. Commands, revision control and proposals](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#14-commands-revision-control-and-proposals)
- [19. Data contracts and API](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#19-data-contracts-and-api)
- [23. Resource limits and cost control](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#23-resource-limits-and-cost-control)
- [25. Verification and evidence](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#25-verification-and-evidence)

## Completion handoff and commit boundary

Keep this outcome under `RTL-004:`; adjacent cohesive commits may be planned when useful. At execution write file allocations under `docs/commit-plans/RTL-004.md` and actual check/review evidence under `docs/validation/RTL-004.md`. These are future records, not fabricated by this planning pass.

Report files, delivered behavior, settled checks, browser/device observations, deviations and every deferred external check with its prerequisite. Update owning documentation and queue status together. Required local acceptance is verified in [RTL-004 evidence](../validation/RTL-004.md). The owner authorized ticket-prefixed commits after clean validation. No paid, hosted or browser acceptance belongs to this pure-domain packet.
