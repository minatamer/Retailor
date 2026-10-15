# RTL-101 — remove the duplicate footer divider and balance gaps

Status: **Locally implemented and validated.** [Evidence](../validation/RTL-101.md) records18 all-template/page responsive cases, matched visible gaps within0.5px, retained dashboard/preview behavior and real owner navigation. Clean read-only review, five passing code/build gates and617/618units retain only the existing strict Linux source-proof mismatch. Nothing staged or committed; external acceptance remains pending.

Owner's screenshot crosses out the horizontal divider below the store name and asks for equal spacing between store name → Powered by Retailor → controls.

Acceptance:

1. Accepted storefront footer has no divider between its centered name and attribution. Retain the page-content/footer boundary.
2. Visible spacing above and below Powered by Retailor is equal, with centered/wrapping branding and functional controls across Home/Collection/Product and Studio/Pulse/Gallery at laptop and phone widths.
3. Preserve dashboard/preview behavior,44px controls, owner tour target, bottom safe-area/Tailor clearance and all earlier unstaged work. Verify the actual changed paths/responsive views, review the settled diff, run applicable six gates and record honest results. No staging/commit, delegation or external action.

Precision: [allocation](../commit-plans/RTL-101.md), [existing footer/navigation evidence](../validation/RTL-099.md), actual Storefront and Workspace footer consumers. This is a CSS spacing correction, with no state/API or financial behavior change.
