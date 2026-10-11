# Lessons Learned from ClipBuilder

> **Retailor application note — 11 October 2026:** this is an imported sibling reference, not Retailor’s product contract. Apply the [current Retailor blueprint](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md): clothing only, live 15-photo sample drafting, Tailor-led CTA styling, required product photos/chat uploads, optional three-logo branch after colour/type, three catalogue-linked business scenarios and USD/EUR storefront display. Historical free-sample, assistant/editor, asset, currency or motion settings in the source project do not override these accepted decisions. Retailor implementation work is planned in the [22-ticket queue](../tickets/README.md); no tickets are defined by this historical reference.

Reusable engineering guidelines for portfolio and demo web applications.
Prepared 2026-10-07 from ClipBuilder's repository rules, architecture, quality
audit, security audit and deployment work. ClipBuilder also carried forward
ideas from ScreenPilot; this document generalizes the lessons developed here.

## How to apply this document

Use this as a starting point for a project's `AGENTS.md` and engineering
decisions. Replace the example project names, commands and capabilities with the
actual application's requirements. When continuing an existing project, audit
its current behavior before restructuring it.

The stack and infrastructure below are the preferred baseline for similar demos.
Optional components need a real use case. A different product can need accounts,
persistence, different providers or a different deployment topology; record that
decision instead of copying ClipBuilder's product restrictions.

Keep these priorities in order:

1. Preserve accepted functionality and the complete user journey.
2. Protect private data, credentials and the owner's spending.
3. Keep responsibilities clear, code maintainable and failures diagnosable.
4. Deliver a polished, deployable demo with proportionate infrastructure.

## 1. Product scope and decision authority

- Define the primary journey, intended audience, accepted inputs, output and
  success criteria before implementing infrastructure.
- Favor one complete, polished journey. Add accounts, databases, queues,
  editors, history or batch processing when the product actually needs them.
- Record out-of-scope features so refactoring does not accidentally expand the
  product. Keep internal testing tools out of the visitor experience.
- Follow the latest explicit owner decision, then the project's source of truth,
  active ticket, approved architecture decisions and historical research.
- Work on one dependency-ready ticket at a time. Each ticket should identify
  scope, dependencies, affected boundaries, acceptance checks and open
  decisions.
- Ask for a decision when it changes product behavior, privacy, rights, spending
  or architecture. Resolve routine implementation choices within the approved
  scope without repeatedly asking for permission.

## 2. Preferred framework and toolchain

| Responsibility                               | Preferred baseline                                    | Reason                                                                   |
| -------------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------ |
| Browser experience and server-side web entry | Next.js App Router, React, TypeScript                 | One application for routes, layouts, UI and a server-only API bridge     |
| Private application API                      | Express with TypeScript                               | Explicit HTTP boundary, composition and independently testable use cases |
| Shared runtime validation                    | Zod in a browser-safe contracts package               | Validate data crossing application and provider boundaries               |
| Workspace and dependencies                   | pnpm workspaces with a pinned package-manager version | Shared packages and repeatable installs/builds                           |
| Code checks                                  | Strict TypeScript, ESLint, Prettier                   | Catch unsafe assumptions, boundary violations and formatting drift       |
| Deterministic tests                          | Vitest; Supertest for Express routes                  | Test domain behavior and HTTP contracts without providers                |
| Hosted applications                          | Docker images on Google Cloud Run                     | Separate public and private service boundaries                           |
| Domain and abuse challenge                   | Cloudflare DNS and Turnstile when appropriate         | Managed domain configuration and a server-validated abuse challenge      |

Use supported, patched versions and commit the lockfile. Verify compatibility
and official documentation when choosing or upgrading versions; this document
does not prescribe ClipBuilder's exact version numbers. Keep module conventions
consistent, preferably ESM, with the appropriate TypeScript settings per
package.

Use `strict` TypeScript and appropriate checks such as
`exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`,
`useUnknownInCatchVariables`, `noImplicitOverride` and
`noFallthroughCasesInSwitch`. Prefer runtime validation and type narrowing over
`any`, blanket casts or non-null assertions that bypass boundary evidence.

Add specialized libraries only for the product's actual requirements. Remotion,
FFmpeg, Chromium, image tools and media decoders belong to media applications;
they are optional examples, not dependencies every demo should install.

For an existing application, preserve its working framework unless a migration
has a concrete benefit that justifies the regression risk and effort.

## 3. Repository layout and ownership

```text
apps/
  frontend/
    src/
      app/                         # Next routes, layouts and HTTP entry points
      features/<feature>/          # Feature UI, state, effects and persistence
      server/                      # Private transport and server-only composition
    README.md
    .env.example
    Dockerfile
  backend/
    src/
      app.ts                       # Construct the app without listening
      server.ts                    # Load local configuration and listen
      composition.ts               # Wire configuration, use cases and adapters
      config/
      http/                        # HTTP validation and response mapping
      <domain>/                    # Domain policy, use cases, ports and adapters
    README.md
    .env.example
    Dockerfile
  worker/                          # Optional heavy/native processing service
packages/
  contracts/                       # Browser-safe schemas, DTOs and shared policies
  <shared-feature>/                # Optional pure shared implementation
docs/
  <PROJECT>_SOURCE_OF_TRUTH.md
  tickets/
  architecture/
  operations/
scripts/                           # Named build, release and verification commands
test/                              # Shared test isolation and architecture fixtures
AGENTS.md
README.md
package.json
pnpm-workspace.yaml
pnpm-lock.yaml
```

This tree describes responsibilities, not directories to scaffold in advance.
Create a directory when its first real module arrives. Follow the repository's
chosen test placement consistently; colocated tests work well for feature code.

- Keep frontend workflow and persistence in the owning feature.
- Keep server configuration, provider integration and job descriptors in their
  owning server application.
- Put cross-boundary schemas in contracts once. Do not create competing
  frontend, backend and worker definitions for the same protocol.
- Extract shared implementation only when multiple consumers actually need it.
  For example, a shared composition can keep browser preview and rendered output
  consistent in a media app.
- Name modules for their domain responsibility. Avoid catch-all `utils`,
  `helpers`, `common` and `services` directories.
- Use `apps/renderer` instead of `apps/worker` if rendering is its actual role.

## 4. Dependency boundaries and application structure

Allowed baseline directions:

```text
frontend -> contracts <- backend
worker   -> contracts                  # when a worker exists
frontend -> shared-feature <- worker    # only when genuinely shared
shared-feature -> contracts
```

- Applications never import another application's source or compiled internals.
- Contracts must compile without Node ambient types. They must not import React,
  Next.js, Express, environment readers, provider/cloud SDKs or application
  code.
- Browser feature code must not import server modules, Node APIs or credentials.
- Pure shared UI/domain packages must not load environment variables, call a
  provider, access storage or import application-specific composition.
- Enforce the directions with lint/compiler rules. Include negative fixtures
  proving forbidden imports fail and published package imports succeed.
- Cover all relevant extensions, including `.tsx`; an architectural rule that
  only checks `.ts` leaves a real gap.

An HTTP route should validate its input, invoke one owning use case and map the
result. Use cases depend on domain values and narrow ports, not Express request
objects. Adapters own provider/cloud transport and normalization; raw provider
types must not escape into the frontend or domain logic.

Construct applications and dependencies explicitly. Importing a module must not
start a listener, load an environment file, read private assets, schedule work
or contact a provider. Keep `app.ts` independently testable and let the explicit
server entry point own startup and shutdown.

## 5. Configuration, secrets and capability parity

- Parse server configuration once at composition time and validate it with a
  schema. Distinguish invalid configuration from an unavailable optional
  feature.
- Keep secrets, private connection references and coarse operating switches in
  environment variables. Keep application limits, retry policy and model policy
  in named, reviewed code unless the product requires an operational override.
- Each application owns its `.env.example` and local environment loading. Keep
  credentials and owner-specific identifiers blank in committed examples.
- Preserve the owner's local environment when preparing hosted deployment.
  Hosted settings must not quietly break localhost or replace the local mode.
- Do not read, print, copy or rewrite private environment files during an audit
  or configuration explanation. Use the owning `.env.example` and safe readiness
  diagnostics; the owner populates secret values privately.
- Give browser code only deliberately public configuration. A Turnstile site key
  is public; the verification secret, private API origin, bucket, account
  identity and provider credentials stay server-side.
- Use Secret Manager and runtime identities in hosted services. Keep service
  account JSON keys out of the repository, containers and environment variables.
- Paid/provider work needs explicit approval and complete prerequisites. A
  paid-off master switch must override subordinate live flags and approvals.
  Preserve a practical emergency switch that blocks new expensive dispatches.
- Define each environment explicitly. Keep production provider access gated;
  synthetic tests remain isolated even when production-shaped configuration is
  tested.
- Derive safe public capability metadata from the dependencies actually
  composed. Avoid separate frontend mode switches or hardcoded availability
  booleans that drift from backend behavior.

**Lesson from the hosted rollout:** a working local capability can still be
missing in production because an adapter factory rejects the hosted environment.
Test both rejection cases and the fully approved production composition,
including fallback providers. Check the actual release image, not just source
tests. Do not silently ship a reduced feature set without an owner decision.

## 6. Preserve functionality while improving code quality

- Record the accepted behavior before an audit or cleanup: stages, inputs,
  output, cancellation, refresh, retry, recovery and local/hosted capabilities.
- Audit first when requested. Document findings and a file-level remediation
  plan before implementing them; audit permission is not implementation
  approval.
- Prefer small changes with one responsibility and clear regression evidence.
  Preserve the happy path and important failure behavior throughout the work.
- Remove dead code only after checking imports, dynamic entry points, routes,
  scripts, generated artifacts and release usage. Search results alone are not
  enough to prove code is dead.
- Centralize duplicated policies and schemas where they have one true owner.
  Similar-looking code with different lifecycles is not automatically redundant.
- Review unsafe casts, nullable values, stale flags, forgotten TODOs, import
  cycles, unnecessary dependency weight and obsolete debug/test surfaces.
- Optimize measured or evident waste. Preserve bounded concurrency and cleanup;
  fewer lines of code is not the quality target.
- Validate the combined diff, fix newly confirmed actionable findings within
  scope, and validate again. Record residual risks or accepted deferrals
  honestly.
- Passing checks establish evidence within their scope. Do not claim absolute
  correctness, perfect security or a guaranteed "10 out of 10" codebase.

## 7. State, asynchronous work and resource lifecycle

- Give user-visible workflow state one canonical authority, such as a reducer or
  explicit state machine. Derive UI availability and progress from that state.
- Treat persistence as a validated projection of state, not a second competing
  workflow implementation. Version persisted records and handle incompatible or
  expired records safely.
- Fence asynchronous results by the owning session/operation/revision. A late
  response must not resurrect an exited session or overwrite a newer result.
- Connect cancellation and deadlines through the whole operation: browser,
  route, use case, adapter, stream and worker when applicable.
- Distinguish caller cancellation from deadline expiry and provider failure in
  private diagnostics and safe recovery policy.
- Make cleanup idempotent and exception-resilient. One throwing cleanup callback
  must not prevent unrelated resources from being released.
- Assign an owner to every timer, listener, request, worker, stream, object URL,
  subprocess, scratch directory and temporary object. Test exceptional paths.
- Specify the policy for uncertain outcomes. After a timeout, disconnect or
  restart, do not automatically repeat a potentially billed operation merely
  because its response was lost. Use idempotency or an explicit recovery policy.
- Refreshing, seeking, restoring a completed result or retrying a download
  should not start new generation/processing unless the product requires it.
- Keep immutable completed results tied to their original version. Explain when
  a new session is needed to exercise behavior introduced by a deployment.

## 8. User experience and private diagnostics

- Preserve useful backend diagnostics. Do not remove logging as part of cleanup
  merely to make the code shorter or the console quieter.
- Emit structured, content-safe private records: correlation ID, operation,
  phase, safe error category, elapsed time, attempt count, provider status,
  accepted/rejected counts and cleanup outcome where relevant.
- Distinguish unavailable, busy, expired, cancelled, timeout, transport and
  validation outcomes. Record enough evidence to locate failures without raw
  request/response dumps.
- Keep credentials, cookies, signed capabilities, URLs containing tokens,
  private identifiers, user filenames/content, prompts and provider payloads out
  of normal logs, errors, documentation, screenshots and Git.
- Application UI and browser console must not emit technical diagnostics,
  exception messages, stack traces or provider responses. Render generic,
  source-controlled messages with a useful next action and safe reference ID.
- If browser errors need investigation, forward a bounded validated diagnostic
  category to private logging. Do not serialize arbitrary exceptions or let
  clients turn a telemetry endpoint into an unbounded log sink.
- Private debugging captures require explicit owner authorization, defined scope
  and retention, and storage outside Git. Normal logging stays safe.
- Make loading, empty, unavailable and failure states coherent. Preserve
  cancellation and accessibility; do not leave visitors trapped in a spinner.
- Show measured upload progress when available. Label illustrative wait messages
  honestly rather than presenting them as measured backend stages.
- Keep design tokens, used primitives and responsive layouts consistent. Verify
  keyboard/focus behavior, readable errors and the actual target device sizes.

## 9. Deterministic verification and real acceptance

- Tests must install fake-provider, paid-off and disabled live/approval settings
  before application modules load. A `beforeAll` hook is too late for imports.
- Prevent test runners from loading local environment files. Remove inherited
  provider/credential-file variables and block unexpected external fetch/socket
  access, including after mock restoration and during teardown.
- Use synthetic data and injected ports. Never consume an owner-retained asset
  as a routine fixture or contact a shared cloud resource from unit tests.
- For metered boundaries, assert exact dispatch counts, including zero calls for
  invalid, expired, cancelled, exhausted or unapproved requests.
- Test positive approved-production configuration with synthetic dependencies,
  as well as fake/test/preview/paid-off and missing-prerequisite rejection.
- Cover meaningful failure paths: abort, timeout, malformed responses, stale
  results, cleanup failure, interrupted work and resource exhaustion.
- Keep optional native/media harnesses separate and equally isolated. Add
  browser or integration checks where unit tests cannot establish the behavior.
- Run focused checks while iterating, then the ticket's required final gates.
  Investigate failures; do not weaken assertions or inflate timeouts to hide
  them.
- A no-key fake result proves only the exercised plumbing and behavior. It does
  not prove provider quality, deployed functionality, billing or real data
  cleanup.
- Distinguish API-free from AI-free. A local model still needs implemented,
  approved weights/runtime and verification; it is not automatically available.
- The owner performs paid/live acceptance unless separately authorized
  otherwise. A health/configuration GET is a readiness probe, not an end-to-end
  paid test.

Provide these root commands, adapted to the actual workspace:

```text
corepack pnpm install --frozen-lockfile
corepack pnpm format:check
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test:unit
corepack pnpm build
```

## 10. Security review that fits a public demo

Perform a concrete STRIDE review of browser/server boundaries, provider calls,
uploads, storage, streams, workers and deployment configuration. Prioritize
material risks and feasible abuse paths over speculative hardening.

| STRIDE category        | Questions to answer                                                                                              |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Spoofing               | Who can obtain a session or invoke a private service? Are caller identity, audience and session proofs verified? |
| Tampering              | Can input, provider output, persisted state or a job descriptor change trusted behavior or bypass bounds?        |
| Repudiation            | Can safe private diagnostics explain which operation was admitted, dispatched, rejected or cleaned up?           |
| Information disclosure | Can browser output, errors, logs, storage, build artifacts or dependencies expose private data or capabilities?  |
| Denial of service      | Can requests exhaust verification, memory, CPU, scratch space, streams, provider calls or storage delivery?      |
| Elevation of privilege | Can a public caller reach privileged operations, arbitrary commands/paths/URLs or broader cloud permissions?     |

- Validate input type, size, shape and semantics before expensive work. Bound
  body reads, timeouts, concurrency and output/delivery sizes as appropriate.
- Validate provider responses locally even when the provider supports a schema.
  Treat AI output as untrusted data; compile it into an allowlisted internal
  representation before any privileged execution.
- For cookie/session mutations, enforce the intended Origin/CSRF and cookie
  policies. CORS, a proxy header and Turnstile are not authorization mechanisms.
- Validate Turnstile on the server and check the expected hostname/action and
  applicable session binding. Tokens are short-lived and single-use. See
  [Cloudflare's validation requirements](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/).
- Protect scarce session allocation before allocating it, then protect expensive
  stages. Apply bounded verification, request admission and sensible rate
  limits.
- Scope expiring capabilities to the session, purpose and resource. Prevent
  replay or allowance replenishment by reopening routes or switching aliases.
- Introduce delivery allowances only where downloads/streaming create meaningful
  abuse cost, and leave headroom for legitimate seek, refresh and retry
  behavior.
- Check SSRF, path traversal, command injection and parser/decompression abuse
  where the application's inputs make them relevant.
- Use compatible production security headers and CSP. Exercise the actual
  widget, worker, player and assets; a policy that breaks accepted functionality
  is not a completed fix.
- Review dependency advisories, container OS/native packages and licenses.
  Record affected version, runtime reachability, exploit prerequisites, fix and
  compatibility evidence. A clean package scan alone is not a security audit.
- Document severity, evidence, PM-language threat/solution, safe remediation,
  verification and remaining limitations. Record accepted/deferred findings.

## 11. Preferred cloud topology and bounded spending

```text
Browser -> public Cloud Run frontend -> private Cloud Run API
                                            |
                                            +-> provider adapters
                                            +-> optional private worker
                                            +-> private temporary storage
```

- Keep browser requests same-origin through the frontend's server-only bridge.
  Authenticate private service calls with runtime identities and the correct
  audience. Grant each caller only the required service invocation permission.
  Follow
  [Google's service-to-service guidance](https://docs.cloud.google.com/run/docs/authenticating/service-to-service).
- Separate frontend, API and worker identities. Give provider/secret/storage
  access only to the service that needs it; avoid project-wide owner/editor
  roles.
- Use Secret Manager, Artifact Registry, controlled builds and private storage
  when required. Record actual IAM and configuration evidence separately from
  passing source tests.
- Choose the region and resource envelope for the new product. Configure CPU,
  memory, scratch, concurrency, minimum/maximum instances and deadlines from
  measured workloads, not ClipBuilder's numbers. Scale-to-zero is a useful demo
  default when cold starts are acceptable.
- Distinguish HTTP concurrency, expensive-job concurrency, per-session
  allowance, provider quota and instance count. They protect different
  resources.
- In-memory limits apply to the process that owns them. Replicas, restarts and
  revision overlap can change the effective capacity; do not call them durable
  global budgets or promise exactly one global executor.
- Use alerts plus applicable provider/service spend caps and quotas, and record
  their coverage and enforcement delay. Alerts-only budgets do not cap spending;
  eligible spend-cap budgets can pause covered services. Verify current support
  in
  [Google's budget guidance](https://docs.cloud.google.com/billing/docs/how-to/budgets)
  and
  [spend-cap guidance](https://docs.cloud.google.com/billing/docs/how-to/budgets-spend-caps).
- Include provider calls, compute, storage, delivery and build costs in the
  operating model. Avoid treating a cap for one service as a whole-project cap.
- Preserve cleanup access when rejecting new paid work or pausing processing.
  Document what happens if enforcement also pauses expiry/cleanup work.
- Assess traffic protection across the real public entry points, including the
  managed service URL if it can bypass domain-level controls. Instance caps and
  per-session limits do not establish complete DDoS protection.
- Use a separate worker for actual heavy/native processing or isolation needs.
  Select request-bound services versus jobs/durable orchestration according to
  duration and restart semantics; do not assume work continues safely after an
  HTTP response. Avoid adding a queue/database without a demonstrated need.

## 12. Privacy, retention and cleanup

- Define what is collected, where it goes, which providers receive it, access
  lifetime and deletion behavior before implementing the flow.
- Keep private storage private. Signed access must be scoped and short-lived;
  never embed signed capabilities or private content in public URLs or Git.
- For disposable workflows, delete temporary inputs, intermediates and outputs
  on the agreed exit, cancellation, expiry and completion paths.
- Design for process loss. Use independent storage lifecycle/provider expiry or
  another justified fallback, and publish the real deletion window accurately.
- Revoking access, returning an exit response and confirming deletion are
  different outcomes. Report cleanup failures privately and retain bounded retry
  responsibility without making visitors manage internal cleanup.
- Fence deletion to the exact owned object/version. Never let a stale cleanup
  delete a replacement resource.
- Preserve explicitly owner-retained masters/assets. Keep them ignored and out
  of public/build contexts; deletion requires an instruction naming the asset.
- Confirm rights and third-party asset licensing before public use. Keep private
  rights evidence and user content out of committed examples and fixtures.

## 13. Build, deployment and domain preparation

- Build from an explicit allowlist or equivalently verified context. Exclude
  environment files, private assets, diagnostics, replay caches, test UIs and
  unnecessary source/test/doc artifacts from submitted contexts and runtimes.
- Use frozen installs and explicit dependency lifecycle-script policy. Build
  shared packages in dependency order; do not rely on stale compiled contracts.
- Produce a small nonroot runtime image with only required compiled artifacts,
  libraries and public assets. Bake pinned native tools into relevant worker
  images; avoid runtime tool downloads and arbitrary worker inputs.
- Verify the real target-platform image. Windows success does not prove Linux
  native dependencies, symlinks, workspace packages or browser tooling work.
- For Next.js standalone output, verify monorepo tracing and required static/
  public assets against
  [the official output documentation](https://nextjs.org/docs/app/api-reference/config/next-config-js/output).
- Do not overwrite an active dev server's build directory with a production
  build. Use an isolated release context or the documented safe workflow.
- Run non-metered image checks for startup, health, assets, configuration,
  authenticated transport and approved adapter composition. Keep them offline or
  synthetic where provider access would otherwise be required.
- Remove retired testing ports, replay paths, debug pages and local-only sample
  controls from the actual hosted artifact; hiding a button is not removal.
- Obtain explicit deployment approval, deploy the required components, and
  record source commit, image digest, revisions and safe configuration evidence.
- Choose one canonical domain. Configure DNS/TLS, redirects, exact frontend
  origins, cookie/CSRF policy, upload/storage CORS and provider/widget hostname
  lists consistently. Preserve localhost independently for ongoing development.
- Turnstile hostnames belong to pages where the widget runs, usually the
  frontend; a private API hostname is not the website hostname. Include a raw
  frontend hostname only when that access path is intentionally supported.
- Choose the custom-domain routing method using current provider guidance and
  the product's cost/security needs. Verify certificate and redirects before
  reporting cutover complete; do not copy another app's DNS targets.
- Keep an immutable previous image and matching configuration for rollback.
  Verify an emergency paid-off path and account for session/revision changes.
- Complete a fresh owner-run deployed walkthrough, including the final result
  and failure/recovery paths that need real acceptance. Inspect private logs and
  record cleanup/cost/quality evidence; capability booleans alone are
  insufficient.

## 14. Local operation and process hygiene

- Document canonical commands, ports and browser origins in the application
  guides. Build shared contracts before first startup and after schema changes.
- Start the API first and verify its safe health endpoint before the frontend.
  Then verify the intended page and safe configuration endpoint.
- Reuse a healthy matching instance. Before stopping anything, establish process
  ownership; never terminate every Node process or kill an unidentified port
  owner.
- For restart/stop, capture supervisors, watchers and descendants. Stop the
  supervisor first, shut down gracefully, then perform bounded tree-aware
  cleanup. Verify creation times before terminating survivors and recheck for
  respawns.
- A launcher PID is not readiness. Verify listeners, health and page responses;
  clean up the full new process tree if startup fails.
- Do not silently pick alternate ports, rewrite origins or change the owner's
  environment to work around a conflict.
- On Windows, keep agent-managed background launches detached and hidden unless
  a visible terminal was requested. Store content-safe stdout/stderr and a PID
  ownership record outside Git; report URLs and private log locations safely.
- Respect sandbox permissions and explicit launch approval. Local startup is not
  permission to call paid providers or mutate/deploy cloud resources.

## 15. Documentation and Git discipline

| Document                    | Owns                                                                              |
| --------------------------- | --------------------------------------------------------------------------------- |
| Root `README.md`            | Concise public product story, portfolio evidence and repository map               |
| Application/package READMEs | Commands, setup boundaries and focused verification                               |
| `AGENTS.md`                 | Repository operating constraints and agent workflow                               |
| Project source of truth     | Current product behavior, architecture, privacy and spend decisions               |
| Tickets                     | Dependency-ready work, acceptance criteria, decisions and implementation evidence |
| Architecture decisions      | Rationale and tradeoffs for consequential choices                                 |
| Operations docs             | Setup, security, deployment, retention, cost, rollback and release receipts       |

- Update the narrowest owning document. Keep current status easy to find and
  label superseded plans/history explicitly; avoid duplicate authoritative
  plans.
- Record implemented, automatically verified, owner-reported, accepted, deferred
  and still-unchecked behavior separately. Documentation must not promote a
  synthetic check into real production acceptance.
- For an audit, preserve baseline findings and add remediation/validation status
  rather than rewriting history to imply no issue ever existed.
- Before staging, make a file-level commit plan with exact files and meaningful
  ticket-prefixed messages. Stage intentional files and review the staged diff.
- Stage, commit, push, fetch, pull, switch branches or rewrite history only with
  the owner's applicable authorization. Commit permission does not imply push or
  deployment permission; existing authorization persists within its scope.
- Keep private data, environment files, build contexts, temporary logs and
  generated media out of commits. Verify the final inventory and worktree state.

## 16. How to plan, write and execute tickets

Tickets are small implementation packets inside a larger product plan. They
should give another agent or developer enough context to implement and verify
the work without guessing the product, architecture or previous decisions.

### Build the plan before filling the queue

1. Write the project's source of truth: user journey, scope, architecture,
   external dependencies, privacy/spend policy and acceptance criteria.
2. Identify the risky feasibility questions early. Verify them before building
   extensive UI around an assumption; real paid proofs remain owner-approved.
3. Divide the work into milestones and dependency-ready vertical slices. Each
   implementation ticket should deliver a useful behavior or an executable
   foundation, including its contracts, tests and documentation.
4. Put the canonical queue in `docs/tickets/README.md`. List stable ID, title,
   milestone, dependencies, status and the next eligible work. Link each packet.
5. Separate implementation dependencies from owner/external gates. A provider
   setup guide can be written without credentials; a provider acceptance claim
   cannot. A local fix can be complete while its image rollout remains pending.
6. Keep later tickets specific enough to preserve direction without inventing
   detailed abstractions before their inputs and feasibility are established.

Use a project prefix, for example `APP-001-initialize-workspace.md`. Stable IDs
make decisions, validation and commits traceable. Keep one authoritative packet
per piece of work, link follow-ups, and mark superseded sections explicitly.
Keep current instructions at the top; move long historical receipts into linked
operations records rather than making the active task hard to find.

### What a good ticket must contain

- **Concrete objective:** the problem and resulting user or engineering
  behavior.
- **Why it matters:** product/portfolio value, not just a list of modules to
  add.
- **Standalone context:** current behavior, accepted decisions, contracts and
  boundary responsibilities. Link precise relevant references.
- **Dependency evidence:** what must already exist and what verification proves
  readiness. A dependency being marked done is not sufficient when its required
  artifact or behavior is missing.
- **Files and areas owned:** a file-level plan or precise responsibility map.
  Allow routine filename adjustments without changing the agreed boundaries.
- **In scope / out of scope:** protect the working journey and exclude unrelated
  cleanup, new product features and unapproved external actions.
- **Implementation steps:** ordered, reviewable changes with lifecycle and error
  handling included, not postponed to a vague final hardening phase.
- **Acceptance criteria:** observable outcomes for happy path, key failures,
  cleanup, security and provider-call counts where relevant.
- **Verification:** exact focused checks and required final gates, plus separate
  owner/manual/live items. Do not invent coverage that cannot run safely.
- **Documentation ownership:** identify the narrow documents that need updates.
- **Owner gates and blockers:** decisions, credentials, rights, paid testing,
  cloud/build/deployment and Git actions that need applicable authorization.
- **Commit boundary and handoff:** suggested file groups, ticket-prefixed
  subjects, evidence to report and what remains unchecked. Suggested commits are
  not approval.

### Copyable ticket template

```markdown
# APP-00X - Deliver a concrete outcome

Status: Planned Milestone: Mx - Milestone name Depends on: APP-00A, APP-00B
Blocks: APP-00Y Authority: ../<PROJECT>_SOURCE_OF_TRUTH.md Index: README.md

## Objective and value

Describe the trigger, current problem and expected resulting behavior.

## Current context and dependency evidence

Describe existing functionality and the evidence needed before starting. Link
the owning contracts, decisions and previous implementation receipts.

## Scope and functionality to preserve

In scope: ... Out of scope: ... Accepted behavior that must remain working: ...

## Files and responsibilities

| File or area | Responsibility | Planned change |
| ------------ | -------------- | -------------- |
| ...          | ...            | ...            |

## Implementation plan

1. Make the smallest coherent change to the owning boundary.
2. Add meaningful regression checks for behavior or risk being changed.
3. Review lifecycle, private diagnostics and integration with existing flow.

## Acceptance criteria

- [ ] The intended behavior works through the existing journey.
- [ ] Relevant failure/cancel/refresh/cleanup behavior remains correct.
- [ ] Boundaries, safe UI errors and private diagnostics are preserved.
- [ ] Applicable input/resource/provider-call limits are verified.

## Verification

Focused deterministic commands/checks: ... Required final gates: ...
Owner/manual/live checks, prerequisites and evidence limits: ...

## Documentation updates

Identify the narrow owning guides, source-of-truth changes and ticket/index.

## Owner gates, blockers and rollback

State applicable approvals and concrete unresolved prerequisites. Explain the
safe rollback or recovery for consequential changes.

## Suggested commit groups

List exact file groups and meaningful APP-00X-prefixed subjects. Do not
stage/commit/push without the applicable owner authorization.

## Completion evidence

Changed files, exact check results, validation findings/fixes, deviations,
owner-reported results and every unchecked external/manual acceptance item.
```

### Execution rules reflecting the owner's working style

1. **Functionality comes first.** Keep the accepted flow working while changing
   code. A refactor is not permission to redesign the experience or remove a
   capability. Preserve local and deployed behavior, private logs and quality.
2. **Read before editing.** Inspect the source of truth, active packet,
   dependency evidence, Git state and the modules that own the behavior.
   Preserve unrelated user work. Choose the next eligible ticket, not simply the
   lowest open ID.
3. **Treat audit and implementation as distinct phases.** When asked to audit,
   inspect and document only. Produce detailed findings and a careful file-level
   fix plan. For security, also provide the requested severity-ranked
   PM-language review with plain-language threat and solution; let the owner
   choose material policy changes before implementation.
4. **Once execution is authorized, finish the agreed work.** Do not stop at a
   plan, a scaffolding shell, or an offer to continue. Make routine reversible
   fixes and documentation concrete without asking for the same approval again.
5. **Keep changes scoped and maintainable.** Do not chase fewer lines, unrelated
   rewrites or speculative abstractions. Remove proven dead/redundant paths
   while preserving responsibilities, security controls and useful diagnostics.
6. **Document as work progresses.** Record the current plan, substantive
   findings, owner decisions, verification and deviations. Preserve original
   audit evidence; do not rewrite a failure into a success without the
   intervening correction.
7. **Validate after implementation.** Review the full ticket/diff for omissions,
   likely bugs, edge cases, duplicate or dead code, boundary violations, leakage
   and cleanup. Fix actionable findings inside the approved scope, run affected
   checks, and validate again until the scoped review finds no new actionable
   issue. A materially new decision or external action keeps its approval gate.
8. **Use meaningful evidence.** Run focused checks while iterating and required
   final gates after changes settle. Label fake results and owner-only checks.
   Do not mark a real flow working from synthetic tests or a configuration GET.
9. **Prepare exact commits when requested.** Create a file-level plan and
   meaningful ticket-prefixed subjects, stage only intended files, review and
   commit under existing authorization. Use a different prefix if the owner
   explicitly requests one, such as grouping approved release work under its
   deployment ticket.
10. **Hand off clearly.** Report what changed, why, exact checks/manual states,
    deviations and remaining items. Update the ticket/index only for evidence
    actually produced. Local implementation completion and production acceptance
    can have different statuses; make that distinction explicit.

If blocked on a credential, owner decision or external resource, finish useful
independent work and report the exact missing prerequisite. Keep the dependent
acceptance item open. Do not substitute fixtures in live mode, silently enable
features, weaken validation or create unapproved infrastructure to declare done.

Optional independent validation/delegation must follow the owner's instructions
and available workflow. Do not create extra chats or message other tasks without
authorization; a second agent's opinion does not replace actual acceptance.

### A generic demo ticket roadmap

This is a pattern, not a mandatory fixed ticket count or feature sequence.
Change the middle tickets to the new application's purpose. Security, cleanup
and test isolation begin in the foundation and continue in every feature; the
later audits review the combined result.

| Example                            | Outcome                                                                                                                     |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| APP-001: Workspace and contracts   | Working frontend/API startup, strict tooling, safe errors, shared schemas and executable boundaries                         |
| APP-002: Visual direction          | Approved design reference, tokens and responsive shell before broad UI implementation                                       |
| APP-003: Workflow foundation       | Canonical state, labelled synthetic journey, persistence/recovery and cleanup ownership                                     |
| APP-004: First complete UI slice   | A usable initial journey with loading, empty/error states and no false live claims                                          |
| APP-005: Provider/setup readiness  | Focused owner setup guides, feasibility evidence and explicit privacy/spend prerequisites                                   |
| APP-006: Real input/admission      | Validated input or upload, scoped authorization, bounded resources and cancellation                                         |
| APP-007: Core live capability      | Product-specific provider/domain behavior behind existing gates, normalized outputs and exact call-count tests              |
| APP-008: Result processing         | The application's next real transformation, including optional worker feasibility and lifecycle                             |
| APP-009: Result review/delivery    | Complete user result, refresh/retry behavior and output delivery without accidental redispatch                              |
| APP-010: UX quality                | Responsive, accessibility, performance and polished failure/progress behavior                                               |
| APP-011: Code-quality audit        | Detailed findings and safe plan, then approved remediation and repeat validation                                            |
| APP-012: STRIDE/security audit     | Material threats, dependency review, PM-readable review, selected fixes and repeat validation                               |
| APP-013: Release preparation       | Verified images, no debug/replay surfaces, secrets/identity/cost prerequisites and final local owner test                   |
| APP-014: Deployment and acceptance | Approved rollout, domain/challenge setup, fresh owner deployed walkthrough, diagnostics, cleanup/cost and rollback evidence |

Separate a feasibility or deployment packet when it needs distinct approval or
would otherwise make a feature ticket unsafe to execute. Combine closely related
steps when they form one coherent slice. Keep dependencies real and avoid a
queue of empty shells waiting for later tickets to make them useful.

## 17. Practical handoff checklists

### Before changing an existing application

- [ ] Read the current authority documents and select the active ticket.
- [ ] Record the working journey, capabilities and important recovery behavior.
- [ ] Identify the files, boundaries and tests that own the proposed change.
- [ ] Distinguish audit-only work from approved implementation.
- [ ] Preserve private logging, local configuration and owned retained assets.

### Before handing off implementation

- [ ] Validate functionality, contracts, dependency directions and safe errors.
- [ ] Check async ownership, cancellation, cleanup and metered dispatch counts.
- [ ] Check dead/debug code, duplication, unsafe casts and stale configuration.
- [ ] Run the meaningful focused checks and required final gates.
- [ ] Re-review the combined changes and address new actionable findings.
- [ ] Update owning documentation with evidence and remaining manual checks.

### Before public release

- [ ] Verify the actual images, private identities, secrets and service
      settings.
- [ ] Verify all approved features work in hosted composition, including
      fallbacks.
- [ ] Verify origins, domain/TLS, challenge hostnames and release exclusions.
- [ ] Record traffic/spend controls, retention fallbacks and residual risks.
- [ ] Record rollback and emergency paid-off behavior.
- [ ] Obtain the required external-action approvals and owner live acceptance.
- [ ] Report what passed, what the owner verified and what remains unchecked.

## Decisions the next project must make for itself

Before adopting this baseline, record the new application's primary journey,
accepted inputs, public capabilities, authentication needs, persistence needs,
providers/data transfer, rights, retention, budget, region, resource limits,
canonical local origins, production domain and required manual acceptance.

Reuse the engineering standards and proven boundaries. Choose the product's
state, providers and resource policy from its own requirements and measurements.
