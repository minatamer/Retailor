# Current-record dashboard and exact evidence

RTL-012 presents one canonical temporary clothing business. Four immediate headline facts lead: net merchandise sales, included orders, average merchandise order value before refunds, and simulated operating result. Exact values are never delayed by animated counting. Owner money remains USD; storefront EUR presentation does not change owner inputs or reporting.

## Reference decisions

Directly inspected Retrosum `features/dashboard/charts.tsx` and `fact-detail.tsx`: scoped facts, semantic interactive marks, exact tables, formula/date/exclusion context and real source navigation. Its configurable widget builder is outside Retailor scope. RTL-002's existing SVG specimen already proved native keyboard selection/evidence locally; RTL-012 additionally verifies a real refund-date trend and actual refund record in the browser before extending the panel family.

Reviewed official reporting guidance on 12 October 2026. [Shopify's analytics overview](https://help.shopify.com/en/manual/reports-and-analytics/shopify-reports/overview-dashboard/using-the-overview-dashboard) supports date controls, numeric cards and report navigation; [behavior reports](https://help.shopify.com/en/manual/reports-and-analytics/shopify-reports/report-types/default-reports/behaviour-reports) provide a conversion funnel reference. Retailor borrows the interaction hierarchy and keeps its own exact documented financial/session conventions. There is no provider analytics integration, advertising attribution, CAC/LTV/ROAS, demand forecast or Shopify accounting equivalence.

Native SVG plus semantic HTML targets meets the proven responsibility. No chart library or new dependency is added. Daily observations use straight segments and explicit source points/zero baseline, preserving negative values without inventing measured intermediate observations. A bounded animation interpolates geometry for presentation, not financial data.

## Scope, truth and ownership

`features/dashboard/state.ts` defines finite Last 7 days / Last 28 days / All activity, sales/result series and registered targets. The session controller owns scope, pinned selection, evidence/source navigation and bounded contributor pagination. Recovery saves preferences and reference IDs, never KPI totals or executable operations. Scenario replacement/publication/reset clears identity-bound selections; perspective changes retain valid context. Every render resolves facts/records against the current immutable graph/revision.

Rolling periods end one millisecond after the latest known graph as-of and cover exactly seven/28 days, including that latest observation. All activity begins at the recorded history anchor. Daily UTC buckets are clipped to those bounds, so boundary days can be partial. An unusually long recovered history has a bounded latest-31-day chart (at most 32 UTC buckets), explicitly labelled while cards retain the whole selected scope. No comparison is fabricated: a previous equal-duration period is offered only when recorded history covers it completely. Its own facts and contributors remain inspectable. All activity and insufficient-history comparisons explain unavailability. No unsupported growth percentage is assigned.

`@retailor/commerce/dashboard` returns existing registered facts plus narrow named groups: product net sales/net units, current catalogue category grouping, signed expense category contributions, physically received units by recorded reason, and as-of variant availability. `unit-events.ts` supplies the same exact global/product net-unit rule; the frontend performs no separate economic formula. Category changes regroup historical product identity under its explicitly current category, without rewriting placed snapshots. Groups retain formula/date/availability/contributor metadata.

Sales use placement/adjustment event dates; included orders and AOV use order dates/current cancellation state. A refund-only day can have negative sales, zero orders and unavailable AOV. Day evidence displays all four headline facts for that day. Product evidence exposes independent net units and actual current garment detail. Operational stock/awaiting fulfilment/open returns are as-of balances, not period sums. Financial refunds remain independent of physical receipt/restock. Signed expenses/cost reversals/losses use bars, never misleading positive-only donuts.

## Question-led panels

- Daily merchandise/result trend: immediate exact values, explicit zero, source observations and series choice.
- Product ranking: real current photos/names, net merchandise and independent net units; six bars lead, exact table retains all groups and historical line evidence.
- Funnel: one nested eligible session-start cohort, unique visit counts/rates, owner/designer exclusions and known order links.
- Current category contribution and signed operating expense composition, with exact records.
- Inventory attention: lowest available active options first, SKU/size/colour, current stock/movement evidence, threshold two; eight bars lead and the exact table retains all active options.
- Received-return reasons, fictional new/repeat buyer cohorts, and event-dated cost/result context.
- Margin, refund/return cohort and synthetic rating details remain secondary. Zero denominators/nonpositive margin bases stay unavailable.

## Interaction, record context and motion

Each chart has semantic native controls: hover/focus detail, click/tap pin, and an explicit View evidence action. Hover is optional; keyboard and exact-table actions reach the same registered facts. Exact tables retain complete selected groups, readable values and numerator/denominator. Native horizontal scrolling is contained within day strips/tables instead of the page. Product/variant labels, missing-photo notices and source links never substitute another garment.

The native modal evidence drawer shows current value, formula, exact numerator/denominator, scope/as-of/date basis, availability, contributors and exclusions. Fifty contributors per page keep the view bounded. Actual order/line/product/variant/refund/return/expense/movement/writeoff/cancellation/traffic/buyer/feedback detail resolves known IDs only. A back action returns to the same figure and saved evidence scroll; close/Escape returns focus to its connected opener. The drawer sits in the native top layer above Tailor. Unsupported/stale references show a truthful unavailable state instead of an old amount or guessed record.

Chart motion uses a single owned requestAnimationFrame chain per trend, 550ms entrance / 400ms replacement, cancellation on new target/unmount and fixed 32-coordinate geometry. Values/controls stay current immediately. Bars use stable keys and 400ms width/position transitions; panels enter in 550ms and selection feedback lasts 180ms. Unrelated form/chat preferences preserve graph/model references and do not restart the chart. Rapid scope/scenario changes cancel old work and settle to current facts. No animation-off/render-off setting, OS suppression, flashing or unbounded animation loop is added.

Responsive grids recompose four/two/one cards and two/one chart panels. Short/narrow evidence drawers have internal scroll, readable one-column related facts, safe viewport bounds and at least 44px primary controls. Native physical devices, virtual keyboard, actual browser zoom and final owner judgment require their own evidence; viewport/DOM observations alone do not establish them.

See [RTL-012 validation](../validation/RTL-012.md) for the actual settled checks, read-only review and observed browser matrix. Grounded Tailor commentary/tours follows in RTL-013; this ticket supplies the shared current metric/evidence authority.
