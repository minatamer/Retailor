# Lessons Learned from Retrosum

> **Retailor application note — 11 October 2026:** this is an imported sibling reference, not Retailor’s product contract. Apply the [current Retailor blueprint](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md): clothing only, live 15-photo sample drafting, Tailor-led CTA styling, required product photos/chat uploads, optional three-logo branch after colour/type, three catalogue-linked business scenarios and USD/EUR storefront display. Historical free-sample, assistant/editor, asset, currency or motion settings in the source project do not override these accepted decisions. Retailor implementation work is planned in the [22-ticket queue](../tickets/README.md); no tickets are defined by this historical reference.

Reusable product, architecture and delivery guidelines for portfolio demo web applications.
Prepared **11 October 2026** from the implemented Retrosum repository, its current blueprint,
engineering guides, source modules and recorded local acceptance. This companion follows the
purpose of the existing ClipBuilder lessons and ScreenPilot portfolio playbook.

## Purpose and how to use this reference

Retrosum shows how a simple guest experience can demonstrate substantial engineering:
document understanding, exact calculations, an interactive dashboard and an agent that can
explain evidence and prepare useful changes. Its scope stays small enough for a visitor to
understand and try without an account.

Use the patterns here when designing Retailor or another demo. Adapt them to that product's
own story, data and operating limits. This file is supporting inspiration; Retailor's
[product specification](../retailor.md) and latest owner decisions define Retailor behavior.
Retrosum's budgets, credentials, approvals and product restrictions do not transfer.

The Google Cloud section describes Retrosum's prepared release pattern, matching the
Cloud Run approach used for the sibling demos. Local implementation and live acceptance
are recorded; hosted deployment acceptance is still pending as of this review.

## The method in one page

1. Start with a complete visitor story: recognizable input, useful transformation and a
   result that can be explored. Avoid a collection of disconnected feature demonstrations.
2. Make sample inputs visible and credible. A guest should inspect what the AI will read
   before committing to their own files.
3. Let the model interpret evidence; let application code own arithmetic, relationships,
   eligibility and every change to state.
4. Keep one canonical domain model. Charts, tables, forms, agent replies and summaries
   must agree because they use the same calculation and command authority.
5. Make every important metric inspectable: its period, formula, included records,
   exclusions and original sources should be one useful interaction away.
6. Give the agent a visible job beyond answering questions. It can explain a chart,
   guide the interface, prepare an editable record or propose a dashboard change.
7. Separate a proposed action from an applied action. Show the actual editable fields,
   calculate the effect, ask for confirmation and offer the latest eligible Undo.
8. Treat asynchronous results as belonging to a workspace, revision and input. A late
   response must never resurrect a reset session or overwrite a newer correction.
9. Build a safe development path with fixtures and paid-off defaults. Never quietly
   substitute simulated results when a live provider fails.
10. Keep guest recovery bounded and local where the story permits it. Accounts,
    databases, queues and permanent document storage need a specific reason.
11. Verify the risky domain logic independently, then test actual provider behavior
    and the browser journey as distinct kinds of evidence.
12. Release a recorded image pair with private provider access, bounded capacity,
    observable behavior and a practiced paid-off/rollback path.

## What Retrosum actually built

**Product sentence:** Retrosum turns financial PDF evidence into an interactive money
dashboard, with an assistant named **Retro** that explains the supplied records and helps
the visitor work with a temporary session.

The guest does not have to identify each document as an invoice, receipt or payment
statement before processing. The application interprets the documents relative to the
business and separates documented income, documented costs, recorded cash and known
open balances.

### Signature flow

1. Open a public landing page and understand the documents-to-dashboard promise.
2. Enter `/demo` and choose the original sample PDFs or eligible personal PDFs.
3. Inspect the collection and preview actual pages. No financial graph is secretly
   loaded just because the sample was selected.
4. Explicitly process the selected collection. The intended public sample uses live AI
   over those originals; development fixtures exercise the same domain flow.
5. Reach a useful dashboard from eligible results. Scanned, ambiguous, duplicate or
   inconsistent sources can remain in a synchronized review queue.
6. Open a KPI or chart, inspect its formula and contributors, and follow a source to
   the original PDF page.
7. Ask Retro about current figures, request guidance, prepare an editable record or
   propose a chart/KPI/layout change. Confirm changes locally and use latest Undo.
8. Switch between Dashboard, Documents and Records without losing the workspace.
   Refresh restores bounded completed state; reset starts an empty session.

### Implemented shape

```text
Browser
  -> Next.js frontend and fixed same-origin API bridge
       -> Express private API
            -> PDF inspection worker
            -> backend-only OpenAI adapters
            -> bounded admission and operational metrics
            -> fixed public exchange-rate lookup

Shared packages
  contracts -> strict browser-safe schemas and types
  money     -> pure calculations, commands, dashboard facts and agent grounding

Browser-owned recovery
  sessionStorage -> bounded normalized state
  IndexedDB      -> bounded temporary original PDF bytes
```

There is no application login, hosted database, permanent upload library, document bucket
or background job queue. English and exact USD source records are the first-build domain.
EUR is an optional dashboard display using an automatically retrieved dated reference
rate; it does not rewrite the original USD evidence.

## 1. Product scope and documentation authority

Write the portfolio promise before choosing services. Retrosum's promise is not merely
"extract fields from an invoice": the original documents lead to a coherent financial
workspace with evidence inspection and useful agent interaction.

The repository gives different documents clear jobs:

| Document or artifact | Responsibility |
| --- | --- |
| Current status | What is complete now and which acceptance remains |
| Product/architecture blueprint | Product behavior, invariants and boundaries |
| Active implementation packet | One coherent outcome, dependencies and acceptance |
| Engineering guide | Implemented mechanism and its practical limits |
| Validation record | Actual checks, failures, measurements and deferred evidence |
| Commit plan | Explicit file ownership and reviewable commit groups |
| Historical research/prototype | Context, without overriding the current contract |

Retrosum's original concept Markdown and HTML remain historical alongside the newer
source of truth and overview. A next-project agent should read the current authority,
not accidentally implement an attractive but superseded prototype.

**Retailor application:** keep the accepted photos → catalogue → storefront → dashboard
story central. The imported guides help engineering decisions; they must not turn
Retailor into a finance app, video editor or full commercial SaaS.

## 2. Repository layout and dependency ownership

The inspected baseline is Node 24 LTS, pnpm, strict TypeScript, Next/React, Express and
Zod, with pinned direct dependencies and a committed workspace lockfile. Exact versions
belong to Retrosum's package files; choose and verify the next project's own baseline.

```text
apps/
  frontend/
    src/app/                 route composition and same-origin bridges
    src/features/            demo, documents, session, records, dashboard, Retro
    src/components/ui/       shared interface primitives and branding
    src/server/              server-only private transport
    src/styles/              design tokens and shared primitives
  backend/
    src/http/                configured Express application
    src/config/              explicit validated configuration
    src/runtime/             composition, clocks and operation ownership
    src/documents/           bounded PDF processing
    src/retro/               investigation and chat route
    src/providers/           fake/live adapters and exchange-rate service
    src/security/            challenge, grants, admission and safe metrics
packages/
  contracts/                 strict public domain/request/response schemas
  money/                     pure calculations, commands and fact catalogues
scripts/                     ownership checks, evaluations and release packaging
test/                        independent fixtures and behavioral tests
infra/cloud-run/             reviewed service templates
docs/                        blueprint, packets, engineering and validation
```

Shared packages never load environment variables, start servers, access storage,
invoke providers or import an application. Applications import package public exports.
Client components cannot reach server-only modules. App factories accept their ports;
only explicit startup loads private configuration and opens a listener.

The repository enforces these rules with executable import-boundary checks and negative
tests, rather than relying only on folder names or comments. Build scripts produce the
shared package outputs before their consumers, avoiding stale aliases.

**Retailor application:** place products, variants, order transitions, returns, refunds,
inventory and money rules in a pure commerce domain. Keep image interpretation,
provider transport, persistence and page rendering outside that domain.

## 3. Samples that prove the complete story

Retrosum's sample is **Harbor Studio**, a fictional service business with ten original
PDFs and eighteen pages. September 2026 is the main period; August has its own visible
comparison records. The supplied as-of date is part of the sample, not today's date.

The collection contains different invoice/receipt layouts, a supplier scan, a synthetic
handwriting-style receipt, a second rendition of the same bill, payment rows and dated
historical records. Two newer receipt packs supply useful cost categories through actual
visible evidence. They enrich the dashboard without putting decorative numbers in UI code.

Important sample design choices:

- Originals, thumbnails, page counts and hashes describe the same files.
- The guest can open the evidence, including duplicates and documents awaiting review.
- Repeated pages or a second scan do not become another economic transaction.
- Handwriting rendered with a licensed font is labelled synthetic handwriting-style;
  it is not presented as proof of arbitrary human handwriting accuracy.
- Sample contact details are fictional metadata with explicit sample identity. They
  never enrich an unrelated visitor upload that happens to have the same name.
- Independent expected results belong to tests. They are not imported into the
  live application to manufacture a successful recognition result.

**Retailor application:** author a coherent clothing capsule with actual primary,
alternate, detail and worn images where available. Let the uploaded/sample photos drive
the catalogue. Separately generate clearly synthetic owner activity tied to those products.
Product photography cannot prove real sales, stock, garment measurements or material.

## 4. AI interpretation and deterministic acceptance

Retrosum checks the actual PDF bytes, signature, hash, size and page count before
provider dispatch. Backend inspection is independent of browser claims and runs in a
bounded worker. Both transports and decoding have byte caps, deadlines and cancellation.

The inspected first-build envelope is ten PDFs, twenty pages and twenty MiB combined,
with five MiB per original. Those are Retrosum's reviewed limits, not universal upload
recommendations. Unsupported/encrypted/active PDFs are rejected or receive a safe
original-download fallback rather than being treated as automatically understood.

The backend asks the model for a strict interpretation, then code verifies the result:

1. Parse the required structure and reject extra/invalid fields.
2. Resolve document role, parties, dates, identifiers and currency.
3. Preserve source locators and the inventory of printed numeric occurrences.
4. Validate amounts, quantities, tax relationships and repeated content.
5. Resolve existing economic identities and payment relationships without guessing.
6. Hold a source when its meaning or arithmetic is not safely supported.
7. Commit only eligible records through the canonical workspace authority.

Image-only figures require explicit source review. Unknown role/currency, a missing
digit, conflicting duplicate or arithmetic mismatch does not become a confident total.
The app never repairs a value by looking at expected test output.

Live extraction sends the inspected original through the backend-only provider adapter.
Structured output is still untrusted input. Refusal, incomplete output, invalid IDs,
unexpected usage or a timeout receive owned error behavior; there is no silent fake
fallback or automatic rebilling retry.

**Retailor application:** the model may draft a product name, observed colour/category,
photo grouping and copy. Code validates the structure and provenance. Size options are
templates unless supplied by the merchant; material, measurements, price and inventory
must retain their actual or synthetic origin. Ambiguous photo grouping stays editable.

## 5. One exact domain authority

Retrosum's `packages/money` owns exact integer minor units, decimal parsing, relationships,
eligibility, calculations and commands. Components and model replies cannot define
their own competing totals. Floating-point geometry can draw a chart, but it cannot
become the authoritative financial amount.

The important distinctions are part of the model, not just explanatory copy:

| Concept | Meaning in Retrosum |
| --- | --- |
| Documented income/cost | Eligible supplied economic events on their event dates |
| Recorded cash | Actual supplied payment movements on movement dates |
| Source-stated paid | Settlement evidence that need not establish a cash movement |
| Known customer/supplier open | Supported unsettled gross amounts, kept separate |
| Draft invoice | A session record excluded from posted income until issued |
| Owned-account transfer | A movement excluded from operating cash and profit |
| Duplicate source | Another rendition or reference to the same economic event |

Matching a payment requires supported direction, counterparty, currency and remaining
amount. Editing/deleting an invoice is not permission to delete an unrelated payment.
Unknown settlement or missing evidence remains unknown. A known zero and an unavailable
figure have different display states.

For example, the recorded ten-PDF initial result shows USD 4,800 income and USD 1,190
eligible costs, giving USD 3,610 profit preview. Held scan/rent/duplicate sources stay
out until reviewed. Accepting the supported additional bill/rent produces USD 2,350
costs and USD 2,450 profit; the second bill rendition still counts once. Recorded cash
remains based on the payment evidence, rather than being invented from paid receipts.

**Retailor application:** distinguish order placement, cancellation, fulfilment, physical
return, issued refund and restock. A return does not automatically issue a refund;
a refund does not automatically prove returned stock. Have one engine reconcile gross
sales, cancellation reversals, refunds, net sales, AOV and variant availability.

## 6. Dashboards as inspectable facts

Retrosum's dashboard builder returns a fact catalogue, not decorative chart values.
Each important fact includes its stable identity, workspace revision, period/as-of,
formula, availability, contributors, exclusions and original source references.

The interaction is **figure → explanation → records → original evidence**. It works
for KPI cards, category charts, open amounts, trends and comparisons. The records
register and Retro read the same authority.

Practical choices that make the dashboard useful:

- State the date basis and selected scope. Income dates and movement dates are not
  interchangeable; an as-of balance is not the same as a period total.
- Keep Dashboard and Records date selections independent. Retrosum resets their
  ranges to defaults on refresh while preserving valid records and other preferences.
- Plot only supplied history. Missing months receive an unavailable explanation,
  not invented interpolation or a plausible-looking growth line.
- Group crowded categories into a bounded **Other** that still exposes every member.
- Offer an exact data table beside each chart and support click, focus and touch.
- Preserve negative values and reconciliation signs; loss is not a visual error.
- Treat legend isolation as a picture filter unless the headline scope also changes.
- Resolve open details against the latest fact ID after edits, rather than freezing
  an old total under a newly changed chart.
- Keep source navigation reversible: close the PDF and return to the same detail.

Retrosum uses small bounded SVG chart components with native controls and data tables.
This suited its series; a next project should select a chart library only when its
requirements justify the added dependency.

**Retailor application:** KPIs should open the exact synthetic orders/refunds/stock
movements behind them. Show the selected period and seed-versus-guest origin. Feedback
themes need their supporting sample comments. No random secondary array should feed
a chart that disagrees with the orders table.

## 7. An agent that can explain, guide and prepare

Retro is a floating composer and expandable conversation integrated with the dashboard.
It can explain current facts, show sources, open registered views, guide a visitor,
prepare record changes and propose useful dashboard widgets or layout changes.

The backend validates the submitted graph and recomputes its facts. A bounded
investigator uses a finite tool catalogue and strict decision contracts. In the reviewed
implementation, one turn allows at most three model requests, four aggregate tools and
a sixty-second reply operation, with no automatic retries. Verification has a separate
bound before that reply deadline begins.

The model selects supported topics, fact IDs, registered targets and proposed intent.
Application code verifies sources and builds approved explanations from current facts.
Free prose, arbitrary totals, invented causes, remote URLs and provider CSS selectors
do not acquire authority.

A reply is tied to workspace identity, revision and complete filter scope. If those
change, an old explanation cannot continue presenting itself as current. Refreshing
a stale explanation is a deliberate current-fact operation, not a hidden paid request.

Local explanations, source opening and tours remain useful when live AI is unavailable.
Opening chat or reconnecting capability information does not dispatch a paid turn.
Retro describes the supplied evidence; it does not provide financial, tax, legal or
investment advice or perform external money actions.

**Retailor application:** a shopper agent can explain products and prepare a bag;
an owner agent can explain synthetic sales/refunds, inspect low stock or prepare
catalogue changes. Give each a small relevant tool set. Never infer real customer
demand, product quality or revenue from a generated catalogue alone.

## 8. Editable changes, confirmation and latest Undo

Retrosum uses one command engine for manual forms and agent-prepared changes. The
provider proposes intent; it cannot apply a mutation. Preparation creates a detached
preview, checks identities and relationships, and calculates the effect.

The visible change flow is:

1. Resolve the requested record and ask together for missing or ambiguous core fields.
2. Open the real editable form with the prepared values.
3. Fill supported fields with owned animation while preserving visitor edits.
4. Show the effect calculated from the actual current form values.
5. Confirm against captured workspace identity, revision, expiry and command ID.
6. Apply one validated atomic group and expose a latest eligible Undo receipt.

Late automatic field filling must not overwrite a field the visitor already changed.
Confirmation waits for filling and validation; cancel, navigation or reset stops timers.
Ambiguous names never select the first record silently. A missing date year receives
explicit choices rather than a guessed destructive change.

Commands validate the final graph before committing. Failure leaves the old graph
unchanged; duplicate command IDs cannot apply twice. Undo restores the affected group
at a new revision, and later mutations invalidate older receipts. Saved messages contain
inert data, not a runnable callback or proposal that can replay after refresh.

Dashboard chart/KPI/layout proposals also retain captured data and presentation
revisions. Changing the underlying figures or dashboard makes a former proposal stale.
Customization changes the presentation, not the financial evidence itself.

**Retailor application:** use this for catalogue corrections, merchant size templates,
owner widgets and reviewed store operations. Recheck stock/price at checkout confirmation.
Reject a second cancellation/refund/restock, and invalidate stale shopper suggestions
after a product or variant changes.

## 9. Session state, asynchronous work and recovery

The session controller owns the graph, revisions, finalized messages, preferences,
replay identities and the latest eligible receipt. Components subscribe; they do not
create a parallel ledger or change the domain directly.

An asynchronous operation carries workspace identity, generation, input revision and
operation ID. Every commit verifies that ownership again. Reset/expiry aborts registered
effects; a late extraction, challenge or agent response cannot populate the new session.

Four document workers may overlap requests, but results commit in selection order
against the current batch-owned revision. Cancel preserves completed sources, aborts
active work and leaves queued originals unsubmitted. A failed source need not destroy
the rest of the collection. Refresh marks interrupted work cancelled rather than
automatically starting another paid extraction.

Retrosum's recovery is deliberately bounded:

| Stored item | Reviewed behavior |
| --- | --- |
| Normalized projection | Strict allow-listed `sessionStorage`, at most 2 MiB |
| Finalized conversation | At most forty bounded messages; no pending execution |
| Original PDFs | Temporary native IndexedDB cache, five MiB/file and twenty MiB/session |
| Cross-session cache envelope | Eighty MiB with expired-remnant cleanup |
| Lifetime | Fixed two hours from creation; refresh does not extend it |
| Duplicated tab | Ownership lease/fork; no borrowing another tab's uploaded originals |
| Missing/corrupt storage | Honest recovery notice with usable in-memory state |
| Reset | Fresh empty identity; clear only owned records/resources |

Secrets, grants, controllers, object URLs and Base64 copies are outside persisted state.
Missing original bytes do not erase valid normalized records or pretend the original
is still available. Cleanup is owned and bounded; browser closure is not a guarantee
of immediate physical erasure.

**Retailor application:** the generated catalogue, storefront and owner dashboard should
share one guest workspace. Decide separately whether uploaded photos need refresh
recovery. Reuse the ownership and expiry principles without copying PDF-specific quotas.

## 10. Visual design that supports the work

Retrosum has an explicit visual system: forest green, burnt orange and ivory,
professional vintage typography, shared tokens and a canonical geometric logo. Brand
components reuse that logo rather than independently redrawing it in each screen.

Its route progresses through **Choose → Documents → Process → Dashboard** inside
`/demo`, without query/hash strings as a second source of state. Landing and processing
establish the story before the denser workspace appears.

Useful interface lessons include:

- Lead with the product result and a clear sample/upload entry.
- Make source preview and correction natural parts of the main workflow.
- Keep exact amounts readable immediately; animate chart geometry and transitions.
- Pair hover behavior with keyboard focus and tap controls.
- Use one consistent dialog layer with focus return, visible close controls and
  cancellation of its owned rendering work.
- Measure the actual floating agent dock and reserve enough content space around it.
- Test short viewports and virtual-keyboard geometry, not only wide desktop screenshots.
- Make tours use registered visible targets. Scrolling can interrupt positioning
  without destroying the visitor's ability to continue or dismiss the tour.
- Keep contextual examples useful without filling the workspace with permanent hints.

Retrosum's owner explicitly chose always-running intended motion. That is a Retrosum
product decision; adopt Retailor's own motion/accessibility contract deliberately.
Do not treat one sibling's palette, logo, headline or settings as a shared brand system.

**Retailor application:** desirable clothing imagery and storefront interactions deserve
their own fashion identity. Reuse dashboard clarity, evidence details and agent/form
behavior while designing the shopping surface for browsing and product confidence.

## 11. Fake/live parity and explicit capability

Committed Retrosum defaults are fake and paid-off. Fixtures let development and tests
exercise the same schemas, money engine, forms, charts and revision rules without model
spending. An unfamiliar uploaded document has no invented fake OCR result.

Live mode is selected explicitly, requires its actual backend prerequisites and never
silently falls back to fake. `PAID_DEMO_ENABLED` is the single live paid switch for both
documents and Retro. A public capability contract exposes availability and safe reasons
without leaking private configuration.

Health and readiness have different meanings: an alive process can still be unavailable
for a selected live capability. Missing credentials/admission, a disabled paid path or
an unavailable adapter produces predictable behavior. Local manual/source interactions
remain useful where supported.

**Retailor application:** separate authored sample interpretation, actual live vision
recognition and synthetic commerce history. A convincing UI should not make arbitrary
uploaded images look recognized when only placeholders were created.

## 12. Admission and spending as part of the architecture

Retrosum's Process action approves the exact selected document manifest after concise
handling disclosure. One challenge verification establishes bounded batch approval;
each actual upload receives a fresh short-lived, single-use grant tied to its exact
request and PDF identity. Retro Send separately approves the exact turn with inline
verification. Selection, preview and opening chat do not spend provider credits.

The backend checks input binding, expiry, replay, capacity and conservative cost
reservation before provider dispatch. It caps actual bytes, context, output, tools,
model requests and elapsed time. Cancellation propagates through owned transports;
unknown provider outcomes retain their reservation rather than inviting a free retry.

The reviewed expensive-operation capacity is four slots per backend process. Slots,
run counters and reservation releases have explicit owners; one completion cannot free
another operation's slot. Retrosum's current per-run allowance is USD 2.50. Its owner
also confirms a separately configured USD 5 OpenAI limit and Google Cloud budget
controls/alerts at USD 5 and USD 10.

These figures describe Retrosum's setup. Process-local quotas, restarts, anonymous
identities and overlapping service revisions do not establish a durable global account
cap. Cloud alerts and provider controls have different scopes. A new app needs its own
cost model and verified settings; credentials or approval from a sibling are not inherited.

**Retailor application:** bound photos, aggregate bytes, image detail, product/variant
count, provider calls, turns and concurrency. Decide which visitor action authorizes
recognition; store browsing and switching to the owner dashboard should remain local.

## 13. Privacy, originals and safe diagnostics

Original PDFs stay in bounded browser storage and transient processing memory. Retrosum
adds no hosted upload library, document bucket or permanent conversation store. The
provider receives disclosed inputs for explicit processing; its data handling remains
separate from application cleanup.

Document processing sends the selected original; Retro receives normalized current
records, the question and bounded conversation rather than automatically attaching
every original. Unneeded contact/email/account fields stay outside its model context.
Generated content is rendered as untrusted text, not executable application markup.

The private API bridge forwards fixed routes to a fixed backend. It does not accept
arbitrary URLs, redirect destinations or browser-supplied backend Authorization.
Hosted origins and runtime identity have explicit configuration and validation.

Operational logs use an allow-list such as operation route, mode, status and bounded
duration. They omit original contents, extraction text, chat, filenames, credentials,
grants and raw errors. Platform request logs need their own retention/access review.
Safe application logging alone does not describe all cloud/provider retention.

The current guest UI retains actual original PDF downloads. Workspace ZIP and generated
invoice export controls were removed. An old module on disk or old acceptance note is
not evidence that a feature is still exposed in the current product.

**Retailor application:** keep uploaded photos and generated descriptions out of public
logs; avoid collecting real customer/payment information for demo checkout. Reset can
clear owned browser state but cannot recall something already downloaded or sent to a
provider. Promise only the handling the implementation actually controls.

## 14. Verification that measures the right thing

Retrosum separates deterministic domain checks, actual provider evaluations, browser
evidence and deployment acceptance. A successful simulation does not prove PDF reading,
and a live sample success does not establish every possible upload's accuracy.

### Deterministic checks

- Exact money parsing/rounding, event eligibility and settlement relationships.
- Duplicate economic references and repeated-page exclusion.
- Draft/issue/payment distinction, grouped CRUD and latest Undo.
- Stale revisions, duplicate command IDs, late results and reset/expiry races.
- Dashboard formulas, scope, source contributions, missing history and negative values.
- Strict provider output, wrong IDs, refusal, cancellation and bounded decoding.
- Challenge/grant input binding, replay, expiry, boot changes and paid-off rejection.
- Browser recovery corruption, quota, missing originals and duplicated-tab ownership.
- Executable dependency boundaries, including intentionally invalid imports.

Tests replace inherited paid settings and prohibit external HTTP/network dispatch.
Mocks and fake providers must not accidentally use the developer's live credentials.

### Actual AI and browser evidence

The recorded acceptance includes two independent actual-byte passes over the ten-PDF
corpus, record/source audits and seventeen live Retro cases. Expected fields are loaded
for evaluation after provider results, rather than supplied as answers to the model.

The current validation record also reports a fresh ten-PDF localhost browser run reaching
the dashboard in about two minutes two seconds, with ten successful extractions and the
expected review holds. That is a dated measurement on this setup, not a hosted speed
guarantee. The guide does not rerun or upgrade that evidence.

The latest recorded root gate passed formatting, lint, strict types, ownership checks,
408 tests across forty files and both production builds. These are repository-recorded
results, not checks newly executed while writing this reference.

Retrosum's root verification commands are:

```text
pnpm format:check
pnpm lint
pnpm typecheck
pnpm check:boundaries
pnpm test:unit
pnpm build
```

`pnpm check` combines them. New live evaluations require their own authorization and
current provider cost review; no paid evaluation is needed to read or apply this guide.

**Retailor application:** independently verify price/stock transitions and synthetic
metric reconciliation. For image recognition, measure grouping, visible attributes,
unknown facts and inappropriate sizing claims, then inspect the actual generated store.
Test one complete guest order appearing correctly in the owner view, plus independent
return/refund/restock paths and stale agent proposals.

## 15. Standard Google Cloud release pattern

Retrosum uses the same deployment tool family as the sibling demos: Google Cloud Run,
Artifact Registry, Secret Manager, separate runtime identities and Cloudflare domain/DNS
handling. Keep this a small two-service release, without adding a database or upload
bucket just to match a conventional SaaS diagram.

```text
Visitor -> public frontend Cloud Run service
                |
                | server-only authenticated request
                v
           private backend Cloud Run service -> approved provider endpoints

Artifact Registry -> immutable frontend/backend images
Secret Manager    -> approved backend runtime secret bindings
```

### Topology and identities

- The browser talks to the frontend's same-origin bridge.
- The backend requires authenticated invocation; the approved frontend service account
  has narrowly scoped service-level invocation permission.
- The frontend does not need the OpenAI secret. The backend receives only its named
  provider/challenge/grant secret versions.
- Operator/build identity is separate from runtime identity. Avoid project-wide
  administrative permissions as a runtime shortcut.
- Application origins and receiving-service audience are explicit; forwarded browser
  headers cannot redefine private transport destinations.

The reviewed templates start with zero minimum instances and a one-instance maximum,
nonroot containers and bounded concurrency/timeouts. Current HTTP concurrency is eight
for frontend and six for backend to leave room around four expensive operations.
Measure hosted memory/capacity for the intended files before treating those values as
adequate for another product or expecting a global cap across overlapping revisions.

### Packaging, release and rollback

1. Run the settled source checks and package the accepted commit in Linux.
2. Verify the actual final runtime contains shared package outputs, public samples,
   PDF worker/runtime assets, fonts and required static files, without private env files.
3. Build and probe the nonroot frontend/backend image pair in fake and paid-off modes.
4. Record registry digests for both images; a mutable tag is not a release identity.
5. Bind the verified service origins, runtime identities and named secret versions.
6. Deploy private backend and initially closed frontend, verify the bridge and backend
   anonymous denial, then expose the intended frontend entry after release approval.
7. Verify domain/HTTPS, challenge hostnames, retention, logs and capacity in the hosted
   environment before enabling the selected live path.
8. Record an actual guest walkthrough and operation measurements; preserve unchecked
   acceptance instead of turning a local container probe into a hosted claim.
9. Keep paid-off available and route back to a recorded compatible paid-off image pair
   during rollback. Previously dispatched requests may still finish.

The owner confirms Retrosum's Google Cloud project, budget controls/alerts and deployment
secrets already exist. The prepared templates and local packaging evidence support this
release pattern; a verified hosted release record still belongs to deployment work.

**Retailor application:** follow the same service/identity/secret/image discipline.
Choose resource limits for photo processing, not PDF processing. A production storefront
with real checkout, webhooks, customer accounts and merchant persistence needs a separate
commercial architecture and acceptance plan.

## 16. Tickets, commits and practical operation

Retrosum's twelve dependency-ordered packets covered foundation, brand/landing, original
samples/viewer, money/session authority, recognition/review, dashboard, Retro conversation,
Retro editable CRUD, session lifecycle, security/spend, product acceptance and release
preparation. Each packet delivered a coherent part of the visitor story.

Useful delivery rules:

- Read the complete packet and relevant current blueprint before changing code.
- Define one outcome, the functionality to preserve and the domain authority it uses.
- Allocate explicit paths and coherent commit groups before staging.
- Verify risky boundaries with meaningful tests instead of mirroring implementation.
- Review the settled result after the required checks, then advance dependencies.
- Record corrected failures, actual measurements and deferred external acceptance.
- Keep secrets, dependencies, screenshots, generated reports and build output out of
  ordinary commits; preserve useful evidence in owned ignored output where appropriate.
- Keep task-specific approvals local to the project and action they actually cover.
- Use documented local startup, ports and configuration. Start/stop only owned services
  and verify process identity rather than killing every Node process or a guessed port.

**Retailor application:** build the shared commerce state before disconnected dashboard
screens. Deliver image input/catalogue generation, usable storefront, connected owner
operations and agents as vertical outcomes. Verify each before expanding polish.

## 17. What Retailor should inherit

| Retrosum pattern | Retailor adaptation |
| --- | --- |
| Samples or personal documents, with previews | Sample clothing collection or personal product photos, with visible originals |
| No initial document-type entry | No mandatory product name/category/description entry before AI drafting |
| Strict interpretation with review holds | Editable catalogue with observed, generated, unknown and demo-default provenance |
| One pure money/command authority | One pure commerce authority for catalogue, variants, orders, refunds and inventory |
| Metric → formula → record → PDF | Metric → formula → synthetic order/refund/stock movement |
| Supplied history only | Clearly synthetic seed history tied to the generated catalogue |
| Retro explains and prepares | Shopper agent helps browse/build a bag; owner agent explains and prepares changes |
| Editable form, effect, confirmation, Undo | Reviewed catalogue/operation proposals using the same manual command path |
| Revision/generation-owned results | Discard recognition/chat results after reset, product edits or stock changes |
| Bounded browser guest recovery | One catalogue/storefront/dashboard session with deliberate photo handling |
| Fake fixtures with no live fallback | Prepared development/sample behavior distinct from actual image recognition |
| Private provider adapter and admission | Backend-only vision/chat keys, exact action consent and bounded spend |
| Shared UI tokens and brand components | A distinct clothing/store identity across landing, storefront and dashboard |
| Small Cloud Run release | Public frontend, private provider backend and verified image pair |

The especially valuable combination is **beautiful output + inspectable information +
useful agent action**. For Retailor, the shopper sees a desirable store, while the
potential client can switch into a dashboard that explains its figures and demonstrates
real, coherent operations over the same products.

## 18. Decisions the next project must make for itself

Before implementation, settle:

- The signature visit and what a guest can complete without typing or signing in.
- Which catalogue attributes can be observed, drafted, supplied or synthetic.
- Photo grouping and review rules, supported image formats and useful upload limits.
- Sample asset authorship, licensing and the exact synthetic owner-data story.
- Canonical order/return/refund/restock transitions and visible metric definitions.
- Shopper-versus-owner agent tools and which operations require confirmation.
- Session expiry, photo recovery, reset and duplicated-tab behavior.
- Provider/model/cost policy, paid-off behavior and abuse/capacity controls.
- Brand tokens, motion, responsive behavior, keyboard/touch and useful drilldowns.
- Local, live, manual and hosted acceptance for the actual intended public experience.

Do not mechanically inherit Retrosum's USD-only source domain, PDF viewer, financial
record families, forest/vintage identity, exact quotas or account configuration.

## Source map and sibling guides

Reviewed sources are local project evidence, not a new upstream product specification.
This is a dated reference; return to the source repository before depending on a later
implementation detail or operating limit.

| Source | Why it was inspected |
| --- | --- |
| [Retrosum current status](../../../Retrosum/docs/CURRENT-STATUS.md) | Current completion and evidence boundaries |
| [Retrosum blueprint](../../../Retrosum/docs/RETROSUM_DEMO_SOURCE_OF_TRUTH.md) | Visitor contract, domain meaning and architecture |
| [Foundation](../../../Retrosum/docs/engineering/FOUNDATION.md) | Stack, dependency direction, startup and checks |
| [Money and sessions](../../../Retrosum/docs/engineering/MONEY-SESSIONS.md) | Canonical graph, exact amounts, commands and recovery |
| [Recognition](../../../Retrosum/docs/engineering/RECOGNITION.md) | Original-byte processing, validation and review |
| [Dashboard](../../../Retrosum/docs/engineering/DASHBOARD.md) | Fact catalogue, scope, chart interaction and sources |
| [Retro](../../../Retrosum/docs/engineering/RETRO.md) | Bounded investigation, grounding, guidance and editable changes |
| [Security/admission](../../../Retrosum/docs/engineering/SECURITY-ADMISSION.md) | Consent, exact grants, reservations and private transport |
| [Export/lifecycle history](../../../Retrosum/docs/engineering/EXPORTS-LIFECYCLE.md) | Cleanup mechanisms; current export scope comes from current status |
| [Harbor corpus](../../../Retrosum/docs/research/HARBOR-FIXTURES.md) | Visible sample evidence and independent ground truth |
| [RET-011 validation](../../../Retrosum/docs/validation/RET-011.md) | Recorded actual live/local acceptance and limitations |
| [Manual deployment](../../../Retrosum/docs/operations/MANUAL-DEPLOYMENT.md) | Prepared Cloud Run image/identity/release pattern |
| [Cloud Run templates](../../../Retrosum/infra/cloud-run/backend.service.template.yaml) | Current bounded service configuration, with separate frontend template |
| [Workspace package](../../../Retrosum/package.json) | Actual runtime constraints and verification commands |
| [Money implementation](../../../Retrosum/packages/money/src/metrics.ts) | Exact event/cash/open computation |
| [Session controller](../../../Retrosum/apps/frontend/src/features/session/session-controller.ts) | Empty initial state, ownership and recovery composition |
| [Runtime composition](../../../Retrosum/apps/backend/src/runtime/compose.ts) | Fake/live prerequisites and capability authority |
| [Custom dashboard authority](../../../Retrosum/packages/money/src/custom-dashboard.ts) | Fact-derived charts, exact display conversion and layout |
| [Dashboard request UI](../../../Retrosum/apps/frontend/src/features/retro/dashboard-request.tsx) | Editable proposals, current revisions and application-owned Apply |

The other two files in this folder are existing guides copied without rewriting:

- [Lessons Learned from ClipBuilder](LESSONS_LEARNED_FROM_CLIPBUILDER.md): the original
  reusable engineering lessons, sourced from the preserved original in the Upwork MCP
  history archive. This avoids carrying Retrosum-specific adoption notes into Retailor.
- [Portfolio Demo Build Playbook](PORTFOLIO_DEMO_BUILD_PLAYBOOK.md): the ScreenPilot-derived
  methodology already present in `ClipBuilder/docs/reference`.

Their internal links and scope notes retain the original source-project context. Those
imports supply reference material, not Retailor requirements or permission to perform
provider, cloud or external account actions.
