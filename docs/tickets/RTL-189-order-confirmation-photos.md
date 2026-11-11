# RTL-189 — Order confirmation photos and centered checkmark

11 November 2026. Owner requests garment photos in the order-confirmation card and centering its success tick. Deployment is explicitly held; prepare hosted Shopify/paid deployment after addressing feedback. Preserve preceding validated changes and the empty index.

## Acceptance

1. Each ordered garment displays its actual saved order-line photo with the existing image/loading/failure treatment. Keep snapshot name/options/quantity/prices and exact saved receipt totals. Do not substitute a different current product/colour photo; a missing historical photo gets the designed unavailable placeholder.
2. Center the existing animated success tick horizontally in the confirmation content, preserving the remaining card layout, typography, palette and motion. Keep photos/copy/prices readable on desktop and narrow phones.
3. Check actual confirmation, image availability, close/reopen/restore and keyboard/responsive behavior through existing supported paths. Run meaningful existing checks and applicable settled gates; record a read-only review and honest native limits. Do not submit a real-money payment or deploy.

Precision: root/frontend instructions, Next use-client guide, current BagDialog and immutable OrderLine.photoId, photo controller/view and GarmentImage/PhotoPlaceholder, RTL-188 verified sandbox recovery. A completed sandbox payment or normal local-demo order can establish native receipt behavior; injected test data must be labelled separately.

Status: locally implemented and reviewed. Actual two-product Stripe sandbox completion, correct receipt photos/total, centered mark, desktop/390px/320px fit, reload/reopen and keyboard recovery verified. All six Linux gates pass,895/895; two Windows timeout-only cases pass isolated original-budget diagnostics. [Actual evidence and limits](../validation/RTL-189.md). Deployment remains held.
