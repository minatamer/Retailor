# Exact temporary commerce

RTL-004 implements Retailor's sole pure record, command and calculation authority. Storefront, scenario, owner and Tailor consumers must use its public subpaths rather than maintain independent inventory or KPI totals. No provider, environment, browser storage, Blob or app module enters `packages/commerce`.

## Public ownership and integration

`@retailor/contracts/product`, `/commerce`, `/commands` and `/facts` own strict public shapes. `@retailor/commerce/graph` validates complete record graphs; `/commands` applies mutations; `/effects` previews the identical mutation path on a detached graph; `/facts` derives reporting evidence; `/selectors`, `/allocation` and `/money` supply narrow pure operations.

The future session controller is responsible for decoded photo availability, persistence, UI proposals and its injected clock. Call `applyCommand(graph, command, {now, availablePhotoIds})` only after the final browser asset check. A photo descriptor alone is not that witness. On success publish the returned fresh, deeply frozen graph. On a typed rejection preserve the old graph and show its actionable reason. Consumers cannot execute the preview's detached result as an approved graph; they dispatch the reviewed command again against the current revision.

## Records and independent limits

The graph contains a workspace/scenario identity, revision, schema version, canonical UTC millisecond timestamps, a fixed two-hour expiry, accepted photo descriptors and the following bounded records.

| Record | Bound and meaning |
| --- | --- |
| Products | 20 active, 40 retained; clothing only; 1–8 accepted photos each |
| Variants | 24 per product, 288 retained; stable ID, size/colour/SKU, opening stock, creation date, USD price/cost and archive state |
| Photo descriptors | 32 retained; actual bytes are external |
| Bag | 8 distinct variants, 1–5 units each; current reviewed price quote, no reservation |
| Order drafts | 4, 8 distinct lines each, 1–5 units/line; editable, no stock or finance effect |
| Placed orders | 30: at most 20 seeded and 10 guest/owner; immutable priced/costed/photo-backed line snapshots |
| Cancellations | At most one per order, exact charges and linked restoring movements |
| Returns/refunds | 60 each; independent physical and financial records |
| Stock movements | 256 signed source-linked records; each running variant balance must stay 0–10,000 |
| Expenses | 4 unposted drafts; 40 posted entries including linked corrections/voids |
| Writeoffs | 24; available units with captured cost and one stock movement |
| Buyers/traffic/feedback | 40 fictional buyers; 300 seeded + 20 guest sessions; 60 synthetic feedback records |
| Receipts | 160; exact canonical operation identity and resulting references; only the latest can retain eligible Undo |

Array counts, text limits, per-value money limits, 96-KiB command identity and 512-KiB serialized UTF-8 graph are independent constraints. Jointly maximizing every string does not fit merely because each array count fits. A rejected operation never trims ledger history or removes replay protection to make room. Start a new disclosed scenario through the later session lifecycle when limits are reached.

Products have finite clothing categories and sizing-system IDs, not guessed garment measurements. Optional reviewed attributes carry explicit provenance, source-photo references and review state. Image observations must cite the product's photos; unknown attributes have a null value. Variant option pairs and IDs are unique. Once a variant has order or movement history, its option identity cannot be repurposed. Price/cost/copy edits affect current or future views while placed snapshots stay unchanged. Referenced products/options archive; only unreferenced records delete. Draft references also protect product identity.

Opening stock is immutable after creation. Receive/correct stock through reasoned movements rather than editing a second `stock` field. Available stock is opening stock plus signed movements at the selected cut. Archived variants remain in history and inventory totals but leave active low-stock alerts and shopping.

## Exact prices, discounts and unit bases

Editable money parses canonical unsigned USD decimals into bounded integer cents. Exponent notation, negative input, excess fractional precision, leading-zero ambiguity and oversized values reject. Aggregates use safe exact integers and BigInt intermediates; formatting preserves cents even at the maximum safe integer. Floating-point dollar arithmetic is forbidden.

An order's line gross is captured unit price × quantity. Allocate its merchandise discount proportionally across line gross using integer floors and largest fractional remainders; equal remainders use line order. Divide each discounted line total into its unit bases with stable first-unit cent remainders. Store these bases once. Refund remaining merchandise uses those captured bases rather than re-rounding each adjustment. Delivery and simulated tax have independent captured/refundable components.

For three $1.01 units discounted by $2.03, the remaining $1.00 is captured as `[34, 33, 33]` cents. Refund 34 cents, then at most 66 more. A delivery refund cannot consume merchandise or tax allowance.

## Atomic lifecycle and history

| Operation | Exact effect |
| --- | --- |
| Save/delete order draft | No reservation, sale or cost; eligible latest Undo |
| Place | Recheck every active variant, available photo witness, current quote and stock; allocate/capture all lines; deduct all once or reject all |
| Ship/fulfil | `placed → shipped → fulfilled`; dates advance; no additional deduction |
| Cancel | Only unadjusted `placed`; reverse full discounted charges, restore each unit and sold cost once |
| Request/approve return | Shipped order only; select distinct captured zero-based unit indices; no money/stock effect |
| Receive return | Only approved; record physical receipt and inspected eligible subset, independently of money |
| Restock return | Once, for the received eligible subset; restore units and reverse their captured sold cost |
| Close return | Preserve history; unreceived declined/closed claims release their selected units for a later request |
| Issue refund | Positive bounded merchandise/delivery/tax adjustment; never implies receipt, stock or sold-cost reversal |
| Write off available stock | Deduct actual available units once and capture current disclosed cost as inventory loss |

Active or received return claims cannot reuse an order unit. Damaged returns have no restockable subset. Already sold damaged goods retain sold cost; they do not incur a second warehouse loss. A goodwill refund without return can leave a negative result while stock and sold cost stay unchanged. Cancellation is unavailable after a refund or return and after shipment.

Expense drafts create/edit/delete without financial effect. Posting consumes a draft and preserves its original entry. A correction appends a signed entry linked directly to the original, with the same finite operating category. Each corrected balance must stay 0–1,000,000,000 cents. A void reverses the exact remaining balance once; later corrections reject. Inventory purchases are not an operating-expense category: inbound stock cannot be expensed again as sold cost. A later stock correction does not erase a writeoff's recorded loss.

## Scope, facts and evidence

`facts(graph, {from, to, asOf})` returns 36 global facts. `productContribution` returns the product-specific 37th fact. Periods include `from`, exclude `to`, and include events through `asOf`; the cut must be within known scenario history. Periods starting before recorded history return unavailable values. As-of operational balances remain distinct from period flows. There is no guessed prior-period comparison or fabricated historical cost setting.

Each fact identifies workspace/scenario/revision/scope, its formula/date basis/unit, unrounded exact numerator/denominator, rounded value or null, availability reason, contributing record references and relevant exclusions. Count/cent values are exact. Ratios round half-up into basis points; ratings into hundredths. Zero numerator with a positive denominator is a real zero; zero or unknown denominator is unavailable. Negative sales/result stay signed, and margins with non-positive net sales are unavailable.

| Fact IDs | Definition and date basis |
| --- | --- |
| `gross_sales`, `discounts` | Original gross and captured merchandise discount; placement dates |
| `cancellations`, `merchandise_refunds` | Discounted cancellation reversals and issued merchandise refunds; adjustment dates |
| `net_sales` | Gross − discount − cancellation − merchandise refund; corresponding event dates |
| `included_orders`, `aov` | Period-placed orders not cancelled at cut; discounted merchandise **before refunds** / included orders |
| `awaiting_fulfilment` | Non-cancelled placed orders not shipped at cut |
| `refund_value`, `refunded_orders` | All issued refund components and distinct affected orders; refund dates |
| `returned_units`, `open_returns` | Received physical unit indices by receipt date; unreceived/unclosed unit claims at cut |
| `available_stock` | Opening + signed movements at cut, including retained archived inventory |
| `average_rating` | Synthetic rating sum / known feedback count; feedback dates |
| `net_units` | Placed units − cancellation units − received units; event dates |
| `sold_cost` | Sale snapshot cost − cancellation/eligible-restock reversals; source movement dates |
| `gross_result`, `gross_margin` | Net sales − sold cost; result / positive net sales |
| `expenses`, `inventory_loss` | Signed operating postings; available-unit writeoff quantity × captured cost; event dates |
| `operating_result`, `result_margin` | Net sales − sold cost − expenses − inventory loss; result / positive net sales |
| `eligible_sessions` | Distinct known shopper sessions starting in period |
| `engagement_rate`, `bag_rate`, `checkout_rate`, `conversion_rate` | Reached-stage sessions / same eligible session-start cohort, observed through cut |
| `checkout_completion` | Converting sessions / checkout-reaching sessions within that same cohort |
| `new_buyer_share`, `repeat_buyer_share` | Distinct known fictional period buyers without/with a prior non-cancelled order; unknown buyer IDs excluded |
| `refunded_order_rate` | Eligible period-placed orders refunded by scope end / those orders |
| `returned_unit_rate` | Received units from matching period-placed shipped orders / their shipped units, both cut at scope end |
| `product_net_contribution` | Product's discounted merchandise − cancellation − product refunds; event dates and immutable line IDs |
| `sell_through` | Scenario-to-date net physical sold units / opening + positive inbound/correcting supply units |
| `stockouts`, `low_stock` | Currently active variants at zero / at two units or fewer; matching variant/movement evidence only; unavailable at a historical cut because historical archive settings are not retained |
| `inventory_value` | Available units × **current** disclosed unit cost; unavailable for historical cuts |

Supply refinement made before consumers: positive count corrections join inbound supply in the disclosed sell-through denominator. Otherwise a subsequently sold, previously missed shelf unit could produce a misleading ratio above 100%. Cancellation and return restocks are not new supply. Physical return quantities, rather than refund money, reduce net units.

Traffic stages must nest chronologically: visit → product engagement → bag → checkout → linked placement. A session counts once even for repeated actions or orders. Owner/designer sessions and owner-created orders do not contribute to shopper conversion. Traffic references resolve to the current retained catalogue. Buyers and feedback are explicitly fictional; no real customer PII is modeled. Refund-order count by refund date is deliberately different from an order-cohort refund rate. An overnight session remains in its start cohort even when its checkout occurs later.

Worked independent basis: two $54 shirts with $10 discount and one cancelled $38 tee yield gross $146, discount $10, cancellation $38. A $49 shirt refund yields net $49 while included-order AOV remains $98. One eligible shirt restock reverses $24 of captured sold cost; net cost $24, gross/result $25 before expenses. A period containing only that refund has net −$49 and an unavailable AOV if no orders were placed in it.

## Revision, replay and Undo

Every envelope binds command ID, workspace/scenario identity, expected revision, event date/origin and a reviewed expiry no later than two minutes from dispatch or workspace expiry. Guest events cannot predate workspace creation; seeded history can extend to the explicit anchor. Injected clocks cannot move behind the current graph cut. Strict parsing precedes mutation.

Receipts compare exact canonical JSON of type/payload/event date/origin, rather than trust a caller digest. Replaying the same ID/content within the valid workspace returns its prior references even when its expected revision or proposal expiry is now old. Reusing the ID with changed values rejects. A replay does not create stock, finance, traffic or another receipt. Stale workspace/scenario/clock still reject. Receipt and graph caps fail atomically, retaining all prior identities.

Only the latest successful eligible bag, product-copy or unposted-draft mutation retains Undo. Undo is a new fenced command/revision, not history erasure. A later command removes eligibility; financial postings never have erase-history Undo. Bag/copy restoration rechecks relevant availability and current quote/stock. Product copy excludes price/cost/options/stock identity.

## Verification and consumer handoff

Independent fixtures cover shirt/tee reconciliation, negative refund periods, refund-only loss, physical restock and damaged return, exact remainders, all-line oversell, immutable snapshots, expense correction/void, replay/stale/expiry/Undo, nested cohorts and explicit limits. A separate hand-authored maximum-count graph includes 40 products, 288 variants, 30 orders, 60 returns, 60 refunds, 256 movements, 320 sessions and 160 receipts; values are calculated independently of the engine. The companion oversized-text case proves serialized-size enforcement does not truncate history.

Actual byte/timing measurements, root gate results and read-only review dispositions are recorded in [RTL-004 validation](../validation/RTL-004.md). Consumer UI integration belongs to later tickets and must preserve these formulas and immutable lifecycle rules. Photo byte decoding is proven in RTL-003, not reimplemented here. No paid, hosted or visual acceptance is claimed by this pure-domain ticket.
