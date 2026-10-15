# RTL-094 — control store currency from the dashboard

Status: **Implemented and locally validated. Existing strict Linux source-proof failure/external acceptance remain pending.**

15 October 2026 owner feedback removes the storefront's “Prices are shown in EUR” message, USD/EUR toggle and circular currency-info button. The dashboard must control the store currency instead.

Acceptance:

1. No currency toggle, redundant success message or currency-info CTA in the storefront navbar on any page/template.
2. A clear dashboard setting actually updates the existing shared storefront/bag/checkout display scope, persists through returning/reloading and supports USD/EUR with current FX freshness/failure behavior.
3. Remove the obsolete info/modal UI and unused branch/styles only after checking consumers. Retain meaningful error/loading/price-filter-reset feedback in the dashboard and honest reference information.
4. Dashboard recorded amounts and existing receipt scopes stay in their existing exact monetary authority; no new currency preference owner or hidden conversion rules.
5. Meaningful regression and actual laptop/phone dashboard/store checks, settled read-only review and six repository gates; preserve other unstaged work. No staging, commits, delegation, paid or cloud action.

Precision references: [allocation](../commit-plans/RTL-094.md), [shopping/currency rules](../engineering/SHOPPING.md), existing `features/currency` / session controller and `OwnerWorkspace` Personalize view. Latest owner UI placement request supersedes historical shopper-toggle placement.

[Actual validation](../validation/RTL-094.md): dashboard changes in both directions, Euro store/bag values and reload persistence, all three accepted-store page headers clean, laptop/phone settings, 16 focused tests and 589/590 full units. Five code/build gates pass; sole unit failure is the retained prior Linux-source mismatch. Current source fingerprint requires fresh Linux/image/scanner acceptance. Existing checkout/title work remains preserved and unstaged.
