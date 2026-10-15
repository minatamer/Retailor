# RTL-075 — remove the cart add-success sentence

15 October 2026 owner screenshot/request: remove “Added to your bag.” in the cart.

Acceptance: successful Add to bag opens the actual bag with the selected item and quantity, without that redundant sentence or an empty notice row. Clear previous transient notices on success. Preserve actionable quantity/availability errors, normal quantity/removal notices, checkout review and receipt messages, exact commerce and focus/motion behavior. Verify existing shopping regressions and actual desktop/phone cart rendering; record the six settled gates and read-only review. Preserve prior pending work; no staging/commit or external action.

References: exact owner screenshot, [allocation](../commit-plans/RTL-075.md), [shopping behavior](../engineering/SHOPPING.md), existing RTL-010/048 cart implementation and root/frontend rules.

Status: implemented and locally reviewed. [Actual validation](../validation/RTL-075.md): native desktop/320px cart, exact selected quantity/totals, retained limit warning and successful recovery verified. Five root code/build gates pass; 506/507 units retain only the existing source-proof failure. Current physical/live/owner/external acceptance remains pending. Nothing staged or committed.
