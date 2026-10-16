# RTL-122 — immediate tour welcome

**Final batch update — 16 October 2026:** [RTL-137](../validation/RTL-137.md) records all six passing settled gates (634/634 unit tests), final read-only review and the owner's explicit staging/commit approval. This supersedes the earlier deferred-check/no-commit packaging state below; dated observations and external/physical limitations remain.

16 October 2026. Status: **Implemented; final automated batch and owner acceptance pending.** The owner likes the welcome but finds it too late: show it once the page loads with no other buffers.

Acceptance:

1. Render the eligible welcome directly when its page/tour mounts. Remove the image/font/document/layout polling and extra 1,000ms welcome pause; do not replace them with another timer, readiness gate or loading buffer.
2. Preserve the welcome's current appearance, short entrance animation, Start/Skip, first-run/replay policy, keyboard/focus/cleanup and session-owned navigation. Keep the guided steps' separate target/scroll placement safety and transition behavior after Start.
3. Prove the removed readiness helper has no remaining runtime consumer before deleting it and its obsolete delay-specific tests. Keep the existing controller/tour/geometry regressions for the final batch. Preserve all earlier pending edits.
4. Perform a quick actual welcome/source review and defer automated checks to the end of the edit batch under current owner direction, except targeted runs for discovered errors. No staging, commit, delegation, provider/paid/cloud action or publication.

Precision: [allocation](../commit-plans/RTL-122.md), RTL-107 ticket/allocation/validation (its old welcome-wait requirement is superseded), current TourGuide/readiness/styles/controller call sites, installed Next client guidance and root/frontend preservation rules.

[Quick actual evidence](../validation/RTL-122.md): the normal Personalize store action's first resulting UI observation includes the welcome and focuses Start tour. Desktop/phone visuals retain the existing presentation. Source review confirms no welcome readiness/timer gate or leftover helper import; automated gates remain deferred. Earlier pending work remains preserved and uncommitted.
