# RTL-062 — enlarge the Meet Tailor label

Owner request, 15 October 2026: “meet tailor font size can be bigger.” The screenshot identifies the small uppercase label and sparkle above “A good eye. A helping hand.” in the centered landing introduction.

## Acceptance

- Increase the “Meet Tailor” label from 10px to 16px through its existing scoped CSS selector.
- Keep the centered introduction and usable spacing on desktop/tablet/phone, including 320px width; retain the adjacent/stacked example cards and their interactions.
- Preserve all existing motion and the deferred hero-video reminder. Limit application changes to the identified label sizing.
- Record actual changed-path browser checks, the six required settled gates and a read-only full-ticket review. Current Linux/hosted/live/owner acceptance remains separate.

References: owner screenshot/request in this chat, [file allocation](../commit-plans/RTL-062.md), [landing design](../design/LANDING.md), [centered introduction](RTL-041-center-tailor-section.md), root/frontend instructions and installed Next CSS Modules guidance.

Status: implemented and locally checked at desktop/tablet/phone widths. Five settled root gates pass; 464/465 unit tests pass with only the existing historical Linux source-proof mismatch. [Actual validation and limits](../validation/RTL-062.md). No staging/commit or external action.
