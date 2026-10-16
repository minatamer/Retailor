# RTL-115 — current landing FAQ copy and exclusive answers

**Final batch update — 16 October 2026:** [RTL-137](../validation/RTL-137.md) records all six passing settled gates (634/634 unit tests), final read-only review and the owner's explicit staging/commit approval. This supersedes the earlier deferred-check/no-commit packaging state below; dated observations and external/physical limitations remain.

16 October 2026. Status: **Locally implemented and reviewed.** The owner requests correction of the landing FAQ because the different business scenarios are no longer offered, then adds that expanding a question must collapse the other answers. [Validation](../validation/RTL-115.md) records actual desktop/phone pointer and keyboard checks, all six passing gates and 632/632 tests. Settled read-only review finds no actionable issues; current external/physical/owner acceptance remains pending. Nothing staged or committed. The previous personalization redesign remains a proposal awaiting selection.

Acceptance:

1. Remove the healthy-profit, near-break-even and heavy-loss scenario claim from the “Are the sales and orders real?” answer. Explain fictional demo activity connected to the visitor's catalogue, stock and dashboard.
2. Correct the same answer's obsolete no-payment-connection claim to match existing sandbox checkout: test payments, no real charges or shipments. No external checkout request is needed for this copy change.
3. Replace the nearby three-profit-and-loss-stories feature bullet with an accurate connected-record benefit. Preserve FAQ questions, layout, motion and the rest of the landing/demo.
4. Keep at most one FAQ answer expanded. Opening another answer closes the current one; toggling the open question can still close all answers. Retain native keyboard/focus semantics without introducing a client state owner.
5. Verify the actual updated FAQ and nearby bullet at desktop and phone widths, including pointer/keyboard exclusive opening and closing. Run the six applicable repository gates and a settled read-only review; record actual evidence and external limits.
6. Subsequent owner follow-up: the closing landing line must read exactly “No signup. No real payments. Try it out now.” Preserve all previous FAQ changes; verify the current closing copy in the browser.

Precision: [allocation](../commit-plans/RTL-115.md), [current checkout behavior](../operations/CHECKOUT-STORAGE.md#enable-locally), `apps/frontend/src/features/landing/landing.tsx`, root/frontend instructions and the owner's current screenshot and follow-up request. No scenario runtime removal, personalization redesign, provider/configuration/security change, staging, commit, delegation or external action.
