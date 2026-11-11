# RTL-177 — Fill empty Retailor collection images

## Authority and status

11 November 2026. The owner requests using Retailor's logo for its Shopify export collection, only when the image is empty; preserve any existing image. Implement within the existing explicit export/update flow and owned collection. Preserve all 34 earlier RTL-174–176 paths. No new credentials, infrastructure, review submission, deployment or Git staging/commit.

## Precision references

- Shopify Admin GraphQL2026-10 [CollectionCreateInput.image](https://shopify.dev/docs/api/admin-graphql/2026-10/input-objects/CollectionCreateInput), [CollectionUpdateInput](https://shopify.dev/docs/api/admin-graphql/2026-10/input-objects/CollectionUpdateInput), [ImageInput.src](https://shopify.dev/docs/api/admin-graphql/2026-10/input-objects/ImageInput) and [collectionUpdate](https://shopify.dev/docs/api/admin-graphql/2026-10/mutations/collectionUpdate). Existing `write_products` scope covers collection image changes. No atomic compare-if-empty condition is documented for this field.
- Existing `shopify/collection-provider.ts`, `collection.ts`, catalogue explicit export/update, durable ledger, shared admission and unknown-outcome controls; [RTL-170](RTL-170-shopify-photo-selection-and-collection.md).
- Existing public square Retailor brand asset `https://tryretailor.com/apple-touch-icon.png`; verified actual HTTP200/image/png/4569 bytes on this date, no redirects. Source image is `apps/frontend/public/apple-touch-icon.png`.
- Root AGENTS.md and RTL-023 quality/security preservation: exact ownership, fixed outbound operations, private errors/logs, no blind retry, finite capacity/deadlines and inert factories.

## Acceptance

1. New app-owned Retailor collections include the fixed public Retailor logo and meaningful alt text in their create request. No visitor-supplied URL, env field, staging bucket, local callback exposure or extra scope.
2. During an explicitly reviewed export/update, fill an existing owned collection's empty image. Read image presence as required provider metadata; unknown/malformed image information is not assumed empty. Recheck ownership and image immediately before mutation. Preserve any non-null image, regardless of its URL/id/alt or whether it is already Retailor's logo. Never adopt a collection by title.
3. Image mutation changes only id/image. Persist image dispatch before HTTP; after a lost/unknown response, read actual state before any later action and never blindly repeat an in-flight image write. Clear the dispatch fence after observing an image; preserve legacy ledger compatibility and the ability to fill a later confirmed-empty image after a known successful write. Do not advertise a Shopify atomic-empty guarantee that its API does not provide.
4. Preserve product variants/photos, explicit confirmation, original expiry, admission/rate/concurrency, collection membership/cleanup and old exports without collection records. New collection writes and changes still happen only during the authorized export/update, not Connect/browse/health.
5. Meaningful provider and lifecycle tests for new logo, empty fill, existing-image preservation, ownership/late image checks, unknown/definite rejection, legacy state and cleanup. Required six gates and settled read-only review, actual evidence in [validation](../validation/RTL-177.md). Native Shopify image attachment is unverified until actually observed; public logo reachability alone is narrower evidence.

## Progress

Implemented and locally validated. File allocation preceded edits. All six gates pass, including 848 tests across 124 files; settled read-only review found no actionable local findings. Existing-image preservation, fresh ownership/image checks and durable unknown-write handling are covered. Native Shopify attachment/appearance remains explicitly unverified until the next confirmed export/update is observed. See [actual evidence](../validation/RTL-177.md). Nothing staged or committed.
