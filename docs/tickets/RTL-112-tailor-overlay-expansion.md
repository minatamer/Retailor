# RTL-112 — expand Tailor over the preview

Status: **Locally implemented and reviewed.** [Validation](../validation/RTL-112.md) records normal/large/restore motion, unchanged preview/photo/owner geometry, compact footer controls, drafts/focus/lifecycle and tablet/phone/short-window bounds.25/25focused tests and five code/build gates pass;629/630units retain only the existing strict Linux source-proof mismatch. Current Linux/hosted/physical acceptance remains pending. Earlier unstaged work remains; nothing staged/committed or externally invoked.

Acceptance:

1. Replace See full preview with the existing downward-collapse meaning as a smaller footer arrow. Keep its accessible name,44px target and footer layout; it collapses the complete chat through the existing controller action.
2. Header's former collapse position becomes an accessible expand button, then a restore-size button. Smoothly enlarge both width and height where screen bounds allow, especially width on desktop/tablet. The larger chat floats above content. Existing preview/main reserved width and photo layout do not shrink further when size is toggled.
3. Preserve actual chat/draft DOM, role labels/content, keyboard focus, scroll and active-field visibility, central open/close/session/tour behavior and designed motion. Collapse/reopen resets enlarged presentation; no persisted schema/controller or provider change. Handle narrow/short and viewport/keyboard bounds, restore and repeated toggles without overflow or hidden controls.
4. Actual setup/storefront/dashboard and responsive/motion geometry checks, content preservation and lifecycle cleanup, focused meaningful existing regressions, settled read-only review and six repository gates with exact-byte evidence. Preserve strict current Linux proof mismatch, prior changes and pending external/physical acceptance. No staging/commit, delegation, paid/cloud or publication action.

Precision: [allocation](../commit-plans/RTL-112.md), [tour behavior](../validation/RTL-107.md), [identity](../validation/RTL-111.md), current Tailor/Workspace/compact/visualViewport and session behavior, root/frontend rules and relevant RTL-023 ownership/privacy/cleanup dispositions.
