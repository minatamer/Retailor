# RTL-169 — Load the connected catalogue on entry

## Authority and status

**Locally implemented and validated, 10 November 2026: all six gates pass, 798 tests.** [Actual validation](../validation/RTL-169.md) separates injected auto-read tests, available in-app inspection, the owner's native manual read and pending native automatic-read acceptance. Latest owner request: visiting dashboard Connections must load Shopify products without an initial Read/refresh click; explain existing products/photos and make them easy to locate in Shopify admin. Preserve the unstaged RTL-166–168 work. No product write/delete, review submission, distribution change, external-browser access or new provider credentials.

## Precision references

- Current `apps/frontend/src/features/shopify/controller.ts`, its tests, session `shopifyVisible` bridge and the shared `connections.tsx` consumer.
- Existing RTL-163 read contract: verified connected shop, page size 20, at most five pages per browse cycle, existing API budgets, no auto-write/import into the clothing graph. Fixed requests and cancellation/revision/expiry fences remain required.
- `packages/contracts/src/shopify.ts` product/image/ID schemas and current safe `adminLink` helper. Keep the existing image-link approach and CSP; do not add an arbitrary image/URL proxy or remote-origin exception merely to answer the photo question.
- [Shopify generated test data](https://shopify.dev/docs/apps/build/stores/generated-test-data): Gift Card with $10/$25/$50/$100 variants matches the owner's screenshot. Identify this as matching Shopify seed data, not a Retailor export.

## Acceptance

1. Dashboard Connections initiates one initial first-page read per visit, only after availability/proof/connected status are verified. Handle delayed bootstrap and status verification. Onboarding does not read the catalogue; connecting never writes products.
2. Deduplicate repeated visibility/render notifications and share the existing single operation owner. Navigation cancels/fences late results; re-entry may start a new first-page read. Respect expiry, blocked rates, existing pagination and request bounds. Do not auto-retry a failed product read or turn status polling into product polling. Manual Refresh products and Next remain available.
3. Each real product card offers a validated direct Shopify admin link using its returned product GID and the connected shop. Existing merchant products remain read-only. Simulation must not offer real-store links.
4. Photo metadata says whether photos are available, rather than claiming thumbnails are shown. Retain the existing safe first-image link and explain that the screenshot's product has one image. No CSP, backend media, stock, bag, checkout or commerce graph change.
5. Meaningful controller/session tests cover ready and delayed entry, deduplication, reconnect/status refresh, cancellation/re-entry, failure/no silent retry, pagination and onboarding/disconnected refusal. Run required settled gates and read-only review; actual native/visual acceptance must be labeled honestly.
