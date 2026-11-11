# RTL-190 — Prepare paid and hosted Shopify deployment, without deploying

11 November 2026. Owner requests hosted Shopify in the eventual paid-mode release, explicitly says **do not deploy now**, and requests preparation plus the accompanying feedback. RTL-188/189 implement the checkout/confirmation corrections. Earlier file-level staging/commits/push authorization remains; this ticket permits read-only cloud/account/source research and local preparation only.

## Acceptance

1. Record actual existing project/region/services/domain/paid settings, preserving current runtime and the exact domain. Distinguish read-only configuration from actual provider/first-request readiness.
2. Provide one concrete guide with the Shopify Dev Dashboard fields, public Client ID versus server-only secrets, local/production separation, minimal durable state/cleanup, actual code/packaging gaps, bounded costs and ordered future verification/cutover. Preserve the temporary frontend demo and the credential-free visitor CTA.
3. Reconcile the new intention with the existing production refusal without silently enabling or weakening it now. Keep separate-store eligibility honest and defer app review/account mutation. Create a scoped executable follow-up for the remaining work.
4. Record verification and remaining gates. No deployment, registry push, API enablement, secret access/upload, IAM/DNS/bucket/schedule mutation, new live listener or actual Shopify setting change.

Precision: current root instructions, RELEASE/RELEASE-STATUS and RTL-154/155 evidence, SHOPIFY-RESOURCES, current app factory/cleanup CLI and fixed routes, current official Shopify app-configuration/hosting and Google billing/Scheduler guidance. Latest owner direction outranks earlier deployment authorization.

Status: **Complete — readiness packet only.** [Actual validation](../validation/RTL-190.md) records existing service/domain/paid observations, the unresolved first-config timeout, corrected Docker-context proof and clean read-only review. RTL-191 remains planned; deployment and cloud/Shopify mutations remain held.
