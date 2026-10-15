# RTL-078 — consistent storefront navbar across pages

15 October 2026 owner screenshots/request: Product navbar looks right but other pages differ. Make all pages match its alignment.

Acceptance: keep wordmark left and the same right-packed Home/Collection/Product, currency/details and bag positions across all page template families, including mixed assignments. Preserve dimensions/spacing within the same container, active-page underline, logo/palette/type, responsive wrapping, native navigation and functional controls. Full and narrow Tailor previews use the same rule. Do not change any page's content composition or session/commerce authority. Verify mixed-page before/after, desktop/tablet/phone/preview and actual navigation/currency/details/bag, existing meaningful regressions, six settled gates and complete read-only review. No staging/commit or external action.

References: exact owner screenshots, [allocation](../commit-plans/RTL-078.md), [page layout mixing](../design/PAGE-LAYOUTS.md), [storefront library](../design/STOREFRONT-LIBRARY.md), RTL-049 and root/frontend instructions.

Status: implemented and locally reviewed. [Actual validation](../validation/RTL-078.md): native mixed Studio/Pulse/Gallery before/after, exact desktop/tablet/phone and narrow/full-preview alignment, active links, EUR/details/bag and refresh verified. Focused 16/16 and five root code/build gates pass; 511/512 units retain only the existing source-proof failure. Current physical/live/owner/external acceptance pending; nothing staged or committed.
