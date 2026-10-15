# RTL-070 — add an editable next-size block

15 October 2026 owner screenshot/request: add one more size, price, unit cost and opening-units block; intuitively prefill from the previous size, respecting each clothing sizing convention.

Acceptance:

- Review product editor has an accessible Add size action for each current colour. Added row preserves current unsaved colour/price/cost/stock, gets a new variant ID/SKU and editable suggested size. Focus goes to that size; remove an accidental new row without losing other edits. Save/Link use existing exact validation; Cancel discards additions.
- Suggestions are based on entered labels/convention, not inferred body measurements: alpha succession, next waist retaining inseam, observed numeric interval and recognized region/chest labels. Skip existing same-colour labels. One-size/unrecognized/exhausted patterns leave the size blank for explicit entry; do not invent a product fit or create a duplicate.
- Owner garment forms use the same defaults for their add action, preserve existing option IDs/stock/history and require the usual exact-effects review/confirm. Keep manual correction and photo/colour mapping.
- Preserve finite 24/product and 288/draft limits, distinct options, all photo/commerce/session/privacy/motion/safety controls and earlier pending edits. No paid/provider/cloud/Git action.
- Meaningful pure/parser/controller tests and actual desktop/tablet/phone UI add/edit/remove/save/cancel/reopen checks; all six settled gates and complete read-only review with current external/source-proof limits.

References: exact owner request/screenshot, [allocation](../commit-plans/RTL-070.md), [size behavior](../design/SIZE-OPTIONS.md), RTL-050 carousel, RTL-051 grouping/colour mapping, RTL-068 naming, RTL-069 note removal, PHOTO-LINKING and root/frontend/RTL-023 preservation rules. Status: implemented and locally reviewed. [Actual validation](../validation/RTL-070.md): focused 47/47 and five root code/build gates pass; 496/497 units retain only the existing source-proof failure. Actual review/owner/storefront/responsive checks completed; current external/live/physical/owner acceptance stays pending. Nothing staged or committed.
