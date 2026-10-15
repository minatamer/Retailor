# RTL-099 — storefront footer arrangement

Status: **Locally implemented and validated.** [Evidence](../validation/RTL-099.md) records18 page/template preview checks,15 accepted page/width checks, moved tour spotlight and real dashboard/personalize/reset/preview-return navigation. Fifteen focused tests and formatting/lint/types/boundaries/build pass;615/616 full units retain only the existing strict Linux source-proof mismatch. External Linux/image/scanner/release and physical-device acceptance remain pending. Nothing staged or committed.

Latest owner screenshot marks the store name to move toward the footer center, crosses out Temporary demo store · Illustrative prices and inventory, and points Owner workspace toward the Personalize/Reset demo row. Stated working interpretation: center the name above the existing Powered by Retailor footer and put Owner workspace beside those two controls.

Acceptance:

1. Store name is centered, the marked sentence is removed, Powered by Retailor stays, and the accepted storefront has one Owner workspace control grouped with Personalize/Reset demo. All actual Home/Collection/Product and Studio/Pulse/Gallery paths share the change.
2. Owner navigation and preview return remain functional; dashboard controls and other session/commerce behavior stay intact. Preserve the moved `store-owner` tour target without duplicates. Controls remain keyboard/touch accessible and clear the collapsed Tailor launcher at laptop/intermediate/phone widths. Long names wrap.
3. Actual responsive/page/template and moved-control/tour checks, settled read-only review, six gates and accurate documentation. Preserve earlier unstaged work; no staging/commits/delegation/provider/cloud action.

Precision: [allocation](../commit-plans/RTL-099.md), Storefront and Workspace footer consumers; [tour evidence](../validation/RTL-095.md), [prior full-page layout](../validation/RTL-087.md), [RTL-098 baseline](../validation/RTL-098.md). This is a presentation/navigation relocation, not a new state or checkout feature.
