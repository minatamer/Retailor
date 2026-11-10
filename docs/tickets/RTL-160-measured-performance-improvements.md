# RTL-160 — apply focused fixes with comparable mobile evidence

Status: **Planned — awaiting owner review and later execution instruction.**\
Planning date: **19 October 2026**\
Depends on: RTL-157 measurements; RTL-158/159 required local behavior verified\
External GA4 receipt is a separate pending check if owner access is unavailable

## Outcome and entry conditions

Select a small set of fixes from measured bottlenecks, preserve the existing designs/motion/shopping, and report comparable production-build before/after evidence. Do not commit to a score, ranking, conversion gain or speculative percentage. Read [the complete measurement protocol and candidate table](../engineering/DEMO-IMPROVEMENTS-PLAN.md#3-measure-first-then-make-focused-performance-changes), RTL-157 reports and current RTL-158/159 validation. Create a measured file-level allocation in `docs/commit-plans/RTL-160.md` before edits.

## Scope selected by evidence

Potential owners are existing hero media/render script, `FontPreloads`/font CSS, storefront image selection/dimensions, real feature-loading boundaries and the specific traced interaction path. These are candidates, not a mandate to edit every area. No new infrastructure, image CDN, animation-off mode, generic memoization framework, session-owner split, dependency sweep or deletion based on line count. Preserve RTL-040 refresh font stability, optional logos, tours, typed filters, photo availability, exact money, connected owner/shopper views and all private diagnostics.

## Acceptance criteria and meaningful verification

1. Re-baseline the current routed/analytics build immediately before optimization using RTL-157's exact browser/tool/throttle/profile/viewport/fixture conditions. Preserve the original pre-feature baseline separately. Identify each changed input; build hash and fixture state must be known.
2. Choose each fix from an actual LCP/network/coverage/decoder/long-task/layout-shift finding. Record its targeted byte/timing/work cause, smallest file change and plausible tradeoff before implementation. If current data does not support a gain, gather better evidence or omit the candidate.
3. Use five comparable cold mobile navigation runs per route and matched interaction traces after changes, including landing, empty demo, controlled populated paths where available, and consent-rejected/accepted cases. Report medians/ranges and resource bytes/request counts beside the before values; distinguish controlled local tag sinks from actual Google network results.
4. Keep only demonstrated improvements without meaningful regression across measured routes/interactions. Treat changes inside normal run variation as inconclusive. Record unchanged/regressed results honestly and revert unjustified edits. If no candidate yields a useful improvement, report that evidence rather than invent a patch.
5. Check real changed-path design/motion at320/390px, tablet and desktop: film autoplay/loop/composition, font refresh/selection, responsive images and stable geometry, navigation/focus/touch, Tailor/tours, bag/checkout and owner charts. Preserve loading/error/cleanup and photo/cache/late-response bounds. A lower score caused by suppressed content or motion is not acceptance.
6. Re-run focused behavior tests for actually changed functional boundaries, all six settled root gates and a settled full-ticket read-only review. No extra tests that merely mirror a preload declaration or class name.
7. `docs/validation/RTL-160.md` records actual commands/environment, exact build identities, sanitized before/after tables, trace findings and regression decisions. Raw reports stay ignored/local. TBT/interaction traces are lab evidence, not actual visitor INP; CrUX field data can remain unavailable. No unsupported visitor-performance, SEO-ranking or conversion claim.

## Handoff boundaries

Refresh applicable raw-byte LF/fingerprint/Linux/image/scanner evidence after base/app/media/build changes before a later release. Reuse no same-build visual acceptance after app inputs change. Owner/provider/physical/hosted checks require actual separate evidence and authorization; no public deployment or paid call is implied. Missing Google receipt must not become an excuse to skip local blocked/consent and controlled tag-cost comparisons. No staging/commit, push or release is authorized by this planning packet.
