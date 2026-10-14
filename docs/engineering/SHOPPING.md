# Connected shopping and simulated orders

RTL-010 local implementation, 12 October 2026. Shopping is available only in the accepted storefront. Studio, Pulse and Gallery share actual variants, one controller-owned bag and the same order commands. No checkout service, contact form, payment, shipment or database is involved.

## Bag and availability

Select the actual garment option and one to five units. Adding the same variant merges quantities up to five; the bag holds eight distinct lines. Bag edits reserve no inventory. Every required product photograph must still be validated and available; missing photos, sold-out quantities or archived options block review. Removal is always offered for retained lines. Product deletion/archive commands remove their affected bag lines with an explicit notice and never select another garment.

Rows derive current titles/options/prices/costs/stock/photos from the graph. A stored bag price remains a comparison witness, so an owner price change is disclosed. An over-limit current bag stays editable with an explicit quantity/removal recovery message instead of a thrown rendering error.

The default demo delivery charge is USD 600 cents, tax zero. A finite optional USD 500-cent merchandise discount is capped at merchandise value. Owner lifecycle/register editing belongs to RTL-011.

## Review, placement and currency

Review prepares a bounded local shopper draft with the seeded fictional label **Demo shopper**, actual line IDs/quantities and exact USD totals. There are no real names, addresses, emails or card inputs. Review snapshots the current revision, workspace/scenario, price/stock/cost/photo witness, currency scope and stable place command ID, with a maximum two-minute confirmation lifetime. It deducts no stock.

Place demo order checks current availability and the reviewed context again. Revision, options, price/stock/photo/currency changes or review expiry retain the current selections and require review. One unavailable line rejects the whole placement. The pure command writes immutable price/cost/discount-unit snapshots and linked sale movements atomically, then clears the purchased bag. The controller persists that exact graph together with the order ID and its display scope in one projection update. A repeated successful click returns the same order reference; refreshed receipt rendering invokes no command or provider.

USD remains the recorded authority. EUR uses the accepted dated reference for unit prices, line sums, discount, delivery, tax and order total. Displayed unit price × quantity forms each line; the shared exact projection includes any nonzero rounding adjustment so visible components reconcile to the total. Confirmation always uses its recorded placement scope, even after storefront currency changes or quote expiry. A later currency selection cannot rewrite an order.

## Shopper visits and recovery

Accepted-store exploration, product engagement, a populated bag and checkout use existing nested add/touch traffic commands. Styling/design previews and owner actions create no eligible shopper visit. Stages and product IDs are deduplicated; repeated bag clicks create no event stream. Multiple linked orders in one visit contribute one converting session to the shared fact engine.

An exact controller-owned lastActivityAt defines a new visit after 30 minutes of inactivity, within the fixed two-hour workspace. Graph activity timestamps refresh at most once per minute between stage changes; the exact inactivity timestamp is persisted independently. There are at most 20 guest visits, 10 guest orders and the existing bounded receipt/draft limits. Limit errors are shown without deleting older records. The fictional shopper ID is reused for subsequent orders.

Projection recovery restores bag, buyer/visit/draft and latest order references without replaying placement. Checkout review and modal callbacks are ephemeral: refresh requires a new review. Opening an empty bag can show the latest saved receipt; removing the last selection shows the empty bag immediately. Scenario rebuild clears replaced shopping IDs and order-display references. Reset/expiry clears the controller’s owned modal/review state and pending operations; inactive controllers reject effects.

## UI and evidence

One native modal owns bag → review → receipt. It traps native modal focus, scrolls within viewport bounds, focuses step headings and returns to the connected opener on close. Removing a row moves focus to the heading. Inline currency controls avoid a nested currency modal. Meaningful fields and actions have 44px controls; motion is preserved without an animation-off preference.

RTL-048,14 October2026, revises that same modal into a right bag drawer, a separate two-column desktop/one-column phone **Demo checkout**, and an actual receipt. Quantity steppers retain the existing one-to-five/current-stock limits. Exact displayed line amounts form Subtotal; existing discount, sample delivery, simulated tax and any rounding adjustment reconcile to the existing total. Customer, delivery and payment are visibly fictional; no personal or payment fields are collected. Empty-bag Explore opens Collection. Short exit animation is cancelled on cleanup/reopen, checks current controller state before native close, and rejects stale close events/focus restoration.

Collection filters use a transient draft with visible category/actual-size/known-colour choices and counts from the existing collection selector. Other filters and same-variant matching remain in force; exact price bounds use the currency scope captured at opening. Show commits deliberately; Escape/close cancels; Clear recovers the unfiltered collection. Fresh fake fixtures omit their generic authoring description; saved and owner-written text is preserved. [RTL-048 validation](../validation/RTL-048.md) records actual local evidence and the existing unrelated release-proof failure.

The owner view derives its figures and latest actual order reference from the same immutable graph. See [RTL-010 validation](../validation/RTL-010.md) for executed gates, browser observations and limitations. Physical devices, native browser zoom, virtual keyboards and owner visual approval remain separately pending in RTL-019; screenshots are desktop viewport observations.
