# Tailor operations

RTL-014 uses the owner workspace's 22 forms, detached raw draft, photo controller, exact preview and pure command engine. Tailor has no second catalogue, ledger, form draft or photo cache. The provider prepares an inert intent; the browser owns all edits, review and confirmation.

## Preparation and clarification

`prepareOperation` is a finite owner-only tool. Creation starts without a target. Existing operations require an exact current eligible ID. Missing targets return `operation-choices`: at most six IDs plus a more-matches flag. No match is an honest empty choice; an ambiguous name never becomes first-match execution. Native cards resolve labels, clothing options, dates and original amounts from the current graph. Selecting a choice opens the real draft locally and spends no model turn. The live tool supports a bounded target query; the declared development grammar covers all operation families and clothing categories, and accepts deliberate literal references. Live natural-language accuracy remains RTL-020 evidence.

| Forms | Target and final authority |
| --- | --- |
| Create / update / remove product | No target for creation; exact product for update/removal. Creation/update require available photo bytes. Referenced removal archives and preserves history. |
| Save / delete / place order draft | New or exact unplaced draft. Save changes no sales/stock; placement captures current snapshots and deducts units once. |
| Cancel / advance order | Exact eligible placed/shipped order. Immutable placed snapshots remain; cancellation and fulfilment use permitted transitions. |
| Request / advance / receive / restock return | Exact order or return and explicit unit selection/disposition. Restock applies inspected eligible units once. |
| Issue refund | Exact non-cancelled refundable order and bounded discounted components. Refund changes money without implicitly returning units or reversing sold cost. |
| Adjust / write off stock / future unit cost | Exact active variant, editable reason/units/cost. Reasoned movements and immutable sold-cost snapshots remain authoritative. |
| Save / delete / post expense draft | New/exact unposted draft. Saving/deleting has no posted expense effect; posting reduces result once. |
| Correct / void expense | Exact original posting, not already voided. Linked adjustments preserve the original history. |
| Undo | Exact latest eligible receipt only. Unposted draft, copy and bag reversals are bounded; posted orders/refunds/cancellations/movements cannot be erased. |

## One draft, one mounted form

`SessionController.ownerForm` owns raw values and dirty fields. `ownerSurface` is memory-only and selects exactly one `FormShell`: Tailor or dashboard. Open full form / Continue in Tailor moves the same form ID, values, dirty fields, selected photos and review. It does not clone them. An edited current draft prevents a new copilot proposal from replacing it. Perspective navigation preserves editable human values while clearing its executable review and stopping suggested fills. Reset, expiry and refresh do not restore a pending form or animation.

The shared product/order/expense/inventory/return family components remain separate. The inline shell uses the same fields and effects at narrower width, with container-based field reflow, accessible headings, native controls and internal conversation scrolling. Required product-photo and title states appear beside the fields; unavailable/missing photos disable Review. The final create/update command repeats all product and available-photo validation.

## Photo admission and role boundary

The inline picker accepts JPEG, PNG and static WebP through RTL-003's signature/decode/hash/dimension/byte checks and remaining workspace cache caps. A thumbnail points to owned available raster bytes. Upload is local and creates no garment. Accepted product-linked clothing photos can be deliberately reused; hero-only sources, missing bytes and logo candidates are not offered as garment-photo choices. Selecting unsupported SVG/logo artwork fails raster admission and leaves prior accepted photos intact. Remove/replace cannot enable a photo-free saved product.

The visitor confirms that an upload depicts clothing before opening the picker. This is an explicit human photo review, **not a claim of automated visual classification**. A decoder proves safe available raster bytes; it cannot identify every mislabeled raster illustration or logo. New user photo semantics rely on the human clothing review; public sample photos were separately vetted. The later logo subsystem owns a separate cache/asset type and cannot furnish garment IDs. No arbitrary image URL or fallback illustration is accepted as an available photo witness. Optional AI description assistance is not added here: saving manually completed photo-backed products needs no model request, and any later help must reuse the explicit two-attempt catalogue admission budget.

## Interruptible suggestions

`operation-prefill.ts` validates a finite detached sequence before starting. Product title/category and expense note are the supported suggestions; price, stock, cost, quantities and financial components stay explicitly editable demo inputs. It highlights and writes complete validated values sequentially through `editOwnerField`, with one bounded timer. It never streams text into commerce records or writes DOM values directly. Human input marks a field dirty even if its value is unchanged. Later suggestion steps skip dirty fields and preserve keyboard focus.

Stop suggested fill, cancellation, moving the form, navigation, graph/scenario change, photo upload, Tailor collapse, reset and disposal cancel owned choreography and remove highlights. Review stops the sequence and uses the actual values then present. No motion-off setting, OS suppression or unbounded animation loop is introduced.

## Reviews, replay and results

An executable assistant operation must be current, unrestored and younger than two minutes. Review computes a command using current workspace/scenario/revision, a unique ID and expiry no later than two minutes or workspace expiry. The preview shows exact USD deltas, current/future price and cost, stock before/after, actual snapshots and affected references. Editing clears the review. Confirmation checks the exact active review/form identity and invokes the existing atomic command engine, which recomputes validity/effects against current state. It makes zero provider requests. A second click has no active review; the pure engine additionally retains bounded replay protection.

After applying, the ephemeral result points to the actual receipt and exact reviewed deltas. Record buttons open real product/order/refund/expense/stock sources; saved unposted draft buttons reopen that exact draft. Latest eligible Undo is offered only while the receipt remains the latest revision. Older results describe a completed operation, and posted-history results have no generic Undo. Finalized chat restores as inert text; completed domain records and permitted receipts are restored by the existing allow-listed projection, never by replaying a proposal.

## Evidence boundary

See [RTL-014 validation](../validation/RTL-014.md) for actual deterministic commands, browser sequences, responsive measurements, read-only review results and external prerequisites. Local development examples prove connected forms and commands; they do not prove live proposal accuracy, physical keyboard/touch behavior or hosted release acceptance.
