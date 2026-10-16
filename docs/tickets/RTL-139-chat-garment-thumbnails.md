# RTL-139 — clickable garment photos in Tailor replies

16 October 2026. Status: completed locally; actual checks and review are recorded in validation. Owner requests small garment photos on chat cards while keeping the cards clickable to open the product.

Acceptance:

1. Current Tailor product/variant source cards display a compact real garment thumbnail next to the existing name, exact price/option/stock and action text. Variant thumbnails follow the referenced colour's supplied photos where available; use the existing photo authority and rendering/failure behavior.
2. The entire card, including its thumbnail, remains one keyboard/touch-accessible button with the existing registered reference handler. Shopper product/variant navigation, owner reference behavior, current/restored reply fences and fact/record cards remain intact.
3. Fit narrow and wide chat panels without stretched images or horizontal overflow. Missing photos do not introduce external/fake placeholders or change eligibility checks. No extra paid requests, provider changes, photo uploads or new object-URL ownership.
4. Record actual browser checks of thumbnails and product clicks, applicable settled local gates and a read-only review. Preserve the existing unstaged RTL-138 work; no staging, commit, push, deployment or delegation.

Precision: [file allocation](../commit-plans/RTL-139.md), [validation](../validation/RTL-139.md), existing Reply/controller reference handling, GarmentImage, colourImageIds and PhotoController availability authority; root/frontend instructions apply.
