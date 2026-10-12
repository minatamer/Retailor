# RTL-011 — Deliver three business scenarios and owner operations

Status: **Implemented locally — final physical/zoom/owner visual acceptance pending in RTL-019**\
Planning date: **11 October 2026**\
Milestone: **Owner operations**\
Depends on: [RTL-004](RTL-004-build-exact-commerce-commands-and-fact-engine.md), [RTL-005](RTL-005-build-one-page-workspace-review-and-recovery.md), [RTL-010](RTL-010-connect-shopping-bag-and-simulated-orders.md)\
Blocks directly: [RTL-012](RTL-012-build-animated-dashboard-and-record-drilldown.md), [RTL-014](RTL-014-deliver-tailor-inline-photo-crud-and-confirmation.md), [RTL-016](RTL-016-complete-export-reset-expiry-and-session-lifecycle.md)\
Suggested commit: `RTL-011: deliver three business scenarios and owner operations`\
Parent authority: [Retailor blueprint](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md)\
Queue and execution rules: [Ticket index](README.md)

## Outcome and standalone context

Make the same temporary store operable from its owner perspective. Deliver manual photo-backed product CRUD, unplaced order/expense draft CRUD, permitted placed-order lifecycle, inventory/cost adjustments, returns/refunds and three coherent business presets. Each operation is a real editable form using RTL-004’s exact command/effect engine.

Healthy profit, Near break-even and Heavy loss are accepted scope. Their fictional business activity must reference the published clothes and actual variant IDs, not invent generic bestsellers. Switching presets replaces business activity after a clear effect review, while preserving catalogue, photos and accepted design. The owner’s product prices and explicit unit-cost edits are respected; charts cannot be forced to an arbitrary profit number.

## Dependency evidence and entry conditions

RTL-004 covers pure commands/metrics, RTL-005 workspace/publication and RTL-010 real shopper orders. Confirm actual product/variant/receipt and bag interfaces. The Style publication seam must call this generator once after catalogue approval; replace any declared development-only injection, not maintain two generators. Read all finance/lifecycle/date-basis rules before building forms.

Dependency completion means required local behavior, owning contracts and checks actually exist. A planned checkbox or ticket-named commit alone is insufficient. Verified local dependencies may support local follow-on work while separately recorded live, owner-visual or hosted evidence remains pending. Never turn a fake pass into live acceptance.

## Files and responsibility boundaries

| Area | Responsibility owned here |
| --- | --- |
| `packages/commerce/src/scenarios` | Seeded record generator using the same commands |
| `apps/frontend/src/features/operations` | Product/order/return/refund/stock/cost/expense registers and forms |
| `apps/frontend/src/features/session` | Atomic scenario replacement and catalogue publication |
| `apps/frontend/src/features/dashboard` | Owner shell/navigation and operation entry points |
| `docs/engineering/OWNER-OPERATIONS.md` | Form/lifecycle/scenario contracts and provenance |

Paths describe future ownership. Create modules/directories only with real behavior; reuse contracts, commands, assets and session state rather than a parallel authority.

## Implementation plan

1. **Build owner navigation over one graph.** Create compact Products, Orders, Inventory/Returns, Expenses and Design/Scenario entry points. Reuse existing Design panel. Storefront/owner switch preserves context and accepted look; it does not create another merchant workspace or fictional dataset.

2. **Complete photo-backed product CRUD.** Create/read/update/delete use one form with mandatory native photo upload and current source validation. Title/category/options/price/stock are bounded. Stock updates produce reasoned movements; unit-cost edits apply to future snapshots. Delete only unreferenced items; archive linked items and explain preserved history.

3. **Support coherent order operations.** Editable unplaced drafts can be created/edited/deleted without sales/stock effect. Review exact placement, then allow placed→shipped→fulfilled or eligible placed→cancelled. Placed snapshots are immutable and hard delete is unavailable. Owner-created orders remain excluded from conversion unless genuinely linked to known eligible shopper activity.

4. **Separate return/refund forms.** Return quantities reference known shipped lines; receipt distinguishes restockable/non-restockable disposition. Refund review shows remaining discounted merchandise/delivery/tax and independent physical effects. No refund automatically restocks; no return automatically pays.

5. **Expose costs, expenses and loss causes.** Show visible synthetic unit costs, current stock value, posted operating expenses and available-stock writeoffs. Draft expenses are editable; posted corrections/void are linked. Avoid charging a damaged sold return again as a warehouse loss or double-counting inventory purchase and COGS.

6. **Generate valid seeded scenarios.** Use a reproducible seed and captured anchor over the actual catalogue. Up to twenty seed orders/300 fictional sessions/forty buyers leave guest headroom inside total limits. Apply events in time order with valid opening-stock assumptions; derive all facts from records, never chart arrays.

7. **Define three meaningful stories.** Healthy profit uses sensible costs/expenses; break-even has low headroom; heavy loss has explicit expense/refund/discount/writeoff causes. Respect current product prices/cost overrides. If edited inputs change the intended outcome, display the actual result rather than falsify data.

8. **Review scenario replacement.** State that orders, returns/refunds, traffic, feedback, expenses, movements/writeoffs, drafts and receipts reset. Preserve products/photo bytes/accepted design/brand/logo. Show rebuilt opening stock and discarded drafts. Cancel leaves graph untouched; confirm commits atomically with a new scenario identity/revision.

9. **Reconcile dependent state.** Revalidate the bag after replacement and explain changes. Cancel context-bound requests, clear executable proposals/forms and retain old finalized chat only as inert scenario-labelled text. History snapshot labels distinguish historical price/title from current storefront links.

10. **Make the forms reusable for Tailor.** Expose stable typed form/draft APIs and effect review states for RTL-014, not a second chat CRUD implementation. Preserve dirty fields and focus, handle duplicate names explicitly and keep confirmation compact. Deleting final active product yields a beautiful useful empty store.

## Packet-specific contracts and cases

Scenario identity is separate from workspace identity: replacing activity keeps the clothing/brand workspace and expiry but starts a new business-history generation. The generator must return a complete valid graph before commit. Counts and monetary facts derive from those records; a target result label is not a hidden KPI assignment.

Each register shows origin, relevant timestamp basis and linked records. Costs/sizing/stock are disclosed demo assumptions; photos do not reveal them. Current availability must match the actual signed movement history after any mutation. Use live product links and explicit historical snapshots, never another product as a visual substitute.

## Acceptance criteria — required local outcome

- [x] Owner registers/forms operate the current storefront graph.
- [x] All product creates require actual validated photos; linked removals archive.
- [x] Order/expense drafts and immutable posted lifecycle are clearly distinguished.
- [x] Returns/refunds/restock/cost/writeoff effects follow exact independent rules.
- [x] Three actual coherent scenario generators use only current catalogue IDs.
- [x] Seeded costs/traffic/history are visibly synthetic and source-linked.
- [x] Scenario replacement reviews activity/stock loss and preserves catalogue/design/photos.
- [x] Prices and explicit unit-cost edits are not overwritten to force a result.
- [x] Bag/pending proposals/old chats reconcile against new identity.
- [x] Forms expose reusable typed seams for Tailor, including last-product recovery.

## Focused verification and evidence

| Case | Required observable evidence |
| --- | --- |
| Create/edit/archive garment | Mandatory photo and exact storefront update; old order snapshot preserved |
| Last product removal | Useful empty-store/create path, valid graph |
| Draft/place/cancel/fulfil | No draft effect, no double deduction, correct eligible transitions |
| Return/refund/writeoff cases | Independent physical/financial/cost effects and no double loss |
| All three presets | Expected qualitative story supported by exact records/formulas |
| A radically different uploaded collection | No sample-only or phantom item in scenario/chart references |
| Switch preview/cancel/confirm | Disclosure, atomic replacement and unchanged design/photo identities |
| Override price/cost before switching | Preserved inputs, actual outcome and honest explanation |
| Guest bag and pending Tailor | Revalidation and stale executable action fencing |

Run meaningful focused tests during iteration. At the settled implementation snapshot run the applicable root gates established by RTL-001: `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm check:boundaries`, `pnpm test:unit` and `pnpm build`. Record actual commands/results and revision. UI acceptance needs real browser observations where available; DOM simulations or animation declarations alone do not prove appearance/movement. Do not add tests that merely mirror CSS or static labels.

## External evidence and scope limits

No paid or hosted acceptance belongs to this packet. Record visual/device checks not actually performed separately.

No arbitrary sales editor, cash-flow/bookkeeping/tax product, scenario builder, real customers or supplier API. Scenario replacement is a clearly reviewed local action, not a workspace reset. Simulated item facts must never contradict current storefront identity; past order snapshots remain explicitly historical.

## Precision references

- [5. Canonical visitor journey](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#5-canonical-visitor-journey)
- [8. Catalogue recognition and review](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#8-catalogue-recognition-and-review)
- [11. Owner workspace](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#11-owner-workspace)
- [12. Synthetic collection and activity](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#12-synthetic-collection-and-activity)
- [13. Commerce domain and exact calculations](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#13-commerce-domain-and-exact-calculations)
- [14. Commands, revision control and proposals](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#14-commands-revision-control-and-proposals)
- [15. AI capabilities and assistant behavior](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#15-ai-capabilities-and-assistant-behavior)
- [23. Resource limits and cost control](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#23-resource-limits-and-cost-control)
- [25. Verification and evidence](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#25-verification-and-evidence)

## Completion handoff and commit boundary

Keep this outcome under `RTL-011:`; adjacent cohesive commits may be planned when useful. At execution write file allocations under `docs/commit-plans/RTL-011.md` and actual check/review evidence under `docs/validation/RTL-011.md`. These are future records, not fabricated by this planning pass.

Report files, delivered behavior, settled checks, browser/device observations, deviations and every deferred external check with its prerequisite. Update owning documentation and queue status together. Local criteria above are verified in [RTL-011 validation](../validation/RTL-011.md), including the read-only review loop and actual browser observations. Physical/native-zoom/owner visual checks remain pending in RTL-019. No paid or hosted acceptance belongs to this packet. Ticket creation alone does not authorize Git mutations, paid runtime providers or cloud publication. Follow the user’s actual execution authorization when work starts.
