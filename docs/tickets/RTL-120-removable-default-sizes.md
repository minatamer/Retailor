# RTL-120 — remove default sizes while keeping each colour

**Final batch update — 16 October 2026:** [RTL-137](../validation/RTL-137.md) records all six passing settled gates (634/634 unit tests), final read-only review and the owner's explicit staging/commit approval. This supersedes the earlier deferred-check/no-commit packaging state below; dated observations and external/physical limitations remain.

16 October 2026. Status: **Implemented; final batch validation deferred by the owner.** The owner requests removal of default sizes, with at least one size remaining for each colour option; hide Remove size when that minimum is reached.

Latest owner steering during execution: skip repeated tests while making edits, run them once at the end of the edit batch and fix resulting errors; targeted tests may run sooner when an error is found. This supersedes the per-edit gate schedule below. The running full unit suite was stopped and its queued build did not run. No full-suite result is claimed.

Acceptance:

1. Catalogue review can remove original/default sizes as well as newly added sizes. Show Remove size only when another size remains for that same current colour, using trimmed case-insensitive colour matching. Other colours cannot satisfy the minimum. Keep at least one active size when removing an active row; archived peers do not count as sellable replacements.
2. Apply the same rule and wording to dashboard product forms through the existing session controller. Reject unknown/stale/last-size removals in the action as well as hiding the CTA. Preserve owner role/form/review fences and existing financial history rules: referenced removed options remain archived through the unchanged commerce authority.
3. Removal keeps surviving IDs, raw field edits, photo/colour membership and exact price/cost/stock behavior. Save/Link use canonical validation; Cancel restores uncommitted removals. Add size remains available and bounded by 24/product and 288/draft. Keep clear keyboard focus/status, touch targets and designed motion.
4. Add meaningful helper/parser/controller tests for original-size removal, independent colours/minimum, archived peers, stale actions, persistence/review/history and cancel. Check actual draft and owner desktop/phone/short layouts, hidden final-colour actions and save/cancel/reopen behavior in fake/paid-off mode.
5. Run the six settled gates and complete-ticket read-only review, record actual evidence/limits, preserve earlier pending edits and update status. No staging, commit, delegation, provider/paid/cloud action or publication.

Precision: [allocation](../commit-plans/RTL-120.md), [size behavior](../design/SIZE-OPTIONS.md), RTL-070 ticket/validation, catalogue editor/parser, owner form/controller and unchanged product/commerce history authority, root/frontend/RTL-023 preservation requirements, installed Next client-component guidance and the owner's current request.

[Actual evidence](../validation/RTL-120.md): 49 focused tests passed before the steering; formatting, lint, typecheck and boundaries passed. Actual draft removal/minimum/cancel/save/reopen/add checks and desktop/phone visuals completed. Full unit/build and the remaining owner/responsive checks remain explicitly deferred. Earlier pending work remains preserved and uncommitted.
