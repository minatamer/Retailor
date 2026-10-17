# RTL-151 — inset selected-photo captions

17 October 2026. Status: implemented; scoped read-only source review has no actionable findings. The owner's screenshot shows the photo number and filename almost touching the card outline.

Acceptance:

1. Add comfortable left/right and bottom padding to selected-photo captions while retaining separation below the image.
2. Keep long filenames inside the padded caption at narrow widths. Preserve image sizing, the complete clickable card, hover/keyboard outlines, responsive grid, motion and the earlier sticky draft action.
3. Preserve existing RTL-144–150 work. Record settled read-only source review; tests remain deferred under the owner's instruction. No rebuild/restart, browser data mutation, paid request, staging/commit, deployment or delegation.

Precision: the latest owner screenshot/request, [allocation](../commit-plans/RTL-151.md), [validation](../validation/RTL-151.md), current PhotoPicker/PhotoStack markup and CSS, actual caption consumers, root/frontend instructions and installed Next CSS Modules guidance.
