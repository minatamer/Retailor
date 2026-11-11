# RTL-181 — Animate dashboard period totals

11 November 2026. Owner requests high-quality numeric increases/decreases when switching Last 7 days, Last 28 days and All activity, plus small **Simulated data** text on the right of the period-toggle row. Preserve the existing63 changed paths, empty index and HEAD `e44423059932d7c6b9584381e529fa36aa92e78e`. No delegation, new ports, providers, credentials, deployment or Git staging/commit.

## Acceptance

1. Smoothly interpolate dashboard overview headline, operation, health, comparison and ranked-summary values between registered totals. Preserve integer counts, cents, percentage/rating formatting, negative values and exact final displays. Initial mount shows actual values immediately; unavailable values must not become fabricated zeroes.
2. Use a fixed bounded800ms eased frame timeline. Rapid period reversal continues from the last displayed value; cancellation/unmount fences late callbacks. Unchanged totals do not animate needlessly. Keep tabular numbers, no per-frame session/graph changes, no dependency or motion-disable/OS-suppression setting.
3. Accessible content immediately describes the exact selected-period total; visual intermediate numbers are hidden from assistive technology. Exact data tables, tooltips, evidence and all commerce calculations remain authoritative and immediate. Preserve keyboard period toggles and drill-down behavior.
4. Add subtle `Simulated data` text at the right of the period-toggle row. Keep it on the same row at narrow widths without horizontal overflow or cramped targets, using the existing design tokens.
5. Meaningful timeline/direction/replacement/cancellation tests, actual Codex in-app browser desktop/phone observations of intermediate values in both directions, rapid toggling, unavailable/zero where available, keyboard/evidence checks, all six repository gates and a settled read-only validation pass. Record actual evidence and limitations.

Precision: root/frontend AGENTS.md; current overview/charts/model/CSS; pure commerce facts and `factDisplay`; current Next `use-client` guide; RTL-180 motion-preservation rule. No financial/domain authority moves into the presentation layer. Existing Shopify/motion WIP stays unchanged.

Status: implemented and locally validated. Actual normal-demo in-app desktop/phone traces show intermediate increases/decreases, rapid reversal, exact evidence/accessible values, unchanged All activity totals, navigation/restore and single-row label fit down to320px. All six gates pass,876/876 tests across126 files and both builds. Settled read-only review has no actionable findings. [Actual evidence](../validation/RTL-181.md). Nothing staged or committed; current Linux/image/hosted acceptance remains separate.
