# RTL-091 — prepare private checkout photos and local ADC

Status: **Provisioned; CLI and owner-completed ADC object access verified.**

15 October 2026. The owner authorizes use of existing gcloud authentication to create the private bucket in their new Retailor project, prepare access, then provide the Application Default Credentials login command. Application implementation follows successful owner ADC authentication and verified bucket access. User-uploaded clothing photos remain mandatory; sample-only acceptance is insufficient.

## Exact preparation scope

- Project `retailor-511714`; bucket `retailor-511714-checkout-photos` in `europe-west1`.
- Uniform bucket-level access and public access prevention. Dedicated temporary-photo cleanup, no retained soft-deleted copies.
- Dedicated storage identity, bucket-scoped object access and owner impersonation; enable required IAM APIs, no persistent service-account key or public bucket.
- Verify the intended identity can create/read/delete a synthetic object and produce a working temporary signed read link. Verify anonymous unsigned access is denied.
- Give the owner the explicit ADC command. Do not claim gcloud CLI credentials are ADC or overwrite their current ADC automatically.

## References and completion boundary

[Allocation](../commit-plans/RTL-091.md), [operations and owner auth instructions](../operations/CHECKOUT-STORAGE.md), [actual validation](../validation/RTL-091.md), [Stripe/upload plan](../engineering/STRIPE-SANDBOX-CHECKOUT-PLAN.md).

No deployment, unrelated cloud resources, Stripe requests or application implementation are included in this initial preparation step. After owner login, verify through ADC before starting the separately allocated application change. Existing security/origin/session/money controls and external release limitations remain in force.

The owner completed the impersonated ADC login and explicitly instructed implementation to proceed with the app-local Stripe sandbox key. Actual ADC upload/read/delete passed; the setup prerequisite is complete. Application work follows under its own file allocation, not this provisioning packet.
