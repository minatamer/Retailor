# RTL-163 — Read Shopify products and export owned draft garments

## Status, dependency and authority

**Locally implemented and validated — 10 November 2026; native checks pending.** All six gates pass,725 tests/114 files; settled read-only review has no actionable local findings. [Progress/evidence](../validation/RTL-163.md) separates local behavior, the explicit image-replacement/staging limits and pending native account checks. **Live product mutation remains unreachable until RTL-164 cleanup is implemented and validated.** No credentials were minted and no real store was called.

## Problem and result

Connection must demonstrate useful Shopify API experience. Provide paginated product reads and explicit create/read-back/update of Retailor's own session-created **draft** products, including supported photos/options/variants/prices. Existing merchant products are read-only. There is no automatic synchronization, theme publishing, customer/order access, Shopify stock adjustment or Shopify-to-Stripe checkout.

## Precision references and allocation

Read the complete [Shopify plan](../engineering/SHOPIFY-DEMO-INTEGRATION-PLAN.md), RTL-162's settled contracts/ledger, current product/photo/commerce schemas, exact-money rules, sanitizer and checkout-image handling; [security dispositions](../audits/RTL-023-SECURITY.md) and [RTL-143](../audits/RTL-143-SECURITY.md) apply to transport, media and logs. Check pinned 2026-10 Shopify product/variant/media APIs against the actual schema.

Create `docs/commit-plans/RTL-163.md` before edits. Expected allocation: narrow contracts, backend `shopify/` catalogue/export/media/ownership/reconciliation use cases and provider methods, fixed bridges/routes, bounded sanitized image staging, focused tests, operation guide and `docs/validation/RTL-163.md`. Keep UI scaffolding minimal; RTL-165 owns complete product UX. Reuse actual behavior, not app-to-app imports or an arbitrary GraphQL/URL proxy.

## Implementation contract

1. Read only through the server-verified connected shop. Return twenty-product pages, at most five pages per explicit browse cycle, safe text/currency/status and capped variant/image summaries with clear read truncation indicators. Fixed query templates, bounded cursors/response bytes and no raw merchant HTML. Read non-clothing/no-image products safely in Connections without inserting them into Retailor's clothing/photo-required graph.
2. Freeze and validate selected local garments/revision/photos before export. Review the destination, exact fields, photos, colour/size options, supported SKUs and USD prices; export only to verified USD test stores. EUR display settings are not authority to convert Shopify prices. Reject unsupported cardinality/missing photo/currency mismatch before external writes. Do not infer shipping/tax/discount/inventory semantics or silently omit variants.
3. Support one-variant and multi-variant draft products with explicit `DRAFT`, using the pinned create plus variant APIs as needed. Read back actual status/options/variants/prices/media. Handle top-level GraphQL errors, `userErrors`, partial success, asynchronous media, throttling and version mismatch. HTTP 200 alone is never success. Keep 10 lifetime product-create intents, 64 variants, three options and eight images/product and all plan dispatch/body limits.
4. Persist the server-owned intent/opaque marker/revision before dispatch, then persist exact product/variant/media IDs. Demonstrate the chosen app-owned marker lookup/unique-key mechanism against the pinned API; tags, titles, SKUs and caller GIDs alone cannot authorize writes. Duplicate submissions reuse the recorded mapping. An ambiguous create must reconcile that marker, including partial media/variant work, before any later create. Reserve unknown capacity; do not blindly retry a non-idempotent mutation.
5. Explicit Update changes only the same session-created draft with a new reviewed local revision. Read/verify the remote ownership mapping and status before update; if externally activated/published, block further updates and explain. Reconcile stale/partial update outcomes without duplicating products or changing unrelated ones. Source edits, restore and callback never auto-write. Removing a local garment marks its exported draft for explicit removal/cleanup, not untracked remote abandonment.
6. Sanitize selected images through the existing bounded path. Implement a narrowly scoped expiring image delivery/staged-upload method reachable by Shopify; no blob/localhost URLs, originals, arbitrary URL proxy or public bucket. Track and clean temporary staged objects on every outcome. Prove whether the selected product-media path creates reusable Files, and implement exact owned file cleanup with justified scope if needed. Verify a reusable file is unshared before deletion; preserve/report it if an unrelated merchant product now references it. Record asynchronous readiness and provider-retention limits; do not claim deleting a product removes unverified standalone files.
7. Implement exact-owned deletion primitives used by RTL-164, with ownership verified from the server ledger plus marker and shop/app binding. No caller-selected arbitrary ID mutation. Keep every uncertain/late remote side effect in the cleanup ledger even if the HTTP request/UI was cancelled. Preserve content-free diagnostics and fixed helpful public outcomes.

## Acceptance and failure matrix

| Case                                                                              | Required evidence                                                                                               |
| --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Empty catalogue, five pages, excess variants/media, non-clothing or missing image | Bounded safe reads; no silent local import, HTML execution or photo-invariant weakening.                        |
| Single/multiple variants and images                                               | Exact intended draft fields/options/prices; successful bounded media read-back, not merely accepted create.     |
| USD mismatch, bad currency/price/photo, export limit+1                            | No external mutation; no floating-point reinterpretation, truncated export or invented inventory.               |
| Double click, repeated same revision, restore and network retry                   | One logical export mapping; no duplicate create.                                                                |
| Timeout after remote create but before local ID persistence                       | Durable marker reconciliation recovers owned ID or remains unknown; cleanup can find the side effect.           |
| Partial variant/media failure, 429/5xx, deadline and abort                        | Per-item honest outcome; finite calls; tracked cleanup; no hidden retry queue or fake success.                  |
| Another session/shop's IDs, forged marker/tag, merchant sentinel products         | No update/delete or data disclosure; server authority independently checked.                                    |
| Update races, deleted/activated product, cancelled/reset workspace                | No stale attachment or unintended re-creation; only recorded drafts change; late outcomes remain cleanup-owned. |
| Temporary image or standalone file failure                                        | Exact artifact ownership retained; no leaked public media store or unbounded image work.                        |

Use meaningful injected HTTP/storage/crash tests, verify actual byte/count/deadline boundaries and no external networking. Native Shopify create/read/update/media/delete and sentinel preservation remain pending until expressly authorized and RTL-164 is ready.

## Validation and handoff

Run all six applicable repository gates and settled read-only review; record actual commands, changed behavior, scope/media decisions and unresolved native checks in `docs/validation/RTL-163.md`. Update `docs/operations/SHOPIFY.md` with the exact scope/API/image requirements. Hand RTL-164 a complete ledger and callable cleanup primitives; keep live export unavailable until that ticket's acceptance is satisfied. Do not market catalogue support based solely on fixtures.
