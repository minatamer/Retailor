# RTL-012 — Build the animated owner dashboard and exact drilldown

Status: **Implemented locally — native zoom/physical/owner quality acceptance pending in RTL-019**\
Planning date: **11 October 2026**\
Milestone: **Dashboard showcase**\
Depends on: [RTL-011](RTL-011-deliver-three-scenarios-and-owner-operations.md)\
Blocks directly: [RTL-013](RTL-013-deliver-grounded-tailor-conversation-tools-and-tours.md), [RTL-019](RTL-019-verify-polish-responsive-motion-and-design-matrix.md)\
Suggested commit: `RTL-012: build the animated owner dashboard and exact drilldown`\
Parent authority: [Retailor blueprint](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md)\
Queue and execution rules: [Ticket index](README.md)

## Outcome and standalone context

Deliver an owner dashboard that is as visually compelling as the storefront: smooth animated charts, immediate readable values, hover/focus/tap details and clickable evidence. Retrosum is the key reference for a concise period control, a few headline facts and records behind every number.

Lead with net merchandise sales, included orders, average merchandise order value and simulated operating result. Follow with a meaningful sales/result trend, product ranking, synthetic shopping funnel, inventory attention, category/customer composition and returns/cost context. Every chart queries RTL-004 facts over RTL-011’s current graph. No attractive independent chart dataset or causal conversion claim belongs here.

## Dependency evidence and entry conditions

RTL-011 supplies all three real scenarios, operational registers and exact current graph; RTL-004 fact/date-basis definitions must be proven. RTL-002 supplies design/motion primitives. Inspect Retrosum’s dashboard evidence interactions and current ecommerce-reporting references. Choose native SVG or a justified chart library only after proving a representative accessible interactive chart.

Dependency completion means required local behavior, owning contracts and checks actually exist. A planned checkbox or ticket-named commit alone is insufficient. Verified local dependencies may support local follow-on work while separately recorded live, owner-visual or hosted evidence remains pending. Never turn a fake pass into live acceptance.

## Files and responsibility boundaries

| Area | Responsibility owned here |
| --- | --- |
| `apps/frontend/src/features/dashboard` | Scope, KPI cards, charts, selection and evidence drawer |
| `apps/frontend/src/features/operations` | Record navigation and return-to-chart context |
| `apps/frontend/src/components/ui` | Only stable shared tooltip/drawer/table primitives |
| `docs/engineering/DASHBOARD.md` | Chart/fact interaction, basis and actual evidence |

Paths describe future ownership. Create modules/directories only with real behavior; reuse contracts, commands, assets and session state rather than a parallel authority.

## Implementation plan

1. **Establish question-led hierarchy.** Show Last 7 days/28 days/all activity, USD and as-of basis. Four headline facts lead; operations strip points to awaiting fulfilment, returns, low stock and refunds. Avoid a wall of every possible KPI or unrelated analytics controls.

2. **Render exact facts immediately.** Values/formulas/references come from the fact registry. Animated counting cannot postpone the correct value. Unavailable AOV/margins/comparison history has explicit meaning; a refund-only period may have negative sales with no included orders.

3. **Build a representative trend first.** Use explicit daily observations/zero baseline with selectable sales/result series. Preserve negative values. Curve geometry must not imply invented measured intermediate points. Hover/focus shows exact date/value; click or touch action opens contributors.

4. **Complete useful charts.** Horizontal product bars, ordered nested funnel, positive category/expense composition, inventory attention, return reasons and fictional buyer cohorts use the stated facts. Signed/negative contributions use appropriate bars/line forms, not a misleading donut.

5. **Make evidence inspectable.** Each KPI/point/segment opens amount, formula, numerator/denominator, date/as-of/scope, exclusions and real contributing IDs. Navigate to actual product/order/refund/expense/traffic/movement detail and return to the same selected chart context.

6. **Animate stable identities.** Use proposed 450–650 ms entrances, 300–450 ms scope geometry and short hover/selection feedback where they remain comfortable. Stable keys avoid remounting on chat or unrelated form changes. Rapid scope/scenario switching cancels owned old motion and settles to current facts.

7. **Support all input methods.** Hover is optional. Focus provides the same detail, tap pins a tooltip and a clear action opens records. Exact data tables and readable legends are available. Selection survives valid resize; chart drawer and chat cannot hide each other’s primary actions.

8. **Reflect operations instantly.** A new order, refund, expense or stock adjustment recomputes current facts and stale selection safely. Product labels/images resolve to actual current or explicitly historical IDs. Never leave an old amount attached to a current record after mutation.

9. **Keep synthetic context plain.** Costs, traffic, buyers and feedback are fictional inputs. Owner/designer sessions do not enter conversion. No comparison period is shown if data is absent. Profit means the documented simulated result, not bank/cash or a copy of Shopify’s formula.

10. **Inspect responsive and loss cases.** Prove all three stories, negative/sparse/empty/large values, long product names and phone/keyboard/zoom layouts. Record actual movement and evidence drilldown, not static screenshots alone. RTL-019 later verifies whole-product integration.

## Acceptance criteria — required local outcome

- [x] Four headline KPIs and question-led panels use exact registered facts.
- [x] Charts remain visibly smooth and values immediately readable.
- [x] Hover/focus/tap/click and exact tables offer equivalent meaningful information.
- [x] Every significant value opens real contributor records with basis/exclusions.
- [x] Negative values, zero and unavailable/comparison states are handled correctly.
- [x] Product images/labels and inventory match the actual store.
- [x] Mutations and all three scenarios update facts/selection without stale data.
- [ ] Responsive/keyboard/zoom layouts preserve actions and readable legends. — viewport/keyboard verified; native 200% zoom and physical matrix explicitly pending RTL-019.
- [x] No animation-off or OS suppression behavior is added.

## Focused verification and evidence

| Case | Required observable evidence |
| --- | --- |
| Order→dashboard | Same exact order/stock/sales/cost contribution |
| Refund-only day | Negative trend, zero included orders and unavailable AOV |
| Heavy loss | Exact cost/expense/refund contributors explain negative result |
| Product/category/funnel drilldown | Contributors resolve and cohorts remain nested |
| Scope/resize/rapid mutation | Current selection settles without remount/stale amount |
| Phone/focus/touch/table | Every chart accessible without hover |
| Visible motion | Observe actual geometry transition and correct immediate values |

Run meaningful focused tests during iteration. At the settled implementation snapshot run the applicable root gates established by RTL-001: `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm check:boundaries`, `pnpm test:unit` and `pnpm build`. Record actual commands/results and revision. UI acceptance needs real browser observations where available; DOM simulations or animation declarations alone do not prove appearance/movement. Do not add tests that merely mirror CSS or static labels.

## External evidence and scope limits

No paid or hosted acceptance belongs to this packet. Record visual/device checks not actually performed separately.

No CAC/LTV/ROAS, real attribution, demand prediction, widget builder or independent financial formulas. Do not use a donut for signed loss. No new chart dependency without a proven responsibility/maintenance/bundle justification. UI style cannot change economic facts.

## Precision references

- [11. Owner workspace](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#11-owner-workspace)
- [12. Synthetic collection and activity](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#12-synthetic-collection-and-activity)
- [13. Commerce domain and exact calculations](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#13-commerce-domain-and-exact-calculations)
- [14. Commands, revision control and proposals](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#14-commands-revision-control-and-proposals)
- [15. AI capabilities and assistant behavior](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#15-ai-capabilities-and-assistant-behavior)
- [24. Visual system, motion and accessibility](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#24-visual-system-motion-and-accessibility)
- [25. Verification and evidence](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#25-verification-and-evidence)

## Completion handoff and commit boundary

Keep this outcome under `RTL-012:`; adjacent cohesive commits may be planned when useful. At execution write file allocations under `docs/commit-plans/RTL-012.md` and actual check/review evidence under `docs/validation/RTL-012.md`. These are future records, not fabricated by this planning pass.

Report files, delivered behavior, settled checks, browser/device observations, deviations and every deferred external check with its prerequisite. Update owning documentation and queue status together. Implemented local criteria and actual observations are recorded in [RTL-012 validation](../validation/RTL-012.md). The unchecked combined quality criterion retains its native zoom/physical prerequisite under RTL-019; no unavailable check is claimed as passed. Ticket creation alone does not authorize paid runtime providers, Git mutations or cloud publication. Follow the user’s actual execution authorization when work starts.
