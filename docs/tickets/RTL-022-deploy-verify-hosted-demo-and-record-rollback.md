# RTL-022 — Deploy, verify the hosted demo and record rollback

Status: **Planned — not started**\
Planning date: **11 October 2026**\
Milestone: **Hosted release**\
Depends on: [RTL-020](RTL-020-evaluate-live-ai-and-audit-release-acceptance.md), [RTL-021](RTL-021-package-linux-services-and-manual-release-runbook.md)\
Blocks directly: None; closes the hosted-release queue\
Suggested commit: `RTL-022: deploy, verify the hosted demo and record rollback`\
Parent authority: [Retailor blueprint](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md)\
Queue and execution rules: [Ticket index](README.md)

## Outcome and standalone context

Publish and verify the accepted Retailor demo using the exact reviewed two-service release candidate. This is the final hosted acceptance packet, not permission to implement or deploy during ticket creation. It depends on the real live catalogue/Tailor acceptance verdict from RTL-020 and the Linux images, asset inventory, private bridge and manual rollback plan from RTL-021. Local fixtures, pending provider credentials and a promising Dockerfile are insufficient evidence for a public release.

The deployed flow must still start with clothing photos, perform fresh live recognition for sample and upload generation, guide styling through Tailor, expose three complete storefront families and keep the shopper and owner dashboard connected to one browser session. Optional logos and EUR have individually verified capability/fallback behavior. Public frontend invocation is expected; direct backend invocation remains IAM-private. Turnstile, exact action grants, provider bounds and cost reservations must be configured on the actual hostname before paid capability is enabled. Prepare the full candidate plan, existing-resource inspection and safe verification commands before requesting any missing external authorization. Review approval against named resources and concrete consequences, without treating ticket planning or access to a cloud CLI as deployment consent.

## Dependency evidence and entry conditions

Require a fixed accepted candidate, actual required live evidence, Linux container acceptance and a usable rollback target or explicit first-release recovery plan. Confirm the authorized cloud project, region, registry, service names, identities, bounded secret versions and owned production hostname. Check current account budget/rate/retention capability with actual evidence; alerts are not hard spend caps. Resolve missing external approval only after the concrete reviewable plan is ready. Never inherit sibling project IDs, permissions, domain ownership or budgets.

Dependency completion means required local behavior, owning contracts and checks actually exist. A planned checkbox or ticket-named commit alone is insufficient. Verified local dependencies may support local follow-on work while separately recorded live, owner-visual or hosted evidence remains pending. Never turn a fake pass into live acceptance.

## Files and responsibility boundaries

| Area | Responsibility owned here |
| --- | --- |
| `docs/operations/` | Exact resource/configuration plan, ordered rollout, smoke checks and rollback record. |
| `scripts/release/` | Reviewed manual commands and bounded verification helpers. |
| `apps/* runtime configuration` | Only evidence-driven configuration corrections; feature changes return to owning checks. |
| `docs/validation/RTL-022.md` | Actual hosted readiness, IAM/origin/admission, visual and live-smoke evidence. |
| `README.md and docs/RETAILOR_DEMO_SOURCE_OF_TRUTH.md` | Verified public URL, active capabilities, operator limits and release status. |

Paths describe future ownership. Create modules/directories only with real behavior; reuse contracts, commands, assets and session state rather than a parallel authority.

## Implementation plan

1. **Resolve and freeze external inputs.** Inspect existing resources and record exact project/region/registry/services/identities/domain configuration without leaking secrets. Confirm permissions and scope for mutations. Produce a deploy plan showing intended changes, images, secret versions, public/private invocation rules, spend settings and rollback. A first release must have a clear unavailable/paid-disabled recovery state even without a prior revision.

2. **Verify release and budget prerequisites.** Check RTL-020 actual evidence and RTL-021 source/image fingerprints match the candidate. Confirm authorized hosted smoke call counts and optional logo inclusion before any paid test. Review provider model access, current retention settings, account limits and budget controls. If safeguards are not verified, keep paid capability unavailable; do not claim process-local counters are durable per-person or monthly caps.

3. **Prepare runtime identity and secrets.** Create/update only the authorized named resources. Bind least-privilege identities and specific Secret Manager versions through platform identity. Grant backend invocation only to the frontend caller and intended operators. Do not grant allUsers on the backend or expose keys/internal endpoint configuration to browsers. Verify the bridge target/audience against the deployed backend URL.

4. **Publish immutable candidate images.** Build/push the accepted images under explicit immutable references, record digests and source snapshot, and keep recoverable previous artifacts. Do not stage/commit/push Git or publish a different dirty source unless the user authorized that exact scope. Confirm public sample assets and self-hosted fonts are in the candidate before moving traffic.

5. **Deploy backend then frontend safely.** Apply the reviewed memory/concurrency/instance/deadline settings and deploy the backend with paid capability initially disabled where needed. Distinguish HTTP slots from the RTL-006 process-wide two-worker/two-waiter image pool and the separate one-workspace/two-process paid gate; local Windows measurements do not prove Linux/hosted peaks. Measure simultaneous maximum bodies, decoding, Base64/model stages and cancellation before changing those limits. Verify health and authenticated bridge readiness, then deploy the public frontend with fixed canonical origin. Configure the authorized Cloudflare DNS/domain and Turnstile allowed hostname only within confirmed ownership. Check HTTPS, forwarded-header handling and same-origin routing before enabling paid features.

6. **Verify hosted boundaries before spend.** Prove direct unauthenticated backend requests fail while the authenticated frontend bridge works. Exercise missing/replayed/wrong-action grants and invalid origin/body/image cases with unpaid or deliberately rejected requests. Check streaming/deadline behavior and logs for content-free metadata. Avoid attack-style request floods or exhausting real credits to demonstrate a limit.

7. **Run a bounded connected live smoke.** Within the specifically authorized plan, submit real sample photo bytes for fresh drafting, review a product, style through chat, shop and create a simulated order. Observe corresponding stock/dashboard facts; exercise a grounded Tailor summary and required-photo owner CRUD. Check actual dated EUR capability. Run optional logos only when included in the authorized smoke budget. Capture timings and usage without storing visitor/provider payloads.

8. **Check production appearance and lifecycle.** Inspect fonts, photos, each template family, a compact/wide viewport, chat cards, charts and actual visible motion. Reuse same-build matrix evidence from RTL-019 and focus hosted observations on risks introduced by production delivery; redo broader coverage if assets/layout differ. Exercise reset/resume/expiry and scenario preservation with a safe controlled session. Public sample failure must show recovery, never a canned storefront.

9. **Exercise recovery and observability.** Verify the paid-disable path and review rollback commands against actual immutable image/config references. If a rollback drill is authorized, execute and verify it within the reviewed scope; otherwise state the unperformed drill separately. Inspect only safe readiness/count/error/usage metadata and measured cost. On an unknown leakage or spend-control failure, disable paid capability and repair before restoring public traffic.

10. **Record the hosted verdict and handoff.** Record the actual HTTPS URL, candidate digests, configuration identities, verified boundaries, smoke outcomes, budget basis, latency findings, rollback readiness and remaining limitations. Update queue/docs only from real evidence. Required hosted failures block Complete; individually unavailable optional capabilities must be described and remain fail-closed. Do not create a recurring monitor or cleanup automation unless the owner separately requests it.

## Acceptance criteria — required local outcome

- [ ] The deployment uses a concrete owner-authorized plan with named resources, owned hostname and verified model/retention/spend prerequisites.
- [ ] The published candidate matches actual live acceptance and Linux image evidence, with immutable digests and source snapshot recorded.
- [ ] Only the frontend is public; direct unauthenticated backend invocation is denied and the fixed platform-authenticated bridge succeeds.
- [ ] Actual canonical origin, Turnstile hostname and single-use action admission are verified before paid capability becomes available.
- [ ] Approved sample/font assets resolve over HTTPS and public generation submits real photo bytes for live recognition.
- [ ] A bounded authorized connected smoke proves shopping/stock/dashboard consistency and grounded Tailor behavior.
- [ ] EUR and optional logos have actual verified capability or individually documented fail-closed/unavailable behavior.
- [ ] Hosted compact/wide appearance, all three template families, visible motion and lifecycle checks are observed and recorded honestly.
- [ ] Paid-disable and immutable rollback/recovery instructions refer to actual artifacts/configuration; unperformed drills remain explicit.
- [ ] Public URL, active capabilities, settled hosted evidence and release limits are reconciled without invented pass claims.

## Focused verification and evidence

| Case | Required observable evidence |
| --- | --- |
| Candidate identity | Actual immutable digests, source fingerprint and accepted local/live evidence refer to the same candidate. |
| Private backend | Direct unauthenticated denial plus successful known-audience frontend service invocation. |
| Canonical public edge | HTTPS, owned hostname, correct Turnstile binding, origin validation and forwarded-header handling. |
| Abuse rejection | Missing/replayed/wrong-operation grants and invalid photos/bodies rejected before any provider charge. |
| Live connected smoke | Real sample drafting, chat styling, shopping order and corresponding current stock/metric facts under an approved bounded budget. |
| Optional capabilities | Actual dated FX quote and optional generated logos where authorized, or documented unavailable fallback. |
| Hosted visual/lifecycle | Real asset/font delivery, three template families, compact/wide motion observations and reset/resume/expiry. |
| Recovery and logging | Safe metadata/usage records, working paid-disable configuration and reviewed immutable rollback target. |

Run meaningful focused tests during iteration. At the settled implementation snapshot run the applicable root gates established by RTL-001: `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm check:boundaries`, `pnpm test:unit` and `pnpm build`. Record actual commands/results and revision. UI acceptance needs real browser observations where available; DOM simulations or animation declarations alone do not prove appearance/movement. Do not add tests that merely mirror CSS or static labels.

## External evidence and scope limits

This packet necessarily includes real cloud mutations and bounded hosted provider operations, but only under the user's later explicit execution/deployment scope and approved operation budget. Complete independent plan/preflight work first. DNS ownership, IAM/Secret Manager access, registry publication and account capability are separate actual prerequisites. Record an automatic approval rejection and its stated reason if execution is blocked; do not invent success or route around a rejected action.

Do not purchase a domain, add paid cloud services, change unrelated IAM/DNS, create storage/queues, issue broad destructive cleanup or start recurring monitoring. Credential possession and planned deployment commands are not mutation authorization. Provider-side retention/deletion and durable spend guarantees must not be promised beyond verified account behavior. Never mark hosted release Complete because the budget ran out or a required check was deferred. Preserve a reviewable unavailable state until failures are resolved.

## Precision references

- [19. Data contracts and API](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#19-data-contracts-and-api)
- [20. Provider integration and evaluation](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#20-provider-integration-and-evaluation)
- [21. Configuration and local operation](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#21-configuration-and-local-operation)
- [22. Security, admission and privacy](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#22-security-admission-and-privacy)
- [23. Resource limits and cost control](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#23-resource-limits-and-cost-control)
- [25. Verification and evidence](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#25-verification-and-evidence)
- [26. Infrastructure, deployment and operations](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#26-infrastructure-deployment-and-operations)
- [30. Definition of complete](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#30-definition-of-complete)

## Completion handoff and commit boundary

Keep this outcome under `RTL-022:`; adjacent cohesive commits may be planned when useful. At execution write file allocations under `docs/commit-plans/RTL-022.md` and actual check/review evidence under `docs/validation/RTL-022.md`. These are future records, not fabricated by this planning pass.

Report files, delivered behavior, settled checks, browser/device observations, deviations and every deferred external check with its prerequisite. Update owning documentation and queue status together. All boxes are currently unchecked. Ticket creation does not implement the feature, authorize Git mutations, start services, call paid runtime providers or publish cloud resources. Follow the user’s actual execution authorization when work starts.
