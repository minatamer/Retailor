# RTL-055 — move store actions beside Reset demo

15 October2026 owner asks to move screenshot “Revisit the look” and “Owner dashboard” next to Reset demo at the top so they are easy to spot.

Acceptance:

- Both existing actions appear exactly once in Retailor’s top workspace header beside Reset demo when the storefront is active; remove their lower action bar and its exclusively unused styles. Preserve existing secondary/primary emphasis and exact controller.go handlers/stage eligibility. Other stages retain their current reset/navigation behavior; merchant page navigation stays intact.
- Desktop/tablet show the action cluster beside the brand. Phones keep Reset next to the brand and the two store actions directly below in the same header, with readable labels,44px targets, visible keyboard focus and no horizontal overflow. Preserve existing designed button/stage motion and navigation focus/smooth scroll.
- Actual native fake checks for both top actions, return/refresh/reset-dialog cancellation, phone/tablet/laptop geometry and keyboard activation; required six settled gates and read-only scoped review. No static markup-mirroring tests, domain/provider/state changes, new dependency or paid/cloud/Git/delegation action. Existing unrelated Linux source-proof failure and external/physical/owner acceptance remain explicit.

Precision references: latest owner request/screenshot, [allocation](../commit-plans/RTL-055.md), existing WorkspaceFlow/CollectionCanvas/controller.go, [Tailor owner/setup authority](../engineering/TAILOR-SETUP.md), root/frontend instructions. Current RTL-053 palettes/RTL-054 currency work preserved.

Status: authorized local implementation and read-only scoped review complete,15 October2026. Both exact actions relocated beside Reset, responsive shared header and original handlers/eligibility retained. [Actual validation](../validation/RTL-055.md): focused19/19, five root code/build gates pass;462/463 units retain only existing strict historical source-proof failure. Actual phone/tablet/laptop/navigation/refresh/reset-cancel evidence complete; no actionable scoped findings. Current external/physical/owner release acceptance remains pending. No stage/commit/push/delegation/paid/cloud/publication.
