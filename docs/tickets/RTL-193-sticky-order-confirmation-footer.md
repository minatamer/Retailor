# RTL-193 — Keep order-confirmation actions visible

11 November 2026. Owner requests a sticky footer in the order-confirmation dialog so neither bottom action requires scrolling through the receipt.

## Acceptance

1. Keep Keep exploring and See it in the dashboard visible at the bottom of the confirmation as soon as it opens and while its receipt scrolls. Reserve footer space rather than obscuring products or totals. Match the existing surface, spacing, border and responsive buttons.
2. Preserve receipt photos, centered animated tick, saved totals, existing action behavior, dialog animation, keyboard focus/close and other bag/checkout layouts.
3. Verify actual long receipt scrolling and footer visibility on desktop, phone and short viewports, including keyboard access, both actions and reopen. Run applicable settled checks and document exact evidence and limits. No payment, provider, infrastructure or deployment change.

Precision: root/frontend instructions, current BagDialog flex/scroll layout and RTL-189 immutable photographed receipt. Reuse the existing native sandbox receipt where available; distinguish controlled fixture checks if needed. No new dependency or tests mirroring static markup.

Status: **Complete, locally validated.** The footer remains visible while the actual saved sandbox receipt scrolls on desktop,390px/320px phone and short landscape layouts. Keyboard scrolling, both actions, focus recovery and reopen pass. All six current-source gates pass,895/895 tests. [Actual evidence and explicit limits](../validation/RTL-193.md). Deployment remains held.
