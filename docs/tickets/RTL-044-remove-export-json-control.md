# RTL-044 — remove Export JSON from the demo header

Owner14 October2026: remove the screenshot's Export JSON control.

Acceptance:

- Remove the shared demo-header Export JSON button in every workspace stage where it appeared.
- Retain the approved Retailor identity, Reset demo action, responsive header geometry and keyboard operation.
- Keep intentional report serialization/export infrastructure and its existing behavioral tests; the request removes the visitor control, with no data, commerce, session, reset or API change.
- Preserve all earlier pending changes. Record actual responsive/browser checks, required settled gates and a read-only complete-ticket review. No staging/commit, delegation, paid/cloud or publication action.

References: exact owner screenshot/request in this chat; [allocation](../commit-plans/RTL-044.md); root/frontend AGENTS; installed Next client-component guidance.

Status: locally implemented and verified. Three actual responsive widths and refreshed populated review header pass; keyboard Reset demo opening/cancellation pass. Five root gates pass;399/400 units pass, retaining only the pre-existing strict Linux-source-proof mismatch. [Evidence and limits](../validation/RTL-044.md). Nothing staged, committed, paid or published.
