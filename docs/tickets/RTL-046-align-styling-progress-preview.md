# RTL-046 — align styling progress with the Tailor preview

Owner14 October2026: the creation steps should shrink to the left in assistant view, aligned with the narrowed template preview.

Acceptance:

- When styling Tailor is expanded at desktop widths, center the four progress steps over the same usable width as the narrowed storefront preview.
- When collapsed, return both to full width; animate matching width changes in both directions using existing designed easing.
- At the existing1000px overlay breakpoint and below, retain full preview/progress width and existing narrow wrapping. Check large/small laptops, tablet/phone, threshold widths, repeated open/close and keyboard activation.
- Preserve four labels, current/completed semantics, creation stage flow, existing accepted designs/catalogue/session/control behavior and every earlier pending revision. No provider/request/dependency/state-owner change.
- Record actual changed-path responsive and read-only full-ticket review plus settled gates. No staging/commit, delegation, paid/cloud or publication action.

References: owner screenshot/request; [allocation](../commit-plans/RTL-046.md); existing shared workspace CSS/markup, Tailor's bounded floating shell, root/frontend instructions and installed Next CSS Modules guidance.

Status: locally implemented and verified. Nine actual widths,1000/1001px threshold, synchronized open/close motion, native keyboard activation, earlier-stage progress and restored styling alignment pass. Five settled root gates pass;399/400 units pass with the existing strict Linux-source-proof mismatch. [Actual evidence and limits](../validation/RTL-046.md). No staging/commit or external action.
