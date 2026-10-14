# RTL-056 — move View storefront beside Reset demo

15 October 2026 owner asks to move only “View storefront” from the owner heading to the top workspace header beside Reset demo. “Create a garment” remains in the owner heading.

Acceptance:

- Dashboard stage renders the same secondary View storefront button beside Reset demo in the Retailor header, using the existing controller.go("storefront") handler. Remove its old owner-heading instance; retain Create a garment and its exact handler.
- Preserve storefront-only Revisit/Owner actions, other stages, reset/restore and dirty-design leave confirmation. Reuse existing responsive wrapping, focus, 44px controls and designed motion without new state, styles or dependencies.
- Verify actual native fake navigation, owner refresh, reset cancellation, dirty-design guard and phone/tablet/laptop fit. Run relevant existing tests and all six settled gates, then complete a read-only scoped review. Record existing unrelated source-proof failure and pending external/physical acceptance honestly.

Precision references: latest owner screenshot/request, [allocation](../commit-plans/RTL-056.md), WorkspaceFlow, OwnerWorkspace, controller.go and [Tailor setup](../engineering/TAILOR-SETUP.md). Preserve prior RTL-026–055 work; no paid/cloud/delegation/staging/commits/publication.

Status: local implementation and complete read-only scoped review finished, 15 October 2026, no actionable findings. [Actual validation](../validation/RTL-056.md): focused 19/19; five root code/build gates pass; 462/463 units retain only the existing historical source-proof failure. Native keyboard/navigation/refresh/reset-cancel/dirty-design checks and phone/tablet/laptop fit verified. Current Linux/scanner/hosted/live/physical/owner acceptance remains pending. Nothing staged or committed.
