# RTL-066 — rename Owner view navigation to FAQs

Owner request, 15 October 2026: rename the screenshot's Owner view item to “FAQ's or FAQs or whatever modernly used.” Use the plural label **FAQs** and target the actual existing questions container.

## Acceptance

- Replace the navbar item with FAQs, linked to the existing `questions` target; retain all owner content and actual FAQ text/disclosures.
- Ordinary click and Enter animate to that target with the same 24px offset and destination focus, preserving the clean URL/query/history behavior and one bounded animation owner.
- Preserve current responsive navigation visibility/layout, existing motion, other section/demo/home actions and all pending visual changes.
- Verify actual desktop/tablet/phone behavior, disclosures and clean URLs; record six settled gates and read-only review with existing source-proof/external acceptance limits explicit.

References: exact owner screenshot/request, [allocation](../commit-plans/RTL-066.md), [current navigation behavior](RTL-065-clean-scroll-cta-urls.md), [landing design](../design/LANDING.md), root/frontend instructions and installed Next CSS/link guidance.

Status: implemented and locally checked: FAQs targets/focuses the actual questions with smooth motion and clean URLs, and native disclosures work at desktop/tablet/phone widths. Five settled root gates pass; 464/465 units retain only the existing source-proof failure. [Actual validation and limits](../validation/RTL-066.md). No staging/commit or external action.
