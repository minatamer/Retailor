# RTL-150 — align and keep the photo-draft action within reach

17 October 2026. Status: implemented; scoped read-only source review has no actionable findings. The owner identifies the photo picker's explanation and Create product draft CTA as misaligned and requests keeping the action accessible without scrolling to the end of the selection. Tests remain deferred unless an error requires investigation.

Acceptance:

1. Align the existing explanation and CTA on the same vertically centered row at wide widths, with the CTA at the right. Allow the explanation to wrap within its column without displacing the button onto a second row.
2. Keep this action area sticky at the viewport bottom while the picker spans the page. Use an opaque surface and safe-area spacing; retain its normal-flow space and contain it within the picker. Stack the content and provide a full-width CTA on narrow screens, with scroll clearance for underlying keyboard targets.
3. Preserve the existing single CTA, copy, conditional visibility, disabled checks and explicit processing handler. Keep warnings, photo selection, progress, editor dialogs, resource/session boundaries and motion unchanged.
4. Preserve RTL-144–149 and use the existing hot reload. Record a settled read-only source review; defer automated and browser verification under the owner's instruction. No rebuild/restart, paid request, browser data mutation, deployment, staging, commit or delegation.

Precision: [allocation](../commit-plans/RTL-150.md), [validation](../validation/RTL-150.md), the latest owner screenshot/request and test deferral, current photo-picker markup and stylesheet, live workspace and development photo-lab consumers, root/frontend instructions and installed Next CSS Modules guidance.
