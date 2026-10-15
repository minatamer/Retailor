# RTL-065 — clean URLs for landing scroll CTAs

Owner request, 15 October 2026: remove routes/fragments like the screenshot's `127.0.0.1:4310/#owner-view` when clicking scrolling CTAs. This supersedes RTL-038's ordinary section hash/history behavior while retaining designed smooth scrolling.

## Acceptance

- Ordinary primary click and Enter on How it works, Storefronts, Owner view, the down arrow, header/footer Retailor home and skip link scroll/focus the matching destination without adding a fragment or section-history entry.
- An existing fragment is removed on the next ordinary scrolling activation without losing the current path/query or framework history state. Direct bookmarked fragments and native modifier/new-tab/no-JavaScript fallback remain meaningful.
- Retain one finite/cancellable animation owner, 450–900ms easing, existing section offsets, keyboard destination focus and cancellation on new navigation/manual input/history/unmount. Preserve responsive navigation, illustration/inner-preview motion and real `/demo` navigation.
- Preserve the 16px Meet Tailor label, centered single-link footer and deferred hero-video reminder. Record actual browser regression evidence, all required settled gates and read-only full-ticket review, with existing source-proof/external acceptance limits explicit.

References: exact owner screenshot/request in this chat, [allocation](../commit-plans/RTL-065.md), [prior scroll behavior](RTL-038-smooth-section-navigation.md), [landing design](../design/LANDING.md), root/frontend instructions and installed Next history/link/server-client composition guidance.

Status: implemented and locally checked across all seven scrolling actions, desktop/tablet/phone widths, old-fragment/query/history behavior, rapid activation/manual cancellation and real demo routing. Five settled root gates pass; 464/465 units retain only the existing source-proof failure. [Actual validation and limits](../validation/RTL-065.md). No staging/commit or external action.
