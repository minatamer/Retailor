# RTL-188 — Restore checkout spinner and investigate Stripe failure

11 November 2026. Owner interrupts the authorized commit/push/paid-domain deployment to fix Stripe checkout first. Pause Git/cloud mutations while investigating. Preserve prior WIP and the deployment authorization for after the repair is validated.

## Acceptance

1. Restore the original small spinning ring on both Checkout button states, replacing the shared animated mark. Preserve accessible busy status, disabled action and current merchant colors; retain photo placeholders and other loaders.
2. Reproduce the reported checkout failure in its actual environment. Correlate safe request references/private diagnostics, identify the failing phase and repair the proven cause without weakening payment verification, exact quotes, session/restore/reset identity, storage/photo requirements, idempotency, bounds or cleanup. Configuration/credential/user-only blockers must be stated accurately.
3. Validate real local sandbox opening/cancel/return as permitted, focused failure/recovery tests and applicable settled gates. Never charge real money or claim payment completion from a mock. Record actual evidence and a read-only review before returning to the already authorized commit/push/deploy work.

Precision: root/frontend instructions; RTL-184/187 loading corrections; RTL-092 sandbox plan and CHECKOUT-STORAGE runbook; RTL-023 quality/security dispositions; existing controller/request/provider/storage contracts and tests. Current local public config reports fake AI, paid disabled and sandbox checkout ready; this is configuration availability, not proof of a successful Stripe request.

Status: locally fixed and reviewed. Original spinner restored; old-demo time guard identified and clarified. Actual desktop/phone Stripe sandbox opening/photo/amount delivery and cancel/return pass;36 focused tests and all six root gates pass,895 total tests. [Actual validation](../validation/RTL-188.md). Later owner instruction holds deployment and requests preparation plus order-confirmation feedback first. Nothing staged or committed during this repair.
