# RTL-136 — compact dashboard chart columns and grouped indicators

**Final batch update — 16 October 2026:** [RTL-137](../validation/RTL-137.md) records all six passing settled gates (634/634 unit tests), final read-only review and the owner's explicit staging/commit approval. This supersedes the earlier deferred-check/no-commit packaging state below; dated observations and external/physical limitations remain.

16 October 2026. Status: **Implemented; final batch validation pending.** The owner requests Pinterest-style flow for the cards below the main trend, removing large unused spaces, while keeping the five margin/rate/rating cards in the supplied screenshot together. Independent chart columns, one responsive Store health group and bounded long-table scrolling are implemented. [Actual changed-path observations and settled source review](../validation/RTL-136.md) cover desktop/tablet/phone spacing, wrapping, full table access and evidence/focus. Automated gates remain deferred under the owner's edit-batch instruction.

Acceptance:

1. Replace shared-height chart rows with two independent vertical card columns. Cards retain natural content height, compact consistent gutters and intact contents; narrower layouts become one column. Preserve all eight chart questions, real marks, exact tables, hover/focus/pin/evidence actions, stable component identity across data/width changes and designed motion. No masonry dependency or geometry measurement loop.
2. Keep the five secondary metrics together in one full-width Store health card, outside the independent columns. Use wrapping/growing metric tiles so five items do not leave an empty grid cell. Preserve labels, exact values/bases/unavailable reasons and each evidence action; no green whole-card backgrounds.
3. Review actual collapsed and expanded cards, both columns and the grouped metrics at desktop and narrower widths. Check page overflow, card adjacency, end-of-column gaps, focus and evidence; fix substantive dead space rather than stretching cards to hide it. Long exact tables use a bounded internal scroll area with all rows/focus/actions retained. Record limits honestly; normal gutters/readable padding remain.
4. Preserve all earlier pending work and the owner's deferred automated-gate instruction. Complete a settled read-only source review. No domain/controller/contracts/provider/config/log/dependency changes, delegation, staging/commit or external action.

Precision: [allocation](../commit-plans/RTL-136.md), current overview/chart markup and CSS, RTL-133–135 interaction preservation and installed Next client/CSS Modules guidance.
