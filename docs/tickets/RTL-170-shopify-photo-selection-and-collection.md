# RTL-170 — Photo selection and Retailor collection exports

## Authority and status

Locally implemented and validated, 10 November 2026: all six gates pass, 816 tests / 122 files; settled read-only review has no new actionable findings. [Actual evidence](../validation/RTL-170.md) separates supplied-photo in-app checks and injected API/lifecycle tests from pending native Shopify image/collection/export/deletion acceptance. Latest owner request: identify the local Retailor export selection, show good garment photos, add Select all, offer a complete product view, upload the photos and group exported drafts in a real Retailor collection. Related unstaged RTL-166–169 changes preserved. No external browser, tunnel, certificate, paid call, deployment, distribution change or app review submission.

## Precision references

- `connections.tsx`, Shopify/session controllers and the existing explicit review/confirm flow; use the existing storefront `GarmentImage`/`GarmentGallery` for photo display. Owner register currently links to the storefront; its analytics evidence drawer omits descriptions and is not a complete product preview.
- `catalogue.ts`, `product-provider.ts`, durable installation/product intents and `cleanup.ts`; preserve ownership, unknown-outcome, original expiry, bounded calls, cancellation, image sanitization and ten lifetime product intents.
- Shopify Admin GraphQL 2026-10: [collectionCreate](https://shopify.dev/docs/api/admin-graphql/2026-10/mutations/collectionCreate), [ProductCreateInput.collectionsToJoin](https://shopify.dev/docs/api/admin-graphql/2026-10/input-objects/ProductCreateInput), [Collection.hasProduct](https://shopify.dev/docs/api/admin-graphql/2026-10/objects/Collection), [collectionDelete](https://shopify.dev/docs/api/admin-graphql/2026-10/mutations/collectionDelete), [stagedUploadsCreate](https://shopify.dev/docs/api/admin-graphql/2026-10/mutations/stagedUploadsCreate).

## Acceptance

1. Responsive garment photo cards identify local Retailor products, offer individual selection and Select all within the remaining ten-product allowance. Exclude archived, already tracked or photo-unavailable garments; selection alone never writes.
2. View opens a keyboard accessible read-only dialog with full supplied gallery, description, category, active variants, prices and SKUs. Reuse the existing gallery and photo failure handling; closing returns focus and preserves selection.
3. Confirmed exports upload sanitized local photo bytes through staged uploads and attach returned resources to DRAFT products. Verify media read-back; never pass local/blob URLs to Shopify or claim native media success from fixtures.
4. The first confirmed export creates one unpublished manual collection named Retailor for this installation. Persist intent before dispatch; identify by random handle plus app-owned marker, never title/tag. Product creation joins that collection; ready exports verify membership. Unknown collection creates reconcile without blind duplicate creation. Existing merchant collections/products remain untouched.
5. Disconnect/reset/expiry removes owned products, then the owned empty collection, then app access. Preserve foreign/nonempty/altered collections and unresolved outcomes for attention. Retain finite cleanup attempts and shared admission/deadline controls; old ledgers default to no collection.
6. Meaningful selection, provider, grouping, unknown-result and cleanup tests; required six local gates, responsive in-app checks and settled read-only review. Native exports/media/collection/deletion remain explicitly pending without a connected in-app session.
