# RTL-042 — link multiple views of one product

Owner14 October2026: remove confusing merge UX. After uploading, easily link multiple photographs of the same product (angles/model views), present them as one diagonal layered card, and open the editor by clicking a card. Automatically show every linked photo inside it with the relevant edits/controls directly under that photo. Add alternate views for some sample products so the default journey demonstrates linking. Align Review & process and every submit/proceed action in this creation flow to the right.

## Acceptance

- Intake supports deliberate, reversible links and cover choice within existing8-photo/product and24-selected-photo limits. Linked groups persist on refresh and safely prune/remove/reset; failed/cancelled/stale work cannot restore retired links.
- Default sample retains its15 existing garments and adds three distinct inspected alternate photographs, prelinked only using actually accepted sample byte identities. Repeat sample use stays idempotent and preserves visitor changes. Public sample still requires fresh live recognition; no authored product/recognition fallback.
- Shared layered cards display linked groups in intake and catalogue review. Normal whole-card button opens a native edit dialog by pointer/Enter; all linked photos are visible without another expander. Card selection for linking is explicit and separate from editing.
- Each photo's cover/order/replace/remove/unlink controls sit beneath its image. Shared title/category/copy/exact-money/options belong to one product and appear once under the cover; photo-specific evidence stays with its source. Editor save/errors/close/focus and unavailable-photo recovery remain usable on320px/tablet/laptop.
- User grouping is applied to fresh recognition conservatively: preserve rejected/uncertain status, source coverage/provenance, photo witnesses, finite history and one financial product. No new provider operation, hidden retry or promotion of rejected/non-clothing inputs.
- All creation-flow proceed/submit/link/save/done actions align right, back/cancel actions remain clear; no small-screen full-width rule reintroduces a left-only CTA. Existing merchant galleries can navigate all linked images.
- Meaningful domain/controller/restore/reset/validation tests, responsive browser upload/sample/link/unlink/edit/review/storefront checks, complete read-only review and six settled gates. Preserve raw-byte inventory/source mismatch and external acceptance limits. No staging/commit or external release.

References: exact screenshots/request in this chat; [allocation](../commit-plans/RTL-042.md); original photos/catalogue/session contracts and implementations; RTL-003/005/006 functionality; RTL-023 approved preservation controls; imagegen skill for requested sample imagery.

Status: locally implemented and reviewed. Actual upload/link/unlink/edit/refresh/reset, five-width modal and storefront carousel checks pass. Five root gates pass;396/397 tests pass, retaining only the pre-existing historical Linux-source mismatch. [Evidence and limits](../validation/RTL-042.md). Current-source Linux/hosted/live/physical/owner acceptance remains pending. Nothing staged, committed or published.
