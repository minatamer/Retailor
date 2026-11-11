# RTL-176 — Exclude Shopify gift cards from import browsing

## Authority and scope

11 November 2026. The owner says not to import Shopify gift cards and supplies a screenshot of a disabled gift-card card in the import list. Gift-card imports are already refused by the backend and browser import model; remove them from the visitor-facing import catalogue as well. Preserve the 29 existing RTL-174/175 paths, including earlier edits in the shared controller tests/index. No account/provider call, staging or commit.

## Precision references

- `features/shopify/controller.ts` browse result → `CatalogueBrowser` products, selected IDs, search, detail, Select all and loaded count.
- `catalogue-browser.tsx`, `import-model.ts` and existing gift-card refusal regressions.
- Backend `shopify/catalogue.ts` current native `isGiftCard` check and `import.test.ts` gift-card rejection before image download; unchanged.
- [RTL-171](RTL-171-shopify-collection-import.md): clothing-only, explicit bounded pagination, collection selection and no automatic/partial import.

## Acceptance

1. Filter products with Shopify's explicit gift-card flag before committing catalogue state. Initial reads, pagination, refresh and collection changes exclude them; do not rely on names or remove ordinary clothing when an older response omits the optional flag.
2. Search, loaded counts, selection/Select all and details derive from the filtered products. Remove unreachable gift-card-only card copy/branches. An empty eligible page/collection has accurate copy. Preserve actual cursors, page/limit metadata and explicit bounded pagination; no hidden fill-page requests.
3. Preserve independent backend/browser-model refusal of gift-card imports before image download/local mutation, including direct request attempts. No new API query, schema, provider or security-boundary change.
4. Meaningful mixed/gift-only/pagination/refresh/collection regressions plus existing gift-card rejection checks. Required six local gates and settled read-only review; actual evidence in [validation](../validation/RTL-176.md). No invented native Shopify/browser verification.

## Status

**Locally implemented and validated, 11 November 2026.** All six gates pass, including 835 tests / 124 files. Focused gift-card/controller/model/backend checks pass 37/37; settled read-only review has no actionable findings. [Actual validation](../validation/RTL-176.md). Existing Shopify research and draft-dialog work remain intact and unstaged. No native-store mutation or new browser verification is claimed; no deviations, staging or commits.
