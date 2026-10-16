# RTL-131 — dismiss cart from its backdrop

**Final batch update — 16 October 2026:** [RTL-137](../validation/RTL-137.md) records all six passing settled gates (634/634 unit tests), final read-only review and the owner's explicit staging/commit approval. This supersedes the earlier deferred-check/no-commit packaging state below; dated observations and external/physical limitations remain.

16 October 2026. Status: **Implemented; final batch validation pending.** The owner requests clicking the shaded area outside the cart dialog to dismiss it. [Quick evidence](../validation/RTL-131.md) records actual desktop/phone outside dismissal, inside controls/drag guards, retained cart contents, Escape and focus restoration. Automated gates remain deferred under the owner's edit-batch instruction.

Acceptance:

1. A primary left/touch click that starts and ends outside the dialog bounds dismisses the bag through the existing controller.closeBag path. Inside content, blank dialog space and controls do not dismiss it; an inside-to-outside drag or cancelled pointer gesture does not count as a backdrop click.
2. Preserve cart contents, close/Escape behavior, designed exit animation, native modal containment, focus restoration, checkout cancellation/revision fences and current bag/review/receipt states. No new cart/session authority, global listener, paid/provider dispatch, schema or financial rule.
3. Perform quick actual desktop/phone bag observations for outside dismissal, inside clicks, retained contents, Escape/reopening and opener focus. Automated gates remain deferred under the owner's edit-batch instruction. Preserve prior changes; no staging, commit, delegation, paid/cloud action or publication.

Precision: [allocation](../commit-plans/RTL-131.md), existing FilterSheet primary pointer/bounds pattern, BagDialog lifecycle and closeBag cancellation authority, installed Next client guide, SHOPPING-REVISION preservation notes and applicable RTL-023 cancellation/cleanup boundaries.
