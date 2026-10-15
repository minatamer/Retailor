# RTL-083 — simplify shared owner dialogs

15 October 2026 owner screenshot/request:

- Remove Current records · Owner amounts in USD · Temporary local demo.
- Remove the photo ownership/permission, local raster and unknown-fabric/fit paragraph.
- Remove This upload shows clothing, rather than a logo or illustration and its checkbox.
- Move the complete existing JPEG/PNG/static-WebP/4-MiB/add-view/missing-photo guidance inside the upload area.
- Remove Continue in Tailor from dialogs. Apply the same cleanup across every shared operation dialog, including create/edit and reviews, rather than one instance.

Acceptance: requested copy/action absent; upload instructions inside the associated upload control; no empty spacer action row. Removing manual attestation enables direct picking but preserves actual validated available photo, raster/byte/count/lifecycle, required fields and exact review/confirmation checks. Inline Open full form, current-fill cancellation and native dialog focus/Cancel/Escape remain. No extra classifier/provider, hidden assertion or automatic mutation. Actual representative shared-dialog and responsive checks, existing meaningful tests, six gates and settled read-only review. No commit or external action.

References: [allocation](../commit-plans/RTL-083.md), [owner operations](../engineering/OWNER-OPERATIONS.md), [Tailor operations](../engineering/TAILOR-OPERATIONS.md), [original native modal](RTL-058-owner-operation-dialog.md), screenshot and root/frontend rules. Latest owner removals supersede earlier checkbox/reverse-handoff UI requirements.

Status: independent local implementation and complete read-only validation finished with no new actionable finding. Shared header/reverse-handoff copy removed across operation/review dialogs; product paragraph/checkbox removed and full guidance moved into upload area. [Actual validation](../validation/RTL-083.md): real valid/invalid upload, required-photo remove/reuse/review, create/edit and representative order/stock/cost/expense/return dialogs, inline transfer and responsive checks. Focused42/42 and five root code/build gates pass;517/518 units retain only the existing source-proof failure. Current physical/live/owner/external acceptance remains pending; nothing staged or committed.
