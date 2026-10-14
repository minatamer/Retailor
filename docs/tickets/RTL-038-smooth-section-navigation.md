# RTL-038 — smooth landing section navigation

14 October 2026. Owner's screenshot identifies How it works, Storefronts and Owner view. Confirm the section targets and ensure smooth scrolling, removing the static-scroll setting.

## Acceptance

- All three native links retain their matching `#how-it-works`, `#storefronts` and `#owner-view` targets.
- Use a single explicit smooth-scroll default on the document scroll root, with no automatic instant-scroll or OS suppression setting introduced.
- Preserve keyboard activation, browser hash/history, section offsets, natural manual scrolling, inner preview scrolling, responsive navigation, colours and existing motion.
- Inspect actual click/keyboard behavior and responsive views; record actual observations without claiming a static screenshot proves animation. Preserve existing release-source rejection and pending Linux/scanner evidence.

References: exact owner request/screenshot in this chat; [allocation](../commit-plans/RTL-038.md); root/frontend AGENTS; installed Next CSS guide, Link/hash/scroll-margin guidance and version16 scroll-override section. Existing root CSS has no smooth default, while a landing-scoped `html:has(.landing)` declaration computes to smooth in the inspected local browser. Do not misreport an instant-scroll override as discovered when none appears in source.

Status: locally implemented and verified with actual animated positions, interruption, keyboard and responsive checks; [validation](../validation/RTL-038.md). Current-source Linux/scanner proof remains pending. No staging/commit.

Browser finding: actual native clicks reached the final section within the first 45–65ms sample despite computed HTML `smooth`. Use an explicit bounded/cancellable animation for these three links, retain native anchor semantics/fallback and focus, then recheck intermediate positions and interruption.
