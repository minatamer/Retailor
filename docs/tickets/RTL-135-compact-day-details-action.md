# RTL-135 — remove the redundant trend information box

**Final batch update — 16 October 2026:** [RTL-137](../validation/RTL-137.md) records all six passing settled gates (634/634 unit tests), final read-only review and the owner's explicit staging/commit approval. This supersedes the earlier deferred-check/no-commit packaging state below; dated observations and external/physical limitations remain.

16 October 2026. Status: **Implemented; final batch validation pending.** The owner requests removing the extra date/value/instructions box below the trend now that graph hover exposes values, while keeping a way to open the day's details. Replaced the duplicate box with a compact dated action tied to the controller's selected day. [Actual observations and settled source review](../validation/RTL-135.md) cover desktop/phone, selection, series, details and period fallback. Automated gates remain deferred under the owner's edit-batch instruction.

Acceptance:

1. Remove only the trend's duplicate information box. Retain the hover tooltip, exact day controls/table, availability notices, selected series and designed motion; other ranked-chart detail boxes remain.
2. Offer a compact green day-details action with its UTC date clearly named. Clicking a graph point or day selects it through the existing controller pin path. The action follows that selected day, so crossing other hover columns on the way to it cannot change its destination. Resolve the selected target from current marks after period/series changes, with the existing latest-day fallback, and call existing evidence navigation.
3. Keep keyboard and narrow-phone access. Perform quick actual desktop/phone target/appearance observations and a complete settled read-only source review. Automated gates stay deferred under the owner's edit-batch instruction. Preserve earlier work; no staging, commits, delegation or external actions.

Precision: [allocation](../commit-plans/RTL-135.md), current SalesTrend/current registered marks/controller evidence path, RTL-134 hover interaction and installed Next client/CSS Modules guidance.
