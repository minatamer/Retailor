# RTL-079 — dismiss filters by clicking outside

15 October 2026 owner screenshot/request: clicking the shaded area outside the collection filter panel should dismiss it.

Acceptance: a primary outside click closes the native filter sheet, cancels unapplied edits and returns focus to Filters. Clicks on inside controls/blank space, scrolling and cross-boundary drags do not dismiss or apply the draft. Preserve native Escape, X, Show/Clear, active filter state, counts, scoped exact price inputs and motion. Verify native desktop/phone behavior and existing meaningful filter regressions, six settled gates and complete read-only review. No staging/commit or external action.

References: exact owner screenshot, [allocation](../commit-plans/RTL-079.md), [shopping/filter behavior](../engineering/SHOPPING.md), RTL-048 filter implementation and root/frontend rules.

Status: implemented and locally reviewed. [Actual validation](../validation/RTL-079.md): native desktop/phone outside dismissal, draft cancellation/committed-filter retention, inside clicks, both cross-boundary drags, scrolling, Show/Clear/Escape/X and focus return verified. Focused 11/11 and five root code/build gates pass; 511/512 units retain only the existing source-proof failure. Physical/live/owner/external acceptance pending; nothing staged or committed.
