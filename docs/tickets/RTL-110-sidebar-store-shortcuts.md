# RTL-110 — store shortcuts above sidebar collapse

Status: **Locally implemented and reviewed.** [Validation](../validation/RTL-110.md) records expanded/collapsed/short-window and tablet/phone checks, actual storefront navigation, reset cancellation and confirmed disposable reset/restore.16/16focused tests and five code/build gates pass;629/630units retain only the existing strict Linux source-proof mismatch. Current Linux/hosted/physical acceptance remains pending. Earlier unstaged work and footer actions remain; nothing staged/committed or externally invoked.

Acceptance:

1. Expanded desktop dashboard has View storefront and Reset demo at its bottom, directly above Collapse sidebar. Match sidebar styling, with appropriate icons and spacing. Collapsed navigation retains accessible labelled/title shortcuts and normal expansion.
2. Mobile/tablet drawer exposes the same shortcuts. Close the drawer before switching to the storefront or opening the existing reset confirmation. Existing cancel/confirm/reset lifecycle and session fences remain authoritative; no duplicate controller or bypass.
3. Keep footer actions, store branding, original owner views/navigation,44px targets, keyboard/focus, full-height/short-window scrolling, responsive layout and designed motion. No provider/API/cloud/dependency change.
4. Check actual expanded/collapsed/short desktop, tablet/phone navigation and reset cancel/confirm in a disposable local workspace. Run focused existing lifecycle checks and applicable six settled gates, then document exact-byte evidence and clean read-only review. Preserve the known strict Linux source-proof mismatch and explicitly pending external/physical acceptance. No staging/commit or external action.

Precision: [allocation](../commit-plans/RTL-110.md), [full-page shell](RTL-087-full-page-store-owner.md), [footer navigation](../validation/RTL-099.md), [current attribution](../validation/RTL-109.md), existing OwnerNavigation and central session reset, root/frontend rules and affected RTL-023 audit dispositions.
