# RTL-161 — Plan the complete Shopify demo integration

## Status and authority

10 November 2026 · Documentation prepared; validation is recorded in [RTL-161](../validation/RTL-161.md). Owner review and a later execution instruction are required for RTL-162–166. This ticket authorizes no application implementation, Shopify form submission, account mutation, tunnel, cloud provisioning, paid request, staging/commit, push or publication.

## Owner request

Create complete tickets for a real Connect Shopify experience: native authorization without visitor API keys, product reads/writes/deletion, disconnect and removal of the demo's products after the session. Add optional Connect/Skip during onboarding before showing the storefront, and a dashboard Connections tab. Inspect Choreograph's HubSpot approach. Include a reminder to update GitHub, README and portfolio descriptions after verified delivery so the owner can demonstrate Shopify experience when applying for work. The owner will finish the Shopify app form later.

## Precision references

- [Shopify integration plan](../engineering/SHOPIFY-DEMO-INTEGRATION-PLAN.md), including current first-party sources and Choreograph evidence.
- [Current blueprint](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md), [lifecycle](../engineering/LIFECYCLE.md), [checkout storage](../operations/CHECKOUT-STORAGE.md), [RTL-023 security dispositions](../audits/RTL-023-SECURITY.md) and [RTL-143 security audit](../audits/RTL-143-SECURITY.md).
- [File allocation](../commit-plans/RTL-161.md); [separate existing RTL-156 packet](RTL-156-plan-demo-improvements.md).

## Deliverable

One central scope/architecture/research plan and five dependency-ordered implementation tickets: [RTL-162](RTL-162-shopify-auth-and-durable-connections.md), [RTL-163](RTL-163-shopify-products-and-owned-exports.md), [RTL-164](RTL-164-shopify-cleanup-and-session-lifecycle.md), [RTL-165](RTL-165-shopify-onboarding-and-connections.md), [RTL-166](RTL-166-shopify-verification-and-portfolio-handoff.md). Each owns concrete behavior, source boundaries, acceptance, failure cases, evidence and external prerequisites. Update the documentation indexes/blueprint without erasing pending work.

## Acceptance and scope checks

- Retailor is described as a standalone web app and temporary frontend storefront; no mobile app, theme publishing or visitor key-pasting flow is proposed.
- Optional onboarding and later dashboard management are both covered, including denial/skip/reconnect, explicit product sharing and safe callback resume.
- Read/create/update/delete are concrete GraphQL product operations with photos/options/variants/currency, exact ownership, duplicate/unknown-result handling and no mutation of existing merchant products.
- Durable cleanup survives browser closure/restart, precedes uninstall/revocation and honestly reports the access-loss limitation. The tiny integration ledger is an explicit addition to the prior browser-only baseline.
- The unproven outside-organization/no-review installation assumption is visible as a distribution gate; own-store development is independently implementable.
- Security/admission/origin controls, finite limits, fake/live separation, native evidence and later operations setup are included. Existing Stripe, photo, commerce, motion and session behavior remain requirements.
- Choreograph inspiration identifies inspected source and its native-evidence limits, rather than inheriting its acceptance or infrastructure.
- Final delivery includes the README/GitHub/portfolio reminder with claims tied to actual evidence.

## Validation

Format allocated Markdown, check relative links/whitespace and perform a settled read-only review against all acceptance points. Record actual commands and findings in the validation document. This is not an application diff; no browser, Shopify API, native OAuth, cleanup worker, Linux build, hosted acceptance or six-gate source validation is claimed by this ticket. No runtime behavior is delivered.
