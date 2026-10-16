# RTL-134 — clearer dashboard names and graph point values

**Final batch update — 16 October 2026:** [RTL-137](../validation/RTL-137.md) records all six passing settled gates (634/634 unit tests), final read-only review and the owner's explicit staging/commit approval. This supersedes the earlier deferred-check/no-commit packaging state below; dated observations and external/physical limitations remain.

16 October 2026. Status: **Implemented; final batch validation pending.** The owner accepts “Net sales” and “Operating profit” and adds that hovering the graph should show each point's value. Shared labels and the actual trend tooltip are implemented. [Actual desktop/phone observations and settled source review](../validation/RTL-134.md) cover both series, zero/negative values, keyboard focus, Escape, pointer leave, pin/evidence and edge bounds. Automated gates remain deferred under the owner's edit-batch instruction.

Acceptance:

1. Use Net sales and Operating profit for the corresponding trend choices, accessible chart description, dashboard cards/evidence and connected presentation labels. Keep the explanation that profit is simulated, and preserve exact internal fact/series IDs and financial rules.
2. Hovering any daily observation column in the graph reveals a nearby readable UTC date, selected metric and exact registered value. Highlight the corresponding existing point; clear hover on leave and allow Escape dismissal. No invented interpolation, separate dataset or native tooltip delay.
3. Keyboard focus on the existing day controls provides the same information; touch/click pinning, evidence actions, exact tables, negative/zero/unavailable behavior and designed motion remain. Keep tooltip text within the chart at its first/last points and phone widths. No new dependency, session state owner or provider/network work.
4. Perform quick actual changed-path desktop/phone observations and a settled read-only source review. Record pending automated/physical/assistive-technology checks accurately. Preserve earlier pending edits, no staging/commit/delegation/publication.

Precision: [allocation](../commit-plans/RTL-134.md), existing chart/model/fact authority and [dashboard engineering](../engineering/DASHBOARD.md), RTL-023 preservation dispositions and installed Next client/CSS Modules guidance. Earlier evidence tickets remain historical; this revision changes their visible names without changing amounts.
