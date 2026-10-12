# Owner operations and three business stories

RTL-011 owns manual operation forms over the same temporary clothing graph. No backend CRUD, database, payment, carrier, customer contact collection or independent sales editor exists. Every native action prepares current typed values, previews the existing pure command and requires explicit confirmation. Drafts reserve no stock and do not create revenue/expenses. Posted history uses permitted linked lifecycle changes.

## Scenario publication and replacement

Catalogue publication invokes `@retailor/commerce/scenarios` once, initially Healthy profit. One deterministic source-controlled pattern creates 28 days of actual dated orders, visits, fictional buyers, expenses and feedback against the accepted product/variant/photo IDs. Healthy uses 14 orders and USD 60 operating expenses; Near break-even uses 8 orders and USD 270 expenses; Heavy loss uses 6 discounted orders, a damaged physical return with independent refund, a separate available-stock writeoff and USD 900 expenses. Each contains 168 finite fictional visits and 12 fictional buyer IDs. Prices and future unit costs are preserved. These are activity patterns, not promises to force a result: edited costs/prices may change the qualitative outcome.

Generation applies existing commands in event-date order and validates graph integrity/facts before returning a detached candidate. Historical events use seeded origin; command application uses the current clock. The history anchor is captured from workspace creation. Active options restart with 20 disclosed demo units; archived options restart at zero. The fixed workspace identity/expiry, photos, product identities/options, accepted design, brand and logo survive activity replacement. New scenario identity and monotonically advanced revision fence prior work.

The reviewed replacement names discarded orders, adjustments, visits/buyers, feedback, expenses, movements, writeoffs, drafts and receipts. It shows changed stock and discarded draft counts. Cancel leaves the current graph unchanged. Confirm checks revision, scenario identity, photo availability and two-minute review lifetime, then commits one complete candidate. Bag selections are revalidated; owner/check-out review state and executable context are cleared. There is no conversation history to retain before RTL-013; future finalized history remains inert under its previous scenario label.

The production publication path uses this generator in both live and development runtime after catalogue acceptance. A typed injected scenario factory exists only for isolated unit fixtures; it does not provide an alternate public sample catalogue or live failure fallback.

## One form and confirmation authority

`features/operations/state.ts` owns finite operation types, bounded detached raw fields, actual target IDs, variant/order/unit/refund rows and dirty-field protection. The session controller owns their lifecycle. Human edits invalidate the prior review; suggestions cannot replace dirty fields/groups or a different form identity. Raw forms/reviews are not serialized as executable recovery data. Saved domain drafts remain recoverable. Store/owner perspective switching preserves in-memory raw fields but discards executable confirmation. Reset/expiry/scenario replacement clears owned pending work.

Review combines an actual current-value recap (photos, titles/options/prices/future costs or exact draft charges) with canonical money/stock deltas and affected record references. Stable command IDs, expected revision, fixed identity and expiry protect confirmation. The pure engine rejects stale availability/prices, invalid transitions and limits without partial economic effects. Owner placement records its immutable USD display scope in the same projection update. Typed seams are reused by Tailor in RTL-014; the chat must not create another competing form/mutation path.

## Supported native operations

- Products: create/edit with validated available clothing photos; current title/category/copy/options/prices/future costs; reviewed unreferenced deletion or referenced archival. Product/option availability can be reviewed without deleting history. Referenced size/colour/SKU remains stable; use a new option where identity changes. An empty accepted store stays valid/recoverable and offers creation.
- Orders: create/edit/delete unplaced drafts, optional existing fictional buyer, up to eight actual variant lines/five units each, exact discounts/sample delivery/tax and bounded delivered total. Owner-created orders have no shopper conversion link. Placement is atomic; placed → shipped → fulfilled and eligible placed → cancelled are explicit reviewed operations. Hard delete and old price/cost rewriting are unavailable.
- Returns: select actual shipped unit indices; request/approve/receive/close. Receipt identifies inspected restockable units. A separate once-only Restock action restores only those units and reverses their sold-cost snapshots.
- Refunds: select remaining discounted merchandise plus independent delivery/tax amounts. Financial refund does not restore inventory or reverse COGS. A damaged sold return retains sold cost and is not another warehouse loss.
- Inventory/costs: signed inbound/correction movements with a reason; available-stock damage/writeoff with disclosed current cost; future unit-cost edits preserve prior placed snapshots. Current stock and estimated value derive from the actual graph.
- Expenses: unposted draft CRUD, posting, linked signed correction or once-only void. Original posted records and adjustments stay inspectable.
- Undo: only the latest receipt explicitly marked reversible by the pure engine, reviewed against current identity/revision. Posted order/refund/cancellation/stock history is not erased.

## Views and truthful boundaries

Compact registered views cover overview, garments, orders, returns/refunds, inventory/costs, expenses, visits/customers, feedback and the existing Design panel. Record cards show actual references, relevant UTC dates, source/origin and historical-versus-current links. Search operates known fields; bounded pagination renders twenty rows. Unmatched searches retain the true catalogue/history and offer Clear search. Order financial state independently derives unadjusted, partial/full refund or cancellation from actual records; physical returns never imply a refund. No external analytics, CRM or arbitrary scenario builder is added. Buyer/feedback records remain visibly fictional/synthetic.

Every required photo must remain available for a sellable product, matching command witnesses. Losing an alternate photo marks the garment unavailable rather than advertising a purchase that the command rejects. Failed bag additions expose their actual reason, and event limits do not prevent inspecting an existing bag. Default owner amounts remain USD regardless of storefront EUR selection.

Forms use native labelled inputs, minimum 44px controls, stable IDs, focusable review headings and explicit cancel/back/confirm. Phone layout places the active form before registers; wide screens show it alongside. Modal scenario review has bounded internal scroll and returns focus to its opener. Designed motion remains visible; there is no animation-off preference.

See [actual RTL-011 validation](../validation/RTL-011.md) for commands, browser evidence and unresolved device/live boundaries. Dashboard chart interactions follow in RTL-012; grounded conversation and inline forms in RTL-013/014. No paid or hosted acceptance belongs to this packet.
