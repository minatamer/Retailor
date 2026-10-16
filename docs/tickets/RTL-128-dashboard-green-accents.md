# RTL-128 — dashboard green controls and accents

**Final batch update — 16 October 2026:** [RTL-137](../validation/RTL-137.md) records all six passing settled gates (634/634 unit tests), final read-only review and the owner's explicit staging/commit approval. This supersedes the earlier deferred-check/no-commit packaging state below; dated observations and external/physical limitations remain.

16 October 2026. Status: **Implemented; final batch validation pending.** The owner likes the green active navigation treatment and requests more green within dashboard content, specifically selected timeframe tabs and similar controls, without green card backgrounds. [Quick evidence](../validation/RTL-128.md) records the actual visual/interaction observations and settled source review; automated gates remain deferred by owner instruction.

Acceptance:

1. Use the existing lime/navy palette for selected dashboard timeframe and chart-series controls. Keep unselected controls legible and hover/focus/selected states distinct.
2. Carry green into small KPI/chart action accents, pinned day/row selection and the chart evidence action. Keep whole KPI/chart/tooltip/row card surfaces navy or white, preserving the alternating KPI treatment. Keep negative chart semantics and all canonical values unchanged.
3. Scope styling to the existing dashboard CSS module; preserve controller handlers, aria states, touch targets, focus, responsive layout and motion. No new state, dependencies, tokens, logs, provider or security change.
4. Perform quick actual desktop/phone visual and switching/selection observations. Defer automated gates to the owner's end-of-edit-batch pass. Preserve earlier uncommitted work; no staging, commit, delegation, paid/cloud/provider action or publication.

Precision: [allocation](../commit-plans/RTL-128.md), `owner-navigation.module.css` active-page treatment, `dashboard.module.css` and its Overview/ChartPanel/SalesTrend/RankedBars consumers, current palette tokens, installed Next CSS Modules guide and root/frontend instructions.
