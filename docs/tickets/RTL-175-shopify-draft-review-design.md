# RTL-175 — Organized Shopify draft review

## Authority and status

**Locally implemented and validated, 11 November 2026. All six gates pass, 834 tests / 124 files; settled review has no actionable findings.** The owner reports the pictured draft-export review works and requests a better dialog design consistent with Retailor's organized owner workspace. Implement this visual revision independently of the existing unstaged RTL-174 integration/research changes. No Shopify write, credential/account mutation, deployment, staging or commit is needed for visual validation. The owner's report establishes this pictured export-review flow works for their test; it does not establish unrelated-organization distribution acceptance.

## Precision references

- `features/shopify/connections.tsx`, `review-dialog.tsx`, `connections.module.css`: existing reviewed snapshot, busy/error, confirmation/cancel and native-dialog focus/escape behavior.
- `features/operations/form-shell.tsx` and `operations.module.css`: organized header, scrolling content and persistent action area; platform tokens remain authoritative.
- `features/shopify/garment-picker.tsx`, `features/storefront/gallery.tsx`: supplied-photo gallery, zoom and failure handling. Preserve the frozen review snapshot rather than switching to the current catalogue product.
- [RTL-170](RTL-170-shopify-photo-selection-and-collection.md): exact reviewed fields/photos, active variants, explicit confirmation and owned Retailor collection semantics.
- Installed Next use-client/CSS/image documentation and frontend AGENTS.md; root architecture and motion/privacy requirements.

## Acceptance

1. Export and update reviews use a cohesive responsive dialog: clear title/store destination, collection/draft context, substantial garment photos, full descriptions and organized variant/SKU/USD prices. Show all reviewed products and active variants without clipping long values. Empty descriptions have useful fallback copy.
2. Keep header/close and confirmation/cancel accessible while content scrolls. Footer summarizes the selection and clearly separates primary/secondary actions. Preserve exact source-controlled busy/error/reference copy, unverified disabling, explicit confirmation/cancel and update-photo caveat.
3. Use existing navy/lime/surface/line tokens, typography, spacing, gallery and buttons. Preserve motion, native dialog semantics, Escape, focus return and nested image zoom. Other Shopify dialogs keep their existing layout/behavior.
4. Actual Codex in-app desktop/tablet/phone checks of the changed dialog, scrolling/footer, gallery and keyboard closing, with no live write required. If live-session access is unavailable, use an explicitly isolated controlled preview and label it honestly. Do not mutate the owner's demo/session just to obtain a screenshot.
5. Required six local gates and settled read-only review; record commands/results and evidence in [validation](../validation/RTL-175.md). Preserve RTL-174 and report native/hosted/source-proof limitations separately. No tests mirroring CSS markup solely for this reversible visual change.

## Progress

Delivered the framed destination/product/variant review and persistent actions. Actual controlled in-app desktop/tablet/phone checks, long-value repair, gallery/keyboard/state checks and all required local gates pass. [Actual validation](../validation/RTL-175.md) records evidence and unchanged native/hosted acceptance limits. No deviations, staging or commits.
