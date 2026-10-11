# Portfolio Demo Build Playbook

> **Retailor application note — 11 October 2026:** this is an imported sibling reference, not Retailor’s product contract. Apply the [current Retailor blueprint](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md): clothing only, live 15-photo sample drafting, Tailor-led CTA styling, required product photos/chat uploads, optional three-logo branch after colour/type, three catalogue-linked business scenarios and USD/EUR storefront display. Historical free-sample, assistant/editor, asset, currency or motion settings in the source project do not override these accepted decisions. Retailor implementation work is planned in the [22-ticket queue](../tickets/README.md); no tickets are defined by this historical reference.

> **ClipBuilder scope note:** This is a reusable methodology document, not the
> ClipBuilder product contract. Generic editor examples do not apply to
> ClipBuilder. Its locked demo flow exposes candidate selection, automatic clip
> creation, read-only review/render confirmation, and download—no editor,
> chatbot/assistant, manual trim, customization, proposal flow, or undo/redo.

- Status: Reusable architecture and delivery guide
- Derived from: the implemented ScreenPilot repository and its decision history
- Last reviewed: 2026-09-29

## Purpose

This document captures the reusable method behind ScreenPilot: how to turn a
large product idea into a polished, credible, inexpensive portfolio demo that
an implementation agent can build without silently expanding it into a
production SaaS.

It is not a second source of truth for ScreenPilot and it is not a template to
copy mechanically. Product-specific decisions still belong in the new
project's own source-of-truth document. The useful inheritance is the decision
discipline, architecture boundaries, design workflow, fake-first provider
strategy, spend controls, verification gates, and documentation ownership.

The companion concept that applies this playbook is
[`AI_CLIPPING_DEMO_BRIEF.md`](../research/AI_CLIPPING_DEMO_BRIEF.md).

## The method in one page

1. Write the portfolio story before the architecture. A visitor should
   understand the product in ten seconds and complete its signature experience
   in roughly five minutes.
2. Separate the portfolio demo, commercial MVP, and full-product vision. Build
   only the first one; preserve the others as roadmap context.
3. Appoint one Markdown document as product and architecture authority. Break
   its implementation into small, dependency-ordered ticket packets.
4. Keep the system as small as the story permits. ScreenPilot needed a
   frontend, a private API, one browser-safe contracts package, two external
   providers, and no database.
5. Make fake mode the default. A fresh checkout, automated test, or ordinary
   development command must be unable to spend provider credits.
6. Put every external system behind a narrow typed adapter and validate both
   sides of every boundary.
7. Design the visual language before styling the full application. Use one
   lightweight living reference and one concept for the signature screen, not
   a parallel design project.
8. Build the experience as an explicit state machine. Persist only an
   allow-listed projection, not an entire runtime object.
9. Bound every expensive resource: input size, duration, output size,
   concurrency, request rate, provider calls, retries, instance count, and
   monthly spend.
10. Test risky pure logic with deterministic fixtures and provider fakes. Use
    manual visual and live-provider checks only where they add evidence.
11. Deploy the exact audited revision with immutable images, scale-to-zero
    services, least-privilege identities, secrets outside Git, and a paid-demo
    kill switch.
12. Record what was actually verified. Never upgrade a recollection, free
    allowance, or successful local fake into a production claim.

## What ScreenPilot actually built

The implemented shape is intentionally ordinary and legible to a client:

```text
Browser
  -> Next.js frontend and same-origin /v1 proxy
       -> Express API
            -> OpenAI adapter
            -> ElevenLabs adapter
            -> Turnstile verification adapter

apps/frontend -> packages/contracts <- apps/backend
```

The repository uses:

- strict TypeScript and one pnpm workspace/lockfile;
- Next.js App Router and React for the staged browser experience;
- Express 5 for a separately deployable private API;
- Zod for browser-safe cross-boundary schemas;
- reducer/context state rather than a global state library;
- deterministic fake providers and synthetic fixtures;
- Vitest, Testing Library, and Supertest for focused tests;
- Docker, Artifact Registry, and two Cloud Run services;
- a frontend-server proxy so the browser sees one origin and never receives the
  backend URL or provider secrets;
- no application database, ORM, object store, queue, worker, analytics script,
  account system, or background session.

That exact list is not sacred. Its governing rule is: every deployed piece must
be necessary for the signature experience or for safely exposing it.

## 1. Start with a portfolio contract

Before choosing libraries, lock these statements in the new source of truth.

### Product sentence

Use this form:

> [Product] helps [one primary visitor] turn [one starting input] into [one
> visible outcome], while [the trust or control principle that makes it
> credible].

If the sentence needs several users, dashboards, integrations, and outcomes,
the demo is not yet scoped.

### Ten-second comprehension test

Specify what an Upwork visitor must understand without reading documentation:

- what the product does;
- where the AI contributes;
- what remains under human control;
- what concrete artifact appears at the end;
- why this is more than a static UI mockup.

### Signature flow

Write one canonical, bounded journey. ScreenPilot used two equal entry paths
that converged into one interview and review flow. A new product may have only
one entry path. Every additional path must earn its cost by strengthening the
portfolio story.

For each stage define:

- entry preconditions;
- visible user goal;
- allowed actions;
- data created or destroyed;
- paid operations, if any;
- success transition;
- recovery transition;
- refresh behavior;
- responsive and accessibility behavior.

### Demo success criteria

Prefer observable outcomes over adjectives. Examples:

- the sample reaches the signature screen in fewer than 15 seconds;
- two materially different fixtures produce visibly different grounded output;
- no paid operation starts before the final explicit action;
- a provider failure preserves completed local work and offers a bounded retry;
- clearing the session removes every application-held user artifact;
- the complete experience works at named phone, tablet, laptop, desktop, and
  large-monitor anchors.

### Scope hierarchy

Maintain three lists:

| Layer | Treatment |
| --- | --- |
| Portfolio demo | Implement, verify, deploy, and document now. |
| Commercial MVP | Record as a roadmap; add only when a separate decision promotes it. |
| Full product | Preserve as vision, not implied backlog. |

The completion rule is important: a demo is done when the promised journey is
coherent, trustworthy, recoverable, and presentable—not when it resembles a
multi-tenant business.

## 2. Use a small authority system

ScreenPilot became manageable because each document owned a different kind of
truth.

| Artifact | Ownership |
| --- | --- |
| Root `README.md` | Concise public product story, live link, architecture summary, first-time onboarding. |
| Root `AGENTS.md` | Agent-only operating constraints, safety, privacy, Git rules, test isolation, process rules, and repository-wide engineering standards. |
| `docs/<PRODUCT>_SOURCE_OF_TRUTH.md` | Current product, scope, flow, architecture, security, cost, design, and release decisions. |
| `docs/<PRODUCT>_PROJECT_SPEC.md` | Original research and broad vision; immutable context once superseded. |
| `docs/<PRODUCT>_DESIGN_SYSTEM.html` | Human-scannable visual tokens and representative components. |
| `docs/tickets/<ID>-*.md` | One implementable scope packet, acceptance criteria, dependencies, and evidence. |
| `docs/operations/*.md` | Deployment, provider setup, cost controls, and release evidence. |
| App-level README | Human-facing responsibilities, configuration schema, commands, and app-specific guardrails. |

### Authority order

Use an explicit order so an agent does not revive stale decisions:

1. latest explicit owner decision;
2. current source of truth;
3. approved architecture decision record, if used;
4. ticket packet for the active implementation scope;
5. original project specification and historical research.

When a material product or architecture choice changes, update the source of
truth and the affected ticket together. Update only the narrowest owning
document; do not duplicate an operations manual into the public README.

### Decision table

Put locked choices near the beginning of the source of truth:

| Decision | Locked choice | Consequence |
| --- | --- | --- |
| Product type | Public portfolio demo | Optimize the signature journey, not multi-tenant operations. |
| Primary user | One anonymous visitor | No account or organization model unless the story requires it. |
| State lifetime | Explicitly named boundary | Storage, refresh, retry, and clear behavior become testable. |
| AI responsibility | Narrow named operations | Provider calls and evaluation stay bounded. |
| Human responsibility | Final selection/control | The UI must expose review and correction. |
| Deployment | Named services and region | Cost and privacy claims are concrete. |
| Live limit | Duration/count/size caps | Worst-case spend is calculable. |
| Provider fallback | Usually none in a demo | Fail clearly instead of maintaining two architectures. |

## 3. Translate product scope into architecture

### Choose boundaries, not fashionable services

Start with the smallest boxes that own real decisions:

- browser experience and browser-only APIs;
- private server API and provider orchestration;
- browser-safe shared contracts;
- external providers;
- only the storage or worker required by the media/data shape.

Do not add a database because production software usually has one. Conversely,
do not force a media product to be stateless if reliable large-file processing
requires temporary object storage. The honest constraint is better than a
misleading architectural slogan.

### Dependency direction

Keep applications independent and share only real boundaries:

```text
frontend -> contracts <- backend
```

The contracts package may own:

- HTTP request and response schemas;
- stable error envelopes;
- client-tool schemas;
- structured provider-output schemas;
- domain values that genuinely cross the application boundary.

It must not own:

- React state or component props;
- frontend persistence envelopes;
- Express middleware or configuration;
- provider SDK payloads;
- fixtures;
- Node-only APIs.

Applications do not import each other. They communicate through HTTP and the
declared contract package.

### Place code with the owner of the decision

| Responsibility | Location pattern |
| --- | --- |
| Framework routing and metadata | `apps/frontend/src/app` |
| One product-stage UI/browser behavior | `apps/frontend/src/features/<feature>` |
| Stable visual primitive | `apps/frontend/src/shared/ui` |
| Workflow reducer and persistence | `apps/frontend/src/features/session` |
| Cross-boundary runtime schemas | `packages/contracts` |
| HTTP validation/middleware/mapping | `apps/backend/src/http` |
| Product orchestration independent of HTTP/SDKs | `apps/backend/src/use-cases` |
| External SDK translation and deterministic fake | `apps/backend/src/providers/<provider>` |
| Server-owned deterministic demo content | `apps/backend/src/demo` |
| Grants, cookies, rate limits, and spend gates | `apps/backend/src/security` |
| Reusable synthetic/adversarial input | `tests/fixtures/<kind>` |

If a module fits two places, put it with the layer that owns the policy and
inject the lower-level capability.

### Composition rules

- Next.js route files compose features; they do not own the workflow.
- Express route handlers validate, call one use case, and map one result.
- Use cases do not know Express request/response types.
- Provider adapters do not decide product policy.
- Importing a module must not open a port, read user content, or start a
  provider request.
- Construct the Express application separately from the listening process so
  tests can exercise it without a network port.
- Avoid root barrels and catch-all `utils`, `helpers`, `common`, or `misc`
  modules.

## 4. Make the workflow explicit

### One state machine

Use one canonical reducer/state machine for product stages. Do not mirror the
current stage across route state, component state, storage state, and provider
state.

Model asynchronous work with discriminated states such as:

```text
idle -> authorizing -> running -> succeeded
                         |            |
                         v            v
                       failed       cleared
```

Use semantic identifiers and legal transitions. Reject or safely recover from
invalid restored states rather than coercing them forward.

### Derive instead of duplicate

Derive button readiness, progress labels, completion state, and available
actions from canonical state. Store a value only when it represents independent
user or provider information.

### Allow-listed persistence

Define a versioned persistence schema that starts empty and opts fields in.
Never serialize the runtime object and remove forbidden fields afterward.

For each field record:

- why it must survive refresh;
- storage mechanism and maximum lifetime;
- maximum size;
- migration behavior;
- whether it contains user content;
- clear-session behavior.

Browser-only APIs belong behind client boundaries. Initial server rendering and
hydration must not read `window`, `sessionStorage`, `File`, media devices, or
other browser-only objects.

### Cleanup is product behavior

Every feature that touches a listener, timer, media track, object URL, request,
worker, SDK subscription, or temporary file owns its cleanup and tests the
risky part. A stage transition is incomplete until obsolete effects stop.

## 5. Treat AI as a typed, measured subsystem

### One action, one documented operation

Every user action should map to at most the documented provider operations.
Retries are explicit and bounded. Do not automatically make a second paid call
to repair malformed model output unless the cost plan explicitly permits it.

### Provider ports and adapters

Define the product-facing interface first:

```ts
interface CandidateAnalyzer {
  analyze(input: BoundedInput, signal: AbortSignal): Promise<ValidatedResult>;
}
```

Then implement:

- a deterministic fake for development/tests;
- one live adapter translating to/from the provider SDK;
- optional contract tests that prove both satisfy the same behavior.

Provider model names, timeouts, retry rules, and credentials stay centralized
in validated server configuration.

### Structured output is not trusted output

Use provider-side structured output where available, then validate it with the
same runtime contract the product understands. Apply only deterministic,
source-controlled normalization that cannot invent new user facts.

Ground AI output to evidence identifiers instead of accepting copied prose or
free-form timestamps. Preserve a visible route back to the source material.

### Untrusted input stays delimited

Documents, transcripts, labels, filenames, and user prompts are data, not
instructions. Bound them before copying or transforming them and place them in
clearly delimited prompt sections. Test prompt-injection fixtures.

### Fake-first is a hard safety property

The committed default is fake and paid-disabled. Automated tests set those
values before modules load, do not read local secret files, deny network access,
and never connect to an already-running app.

Live testing requires all of the following:

- explicit owner authorization;
- synthetic or licensed test content;
- manually populated ignored environment files;
- provider/account caps checked first;
- a bounded measurement plan;
- an explicit stop/cleanup condition.

### Evaluate behavior, not exact prose

For generative behavior, build fixtures and graders around invariants:

- required and forbidden topics;
- evidence references;
- length/count limits;
- unsupported claims;
- role/scope boundaries;
- refusal and failure handling;
- duplicate-operation prevention.

Use exact string assertions only for content that is intentionally
deterministic.

## 6. Privacy and security by data-flow design

Create a data inventory before implementation.

| Data | Browser | API memory | Provider | Temporary/durable storage | Logs |
| --- | --- | --- | --- | --- | --- |
| Original input | State the exact lifetime | State whether streamed/buffered | Name any recipient | Explicitly allowed or forbidden | Never raw |
| Derived text | State the exact lifetime | Bounded request only | Minimum necessary context | Explicit TTL/none | Counts only |
| Structured result | State the exact lifetime | Response only | Model output | Explicit TTL/none | Schema/result category only |
| Credentials/tokens | Memory only where possible | Server only | Required provider | Secret manager only | Redacted |

### Accurate privacy language

Say exactly what the application controls. ScreenPilot's accurate claim is “no
ScreenPilot application database or saved candidate artifacts,” not “no data is
processed anywhere.” Providers and hosting platforms still process requests
under their own policies.

### Baseline web/API controls

- strict runtime validation on every external boundary;
- bounded request bodies, fields, arrays, durations, and outputs;
- restricted origins and CSRF/source checks on paid mutations;
- security headers and a reviewed Content Security Policy;
- same-origin browser calls where practical;
- short-lived, content-free signed grants/cookies instead of user records;
- no user content in URLs, analytics, logs, or exception payloads;
- no provider HTML rendered into the page;
- secret scanning and production dependency audit;
- least-privilege runtime service accounts;
- explicit provider and request abort timeouts.

### Logging allow-list

Log only fields deliberately approved for operations:

- timestamp, service, environment, level;
- request ID, route, status, duration;
- provider/model ID;
- sanitized failure category;
- token/minute/byte totals;
- aggregate sampled rate/capacity rejections.

Never serialize framework request objects. Redact authorization, cookies,
grants, provider tokens, user input, raw IP addresses, signed URLs, and storage
object names that expose content.

## 7. Bound spend in layers

A public kill switch is necessary but insufficient. Use independent controls:

1. fake and paid-disabled committed defaults;
2. visible disclosure and final user action before cost;
3. Turnstile or equivalent verification immediately before each paid action;
4. action-specific, single-use authorization;
5. per-source/session rate limits;
6. route-global limits;
7. per-instance in-flight capacity leases;
8. maximum input size, duration, output count, and operation timeout;
9. provider project hard limits and alerts;
10. Cloud Run minimum instances `0`, low maximum instances, and conservative
    concurrency;
11. cloud budgets/alerts and a separately configurable paid-demo switch;
12. content-free usage measurement after controlled synthetic flows.

Durable one-person quotas are not possible without durable identity and
counter state. State that limitation instead of overclaiming abuse prevention.

### Cost every flow before building it

For each path record:

```text
flow cost = provider operation A
          + provider operation B
          + compute duration × allocated resources
          + temporary storage duration
          + network delivery
          + bounded retry reserve
```

Separate underlying usage from free credits or included allowances. Measure
failed attempts that consumed resources. Reconcile planned versus observed cost
and investigate material variance.

### Spend-saving decisions that matter

- avoid a paid pre-processing call when deterministic preparation is adequate;
- send the minimum context needed for the task;
- generate previews locally or from existing source media before rendering;
- render only the variant the visitor selects;
- lazy-load heavy browser/provider dependencies at the stage that needs them;
- scale to zero and cap instances/concurrency;
- retry manually after preserving completed work;
- do not add a second provider architecture as a hidden fallback;
- expose public sample/fake paths that demonstrate the product without a paid
  operation.

## 8. Design the system before the screens

### Small design authority split

Use four layers:

| Artifact | Authority |
| --- | --- |
| Markdown source of truth | Behavior, flow, content, states, accessibility, responsiveness. |
| HTML design reference | Colors, type, spacing, surfaces, icon rules, and representative components/states. |
| One generated concept | Composition and atmosphere for the signature desktop/mobile moment. |
| Frontend code | Accessible, responsive implementation using the approved tokens. |

The generated concept may inspire hierarchy; it cannot invent behavior or
override accessibility and tokens. Figma is optional unless the product or
client workflow specifically requires it.

### Define a design thesis

Record:

- the emotional tone;
- what must feel distinctive;
- what generic AI/SaaS conventions to avoid;
- light/dark surface roles;
- typography and spacing scale;
- radii, borders, elevation, and gradient limits;
- icon family and semantics;
- motion timing and reduced-motion replacements.

Build shared tokens and primitives before styling every feature. Reuse stable
primitives and product states; do not turn a few repeated lines into an
over-general component with unrelated boolean props.

### Responsive decisions are part of product scope

Name the primary authoring device and the minimum complete experience at other
sizes. Do not accidentally ship a desktop canvas that merely shrinks.

ScreenPilot verified 320 px through 2560 px and used phone, tablet, compact
laptop, desktop, large-monitor, short-height, zoom, keyboard, and intermediate
drag-resize checks. A different product can set different priorities, but it
must state them.

Reusable rules:

- adapt one semantic component tree rather than maintaining device-specific
  feature implementations;
- use bounded readable widths on large monitors;
- treat height and safe-area insets as well as width;
- use natural page flow when a fixed workspace would clip content;
- keep primary targets at least 44 × 44 px;
- prevent horizontal page scrolling;
- preserve focus, source/provenance, errors, and recovery on every layout;
- reduce spatial motion rather than simply shortening it.

### Motion earns attention

Animate state change, provenance, or spatial continuity. Keep background
atmosphere still, avoid rapid/flashing voice or processing indicators, and
provide a deterministic reduced-motion state. Prefer compositor-friendly
opacity/transform motion.

## 9. Build with dependency-ordered tickets

### Ticket contract

Each packet should be independently understandable and include:

- objective and portfolio value;
- dependencies and files/areas owned;
- in-scope and out-of-scope behavior;
- locked decisions copied from the source of truth;
- privacy, provider, and cost constraints;
- contracts and state transitions;
- acceptance criteria;
- smallest relevant automated verification;
- manual verification;
- documentation updates;
- explicit external/owner blockers.

Ticket IDs identify scope; dependency evidence decides execution order.

### Recommended milestone pattern

```text
M0  repository, commands, configuration, fakes, design approval
M1  contracts, canonical state, fixtures, deterministic core flow
M2  provider adapters and the signature live/paid experience
M3  result/review, correction, retry, and clear
M4  abuse, privacy, accessibility, responsiveness, and performance
M5  manual release QA and whole-codebase audit
M6  deployment and measured production checks
M7  optional portfolio packaging and post-deployment hardening
```

The visual lane can progress while backend/contracts foundations are built, but
broad screen styling waits for visual approval. Live-provider setup does not
block fake-mode product work.

### Avoid pre-creating the target tree

Create a directory when its first real module arrives. Placeholder folders,
empty abstractions, and success-printing scripts create the appearance of
architecture without evidence.

## 10. Verify in proportion to risk

### Everyday rule

For an ordinary ticket:

1. run the smallest package/file typecheck or test that covers the change;
2. manually inspect the behavior changed;
3. build only when build/runtime configuration changed or a milestone ended.

Do not run the entire repository matrix after every small edit. Do not skip the
full audited gate before deployment.

### High-value deterministic tests

- parsing, normalization, and bounds;
- reducer transitions and invalid transitions;
- persistence expiry, migration, and clearing;
- API request/response/provider-output schema validation;
- provider call counts and retry prevention;
- evidence/timestamp/source references;
- timeout and abort propagation;
- rate/capacity/admission rejection before provider invocation;
- error mapping and content-safe diagnostics;
- log redaction;
- cleanup of listeners, workers, media, object URLs, and timers;
- prompt-policy and adversarial fixtures.

### Manual acceptance matrix

Include:

- happy path with a previously unused synthetic/licensed input;
- materially different input producing materially different output;
- invalid, empty, oversized, unsupported, and adversarial input;
- provider timeout/failure and manual retry;
- refresh at safe and unsafe stages;
- interrupted partial result;
- clear/delete behavior;
- keyboard and visible focus;
- reduced motion;
- phone, tablet, laptop, desktop, large monitor, and intermediate resize;
- production-like local build/start;
- exactly bounded owner-controlled live-provider flows.

### Completion audit

Before calling a ticket done:

1. search for duplicate components, schemas, constants, styles, and provider
   operations;
2. confirm dependency direction and ownership;
3. remove dead code, debug output, unsafe casts, stale flags, and superseded
   branches;
4. inspect cleanup for every side effect touched;
5. confirm no secret or real user content entered Git or logs;
6. run the smallest relevant verification matrix;
7. update the owning contract/document;
8. list anything still requiring credentials, paid calls, visual approval, or
   user-only setup as unchecked.

## 11. Deploy the audited artifact, not the workspace

ScreenPilot's reusable deployment choices were:

- GitHub Actions for unpaid quality checks only;
- manual owner-controlled deployment from an authenticated laptop;
- immutable container images tagged with the exact Git commit SHA;
- one public frontend Cloud Run service;
- one private backend Cloud Run service invoked only by the frontend identity;
- provider secrets only in Secret Manager and readable only by the backend;
- minimum instances `0`, bounded maximum instances, and explicit concurrency;
- managed HTTPS `run.app` URL before buying a domain;
- same-origin `/v1` proxying so the backend URL is not browser configuration;
- revision history and an IAM snapshot as the rollback path;
- unpaid deployed probes before the small number of authorized paid flows.

Do not add deployment OIDC, Kubernetes, Terraform, load balancing, a custom
domain, or a custom controller merely to look production-like. Add them only
when they solve an owned requirement.

### Release evidence

Record the exact revision, environment, provider/model revisions, configured
caps, request counts, durations, usage/cost, functional result, cleanup, and
unresolved blockers. Keep the record content-free: no source documents,
transcripts, generated output, account IDs, secret-bearing screenshots, or
tokens.

## 12. What not to copy from ScreenPilot

| ScreenPilot decision | Reuse only when… |
| --- | --- |
| No object storage | Inputs and outputs fit safely in browser/request memory. Video usually does not. |
| `sessionStorage` state | The result is small and a same-tab disposable session is the product promise. |
| Two Cloud Run services | The workload completes inside bounded requests. Long media processing may need a job/worker. |
| Equal phone-to-large-monitor parity | The new workflow is genuinely useful at every size. A complex authoring workflow may be laptop-first while retaining a complete mobile review path. ClipBuilder itself has no authoring surface. |
| Turnstile on three paid routes | The new app identifies its own paid boundaries; do not challenge free local work. |
| No provider fallback | One clear failure is acceptable and maintaining two paths would dilute the demo. |
| One generated concept | One screen carries the product's visual thesis. Use more only after explicit approval. |
| Browser-local original input | The browser can perform the required parsing without impractical CPU/memory cost. |
| Five-minute hard stop | The unit of paid usage is time and five minutes matches measured behavior. Derive a new cap from the new cost model. |

The principle is to inherit reasons, not values.

## 13. Common traps

- Building dashboards and CRUD because the commercial product would have them.
- Calling a deterministic heuristic “AI” or calling an LLM opinion a score.
- Claiming current trend awareness without a maintained, authorized data source.
- Letting a model emit raw executable FFmpeg commands instead of a validated
  edit manifest.
- Uploading large media through the application API when direct bounded object
  upload is safer and cheaper.
- Rendering every proposed variant before the visitor chooses one.
- Persisting the whole runtime state because selective persistence takes more
  thought.
- Treating provider structured output as trusted.
- Adding an automatic repair call that doubles worst-case spend.
- Hiding provider failure behind synthetic success in production.
- Logging framework request objects or signed media URLs.
- Confusing a budget alert with a hard cap.
- Treating free credits as a zero unit cost.
- Starting broad React styling before the visual language is approved.
- Making an image concept the behavior specification.
- Running live provider checks repeatedly when deterministic fixtures can prove
  the change.
- Marking a ticket complete with user-only or credential-dependent checks
  silently unperformed.

## 14. Starter repository shape

Use this only after the new source of truth confirms each box is necessary:

```text
<project>/
├─ AGENTS.md
├─ README.md
├─ package.json
├─ pnpm-workspace.yaml
├─ tsconfig.base.json
├─ apps/
│  ├─ frontend/
│  │  ├─ README.md
│  │  └─ src/
│  │     ├─ app/
│  │     ├─ features/
│  │     ├─ shared/ui/
│  │     └─ styles/
│  └─ backend/
│     ├─ README.md
│     └─ src/
│        ├─ config/
│        ├─ http/
│        ├─ use-cases/
│        ├─ providers/
│        ├─ security/
│        ├─ demo/
│        ├─ app.ts
│        └─ server.ts
├─ packages/contracts/src/
├─ tests/fixtures/
└─ docs/
   ├─ <PRODUCT>_SOURCE_OF_TRUTH.md
   ├─ <PRODUCT>_DESIGN_SYSTEM.html
   ├─ tickets/
   └─ operations/
```

If asynchronous media rendering is required, add one worker/job entry point
owned by a real ticket. Do not create a generic “services” layer in advance.

## 15. Reusable agent bootstrap

Give a fresh implementation agent the following context, followed by the new
source of truth and one ticket packet:

> Build this as a public portfolio demo, not a production SaaS. The source of
> truth owns current product and architecture decisions; the active ticket owns
> only its bounded implementation scope. Keep the frontend, backend, and
> browser-safe contracts independent. Use deterministic fake providers and a
> paid-disabled default. Never read ignored local secret files, use real user
> content in tests, or make a paid provider call without explicit authorization.
> Validate every external boundary, keep provider SDKs behind adapters, preserve
> evidence/provenance, bound inputs/outputs/timeouts/retries/concurrency, and
> persist only an allow-listed projection. Reuse approved design tokens and
> feature-owned modules. Run the smallest relevant verification and report
> manual, credential, paid, and visual checks separately. Do not stage, commit,
> push, deploy, or mutate external provider configuration unless explicitly
> authorized.

## 16. Project kickoff checklist

### Product

- [ ] One-line portfolio promise is approved.
- [ ] Primary visitor and signature five-minute journey are named.
- [ ] Demo, MVP, and vision scopes are separated.
- [ ] In-scope/out-of-scope lists are explicit.
- [ ] Human-control and honest-AI claims are written.

### Data and providers

- [ ] Every user artifact has a lifetime and deletion path.
- [ ] Every provider receives only the minimum necessary data.
- [ ] Provider outputs have runtime schemas and deterministic fakes.
- [ ] Paid operations, call counts, retries, timeouts, and caps are costed.
- [ ] Committed defaults cannot spend money.

### Architecture

- [ ] Each deployable component owns a necessary decision.
- [ ] Dependency direction is enforceable.
- [ ] Browser/server/provider boundaries are explicit.
- [ ] The workflow has one state authority.
- [ ] Large/long-running work has an honest storage and execution plan.

### Design

- [ ] Design thesis and anti-goals are approved.
- [ ] Tokens and representative states exist before broad styling.
- [ ] One signature concept is reviewed if useful.
- [ ] Responsive priorities, accessibility, and reduced motion are specified.

### Delivery

- [ ] Tickets are dependency ordered and independently understandable.
- [ ] Focused deterministic fixtures cover risky logic.
- [ ] Manual acceptance and release evidence templates exist.
- [ ] Deployment uses immutable artifacts, least privilege, scale-to-zero, and
      spend controls.
- [ ] The public README remains a concise portfolio story.
