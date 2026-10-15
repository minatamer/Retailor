# RTL-076 — promo-code entry for 10% off

15 October 2026 owner screenshot/request: replace the cart's demo-discount checkbox with a promo-code entry. Its grey placeholder should suggest a working code that gives 10% off.

Acceptance: show labelled Promo code input with grey “Try THREAD10” placeholder and Apply action. Only the suggested code, accepting case/outer whitespace differences, applies a single 10% merchandise discount; delivery/tax remain unchanged. Show helpful invalid/applied feedback and Remove. Calculate from the actual current item subtotal, rounding once to a USD cent using existing exact helpers; USD/EUR display and review/receipt reconcile. Editing quantities/prices updates savings before review. Existing revalidation and atomic order authority remain. Promo form state is ephemeral and does not leak across reset/scenario/new orders. Keep RTL-075's removed success message absent. Verify native desktop/phone/error/remove/quantity/currency/checkout and meaningful amount/placement tests, six settled gates and complete read-only review. No staging/commit or external action.

References: exact owner screenshot, [allocation](../commit-plans/RTL-076.md), [shopping behavior](../engineering/SHOPPING.md), RTL-010/048 checkout/quote authority and root/frontend instructions.

Status: implemented and locally reviewed. [Actual validation](../validation/RTL-076.md): native grey placeholder, invalid/Enter/Apply/Remove, quantity updates, desktop/320px, EUR checkout/receipt and new-purchase reset verified. Focused 14/14 and five root code/build gates pass; 511/512 units retain only the existing source-proof failure. Current physical/live/owner/external acceptance remains pending. Nothing staged or committed.
