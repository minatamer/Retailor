# RTL-033 — remove extra hero text

Owner request, 14 October 2026: remove the screenshot's “No signup. No real payments.” beneath the hero CTA and “A whole new chapter for your clothes” at the hero's bottom edge.

## Acceptance

- Both visible strings are absent from the hero at all responsive widths.
- Keep the headline, supporting copy, demo CTA and animated storefront preview.
- Keep the downward section-navigation arrow at the right edge, with an accessible name and working target.
- Preserve prior visual/reset work and closing-section copy. Do not infer approval of the logo concepts or film production.
- Verify actual changed-path desktop/phone/tablet layout, keyboard navigation and applicable settled gates; record actual evidence and remaining release-proof limits.

References: owner's screenshot in this chat; [allocation](../commit-plans/RTL-033.md); [landing design](../design/LANDING.md); root/frontend `AGENTS.md`; installed Next CSS and Link documentation.

Status: **Implemented and locally checked.** Both hero lines are removed, the named down-arrow link remains right-aligned and keyboard-operable, and actual responsive checks pass. Five root gates pass; 388/389 units pass with only the existing release-proof mismatch. [Actual evidence and limits](../validation/RTL-033.md). No staging or commit.
