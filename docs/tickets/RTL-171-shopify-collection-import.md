# RTL-171 — Import Shopify collections into Retailor

## Authority and status

Locally implemented and validated, 10 November 2026. Owner clarified this must actually import Shopify products, with collection selection, photos, descriptions, names and prices. All six local gates pass (831 tests/124 files); settled read-only review has no actionable findings. [Actual evidence](../validation/RTL-171.md) distinguishes controlled browser previews/offline tests from native acceptance. Owner chose **Finish local validation first**; signed-in native collection/image import and review/confirmation remain pending. Preserve RTL-166–170 unstaged changes. No Shopify review/distribution submission, external browser, tunnel, certificate, paid provider call, deployment or native-store mutation. Nothing staged or committed.

## Research and precision references

- [Shopify collections query](https://shopify.dev/docs/api/admin-graphql/latest/queries/collections) and [collection products](https://shopify.dev/docs/api/admin-graphql/latest/queries/collection): authenticated Admin GraphQL reads, cursor pagination, existing read_products access covered by write_products.
- [App Home / App Bridge](https://shopify.dev/docs/api/app-home), [Resource Picker](https://shopify.dev/docs/api/app-home/latest/apis/user-interface-and-interactions/resource-picker-api): native resource picker runs in Shopify admin's embedded App Home. Retailor stays standalone and builds its picker from Admin API data; no invented external Shopify picker URL.
- Existing Shopify proof/expiry/generation/call admission, fixed API bridge, list/detail provider, PhotoController decode/cache/availability, commerce createProduct/registerPhotos and original demo TTL.
- Latest import instruction supersedes RTL-169's read-only/no-inline-photo requirement only for this import feature. Allow only Shopify's validated CDN image origin in image CSP; retain server-only fixed fetches, exact-host/no-redirect/byte/deadline checks and existing origin guard.

## Acceptance

1. Connected users can choose All products or a Shopify collection; collections/products paginate within existing bounds. Automatic initial loading stays deduplicated. Show photo-led products with name, description, exact currency prices, status and variant information, detail preview, selection and Select all. Clearly distinguish existing Shopify data from local Retailor garments.
2. Review prepares current full product metadata and actual sanitized photos from the authenticated shop before local import. No browser-supplied remote URL, arbitrary proxy, HTML rendering or Shopify mutation. Maintain shared provider admission, deadlines/cancellation, bounded payloads and graph/expiry fences.
3. Import creates local clothing products with photos, descriptions, supported Colour/Size variants, SKUs and exact USD prices. Owner confirms clothing/category and explicit local demo stock; Shopify stock/costs/orders are not imported or changed. Gift cards/non-clothing, unsupported structures, unavailable photos and unsupported prices produce clear review errors. Respect 20 active/40 total products, 288 variants and existing photo/cache limits; never silently truncate an all-products import to a partial collection.
4. Confirm applies the prepared batch atomically through commerce commands, adding to current demo without replacing existing products/history/bag. Cancel/failure/navigation/reset/expiry fence late responses and release unused staged photos; repeated import must not create duplicate local IDs. No import occurs on browse or Connect.
5. Meaningful provider/security/contract/controller/session import and rollback tests; six settled local gates, actual in-app responsive/keyboard checks, settled read-only review and actual progress records. Native connected collection/media import and current Linux/images/public acceptance remain explicitly pending without actual evidence.
