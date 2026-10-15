# RTL-093 — title-first storefront headings

Status: **Implemented and locally validated. Existing source-proof failure/external release acceptance remain pending.**

15 October 2026 owner feedback: remove “Clothing, considered” and switch the order of the store/collection label with the main title, applying the hierarchy to other pages/templates.

Acceptance:

1. Remove the generic campaign kicker and exact “Clothing, considered” footer copy from real storefronts and reachable design previews.
2. Main page title precedes its collection/store/category metadata on Home, Collection and Product across Studio, Pulse and Gallery, including setup and mixed-template previews.
3. Preserve distinct photo layouts, selected hero photos, prices, shopping/navigation, typography and motion. Clear spacing and no new overflow on laptop or phone.
4. Actual changed-path/template/responsive checks, settled read-only validation and six repository gates; preserve unrelated unstaged checkout work and strict source-proof policy. No new behavior tests that merely mirror markup, no Git staging/commits, delegation or external mutations.

Precision references: [allocation](../commit-plans/RTL-093.md), shared `features/storefront/home.tsx` / `storefront.tsx` / CSS, reachable `store-design/design-lab.tsx` and `StoreComposition`. Historical template compositions remain in [RTL-043](RTL-043-research-and-rebuild-storefront-templates.md); current owner hierarchy instruction supersedes earlier kicker placement. Existing [shopping behavior](../engineering/SHOPPING.md) remains unchanged.

[Actual validation](../validation/RTL-093.md) records the shared and standalone renderers across three pages/three templates at laptop/phone widths, clean settled read-only review, 17 focused tests, five passing code/build gates and 588/ 589 units with only the existing strict Linux-source mismatch. Five frontend build inputs changed; unrelated checkout work remains preserved and unstaged.
