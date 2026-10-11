# RTL-001 — Initialize the workspace, contracts and safe runtime

Status: **Planned — not started**\
Planning date: **11 October 2026**\
Milestone: **Foundation**\
Depends on: None\
Blocks directly: [RTL-002](RTL-002-prove-brand-design-system-and-storefront-direction.md), [RTL-003](RTL-003-prepare-fifteen-clothing-photos-and-upload-pipeline.md), [RTL-004](RTL-004-build-exact-commerce-commands-and-fact-engine.md)\
Suggested commit: `RTL-001: initialize the workspace, contracts and safe runtime`\
Parent authority: [Retailor blueprint](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md)\
Queue and execution rules: [Ticket index](README.md)

## Outcome and standalone context

Create a runnable strict TypeScript pnpm workspace with Next.js/React, Express 5, browser-safe Zod contracts and a pure commerce package. Retailor is a clothing-only guest demo: photos become a live AI-drafted catalogue, then Tailor’s interactive cards help create a beautiful store. Development exercises the same production-shaped flow with deterministic providers and paid calls disabled.

The repo contains documentation only. The HTML overview is a planning aid, not application source to import wholesale. Establish real entry points and executable boundaries, creating directories only as real modules arrive. Verify current compatible runtime/framework versions when executing; do not inherit a sibling lockfile, model ID, cloud account or approval blindly.

## Dependency evidence and entry conditions

Read the blueprint, queue and imported lessons. No application dependency exists yet. Inspect current official runtime/framework documentation and choose a compatible pinned dependency set. Provider keys, final photos, Docker and cloud access are unnecessary for this local foundation. Proposed ports are frontend 3000 and backend 4000; preserve the documented Retailor convention.

Dependency completion means required local behavior, owning contracts and checks actually exist. A planned checkbox or ticket-named commit alone is insufficient. Verified local dependencies may support local follow-on work while separately recorded live, owner-visual or hosted evidence remains pending. Never turn a fake pass into live acceptance.

## Files and responsibility boundaries

| Area | Responsibility owned here |
| --- | --- |
| `Root manifests, lockfile and TypeScript/lint configuration` | Reproducible workspace and scripts |
| `apps/frontend/src/app and server` | Minimal real routes and server-only fixed bridge |
| `apps/backend/src/server.ts, config, http and runtime` | Explicit startup, parsed config and injected app factory |
| `packages/contracts/src and packages/commerce/src` | Narrow public shapes and exact money primitives |
| `scripts, test and .github/workflows/quality.yml` | Import boundaries and no-key gates |
| `AGENTS.md and application READMEs/.env.example` | Actual operating rules and blank configuration schemas |

Paths describe future ownership. Create modules/directories only with real behavior; reuse contracts, commands, assets and session state rather than a parallel authority.

## Implementation plan

1. **Pin a justified stack.** Check Node 24 support and current pnpm/framework/library compatibility, then lock exact versions through one installation. Record why each major dependency exists. Shared package builds precede application builds; apps never import each other.

2. **Separate startup from composition.** Create real Next and Express entry points. Importing modules cannot load ignored env files, create paid clients, fetch or listen. The Express factory accepts config/ports and can be tested without a real port; startup alone loads normal configuration.

3. **Define bounded cross-boundary vocabulary.** Introduce IDs/revisions, USD minor units, image descriptors, garment categories, initial product/variant/design types, API envelopes and safe capabilities. Frontend stages/persistence are frontend-owned; avoid catch-all contract exports and duplicating schema constants.

4. **Establish pure amount primitives.** Parse decimal money explicitly, reject extra precision, exponent abuse and unsafe magnitudes. RTL-004 supplies full commerce records and commands. HTTP and starter UI must not invent a competing price or metric engine.

5. **Compose honest modes.** Commit fake/paid-off examples with blank secrets. Separate vision, typed Tailor, optional logos and FX availability. Missing live prerequisites fail closed, never select a fake adapter. Production sample is photo input, never authored catalogue output.

6. **Create the fixed private bridge.** Use relative browser endpoints and a server-only fixed backend origin/audience. Establish explicit allow-listed routes, origin/content-type rules, bounded envelopes and safe request/error IDs. No arbitrary destination proxy or private client config.

7. **Make tests unable to spend.** Inject clock/IDs/abort/provider ports and override inherited live flags before imports. Deny unexpected networking and count provider invocations. Health/readiness/config must cost zero calls even if shell secrets exist.

8. **Enforce dependency direction.** Add executable checks against app imports in packages, platform/env/provider access in pure code and server modules/SDKs in clients. Demonstrate a representative invalid import fails rather than relying only on a written rule.

9. **Provide a usable local workflow.** Create dev/start/build and root format/lint/type/unit/boundary scripts and no-key CI. Document separate terminals, 3000/4000 readiness, normal env loading, owned-process cleanup and explicit startup. Docker packaging belongs to RTL-021.

10. **Verify and document real results.** Check frozen lockfile install, safe startup and both production builds. Record installed versions and command contracts in the owning READMEs/foundation guide. Do not claim fresh-clone or hosted CI evidence unless run.

## Acceptance criteria — required local outcome

- [ ] Both real apps run locally without provider credentials.
- [ ] Lockfile and public package exports build reproducibly.
- [ ] Contracts/commerce contain no app, platform, environment or provider dependencies.
- [ ] Invalid money, revisions and oversized public values are rejected.
- [ ] Tests and default development remain fake/paid-off despite inherited live settings.
- [ ] Health/readiness/capabilities are distinct and dispatch zero paid requests.
- [ ] Client output contains no secret, private origin or cloud identity.
- [ ] Executable boundaries and applicable root gates pass.

## Focused verification and evidence

| Case | Required observable evidence |
| --- | --- |
| Install/startup | Frozen installation and actual safe app responses |
| Exact cents | 0.10 accepted; 0.001, NaN, exponent and unsafe values rejected |
| Inherited live flags | Forced isolation plus zero network/dispatch counters |
| Forbidden imports | Representative violations fail the boundary checker |
| Unavailable live runtime | Safe unavailable response; no fake success |
| Client package build | Only public browser-safe exports enter bundle |

Run meaningful focused tests during iteration. At the settled implementation snapshot run the applicable root gates established by RTL-001: `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm check:boundaries`, `pnpm test:unit` and `pnpm build`. Record actual commands/results and revision. UI acceptance needs real browser observations where available; DOM simulations or animation declarations alone do not prove appearance/movement. Do not add tests that merely mirror CSS or static labels.

## External evidence and scope limits

No paid or hosted acceptance belongs to this packet. Record visual/device checks not actually performed separately.

No database, ORM, Redis, bucket, queue, worker service, voice/video/PDF stack, paid benchmark or cloud mutation. Do not scaffold empty later features. Root documentation links to narrow service guides; provider model selection and account readiness remain implementation evidence.

## Precision references

- [1. Authority, status and reference inheritance](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#1-authority-status-and-reference-inheritance)
- [3. Decisions and scope](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#3-decisions-and-scope)
- [17. Architecture and framework](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#17-architecture-and-framework)
- [18. Repository layout and ownership](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#18-repository-layout-and-ownership)
- [19. Data contracts and API](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#19-data-contracts-and-api)
- [21. Configuration and local operation](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#21-configuration-and-local-operation)
- [25. Verification and evidence](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#25-verification-and-evidence)
- [28. Documentation and collaboration practices](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#28-documentation-and-collaboration-practices)

## Completion handoff and commit boundary

Keep this outcome under `RTL-001:`; adjacent cohesive commits may be planned when useful. At execution write file allocations under `docs/commit-plans/RTL-001.md` and actual check/review evidence under `docs/validation/RTL-001.md`. These are future records, not fabricated by this planning pass.

Report files, delivered behavior, settled checks, browser/device observations, deviations and every deferred external check with its prerequisite. Update owning documentation and queue status together. All boxes are currently unchecked. Ticket creation does not implement the feature, authorize Git mutations, start services, call paid runtime providers or publish cloud resources. Follow the user’s actual execution authorization when work starts.
