# RTL-127 — pinned compact Tailor composer

**Final batch update — 16 October 2026:** [RTL-137](../validation/RTL-137.md) records all six passing settled gates (634/634 unit tests), final read-only review and the owner's explicit staging/commit approval. This supersedes the earlier deferred-check/no-commit packaging state below; dated observations and external/physical limitations remain.

16 October 2026. Status: **Implemented; final batch validation pending.** The owner requests removing the visible demo/keyboard helper line, moving Send into a small icon button at the textarea's bottom-right and keeping the textbox visible while chat scrolls. Follow-ups separate Send from the scrollbar and remove the footer, relocating collapse to the header. [Quick evidence](../validation/RTL-127.md) records actual desktop/phone/short observations and a settled source review; automated checks remain deferred by owner instruction.

Acceptance:

1. Remove the visible demo/helper line. Keep the Ask Tailor label/counter and non-visible keyboard instructions; preserve Enter, Shift+Enter, IME/repeat and 2,000-character limits.
2. Place a compact, clearly named send icon inside the textarea wrapper, with a 44px touch target. The owner's screenshot follow-up requires a separate internal button lane: the actual textarea scrollbar/resize handle and long text must never overlap the button. Keep disabled/send authority and expose cancellation in the same compact control while busy. Retain the live data-sharing note.
3. Keep the composer outside the scrollable content so messages/setup/owner forms scroll independently. The owner's second follow-up removes the bottom footer and relocates the collapse action to the header beside expand, preserving its name, touch target and launcher focus restoration. Preserve active draft, last-message scrolling, focus/keyboard viewport handling, expand/collapse motion and narrow/short layouts. Use the existing session owner, controller APIs and icons.
4. Perform quick actual desktop/phone/short visual and scroll observations. Defer automated/full functional tests to the end of the owner's edit batch unless an error needs a targeted check. Preserve earlier pending work. No staging, commit, delegation, provider/paid/cloud action or publication.

Precision: [allocation](../commit-plans/RTL-127.md), current ConversationPanel/Tailor styles/shell, RTL-112 overlay requirements, existing send/cancel/keyboard code, installed Next client guidance and root/frontend preservation rules.
