# RTL-058 — open the owner form as a dialog

15 October 2026 owner asks for the pictured Create a garment form to be a dialog instead of a dashboard side card.

Acceptance:

- The existing full dashboard owner form opens as a centered, labelled native modal dialog with a theme-matched backdrop, bounded responsive internal scrolling and existing entrance motion. Remove the dashboard split-layout behavior; records retain full width behind the dialog.
- Native focus containment, Escape/Cancel cancellation and opener/fallback focus restoration. Preserve the one controller-owned draft, photo requirements, editable fields, exact review/confirmation and cleanup; no secondary form/state or unreviewed mutations.
- The existing Tailor inline form remains inline. Continue in Tailor and Open full form retain the same dirty draft/review authority; moving or closing removes the old modal. Keep all shared CSS consumers and current top navigation/dashboard intro corrections.
- Actual native fake desktop/phone/tablet checks: create/required photo/edit/review/back/confirm, Escape/Cancel/focus, Tailor round trip and dashboard full width. Focused existing operation tests and all six settled gates, then read-only scoped review. No paid/cloud/dependency/delegation/Git/provider/domain changes. Existing source-proof/current external acceptance remain explicit.

Precision references: latest screenshot/request, [allocation](../commit-plans/RTL-058.md), FormShell/OwnerWorkspace/ConversationPanel and controller owner methods; [owner operations](../engineering/OWNER-OPERATIONS.md#one-form-and-confirmation-authority), [Tailor operations](../engineering/TAILOR-OPERATIONS.md).

Status: local implementation and complete read-only scoped review finished, 15 October 2026, no actionable findings. [Actual validation](../validation/RTL-058.md): focused owner tests 9/9, five root code/build gates pass; 462/463 units retain only the existing historical source-proof failure. Actual native create/edit/photo/review/back/confirm, Tailor draft transfer, Escape/Cancel/focus, refresh and responsive dialog/full-register checks complete. Current external/physical/owner release acceptance remains pending. Nothing staged or committed.
