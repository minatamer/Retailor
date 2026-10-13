# RTL-021 — Package Linux services and the manual release runbook

Status: **Locally packaged and verified — cloud/paid/owner acceptance pending**\
Planning date: **11 October 2026**\
Milestone: **Deployment preparation**\
Depends on: [RTL-016](RTL-016-complete-export-reset-expiry-and-session-lifecycle.md), [RTL-018](RTL-018-harden-privacy-abuse-spend-and-runtime-boundaries.md), [RTL-019](RTL-019-verify-polish-responsive-motion-and-design-matrix.md)\
Blocks directly: [RTL-022](RTL-022-deploy-verify-hosted-demo-and-record-rollback.md)\
Suggested commit: `RTL-021: package Linux services and the manual release runbook`\
Parent authority: [Retailor blueprint](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md)\
Queue and execution rules: [Ticket index](README.md)

## Outcome and standalone context

Produce a reproducible Linux release candidate and a concrete manual release/rollback runbook for Retailor's existing two-service backbone. The frontend is Next.js/React; the backend is Express with typed contracts, provider boundaries and bounded in-process admission. Cloud Run, Artifact Registry, Secret Manager and Cloudflare remain the intended infrastructure. This demo does not need a database, media bucket, task queue, additional worker or deployment automation.

Packaging must include the actual approved public sample photos, self-hosted fonts and workspace packages while excluding credentials, visitor content and development fixtures from public behavior. The backend remains IAM-private; the frontend's fixed server bridge authenticates to the known backend and does not become an arbitrary proxy. Public AI operations still need browser-origin/action admission on top of service identity. Docker output must be tested on Linux semantics rather than inferred from a successful Windows pnpm build. This packet deliberately does not depend on RTL-020's paid evaluation so every unpaid packaging and deployment-plan prerequisite can be completed before external approval. Actual publishing is RTL-022, which requires both this candidate and the independent live acceptance verdict.

## Dependency evidence and entry conditions

The complete lifecycle, runtime hardening and settled visual integration must be available locally. Require the real workspace lockfile, production build entrypoints, explicit asset manifest and documented environment schema. Inspect current root commands and avoid inventing a container pass when Docker is unavailable. External resource names, project, region and hostname may be pending; represent them as inputs to a reviewable plan, not copied identities from Retrosum or ScreenPilot.

Dependency completion means required local behavior, owning contracts and checks actually exist. A planned checkbox or ticket-named commit alone is insufficient. Verified local dependencies may support local follow-on work while separately recorded live, owner-visual or hosted evidence remains pending. Never turn a fake pass into live acceptance.

## Files and responsibility boundaries

| Area | Responsibility owned here |
| --- | --- |
| `apps/frontend/Dockerfile and apps/backend/Dockerfile` | Reproducible non-root Linux runtime images with bounded build context. |
| `.dockerignore` | Exclude secrets, transient outputs and private/debug content while retaining required workspace inputs. |
| `scripts/release/` | Manual candidate preparation and read-only verification helpers, with explicit resource inputs. |
| `docs/operations/` | Concrete two-service deploy, verification, paid-disable and rollback runbook. |
| `README.md and apps/*/README.md` | Actual local/build commands, ports, production config and ownership. |
| `docs/validation/RTL-021.md` | Real Linux/container evidence, candidate digests and unperformed external checks. |

Paths describe future ownership. Create modules/directories only with real behavior; reuse contracts, commands, assets and session state rather than a parallel authority.

## Implementation plan

1. **Inspect the actual build graph.** Resolve frontend output tracing, shared package compilation, public assets and backend runtime entrypoint from the implementation. Use the real pinned Node/pnpm versions and frozen lockfile. Check case-sensitive imports, executable script endings and file permissions. Include production dependencies only where required; do not create a parallel release-only architecture.

2. **Define minimal build contexts.** Use root workspace contexts with explicit Docker stages and a documented .dockerignore. Exclude all environment secrets, provider payloads, Git internals and visitor files. Retain approved sample assets, licences and self-hosted font files. Verify build arguments and layers contain no API keys; secrets belong to runtime injection, never image construction.

3. **Package the frontend.** Build the intended Next standalone/runtime output and copy all required traced workspace modules, public assets and static files. Bind 0.0.0.0 to the supplied PORT. Preserve same-origin frontend routes and the fixed authenticated backend bridge. Verify fonts and all approved photo derivatives exist in the final image, not merely the builder stage.

4. **Package the backend.** Compile strict TypeScript, run as a non-root runtime user and bind the configured PORT without a Windows-only launcher. Keep health checks content-free and readiness distinct from paid capability. Load bounded config before accepting requests; fail closed for production fake mode, invalid origins or incomplete admission settings. Do not require a database or local upload directory.

5. **Verify containers locally.** Build both Linux images and record real results when the engine is available. Exercise readiness, safe unavailable capability, fake-mode rejection, fixed bridge errors, graceful shutdown and bounded stream limits using unpaid fixtures. Check container startup memory/asset sizes against intended 512 MiB frontend and 1 GiB backend limits. If unavailable, complete Dockerfiles/runbook and identify the exact unperformed container acceptance instead of pretending it passed.

6. **Prepare concrete runtime settings.** Specify two Cloud Run services, min instances zero, max one, planned concurrency eight frontend/four backend and outer timeouts 210/200 seconds. Document these as candidate settings to measure, not facts about an existing deployment. Keep paid operation subdeadlines shorter than outer request limits. Explain process-local grant/counter reset and safe old-grant rejection across restarts; no durable monthly spend guarantee.

7. **Prepare identity and secret bindings.** List least-privilege service identities, frontend-to-backend invoker grant, bounded Secret Manager version references and configuration ownership. Use platform workload identity instead of service-account JSON files. The backend must not grant allUsers invocation. The bridge must use the configured target/audience, sanitize outbound headers and avoid public client exposure of keys or internal URLs.

8. **Write the deploy and rollback runbook.** Provide ordered manual commands/templates with explicit owner-supplied resource inputs, candidate image tags/digests, origin/Turnstile host settings and exact checks before enabling paid capability. Include paid-disable steps and rollback to an identified immutable prior image/config. Explain Git revision plus dirty-file/source fingerprint recording when building an uncommitted candidate; do not imply a pushed clean revision exists.

9. **Reconcile operational documentation.** Document frontend 4310 and backend 4311 local commands, separate terminals, health/status URLs, normal environment loading and full-stack start/stop ownership. Root checks must remain unpaid and deployment commands must never run as part of build/test. Link the security and data-retention prerequisites. State that the intended tryretailor.com domain is unconfirmed until actual owner evidence exists.

10. **Hand off a reviewable candidate.** Record image digests, source snapshot, Linux checks, asset/licence evidence, memory findings, configuration template and every missing external input. Fix packaging defects before asking to deploy. RTL-022 receives a complete concrete deployment plan plus the RTL-020 acceptance verdict; do not create cloud resources or mutate DNS while preparing it.

## Acceptance criteria — required local outcome

- [x] Both services have reproducible workspace-aware multi-stage Linux packaging with pinned runtime and frozen dependency install.
- [x] Runtime images include approved fonts/photos/shared modules and exclude secrets, private payloads and unused build tooling.
- [x] Both services bind the platform PORT on 0.0.0.0 and run as a non-root user.
- [x] Production fake-mode/configuration rejection and content-free readiness are covered by unpaid checks.
- [x] The frontend bridge has fixed authenticated private-backend behavior; platform IAM is clearly separate from browser action admission.
- [x] Actual Linux/container evidence is recorded or its absence is an explicit unresolved packaging prerequisite.
- [x] The manual runbook names intended resource/configuration inputs, service limits, secret versions and least-privilege identities.
- [x] Rollback and immediate paid-disable procedures identify immutable artifacts/configuration and required verification.
- [x] Local README commands and ports match the implementation; no automatic deploy or paid test is attached to root checks.
- [x] A concrete candidate/source fingerprint is handed off without cloud publication, DNS changes or fabricated hosted status.

## Focused verification and evidence

| Case | Required observable evidence |
| --- | --- |
| Reproducible Linux build | Real frozen-lockfile build of both images; case-sensitive imports and required traced workspace assets resolve. |
| Runtime startup | Non-root process, PORT binding, readiness and graceful termination observed in actual containers. |
| Asset delivery | Approved sample photos/font files and licence metadata exist in final runtime layers and resolve correctly. |
| Secret exclusion | Inspect context/layer configuration and env injection rules without printing secret values. |
| Production safety | Paid unavailable path and fake-mode rejection tested with network-denied provider fixtures. |
| Bridge boundary | Known target/audience only; unauthenticated backend invocation and arbitrary proxy requests cannot be enabled by client input. |
| Runtime envelope | Observed startup/memory/output findings compared with candidate resources, with unmeasured values labeled. |
| Runbook and rollback | Ordered deploy/paid-disable/rollback plan uses explicit resource inputs and immutable candidate references. |

Run meaningful focused tests during iteration. At the settled implementation snapshot run the applicable root gates established by RTL-001: `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm check:boundaries`, `pnpm test:unit` and `pnpm build`. Record actual commands/results and revision. UI acceptance needs real browser observations where available; DOM simulations or animation declarations alone do not prove appearance/movement. Do not add tests that merely mirror CSS or static labels.

## External evidence and scope limits

Cloud project, region, service accounts, resource names, secret version access, production domain ownership and Cloudflare/Turnstile configuration are external inputs for RTL-022. Inspect available evidence read-only where authorized. No cloud resource is assumed to exist from sibling examples. Current task authorization covers ticket planning; actual release execution needs the later user's concrete deployment scope.

No actual cloud provisioning, registry push, IAM/Secret Manager mutation, DNS update, certificate purchase or hosted paid request is executed merely to complete this preparation packet. Do not add CI deployment, Terraform complexity, recurring jobs or a third service unless a concrete separately authorized need appears. The candidate source may be uncommitted; do not stage, commit or push without the user's applicable Git authorization. A missing Docker engine blocks container acceptance, not the unpaid preparation work.

## Precision references

- [17. Architecture and framework](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#17-architecture-and-framework)
- [18. Repository layout and ownership](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#18-repository-layout-and-ownership)
- [19. Data contracts and API](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#19-data-contracts-and-api)
- [21. Configuration and local operation](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#21-configuration-and-local-operation)
- [22. Security, admission and privacy](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#22-security-admission-and-privacy)
- [23. Resource limits and cost control](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#23-resource-limits-and-cost-control)
- [26. Infrastructure, deployment and operations](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#26-infrastructure-deployment-and-operations)
- [28. Documentation and collaboration practices](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#28-documentation-and-collaboration-practices)

## Actual local outcome

Both non-root Linux images were built and probed with network denied, supplied PORT=8080 and no published host ports. Fifteen photos, five fonts, licences, fixed route failures, production startup rejection, native Sharp and SIGTERM were verified. See [RTL-021 evidence](../validation/RTL-021.md) and [manual release packet](../operations/RELEASE.md). Keys, live acceptance, project/domain/identity/secret inputs and actual hosted publication/rollback remain pending; none are claimed passed.

## Completion handoff and commit boundary

Keep this outcome under `RTL-021:`; adjacent cohesive commits may be planned when useful. At execution write file allocations under `docs/commit-plans/RTL-021.md` and actual check/review evidence under `docs/validation/RTL-021.md`. These are future records, not fabricated by this planning pass.

Report files, delivered behavior, settled checks, browser/device observations, deviations and every deferred external check with its prerequisite. Update owning documentation and queue status together. Required local packaging boxes are covered by actual Linux evidence; external release gates remain pending. Ticket creation does not implement the feature, authorize Git mutations, start services, call paid runtime providers or publish cloud resources. Follow the user’s actual execution authorization when work starts.
