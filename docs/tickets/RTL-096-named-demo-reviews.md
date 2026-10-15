# RTL-096 — multiple fictional reviews with names

Status: **Implemented and locally validated. Existing strict Linux source-proof failure/external acceptance remain pending.**

Owner screenshot shows one anonymous product review. Request: multiple fake reviews for each garment with fake names.

Acceptance:

1. Every active garment in a fresh processed demo catalogue gets at least three varied fictional feedback records, including uploaded garments and all seeded scenarios. Keep the 60-record bound, actual product linkage, integer individual ratings and fractional means; never invent purchases or fit/material confirmation.
2. Existing seeded demo saves gain missing names/reviews idempotently without resetting the catalogue, look, orders, stock or lifetime. Preserve existing reviews and record IDs/order links, safe graph revision fencing and pending hosted checkout recovery; defer seed completion while a Stripe checkout or reversible Undo is pending. Crowded historical saves retain existing records and the hard cap rather than dropping history or silently expanding limits.
3. Product reviews and dashboard Feedback display the same fictional names. Keep explicit demo provenance, product isolation, actual count/average/date/stars, responsive merchant styling and native disclosure/keyboard behavior. Non-scenario/illustration empty data stays empty.
4. Meaningful generation/cap/restoration regressions, actual laptop/phone and template checks, clean settled read-only review and all six repository gates. Preserve earlier unstaged changes; no stage/commit/delegation/external action.

Precision: [file allocation](../commit-plans/RTL-096.md), [existing product-review behavior](RTL-085-product-reviews.md), existing `FeedbackSchema`, `generateScenario`, `restoreProjection` and shared ProductReviews/owner Feedback. Latest owner instruction reopens RTL-085's earlier prohibition on new seed/reviewer fields; other controls remain.

[Actual validation](../validation/RTL-096.md): three named reviews on sample jeans and previously unrated Swim Shorts; all three templates at laptop/phone; matching dashboard authors/45 reviews across15 garments; actual ten-review disclosure. Old-save completion, uploaded catalogue coverage,60-record cap and checkout/Undo fences pass focused tests. Settled read-only review has no actionable findings;16 focused tests and five code/build gates pass, with599/600 full units retaining only the prior strict source-proof mismatch. Earlier work preserved and unstaged; no external actions.
