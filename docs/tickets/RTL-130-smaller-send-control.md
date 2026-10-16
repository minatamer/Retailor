# RTL-130 — smaller send control with scrollbar above

**Final batch update — 16 October 2026:** [RTL-137](../validation/RTL-137.md) records all six passing settled gates (634/634 unit tests), final read-only review and the owner's explicit staging/commit approval. This supersedes the earlier deferred-check/no-commit packaging state below; dated observations and external/physical limitations remain.

16 October 2026. Status: **Implemented; final batch validation pending.** The owner finds the send icon/control too large and the scrollbar on its left awkward. The smaller control now sits below the full-width typing area at the right edge. [Quick evidence](../validation/RTL-130.md) records actual desktop/phone/short observations, the corrected short-screen clipping and settled source review. Automated gates remain deferred by owner instruction.

Acceptance:

1. Use a smaller 16px send/cancel icon with a 32px visible lime button, retaining a clear 44px interactive target and accessible names/states.
2. Replace RTL-127's full-height side lane with a compact bottom action space inside the same textbox border. Let the textarea span the full width so its native scrollbar/resize handle are at the right edge above the send target, with no overlap. Keep an initially compact two-line field and vertical resizing.
3. Preserve the pinned composer, header collapse, draft/counter, 2,000-character bound, send/cancel authority, keyboard/IME/repeat handling, live sharing note, focus and motion. A cramped 390×390 observation requires the short/narrow panel to use its existing viewport limit, preserving readable message space without clipping the composer. No new state or controller/viewport change.
4. Quick actual desktop/phone/short visual observations, including overflowing text and draft retention. Automated gates remain deferred under the owner's edit-batch instruction. Preserve all prior work; no staging, commit, delegation, paid/provider/cloud action or publication.

Precision: [allocation](../commit-plans/RTL-130.md), RTL-127 implementation/evidence, current ConversationComposer and scoped styles, installed Next CSS Modules guidance and root/frontend instructions. This owner revision supersedes RTL-127's side-by-side scrollbar/button layout while retaining non-overlap and touch access.
