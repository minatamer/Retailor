# Retailor — product, architecture and delivery blueprint

**Status:** accepted documentation baseline and a 22-ticket implementation queue; implementation is underway in fake mode; paid and hosted acceptance remain pending.\
**Prepared:** 11 October 2026.\
**Product:** Retailor. **Sample clothing brand:** FORME.\
**Companion:** [Retailor product overview](RETAILOR_OVERVIEW.html).\
**Implementation queue:** [22 detailed tickets](tickets/README.md); RTL-001–017 locally implemented, next eligible packet RTL-018; owner visual/device/zoom and paid evidence remain separately pending.\
**Signature promise:** **Bring your products. See your store.**\
**Owner decisions incorporated:** all eleven answers on clothing-only scope, researched presets, Tailor-led setup, optional logos, mandatory photos, catalogue integrity, three scenarios, live sample processing, runway direction, image sourcing and USD/EUR; 11 October 2026.

Retailor helps an anonymous visitor turn product photographs into a drafted catalogue, use Tailor’s interactive chat to choose a beautiful complete clothing-store template and make it their own with curated colour and typography presets. Every product requires a photo; the prepared 15-item sample supplies photos and receives fresh live AI interpretation, just like uploads. The storefront is the main showcase; the connected owner workspace proves the store has a useful operating system behind it. Tailor, the friendly AI copilot, helps with setup, shopping, tours, explanations and reviewed operations; application code controls prices, stock, calculations and changes. The visitor can complete the experience without signing in, typing product descriptions, paying for an order or connecting a commerce platform.

This document describes what to build, why it belongs in the demo, how its parts work together and how completion will be demonstrated. It deliberately goes beyond a feature list. It defines screen behavior, boundaries, state, domain rules, AI responsibilities, privacy, infrastructure, engineering practices and acceptance.

The target is a coherent five-minute portfolio experience demonstrating a reusable ecommerce foundation. A production store, payment processing, shipping services, legal store policies and an authenticated merchant platform are separate work.

> **Execution boundary:** the owner has authorized the full execute/validate queue, local fake-mode services and ticket-prefixed commits after clean validation. No API keys or paid budget have been provided; prepare live adapters and local deployment files while those external checks remain pending. RTL-001 introduces the local foundation. Later routes/features/settings below remain intended until their owning tickets have actual evidence.

## Contents

1. [Authority, status and reference inheritance](#1-authority-status-and-reference-inheritance)
2. [Product contract and audience](#2-product-contract-and-audience)
3. [Decisions and scope](#3-decisions-and-scope)
4. [Landing page specification](#4-landing-page-specification)
5. [Canonical visitor journey](#5-canonical-visitor-journey)
6. [Routes, shell and navigation](#6-routes-shell-and-navigation)
7. [Photo selection, preview and handling](#7-photo-selection-preview-and-handling)
8. [Catalogue recognition and review](#8-catalogue-recognition-and-review)
9. [Storefront and product experience](#9-storefront-and-product-experience)
10. [Bag and simulated checkout](#10-bag-and-simulated-checkout)
11. [Owner workspace](#11-owner-workspace)
12. [Synthetic collection and activity](#12-synthetic-collection-and-activity)
13. [Commerce domain and exact calculations](#13-commerce-domain-and-exact-calculations)
14. [Commands, revision control and proposals](#14-commands-revision-control-and-proposals)
15. [AI capabilities and assistant behavior](#15-ai-capabilities-and-assistant-behavior)
16. [Guest state, recovery and cleanup](#16-guest-state-recovery-and-cleanup)
17. [Architecture and framework](#17-architecture-and-framework)
18. [Repository layout and ownership](#18-repository-layout-and-ownership)
19. [Data contracts and API](#19-data-contracts-and-api)
20. [Provider integration and evaluation](#20-provider-integration-and-evaluation)
21. [Configuration and local operation](#21-configuration-and-local-operation)
22. [Security, admission and privacy](#22-security-admission-and-privacy)
23. [Resource limits and cost control](#23-resource-limits-and-cost-control)
24. [Visual system, motion and accessibility](#24-visual-system-motion-and-accessibility)
25. [Verification and evidence](#25-verification-and-evidence)
26. [Infrastructure, deployment and operations](#26-infrastructure-deployment-and-operations)
27. [Implementation sequence and ticket map](#27-implementation-sequence-and-ticket-map)
28. [Documentation and collaboration practices](#28-documentation-and-collaboration-practices)
29. [Decisions to settle during implementation](#29-decisions-to-settle-during-implementation)
30. [Definition of complete](#30-definition-of-complete)

Appendices: [recovery matrix](#appendix-a--recovery-matrix), [worked commerce example](#appendix-b--worked-commerce-example), [public copy](#appendix-c--public-copy-and-error-language), [reference map](#appendix-d--reference-map), [glossary](#appendix-e--glossary), [design and dashboard research](#appendix-f--design-and-dashboard-research), [sample-photo sourcing](#appendix-g--sample-photo-sourcing-and-production), [logo and currency references](#appendix-h--logo-and-currency-reference-notes).

## 1. Authority, status and reference inheritance

### 1.1 Documentation authority

Use this order when decisions conflict:

1. The latest explicit owner instruction.
2. This Retailor blueprint, updated to incorporate that instruction.
3. A subsequently accepted Retailor architecture or design decision.
4. The [planned implementation packet](tickets/README.md) for the specific work, applying this blueprint within its scoped outcome.
5. The original Retailor concept documents and the sibling references.

The [original Markdown](retailor.md) and [interactive concept HTML](retailor.html) are retained as source material. They contain useful product exploration and a self-contained concept preview. They are superseded as implementation authority by this blueprint. Their simulated interactions do not establish that Retailor has a backend, real vision recognition or a deployed app.

The new HTML companion summarizes this blueprint for the owner. It owns no separate product rules and is not a second application prototype. Detailed engineering decisions belong here; its purpose is fast comprehension.

### 1.2 What was actually inspected

This blueprint was informed by the Retailor concept files, all three imported reference guides, and direct exploration of the three sibling repositories. Inspection included their documentation, repository instructions, dependency manifests and selected implementation modules. Reading a sibling's recorded validation is not the same as rerunning it.

| Reference | Useful inspected material | Retailor inheritance |
| --- | --- | --- |
| ClipBuilder | Product authority, frontend/backend manifests, application factory, cloud release guide and imported lessons | Explicit boundaries, capability parity, safe diagnostics, lifecycle ownership, immutable deployment and no accidental paid development |
| ScreenPilot | Source of truth, repository instructions, staged-session structure, workspace manifests and manual Cloud Run guide | Public landing followed by a bounded guest workflow, same-origin private API bridge, structured contracts and unpaid quality gates |
| Retrosum | Current blueprint, foundation guide, session controller, pure command module, runtime composition, release preparation and imported lessons | One exact domain authority, shared workspace, evidence drilldown, revision-bound proposals, browser recovery and dashboard/assistant integration |

Specific paths are linked in [Appendix D](#appendix-d--reference-map). Sibling documentation can change after this dated inspection. Do not copy a historical setting without checking its current owner and purpose.

### 1.3 Reuse the backbone, adapt the domain

The intended framework and infrastructure family are the same: pnpm workspace, strict TypeScript, Next.js/React frontend, Express backend, browser-safe shared contracts, pure shared business logic, deterministic fakes, Docker, Google Cloud Run, Artifact Registry, Secret Manager and Cloudflare where the domain and abuse challenge require it.

Retailor uses OpenAI for live catalogue interpretation, text assistants and an optional, separately approved three-logo generation batch. It has no reason to inherit video rendering, FFmpeg, Remotion, voice interviews, PDF parsing or financial-document recognition. Those solve the siblings' product problems. Retailor adds bounded image decoding and a pure commerce package because its own workflow requires them.

The infrastructure remains two deployed services. Uploaded images fit a deliberately small browser/request workflow. There is no database, server upload bucket, background queue or worker service in the initial architecture. A bounded local decoding worker inside the backend process is permitted for isolation; it is not a third deployed application.

### 1.4 Evidence language

Use these words consistently:

| Label | Meaning |
| --- | --- |
| Required | A product or engineering requirement for the intended first demo |
| Proposed baseline | A concrete starting choice in this blueprint, still to be measured or visually reviewed |
| Prepared sample | Authored interpretation of known sample photographs; no fresh AI call is implied |
| Development simulation | Deterministic fake provider behavior for implementation and testing |
| Live interpretation | An actual provider request over the selected images |
| Synthetic activity | Authored/generated demo orders, stock and feedback; never real commercial history |
| Verified | A named check was actually performed against an identified revision and environment |

Local implementation progress is recorded in the queue and validation records. No paid provider or hosted acceptance is claimed.

## 2. Product contract and audience

### 2.1 The product sentence

**Give Retailor your products; it turns them into an ultra-smooth ecommerce storefront you can style, shop and operate, with Tailor beside you.**

The central proof is the quality of the storefront, rather than the presence of a chatbot. Photos become editable product drafts; reviewed products immediately populate professionally authored templates. A template includes a coordinated storefront home, product listing and product detail page. Colour and typography choices change those pages visibly in real time.

The creator should feel: **these are my products, this looks like a real brand, and choosing a beautiful store was easy.** Every shipped design option must support that feeling. A larger collection of uneven templates is less valuable than a small collection in which every option looks excellent.

### 2.2 Audience and portfolio value

The primary audience is people starting an ecommerce brand, especially clothing founders who want confidence that their products can become a desirable store. Existing merchants, agencies, product managers and potential clients are secondary viewers of the same demo. No ecommerce or design expertise is assumed.

Three perspectives share one temporary workspace:

- **Creator:** upload or choose products, review the draft, choose a template, colour theme and typography, then enter the store.
- **Shopper:** browse the same store, ask Tailor to find products or apply filters, explore details, fill a bag and place a demo order.
- **Owner:** inspect the matching activity, charts and records; create or edit products and simulate business operations through forms or Tailor.

The owner view is a demo perspective, not authentication. Shopper tools still stay separate from owner mutation tools, so the experience behaves credibly when someone asks a shopping assistant to change a price.

### 2.3 Ten-second comprehension

The public landing should communicate four things through its hero and one clear primary action:

1. Bring product photos or use the sample.
2. Review the AI draft and make the storefront your own through visual choices.
3. Get a beautiful connected store, shopping copilot and owner dashboard.
4. Explore freely: no signup, real payments or production commerce connection.

The words should be aspirational and plain. Technical architecture, artificial intelligence jargon and long setup checklists belong outside this opening explanation.

### 2.4 Success priorities

The core sequence is **products → draft → review → visual styling → storefront**. Product acquisition, review and styling are one calm progressive page inside `/demo`, inspired directly by Retrosum's expanding-source and processing transitions. The storefront receives the largest share of design effort. Dashboard depth supports it and must not displace the central promise.

Three memorable moments establish value:

- Real supplied images become a coherent catalogue without mandatory product typing.
- Switching a complete template, palette or typography immediately makes the same products look like a different considered brand.
- A demo order, refund, product edit or stock change appears consistently across the store, dashboard and Tailor's evidence.

The 15-photo sample should reach a styled store with little deliberate interaction, while allowing realistic live-processing time; a broader guided visit should fit roughly five minutes. These are targets to measure later. An optional tour may help, but neither typing to a chatbot nor completing a mandatory onboarding questionnaire should be required.

## 3. Decisions and scope

### 3.1 First-demo decisions

These are accepted owner decisions. Visual tokens and implementation limits below are concrete proposed implementations of them, rather than questions to ask again.

| Decision | Required direction | Consequence |
| --- | --- | --- |
| Product scope | Clothing, permanently within this demo: formal, semi-formal, casual, beachwear and other garments | No general-goods catalogue, footwear, bags or accessory sample |
| Main promise | Ultra-smooth, beautiful storefront from supplied clothing photos | Storefront and setup quality lead acceptance |
| Brand | Retailor platform; FORME fictional sample; Tailor copilot | Separate platform, merchant and companion identities |
| Flow | Photos → live draft → review → Tailor styling → storefront ↔ dashboard | Continuous one-page `/demo` shell |
| Library | 3 complete templates × 4 colour themes × 3 typography presets | 36 combinations; all three page types reviewed, 108 page compositions |
| Setup interface | Interactive Tailor chat with native CTA buttons, cards, specimens and uploads | No typing required for the main setup; manual design overrides live in the owner dashboard |
| Brand details | Optional name, headline and supplied hero image; text wordmark by default | Keep a polished result without logo generation |
| Logo branch | Optional three AI logo choices after colour and typography are confirmed | Bounded explicit generation; failure never blocks a store |
| Product creation | Photo is mandatory through both dashboard and Tailor | Inline chat upload and one shared photo-validating form/command |
| AI drafting | Live processing for uploads AND the prepared sample on every fresh draft | No public precomputed-catalogue shortcut or simulated recognition fallback |
| Sample | About 15 distinct garments, including jeans, hoodies and tees | AI-generated original photography preferred; licensed stock researched as an alternative |
| Scenarios | Healthy profit, near break-even and heavy loss | Fictional business records reference the actual published catalogue |
| Facts | Items, variants, photos, current prices and stock agree across all surfaces | No phantom best-sellers or independently invented dashboard product totals |
| Session | Browser memory and bounded same-tab recovery; fixed two hours | No database, accounts or durable merchant storage |
| Language/currency | English; USD source amounts; optional automatically converted EUR storefront display | Dated reference-rate snapshot; USD remains ledger/dashboard authority |
| Landing | Try the live storefront runway; retain alternatives for visual feedback | One coherent animated eye-catcher before adding another |
| Motion | Visible intended animation throughout | No animation-off, render-off or motion-suppression setting |
| Framework/deployment | Sibling TypeScript/pnpm/Next/Express backbone and two Cloud Run services | Add only bounded image-generation and public FX adapters |
| Development | Deterministic fixtures with paid calls disabled | Clearly labelled development simulation, never the public sample experience |
| Deliverables now | Detailed Markdown, concise HTML overview and 22 planned implementation packets | Execution is authorized in fake mode; paid calls and cloud provisioning remain external pending checks |

### 3.2 Included capabilities

- Vibrant public landing with a new storefront transformation eye-catcher.
- A 15-item clothing photo sample, bounded uploads, mandatory product photos, fresh live AI drafting and compact review.
- Tailor-led visual styling with choices inside chat and the creator’s actual products updating across all three storefront surfaces.
- Optional three-logo generation after colour/type confirmation; automatic USD/EUR storefront display conversion.
- Healthy-profit, break-even and heavy-loss synthetic business scenarios using the actual catalogue.
- Several distinct templates, curated colour themes and typography presets; every allowed choice must be beautiful.
- Small optional brand details: store name, short headline and supplied hero image, as accepted by the owner.
- Responsive storefront home, collection filters, product detail, galleries, zoom, bag and clearly simulated checkout.
- Tailor introductions, replayable tours, summaries, navigation, instant shopping filters, grounded explanations and reviewed operations.
- Dashboard and Tailor product create/read/update/delete, with archival when historical references exist.
- Beautiful animated KPI cards and charts with hover, tap, keyboard and contributing-record drilldown.
- Demo order creation and lifecycle, discounts, inventory adjustments, returns, refunds and synthetic feedback.
- Synthetic traffic funnel, customer cohorts, product costs, expenses and simulated profit/loss views.
- Shared state, truthful provenance, bounded browser recovery, export, reset and expiry.

### 3.3 Explicit exclusions

No real checkout, shipping, Shopify, tax, bank refund, advertising or analytics integration. No customer emails, real addresses, payment details or external messages are needed. No hosted database, accounts, multitenancy, durable store publishing or custom store domains.

No freeform colour picker, uploaded fonts, arbitrary CSS, drag-and-drop page builder, custom checkout layout or unlimited template mixing. Home, listing and detail are selected as one template; palette and typography can vary within the accepted matrix.

No unsupported material, fit, authenticity, demand or commercial-history inference from photos. No runtime generation of product or model photography and no virtual try-on. Offline preparation of original AI sample photos and the optional runtime logo branch are included; those are separate from live product recognition. No live assistant browsing, vector store, voice stack or trained recommendation pipeline is required.

A demo financial view is not a bookkeeping product. It displays disclosed synthetic costs and simulated performance, without bank reconciliation, tax filings, invoices, supplier procurement or a general ledger editor.

### 3.4 Later extensions

Real commerce integrations, durable merchant accounts, import/export integrations, analytics connections, localization and richer publishing need separate scope decisions. Dashboard widget rearrangement and arbitrary merchandising experiments may also wait.

Multiple storefront templates, curated style presets and broad useful Tailor interactions belong to the first demo. They are core requirements, rather than optional polish after an otherwise complete single-layout store.

## 4. Landing page specification

### 4.1 Audience and atmosphere

The first screen should make a new founder want to see their products in the store. Use vibrant, confident colour, large product imagery, clear type and purposeful motion. Retailor's platform identity can be more expressive than any one store palette. Avoid an enterprise control-panel impression before the visitor has seen the storefront quality.

The landing shares the promise of ecommerce builders while remaining an AI demo introduction. It must not look like a shop selling FORME clothing: the primary CTA starts building a demo, and displayed shopping surfaces are previews of the result.

### 4.2 Signature eye-catcher: live storefront runway

**Proposed creative direction:** one large, crisp storefront viewport visibly transforms through three considered brand treatments using the same clothing collection. Start with product photography entering the collection; then choreograph changes in home layout, colour and type. Follow with a short glimpse of the matching collection and product detail. A small companion dashboard beat can close the sequence, without becoming the dominant hero.

This differs from ScreenPilot's hovering cards, ClipBuilder's motion graphics and Retrosum's office scene. The main object is a convincing storefront whose design changes, rather than a decorative animation around a slogan. The idea is informed by curated ecommerce builder previews and fashion collection presentation; it is a Retailor design proposal, not a copied competitor composition. See [research](#appendix-f--design-and-dashboard-research).

Implementation direction:

- Use actual approved sample photography and real frontend template components with fixture data wherever practical.
- Keep one visible composition; avoid tiny overlapping windows that cannot be appreciated.
- Show short labelled transitions such as Editorial → Bold → Gallery; palette chips can let the visitor select a scene locally.
- Use a compact repeating sequence with quiet intervals; the Try demo action remains stable, readable and available throughout.
- Scene selection does not call AI, create a workspace, simulate processing or imply a generated storefront already exists for this visitor.
- Reserve dimensions; never cause CTA movement while assets load.
- Use an image/error fallback when an asset fails. Do not expose any animation-off or render-off control.
- A mobile composition emphasizes one storefront and one short headline; it retains intentional motion.

Two alternatives remain reviewable if the owner prefers them: a lookbook-to-store reveal, or an interactive before/after transformation of plain product assets into a storefront. The storefront runway is the first direction in RTL-017; retain the alternatives for concrete visual feedback rather than implementing all three.

RTL-017 locally implements this direction using three accepted photos and the real renderer, a finite six-scene loop and canonical session-preserving entry. Ten native viewport checks, visible collection/detail transitions, stable CTA and photo failure evidence are recorded in [landing validation](validation/RTL-017.md). Owner feedback, physical devices, native zoom, cold font-cache failure and hosted performance remain pending.

### 4.3 Section hierarchy

| Order | Section | Content and purpose |
| --- | --- | --- |
| 1 | Header | Retailor, How it works, Storefronts, Owner view and Try demo |
| 2 | Hero | Strong result-first promise, runway preview, one main CTA |
| 3 | Four-step explanation | Bring products → review draft → choose a look → explore your store |
| 4 | Design collection | Large examples of complete template families and immediate style changes |
| 5 | Storefront capabilities | Beautiful home, easy product browsing, detail gallery and Tailor help |
| 6 | Connected owner view | Smooth charts and one exact order/stock/profit example |
| 7 | Meet Tailor | Guided styling, tours, finding products and understanding business activity |
| 8 | Plain boundaries and FAQ | Temporary demo, editable drafts, synthetic data, no real payments |
| 9 | Final CTA/footer | Try demo and only real existing documentation/contact destinations |

### 4.4 Copy and interaction

Suggested headline remains **Bring your products. See your store.** Supporting copy becomes: **Your products. A beautiful storefront. Make it yours in a few visual choices—with Tailor beside you.** Explain AI drafting in the next sentence or section rather than cramming every capability into the headline.

Suggested CTA: **Build my demo store**. The **Try 15 sample photos** option is clearly named once entering the demo; the same live-processing approval follows either input source. Navigation scrolls to real semantic sections; no fake logos, testimonials, urgency, commercial results or conversion promises.

FAQ answers include supported photos, editable unknowns, the three-page template bundle, curated style choices, Tailor's role, session lifetime, synthetic orders/analytics/costs, and separately scoped real integrations. The short trust line is **No signup. No real payments.**

## 5. Canonical visitor journey

### 5.1 The complete path

```text
Retailor landing
  → Choose 15 sample clothing photos / upload clothing photos
  → Inspect photos and approve fresh live processing
  → Live AI drafts the catalogue → review/correct the draft
  → Tailor welcomes the creator over the emerging store preview
  → Chat cards: complete template → colour theme → typography
  → Optional name/headline/supplied hero image
  → Optional three AI logos, offered only after colour + type confirmation
  → Enter the accepted storefront ↔ connected owner dashboard
  → Tailor help / product CRUD / demo purchases / three business scenarios
  → Export or reset
```

Selection, processing, review and styling remain one progressive `/demo` experience. The **Style** state precedes unrestricted shopping, although its background is already the actual storefront renderer. No setup-page reloads, external editor or required free-text questionnaire. A completed restored draft is not regenerated or charged automatically on refresh; “live every time” means every deliberate new draft/rebuild, for sample and uploaded photos alike.

### 5.2 Stage contract

| Stage | Visitor goal | Primary interaction | Continuity and failure |
| --- | --- | --- | --- |
| Selection | See the chosen clothing photos | Sample or native photo picker, then **Draft my catalogue** | Keep valid photos if one fails; explain live processing before sending |
| Process | Understand real work underway | Stage feedback and Cancel | No invented percentages; retry is deliberate and bounded; no fake ready catalogue |
| Catalogue | Approve a useful photo-backed collection | Beautiful cards, compact corrections, **Make it my own** | Unknown facts stay unknown; every included product has a validated image |
| Style | Make the storefront theirs | Tailor conversation with template/palette/type CTA cards | Clear live preview; defaults can be explicitly accepted through chat; typing unnecessary |
| Optional logo | Choose a mark or keep the wordmark | **Generate 3 logos** / **Keep my wordmark** inside Tailor | Offered after confirmed palette and typography; no paid call on reveal |
| Storefront | Browse and simulate shopping | Collection, detail, bag and shopper Tailor | USD/EUR display, honest stock, persistent accepted design |
| Dashboard | Understand and operate the same store | Charts, records, forms, scenario selector, manual design overrides | All changes share domain validation; scenarios disclose activity replacement |
| Reset/expiry | Leave or restart | Explicit reset / fixed expiry | Clear owned state, abort old work, create a new identity |

### 5.3 Sample and upload modes: the same live path

The sample is **15 prepared photo assets**, not a saved catalogue or a recorded model result. Show thumbnails and a simple **Use these photos** CTA. Bundle a versioned asset manifest with image IDs, source/rights information and checked dimensions. Recognition sends those actual derivatives through the same live OpenAI path used for visitor uploads. Production code must not read an authored catalogue fixture to satisfy this action.

New visits, explicit catalogue rebuilds and approved retries perform fresh live processing. Navigating, switching template, reopening Tailor or restoring an already completed draft does not regenerate it. Independent test expectations may describe what the sample should generally yield; they never replace the production response.

When vision is unavailable, keep selection and explain that drafting cannot finish right now. Offer Retry when available, change photos or return to the landing. Never silently switch to a prepared interpretation, “AI-like” generic clothes or a manual public catalogue that bypasses the chosen showcase. Local work on an already completed store remains usable during a later provider outage. Development fixtures are clearly marked and cannot be selected in a public live runtime.

### 5.4 Processing and review

Stages: **Checking photos → Drafting products → Validating catalogue → Preparing your preview**. Show actual completion transitions and indeterminate waiting where provider progress is unknown. Smooth motion must not delay ready content. The longer 15-item sample must fit the measured output and time envelope; token truncation is an error, not permission to silently omit products.

At review, lead with image-backed product cards and **Make it my own**. Corrections expand compact panels with sources and field provenance. Uncertain materials/measurements are absent or explicitly unknown. Demo price, stock, size and cost assumptions are labelled and editable. Exclude an invalid product rather than publish one without a photo. Catalogue publication creates one healthy-profit scenario against the actual IDs, then enters Style; later style changes never reseed commerce.

### 5.5 Tailor’s first introduction

Tailor’s lower-right chat opens locally: **“Hey, I’m Tailor. Your products are ready. Let’s make this storefront yours.”** A brief soft blur may introduce it; **Let’s style it** clears the blur before comparing options. The first task is a conversational visual choice, not a manual settings tray. The preview stays clear throughout the decision.

Dismiss collapses the welcome but preserves a visible **Continue styling with Tailor** launcher and current microstep. It does not silently accept choices or block recovery. **Use this look** accepts the recommended defaults through chat for visitors who want speed. An authored welcome, card selection, confirmation and tour require no paid model call. Typed requests can invoke live creator Tailor without making typing compulsory.

### 5.6 Chat-led styling microflow

1. **Template:** Tailor presents three visual cards inside the conversation. Each shows the home, collection and detail relationship, plus a short description. Selection changes the actual-product preview immediately; **Use this template** advances.
2. **Colour:** four named swatch cards show background, surface, text and action mood. **Show this theme** previews; **Use these colours** confirms.
3. **Typography:** three specimens demonstrate headline and readable body/control text. **Use this typography** confirms. Home / Collection / Product preview navigation remains available throughout.
4. **Brand:** optional compact inline fields for store name and short headline; optional supplied hero photo selector/upload uses the same validated asset pipeline. **Keep the suggested details** avoids typing.
5. **Logo:** only after colour and typography have explicit accepted values, offer **Keep my wordmark** or **Generate 3 logo choices**. Show the exact generation action before spending; if skipped, the wordmark remains excellent.
6. **Finish:** Tailor summarizes the chosen template, theme, type and mark, with **Enter my store**. Later owner **Design** settings offer manual override, or the owner can reopen creator Tailor.

Only one main task is expanded at a time; prior answers become short recap bubbles with **Change**. Native buttons, not a free-text prompt parser, own finite selection actions. The chat exposes actions without an API roundtrip, is keyboard-operable and has a bounded scroll area. Preview transitions settle to the latest choice. On phone, a compact bottom chat sheet can share the viewport with the preview; it must not cover every preview surface or force a full-screen settings maze.

This builds on Retrosum’s contextual shortcuts, inline editable forms, clear messages and source disclosure. A chat photo-upload card is a Retailor extension of that pattern, not an existing Retrosum capability to copy verbatim. The owner dashboard’s manual override uses the same design commands and library, with **Apply look** / **Cancel**; setup does not open a second manual editor.

### 5.7 Five-minute demonstration

Choose the 15 sample photos, watch a live catalogue draft and review it. Use Tailor’s cards to try a template, theme and typography while inspecting all three page previews. Optionally request three logos, or keep the wordmark. Enter the store, ask **“show me the jeans under €80”**, inspect the actual EUR-filtered results, and place a demo order. In the owner view, drill into a chart point, change to a clearly disclosed loss scenario and ask Tailor to explain its costs. Create a garment through Tailor’s inline form and mandatory photo upload, confirm it, then verify it in the storefront. This is a presentation guide, not a mandatory visitor checklist.

## 6. Routes, shell and navigation

### 6.1 Route baseline

| Route | Responsibility |
| --- | --- |
| `/` | Vibrant public landing and shareable explanation |
| `/demo` | One client-owned staged guest workspace |
| `/api/retailor/v1/*` | Narrow same-origin frontend bridge |
| Backend `/v1/*` | Private validated provider API |

Choose, Process, Catalogue, Style, Storefront and Dashboard are canonical state inside `/demo`. Home, Collection and Product are local storefront surfaces resolved against stable product IDs. They do not require three independent applications or a competing hash/query-state controller.

Browser Back may leave the demo for the landing without clearing its unexpired workspace. Explicit in-workspace back actions return to review or design without unnecessary regeneration. A direct `/demo` visit restores eligible state or begins at Choose. The four setup stages share natural transitions and one continuous shell.

### 6.2 Shell and overlays

Setup includes Retailor identity, a small stage indicator and contextual reset/help. The store prioritizes the guest's store identity, discreet Retailor attribution, Tailor and an obvious **Owner dashboard** action. The dashboard includes **View storefront**, period selection and **Synthetic demo activity**.

One application dialog layer owns welcome, photo viewer, product quick view, bag, editable forms, record drawers and confirmations. Tailor must respect an open form: suggestions may populate it, but a second assistant overlay cannot steal focus or cover the confirmation. Phone composers and trays respect the virtual keyboard and safe area.

### 6.3 Perspective and design continuity

- Switching views, preview pages, templates, palettes or typography does not reseed activity, rerun vision or clear products/bag.
- Keep store filters and dashboard periods independently.
- Reopening customization starts from the accepted design; Cancel restores the accepted design and Apply accepts the preview.
- Preserve meaningful unsaved forms or review before discarding them.
- Shopper Tailor lacks owner mutation tools. In the owner/creator view, Tailor may prepare those changes for review.
- An owner mutation immediately refreshes visible product availability and invalidates stale shopper suggestions.
- A change to purely visual design increments presentation revision; commerce revision changes only for domain operations.

## 7. Photo selection, preview and handling

### 7.1 Proposed input envelope

The 15-item sample must fit comfortably while retaining space for alternate views and session CRUD. These are proposed measured implementation caps, not provider maxima.

| Resource | Proposed limit | Purpose |
| --- | --- | --- |
| Formats | Static JPEG, PNG and WebP | Actual decodable raster photos required |
| Recognition selection | 24 photos | 15 sample primary photos plus up to 9 alternate/detail views |
| Cached garment/hero sources | 32 across the workspace | Room for owner additions after the sample |
| Original | 4 MiB/image; 40 MiB total | Finite browser cache |
| Decoded original | 24 megapixels; no side above 10,000 px | Reject decode bombs |
| Derivative | Longest side 1,600 px; at most 768 KiB/image | Useful image detail with bounded transfer |
| Derivative batch/cache | 18 MiB / 24 MiB | At most 24 × 768 KiB sent; more room for owner photos |
| Drafted/active products | At most 20 | Supports 15 sample products plus additions |
| Retained products | At most 40 including archives | Preserve linked historical records |
| Variants | At most 24/product; 288 retained/workspace | Compact clothing size/colour options |
| Optional logo assets | Separate 3 MiB candidate cache | Never count a logo as a product photo |

A product cannot be created or published without at least one accepted photo ID bound to validated, available raster bytes. Both manual owner creation and Tailor creation require it. Existing accepted photos may be reused deliberately; new photos use the same remaining workspace caps. A user removes/replaces images only if the product retains one valid photo. An empty upload, stock illustration, broken URL or logo never satisfies the invariant.

Tailor’s **Create garment** card contains a labelled native upload input inside the chat, thumbnail, replace/remove controls, validation and the real editable product fields. **Create product** stays unavailable until a valid photo and the other required values exist; explain the missing field beside it. Selecting a file is local and does not itself call AI. Optional **Help describe this photo** uses an explicit bounded catalogue-recognition action and the same attempt budget; do not make a model call necessary merely to save a manually completed photo-backed product.

HEIC, animated GIF/WebP, SVG, archives, URLs and videos receive specific unsupported-format handling. Never silently fetch remote URLs. Imported stock/sample photos are vetted, downloaded release assets, not arbitrary runtime URLs. HEIC requires a tested decoder and updated budget before it can be supported.

### 7.2 Validation order

1. Check count and claimed byte bounds before decoding.
2. Inspect actual signatures and decode the selected format; extension and MIME are hints only.
3. Reject unsupported/animated/overdimension images.
4. Apply orientation, create a deterministic bounded derivative and strip metadata from the derivative.
5. Compute source/derivative identities and show useful local previews.
6. Reject exact duplicate bytes or offer one retained image with a duplicate notice.
7. Bind the selected derivative manifest to the eventual processing approval.

Backend validation repeats the derivative signature, size, dimension, hash and decoding checks independently. The backend never trusts a browser statement that a photo is safe. Reject excess data while streaming, even when Content-Length is absent or false.

Latest owner performance instruction (12 October): overlap bounded image processing while preserving the photo order and all resource/cleanup rules. [Retrosum research and the owning plan](engineering/IMAGE-CONCURRENCY.md) prioritizes RTL-003’s two-item local sample/decode/recovery pipeline with ordered commits and a shared two-worker/24-MP active bitmap budget, then RTL-006’s independently bounded backend sanitizer. Keep one joint catalogue model request so multiple views can be grouped consistently; no per-photo inference fan-out, extra paid attempt, hidden retry or animation setting is introduced. Each owning validation record distinguishes observed local timing from simulated, paid and hosted evidence.

Original photos remain in the browser. The recognition request sends the inspected derivatives. A clearly readable label can be hard to preserve at the standard resolution; leave the fact unknown or offer a deliberate bounded detail crop later, rather than fabricate transcription. Sending a crop is a new approved input and counts toward the same limits.

### 7.3 Selection interface

Show a real gallery with filename display only locally, dimensions, accepted/rejected status, removal and reorder. Drag-and-drop is optional convenience; a normal file picker is required. Reordering should also have keyboard controls.

One invalid image must not erase the accepted ones. Explain count/size constraints before the picker and at the affected card. Do not trigger paid analysis on upload, reorder, preview, hover or input validation.

The visitor may inspect the sample gallery before choosing it. The sample's front/detail/worn labels reflect actual asset roles. Uploaded photo roles remain unknown until reviewed interpretation.

### 7.4 Rights and privacy notice

Use a concise statement near live processing: **Use photos you own or have permission to use. AI processing sends the selected image previews to OpenAI to draft your catalogue. Your demo workspace is temporary.** Link to a fuller explanation of browser cache, provider handling and reset.

Do not collect licensing proof from visitors or build a compliance onboarding process. Separately maintain an asset-rights record for the authored public sample during implementation.

## 8. Catalogue recognition and review

### 8.1 Recognition responsibility

The catalogue agent should:

- Identify likely product types and visible characteristics.
- Suggest which images belong to the same item and each image's role.
- Draft original short titles, useful descriptions and grounded merchandising copy.
- Suggest category navigation and appropriate size-option templates.
- Return uncertainty and review reasons where classification/grouping is weak.
- Suggest a validated layout preset or collection arrangement from a finite authored list.

Application code assigns final IDs, validates grouping, applies synthetic prices/stock and produces the usable catalogue. The model cannot author business event history, executable markup or new allowed tool names.

### 8.2 Field provenance

| Field | Permitted source | Forbidden shortcut |
| --- | --- | --- |
| Colour, pattern, closure, sleeve/neckline | Bounded visual observation linked to image IDs | Guaranteed exact colour under unknown lighting |
| Category | Clothing-only finite category with review state | Publishing non-clothing goods or claiming uncertain garment identity |
| Title and editorial copy | Generated draft grounded in supported attributes | Unsupported performance, sustainability or origin claims |
| Image grouping/role | AI suggestion, visitor correction | Treating similar colour as proof of identical SKU |
| Material/care | Supplied confirmed sample fact or readable label transcription awaiting review | Inferring 100% cotton from surface texture |
| Measurement/fit | Confirmed sample chart or visitor-supplied data | Measurements, body suitability or fit guarantees from a photo |
| Size options | Category-specific demo preset, clearly labelled | Claiming the photographed garment exists in every suggested size |
| Price/stock | Explicit synthetic configuration or later confirmed input | Image-estimated real selling price or warehouse quantity |
| Sales/reviews/demand | Separate synthetic scenario | History recovered from product photographs |

Each attribute carries `provenance`, source image IDs where applicable and a review state. Unknown is a first-class value, not an empty string that UI code turns into a plausible claim. Visitor correction preserves previous source/provenance and records the new origin.

### 8.3 Grouping and variant rules

Multiple views of one item become one product with alternate images. Different colours of an apparently shared style may become variants only when the relation is supported or the visitor confirms it. Similar silhouettes alone are insufficient proof.

An image can show several items. The draft may propose multiple products with a shared source reference and a review reason. It must not silently crop out and invent unavailable separate product photos. An ambiguous clothing photograph may remain an unclassified clothing draft with its original preview. Non-clothing input is explicitly excluded; if garment identity is unclear, request review before publishing.

Every image must have a declared disposition: linked to one or more product drafts, held for review, exact duplicate or rejected. No accepted source disappears without explanation.

### 8.4 Sizing

The impressive behavior is choosing an appropriate interface, not pretending to measure clothing.

| Category | Starting demo template | Honest explanation |
| --- | --- | --- |
| Tee/casual top | S, M, L, XL | Suggested options; uploaded item's real range is unconfirmed |
| Shirt | Alpha sizes; collar/sleeve only for a confirmed matching system | No guessed collar or sleeve measurement |
| Trousers | A named waist/inseam or regional preset | Preserve the chosen convention; no universal conversion |
| Suit/jacket | Named chest/length preset | Pairing and tailoring remain unconfirmed |
| Dress/skirt | Named regional numeric or alpha preset | No assumed brand-specific conversion |
| Beach/swim garment | Appropriate alpha or waist-based clothing preset | No inferred stretch, fit, protection or material claim |
| Unclassified clothing | Neutral demo option or explicit pending options | Confirm it is clothing; non-clothing is excluded, not silently supported |

Store `sizingSystemId`, category, labels and provenance. Do not encode one universal US↔EU mapping. FORME may have an authored sample chart with units and clear sample identity. Uploaded items do not get an invented measurement chart.

### 8.5 Catalogue review screen

Lead with a collection preview and **Make it my own**, not a large required spreadsheet. Each product card opens a compact edit panel for title, category, copy, visible facts, images and sizing preset. Show the source image and a small draft/confirmed/default marker at the relevant field.

Actions include rename, revise category, choose primary image, reorder alternatives, split a group, merge selected drafts and exclude an unusable draft. Editing one field does not automatically re-run vision. Human changes are deterministic commands over the current draft.

Demo price and stock defaults are disclosed in one coherent configuration summary. Detailed field provenance remains available without placing warning banners on every card.

At least one usable product is required to open a store. Unknown composition or unconfirmed measurements do not block the demo. Invalid option structures, dangling image references or broken IDs block the affected draft until corrected/excluded. Manual and Tailor-created products follow the same mandatory-photo invariant. A draft without validated photo bytes cannot be included.

### 8.6 Publication boundary

**Make it my own** publishes a catalogue snapshot into the current demo workspace, constructs its synthetic scenario once and enters Style. It does not publish a website externally.

Before any orders exist, a structural regroup/rebuild may replace the scenario with a clear reset notice. After orders exist, preserve product/variant IDs and historical snapshots; removing a sold variant becomes archival. A split/merge or wholesale regroup that cannot preserve references requires an explicit **Rebuild this demo** confirmation and a fresh scenario identity.

Do not silently attach an old order, review or stock movement to a newly generated product.

## 9. Storefront and product experience

### 9.1 Quality contract

**The storefront is the king of this demo.** A visitor should receive an unusually smooth, desirable store from their products, then enjoy making it look like their brand. Each template must be a finished design idea across home, collection and product detail; changing templates cannot expose a generic unfinished page elsewhere.

Photography, crop behavior, typography, spacing, microinteraction, page transitions and commerce controls receive equal attention. Quality must hold for the sample and valid small uploaded catalogues, including one product, mixed aspect ratios, missing alternate images and long titles. Model output supplies bounded content and can recommend preset IDs; it never supplies CSS, HTML, script or arbitrary component instructions.

### 9.2 Three complete template families

Accepted first library size: three complete templates. The following names and compositions are researched design proposals for visual review:

| Template | Storefront home | Collection/list view | Product detail | Intended mood |
| --- | --- | --- | --- | --- |
| Studio | Editorial split hero; large product-led feature; compact collection story | Balanced grid with generous imagery, clean filter rail and subtle alternate-view crossfade | Gallery beside clear purchase panel, expandable supported details | Contemporary everyday clothing brand |
| Pulse | Bold full-width campaign composition, strong typography and category entry points | Tighter responsive grid, high-clarity active chips and quick variant access | Strong hero image, compact options and responsive sticky purchase region | Confident streetwear or activewear |
| Gallery | Spacious image-led opening, restrained wordmark and curated product pairing | Airy gallery rhythm with consistent cards and quiet category navigation | Large image sequence, calm detail column and considered gallery transitions | Premium or minimal collection |

These names are original working labels. They are not copies of Shopify, Squarespace or Framer theme products. Templates can vary layout and visual rhythm, while their capability contract remains identical. Each supports search, filters, images, variant selection, bag and Tailor. No template gets a weaker checkout or less accessible detail view.

The template is one bundle. The visitor cannot mix Studio's home with Pulse's collection and Gallery's detail in the first demo. That restriction keeps the design coherent and the reviewable matrix finite.

### 9.3 Curated colour themes

Proposed palette identities:

| Theme | Mood and candidate colour direction | Application |
| --- | --- | --- |
| Ink / Paper | Warm off-white canvas, charcoal text, dark high-contrast actions | Quiet contemporary or premium identity |
| Cobalt / Cloud | Cloud-white surfaces, deep cobalt action colour, dark navy text | Bright confident modern identity |
| Oxblood / Blush | Soft blush canvas, deep oxblood action colour, dark burgundy text | Warm editorial identity |
| Pine / Sand | Sandy ivory, deep forest actions, near-black green text | Grounded natural identity |

Every palette is a complete semantic token set: canvas, surface, text, muted text, accent, action text, border, focus, hover and selected states. Feedback status tokens remain comprehensible and do not inherit random colour substitutions. Body contrast, button contrast, chart distinctions and visible focus must be measured before acceptance.

Marketing colour associations can inform a mood, but no palette is claimed to cause purchasing or guarantee conversion. Audience, products, contrast and brand context matter. [Shopify's colour guidance](https://www.shopify.com/blog/color-psychology) explicitly rejects a universal best psychological colour. The proposed palette collection is a Retailor interpretation to be visually tested, rather than a ranked statistical result.

No unrestricted picker, per-element colour editing or automatically extracted unreviewed photo colours. If Tailor suggests “more energetic,” it resolves to an existing accepted theme. Changing palette is local and immediate, with no paid AI request required.

### 9.4 Curated typography

The visitor selects a readable named typography preset, with a real specimen of the store heading, product title, price and button. Under the hood a preset can pair a display face with a compatible interface face; the visitor does not need to understand font pairing.

| Preset | Candidate family/pairing | Role |
| --- | --- | --- |
| Modern | Inter headings and body | Clear, confident, familiar ecommerce interface |
| Editorial | DM Serif Display headings + DM Sans body | Distinctive fashion/editorial personality with readable controls |
| Expressive | Manrope headings + DM Sans body | Strong modern display scale without sacrificing shopping clarity |

Inter has a concrete ecommerce reference: Shopify documents its use throughout Horizon. DM Serif Display is designed for large display text, supporting its limited heading role. These are candidates supported by first-party font/design references, not a claim that this trio ranks as the world's three most-used ecommerce fonts. See [the research register](#appendix-f--design-and-dashboard-research).

Self-host the selected licensed font assets, verify redistribution terms, bundle only needed weights, reserve layout space and provide metrically considered fallbacks. The HTML documentation uses local/system approximations and does not establish final font acceptance. Avoid premium fonts whose licensing/distribution would complicate a public demo.

The preset owns heading/body weights, line height, tracking, responsive scale and tabular price numerals. No user font upload or arbitrary size slider. All accepted typography presets must work on every template and palette.

### 9.5 Tailor-led live design preview

The Style state renders the current catalogue through the production template renderer, with actual selected product imagery. Home / Collection / Product preview tabs expose the full three-page bundle. Optional Desktop / Phone preview widths must render true responsive layouts. Store previews remain clear after the initial welcome; choices appear inside Tailor’s chat, not in a competing manual setup tray.

Template cards show recognizably different compositions; palette cards include names and multi-colour specimens; typography cards pair headline and body specimens. A local finite action updates `StoreDesignSelection` immediately, then a chat CTA confirms that microstep. Choosing a preview page or returning to a prior microstep preserves accepted answers and product context. Recommended defaults can be accepted in one short conversational path, with no free-text input required.

Required behavior:

- One finite template selection controls home, collection and detail; pages cannot be mixed arbitrarily.
- Local styling changes do not call a model or alter product IDs, prices, bag, stock, scenario or sales history.
- The recommended default already renders beautifully. **Use this look** in Tailor explicitly accepts defaults.
- Rapid selections cancel older owned transitions and settle to the latest visible choice.
- Past answers appear as compact chat recap bubbles with **Change**; only the active task is expanded.
- Name, headline and supplied hero photo are optional. Name/headline are bounded plain text; no model-generated HTML.
- Initial **Enter my store** accepts the reviewed design. Later owner manual settings use a preview copy, **Apply look** and **Cancel**, and the same finite commands.
- Chat card actions remain available when typed AI assistance is unavailable; a successful live catalogue is still required to reach this stage.
- Invalid stored preset IDs fall back to an accepted default with a visible explanation.
- All controls have focus states, labels and selected markers; colour alone does not communicate state.

The owner dashboard contains a small **Design** section for manual template, colour, typography, name/headline, hero and selected-logo changes. Reopening Tailor offers the same changes conversationally. No freeform CSS, uploaded fonts, independent page builders or animation settings.

### 9.5.1 Optional three-logo branch

A text wordmark in the selected typography is the default and the automatic fallback. The optional offer appears only after the creator has explicitly confirmed both a colour theme and a typography preset. It is never offered on initial landing/upload/review and is never generated on a hover, preview change or welcome animation.

Tailor says: **“Your colours and typography are set. Keep this wordmark, or let me create three logo directions for your store?”** Buttons: **Keep my wordmark** and **Generate 3 logos**. Before the generation action, summarize store name, accepted palette/type, exactly three candidates, temporary storage and the fact that this is a live AI operation. No open-ended logo prompt editor or unlimited reroll loop.

The backend builds a bounded prompt from sanitized store name, a clothing-brand descriptor, accepted palette values and typography characteristics. Request three separate, simple original marks suitable for the storefront header, with a transparent raster background and a small-header legibility goal. The chosen font family guides the visual direction; image generation cannot be assumed to reproduce the exact font or spelling perfectly. Inspect legibility and exact name spelling before presenting/accepting candidates; illegible outputs do not automatically become a brand.

Three separate image assets are required, rather than one collage containing three marks. Use the official Image API or an equivalent reviewed image-generation port with explicit candidate count; the model/quality configuration must support the selected output options. Validate actual format, bytes, dimensions and transparency, strip unneeded metadata and constrain derivatives. Browser-owned candidate cards show large and small previews, **Use this logo**, and **Keep wordmark**. Selection previews the mark across all three page headers before acceptance. Provide text alternatives and keep store-name text accessible.

The request binds workspace ID, operation ID, confirmed palette/type IDs, store name and design revision. A response to an older colour/type/name selection is stale and cannot attach itself to the current design. Retain a previously selected mark as an explicit old choice until replaced; after a conflicting style change, offer the wordmark or an allowed new generation rather than silently recolouring raster bytes. Cancellation/reset/expiry discards result application; cancellation does not promise that provider billing stopped. Failed, partial or delayed output leaves the wordmark and an honest message. Never repeatedly call the provider to fill missing candidates without a fresh approved action.

First-demo budget: one three-candidate batch per workspace, plus at most one explicit retry, each reserved before calling. A retry replaces the old candidate set atomically when a complete valid result is accepted. At most three candidate raster assets remain cached, 1 MiB each / 3 MiB total. Store selected candidate ID and validated image metadata in the session projection; bytes live in the temporary browser cache, never sessionStorage Base64. Missing cache bytes fall back to the wordmark. Logo generation is optional and independently unavailable without blocking catalogue processing, styling or shopping.

### 9.5.2 Research-to-preset decision matrix

The owner accepted the library size; the proposed names/tokens below need visual proof, not another scope vote. The 2026 research review informs useful shopping behavior. Current builder/fashion references inform visual direction. These references support design choices; they do not establish universal popularity rankings or guaranteed conversion gains. Links and dates appear in Appendix F.

| Choice | Why it belongs | Required review |
| --- | --- | --- |
| Studio | Editorial image/text balance, clear scan order and familiar product grids; suitable for broad clothing collections | Long product names, shirt/jeans/hoodie photos, exposed size options and mobile hierarchy |
| Pulse | Strong campaign image, confident action contrast and denser collection scanning; casual/streetwear energy | Bold type must not crowd controls; sticky buy panel must not obscure images or chat |
| Gallery | Generous image space, restrained navigation and readable purchase details; formal/resort/premium mood | Whitespace cannot hide price, size or useful garment context |
| Ink / Paper | Neutral photographic canvas and dark clear actions; drawn from restrained fashion-brand presentation | Light and dark garments stay distinct; overlays and focus contrast pass |
| Cobalt / Cloud | A confident expressive action colour with quiet cool surfaces | Blue garments remain distinguishable; action versus selected/filter colours stay clear |
| Oxblood / Blush | Warm editorial identity with deep contrasting actions | Red garments remain readable; destructive/error colour has a distinct semantic treatment |
| Pine / Sand | Earth-toned clothing mood with clear dark actions | Beige/green garments remain separate from backgrounds; it makes no sustainability claim |
| Modern: Inter | Familiar readable screen typography; Shopify documents its use in Horizon | Small price/control text, numerals and long titles |
| Editorial: DM Serif Display + DM Sans | Display personality with a restrained readable body pair | Serif reserved for display; sizes, filters and prices remain easy to scan |
| Expressive: Manrope + DM Sans | Geometric emphasis with clear body copy | Controlled weight/spacing; headings cannot dominate buying information |

The combinations do not rely on one font or colour to compensate for a bad layout. All 36 must be judged on home, collection and detail at phone and desktop sizes, including extreme light/dark/colourful garment photography, stock states, EUR strings, logos and long store names. Reject or refine an inferior combination before release; never expose a knowingly mediocre choice. This is 108 page compositions per viewport, plus state checks. The HTML uses system-font approximations and drawn garments only to communicate the idea; it is not final visual evidence.

### 9.6 Shared home and collection capabilities

Store home includes identity/navigation, considered hero, category entry points, a product collection preview, Tailor access and concise demo context. Collection includes result count, category/search/filter controls, removable applied chips and product cards. A prominent **Owner dashboard** action is available without overwhelming the store brand.

Filters use actual known catalogue facts: category, price, supported colour, supported size and availability. Deterministic sorting includes recommended/authored order, price and title. An empty result offers clear/remove-filter actions. Unknown material or fit cannot satisfy an asserted filter as though confirmed.

When the shopper says **“show me the jeans,”** Tailor resolves a known category and applies the real collection filter, opens that view and explains the visible result in one short reply. This benign navigation/filter action does not require a modal confirmation. Display removable chips and **Undo filter change**. Ambiguous categories receive choices; invented categories are not silently applied.

Avoid newsletter gates, fake urgency, unsupported bestseller claims and discount popups. Seeded reviews and sales labels retain their synthetic context. A store can look persuasive without pretending that its demo customers or commercial history are real.

### 9.7 Product cards, images and details

One card represents one product style. Supported colour variants show labelled swatches and consistent selected images. Hover/focus crossfades only to a genuine supplied alternative; touch/keyboard gets an explicit image action. With one image, retain it and offer zoom. Do not invent a worn photograph.

Product detail includes a real gallery, title, exact demo price, supported facts, selected options, current availability, quantity and bag action. Unknown material/measurements remain unknown; demo size presets are labelled. Any size guidance is source-controlled or confirmed, rather than a generated fit guarantee.

Image containers reserve dimensions and use chosen template crop rules. A failed image shows a dignified unavailable-photo state and a repair path. That error display is not a valid creation input. New products always require a photo; a product whose only bytes become unavailable is removed from purchasable results until repaired. Tailor cannot fabricate a product photograph.

Gallery, quick view and sticky purchase behavior vary by template without changing the commerce rules. Changing price or stock from the owner view updates the current detail and bag review; placed order snapshots remain untouched.

### 9.8 Complete-library acceptance

With the proposed library there are 36 combinations and 108 page compositions before responsive sizes. Review the entire accepted matrix for hierarchy, colour contrast, long content, images, active filters, selected variants, empty results and open Tailor. Inspect representative desktop and phone widths for every template and typography, with broader responsive checks in section 25.

Every option must be excellent. A visually weak preset is revised or removed before release; it is not shipped as a lesser choice. Curated quality is the promise. Avoid adding more palettes or fonts merely to make the selection count larger.

## 10. Bag and simulated checkout

### 10.1 Bag contract

The bag contains at most eight distinct variant lines and five units per line. It is temporary workspace state and does not reserve stock. Adding the same variant merges quantities within bounds.

Show title, selected colour/size, image, unit price, quantity, removal and totals. Product price edits or stock changes make old line snapshots stale; recalculate and surface changes before order confirmation. Never silently buy a replacement size/colour.

The bag survives perspective switching and eligible refresh. Quantity, removal and opening the bag are local and unpaid.

### 10.2 Checkout interface

Use a small review panel with a seeded fictional delivery identity, sample delivery cost and zero simulated tax by default. Real names, addresses, emails, phone numbers and card details are unnecessary and must not be requested.

The primary action is **Place demo order**. A nearby sentence states **This simulates an order and updates this demo's stock and dashboard. No payment or shipment occurs.**

The initial pricing policy uses integer USD cents, with automatic EUR storefront display using the same dated snapshot for bag, delivery, filters and confirmation (Section 13.2.1). A $6 sample delivery fee and $0 simulated tax may be the default. These are demo constants, not jurisdictional tax or carrier calculations.

### 10.3 Confirmation and connected result

1. Validate the current workspace, revision, command ID, variants, quantities and stock.
2. Recompute prices, discounts and full totals using the domain engine.
3. If the reviewed values changed, show the new review instead of applying the stale confirmation.
4. Apply the order and all stock deductions atomically once.
5. Clear purchased bag lines, show a demo order reference and offer **See it in the dashboard**.

Double-click, replay or refresh must not duplicate the order or deduct stock twice. If the total order-record limit is reached, explain the boundary and offer reset/export; do not overwrite earlier records.

## 11. Owner workspace

### 11.1 Purpose and information hierarchy

The owner dashboard should look like a beautiful product in its own right: smooth animated charts, clear numeric hierarchy, tactile hover/click behavior and useful detail. Take Retrosum's strongest principles directly: **scope → headline facts → purposeful charts → short observations → exact contributing records**. The same canonical commerce graph drives store availability, orders, costs, KPI cards and Tailor.

Use Overview, Products, Orders, Returns & refunds, Inventory, Traffic & customers, Finance and Feedback as compact sections or registered drilldown destinations. These need not all occupy a large sidebar or become separate full-page suites. Overview leads with a handful of business questions; deeper figures appear where the visitor asks for them.

Research defines a metric registry rather than placing every industry KPI on the opening screen. No absent advertising spend, shipping integration or customer analytics is invented. Synthetic activity, traffic and cost assumptions remain visibly labelled.

### 11.2 Overview and question-led panels

| Area | First view | Useful interaction |
| --- | --- | --- |
| Scope | Last 7 days / 28 days / all scenario activity; USD and as-of | Scope change animates chart geometry; definitions retain date basis |
| Four headline cards | Net merchandise sales, included orders, AOV, simulated operating result | Click/tap opens formula and contributing records |
| Sales and result trend | Daily sales and optional simulated profit/loss series | Hover/focus exact date/value; click opens that day's records |
| Product performance | Ranked net sales and units; optional margin view | Select product to open lines, returns and cost snapshots |
| Conversion funnel | Eligible visits → product engagement → add-to-bag → checkout → placed order | Stage opens cohort counts and exclusions |
| Operations strip | Awaiting fulfilment, open returns, low-stock variants, refunds | Opens matching filtered operational view |
| Inventory attention | Variant availability and stock at risk | Opens movement history and adjustment form |
| Composition | Category contribution or new/repeat fictional buyers | Select segment to inspect contributors |
| Tailor summary | Short current evidence-backed explanation and suggested next action | Opens an actual chart, product or form |

Net sales is not cash, bank receipts or profit. Simulated operating result exists only when disclosed synthetic cost inputs are enabled. Shipping/tax remain separate; costs and traffic are not inferred from product photography.

### 11.3 Chart design and interaction contract

| Chart | Preferred form | Why and interaction |
| --- | --- | --- |
| Sales / profit over time | Smooth line/area with explicit zero baseline | Trend and negative loss values; exact points and day drilldown |
| Product ranking | Animated horizontal bars | Easy comparison and readable product labels; record drilldown |
| Funnel | Ordered step bars or compact stepped composition | Clear stage nesting and dropoff counts; no decorative pie chart |
| Category mix | Donut plus legend and exact values | Positive contribution proportions; selectable categories |
| Inventory | Horizontal bars or compact stock grid | Availability, threshold and movement access |
| Return reasons | Ranked bars | Counts and linked return lines; synthetic small-sample context |
| Customer cohort | Stacked bars or small paired cards | Fictional new/repeat buyers with denominator detail |
| Expense composition | Donut/bars over positive category amounts | Explicit expense records; signed corrections shown separately |

Do not use a pie/donut for negative sales, losses or signed movements. Avoid smoothed curves implying actual intermediate observations; daily source points remain explicit. Series colours are distinguishable and labels remain readable. Large amounts and dates appear immediately; decorative animated number counting must not delay correct information.

Each chart offers hover/focus detail, click/tap drilldown, exact data table, understandable legend and a selected target state. On phone, tap pins a tooltip and a second clear action opens details; hover is never the sole access path. Controls use registered IDs and domain facts, not arbitrary graph callbacks that mutate money.

Proposed motion: 450–650 ms chart entrances, 300–450 ms scope/geometry transitions and 150–220 ms hover/selection feedback. Stable data keys prevent full chart remounts on unrelated chat or form updates. Resize preserves selection where valid. Motion remains visible; there is no render-off, animation-off or OS-based suppression setting.

Start with small SVG chart components if they meet these needs. A maintained chart library can be chosen after a representative chart proves benefit for interaction/accessibility. No dependency is selected merely for impressive screenshots.

### 11.4 Drilldown and evidence

A KPI/chart target opens a drawer with exact value, formula, numerator/denominator where relevant, period/as-of, date basis, contributing IDs, exclusions and source markers. From there open the order, product, cost, traffic session, refund, return or stock movement.

Resolve facts against current revision. After a mutation, recompute or mark stale; an old amount must never remain attached to a current chart. Closing a record returns to the same metric context and scroll position. An empty chart distinguishes zero from unavailable input or absent comparison data.

### 11.5 Products: complete session CRUD

Both **Create product** and Tailor's **“add a black denim jacket”** open the same real editable form. Required fields are the minimum needed to create a sellable demo item: a validated photo, title, clothing category, demo price, finite options and starting stock. The same photo-upload card appears inside Tailor; the dashboard form offers the same uploader and validation. Optional supported description/facts cannot become unverified claims.

Read includes search, filters, detail and source/provenance. Update includes title, description, category, images, active price, future unit cost and permitted options. Stock changes use a reasoned movement rather than silently overwriting a balance. Adding a variant respects the existing total cap.

Delete an unreferenced, unsold product after review. A product/variant referenced by orders, movements, returns or feedback is archived from shopping instead, preserving history. Explain **“Remove from storefront; keep its demo history.”** Bag references are removed/reviewed coherently. Deleting the final active product shows a beautiful empty-store state and clear Create product action, rather than invalid navigation.

Tailor prepares forms and shows effects; the user reviews and confirms the actual current values. Duplicate names require exact item selection. Late suggestions do not overwrite dirty fields. A product changed in the dashboard appears immediately in all storefront templates.

### 11.6 Orders and commercial operations

The order register includes reference, date, origin, fictional customer, items, merchandise, discount, delivery/tax, total, fulfilment and financial state. Detail exposes immutable placed snapshots and linked adjustments/movements.

The owner may create/edit/delete an unplaced demo order draft, select products and quantities, choose a disclosed demo discount and review stock/totals. Place applies one atomic local command. The same workflow is available through Tailor. Orders created by owner forms are simulated activity and excluded from shopper conversion unless linked to a valid eligible visit.

Once placed, commercial corrections use coherent lifecycle actions: cancel eligible orders, mark shipped/fulfilled, receive returns and issue bounded refunds. Historical sales are derived from these events; there is no independent “edit sales total” button. Placed orders cannot be hard-deleted or have old prices overwritten. Reset can intentionally clear the complete workspace.

No operation calls payment/carrier APIs. A fictional address is a display fixture, not a real input form. Shipment states and fees are simulated and labelled.

### 11.7 Returns, refunds and inventory

Physical returns and financial refunds have separate states and dates. A return selects known order lines, quantities and reason; receipt records restockable/non-restockable disposition. Only inspected eligible units restore stock. Refund review exposes remaining refundable merchandise/delivery/tax and exact effect.

Inventory shows opening/received/deducted/restored/written-off units and current availability. Low stock starts at two units or fewer for active variants. Add stock or reduce stock through a signed movement and reason. A damage/writeoff action records both lost available units and their disclosed demo cost; it cannot deduct units twice or also treat the same cost as an expense.

Return of already sold damaged goods leaves the original sold unit cost in cost of goods; it does not create another warehouse writeoff. A restockable received unit reverses its sold cost once when returned to available inventory. Refund and physical cost reversal remain independent.

### 11.8 Finance, traffic and feedback

Finance offers disclosed unit-cost editing for future sales, expense draft/create/edit/delete, posting, reviewed correction/void, and exact synthetic result drilldown. Posted records preserve history; corrections are linked adjustments, not silent deletion. A small set of categories—marketing, packaging, platform and operations—keeps the demo understandable. No accounting setup is required.

Traffic shows explicitly synthetic eligible sessions and the limited real guest shopper activity tracked locally in this workspace. Designer preview/owner navigation is excluded. New/repeat customer views use fictional IDs; no real PII, analytics script or external event service. Period/cohort denominators are stated.

Feedback stays tied to known products and optional known orders, with synthetic labels, counts and grounded summaries. Reasons or small sample patterns are observations, not proof of product demand or guaranteed conversion improvements.

### 11.8.1 Manual design and scenario controls

Owner **Design** exposes the accepted template/theme/type library, optional name/headline/hero and selected logo, with a reversible preview and **Apply look**. These controls complement the primary Tailor-led onboarding, and use the same presentation authority. The optional logo offer retains its colour/type gate and paid limits. Owner **Scenario** offers the three accepted stories with the disclosed activity/stock replacement preview defined in Section 12.2. Neither action changes what garment a product represents. Finance and editable prices remain visibly USD, irrespective of the storefront’s display choice.

### 11.9 Tailor in the owner view

Tailor can introduce the dashboard, explain each chart, summarize changes, navigate evidence and prepare product/order/stock/return/refund/expense forms. A tour highlights registered visible elements, scrolls appropriately and can be dismissed or replayed. It does not fabricate insights, obscure exact figures or automatically mutate records.

Common useful prompts: **“Give me a quick summary,” “Why is profit down?” “Show low-stock products,” “Create a demo order,” “Add this product,” “Update this price,” “Remove that item,”** and **“Explain this conversion chart.”** Each resolves to current facts, a known view or a reviewed real form.

## 12. Synthetic collection and activity

### 12.1 FORME: fifteen clothing-photo inputs

FORME is a fictional clothing brand spanning casual, formal, semi-formal and beachwear. Clothing is the product scope, not merely the first vertical. Exclude belts, bags, shoes, jewellery and unrelated goods. Use finite garment categories: tees, shirts/overshirts, hoodies/sweatshirts, knitwear, jeans, trousers, shorts, skirts, dresses, tailoring, outerwear, swimwear, activewear, loungewear, underwear/socks and other clothing. **Other clothing** keeps the garment scope broad without accepting non-clothing goods. Optional occasion tags are demo merchandising, not inferred facts. Support garment-specific sizes; do not give a waist/inseam garment arbitrary S/M/L measurements.

Prepare fifteen distinct primary garment photos; optional alternate views bring a recognition selection up to 24 photos. The public sample does not ship a ready catalogue. The source manifest IDs below identify input assets, not production product IDs: live interpretation assigns grouped products and validated relationships. Prices are independently labelled demo defaults and remain editable, not visual facts.

| Asset ID | Planned garment | Visual direction | Demo price suggestion | Useful extra view |
| --- | --- | --- | --- | --- |
| F01 | Straight-leg jeans | Mid-blue denim, full silhouette | $68 | Rear or waist detail |
| F02 | Wide-leg jeans | Black denim, visibly different cut | $74 | Side view |
| F03 | Pullover hoodie | Charcoal, plain unbranded | $64 | Hood/detail |
| F04 | Zip hoodie | Oatmeal, clear zipper | $72 | Back view |
| F05 | Everyday tee | White crew neck | $38 | Neckline/detail |
| F06 | Boxy tee | Muted cobalt, different cut | $42 | Side or back |
| F07 | Button-front shirt | Cream, semi-formal styling | $54 | Collar/cuff |
| F08 | Overshirt | Olive, structured casual cut | $78 | Back/detail |
| F09 | Tailored trousers | Charcoal, formal silhouette | $82 | Waist/full length |
| F10 | Single-breasted blazer | Sand, clear lapels | $128 | Rear/lapel |
| F11 | Knit cardigan | Warm brown, visible closure | $86 | Knit/closure detail |
| F12 | Midi dress | Oxblood, uninterrupted silhouette | $96 | Rear view |
| F13 | A-line skirt | Black, full garment | $58 | Waist/detail |
| F14 | Resort shorts | Beige, beach/casual shape | $48 | Side/detail |
| F15 | Swim shorts | Pine, obvious swim-short silhouette | $44 | Rear view |

**Asset status after RTL-003:** fifteen independently generated, visually reviewed primary clothing photos and a byte-only manifest are shipped. [Actual provenance, exact byte totals and browser evidence](research/FORME-PHOTOS.md) identify the accepted files; no unverified alternate is shipped. These are prepared inputs, not a ready catalogue. The admitted RTL-006 adapter is locally verified; fresh paid interpretation remains unverified until RTL-020 receives keys and authorized paid-run evidence.

Preferred path: create original AI-generated garment photography offline before release. Use a consistent neutral studio background, similar lighting, high-resolution garment detail, crop-safe margins and no third-party marks. Each primary image depicts one identifiable garment. Avoid collages, illegible fabric labels, made-up certification text and impossible geometry. Optional alternate views must represent the same garment; reject inconsistent stitching, pockets, cut or colour. Do not infer exact fibre, measurements or manufacturing claims from an attractive generated photo. Describe sample imagery as generated demo photography.

Alternative path: licensed stock photos from Pexels, with ordinary Unsplash as another evaluated source. The current Pexels jeans and hoodie collections and Unsplash clothing-product collection provide discovery entry points, linked in Appendix G. Find individual photo pages for all fifteen types, prefer unbranded unobstructed garments and record photographer, URL, downloaded version and applicable licence. Search pages are leads, not accepted assets. Stock portrait/lifestyle photos often include multiple garments or lack exact alternate views; reject ambiguity instead of claiming they represent the same SKU. Unsplash+ assets must not be confused with the ordinary free licence. The stock route remains available if generation quality is poor; visual coherence is the acceptance criterion.

Offline preparation may create an art-direction contact sheet for review. A contact sheet is not a single product image to pass into recognition. Export fifteen independent optimized assets under the future sample asset directory, with source manifest and content hashes. Run the live recognition evaluation on the exact shipped images. A successful test output is evidence, not a public precomputed response.

A clothing-only budget example replaces the old accessory look: shirt $54 + jeans $68 + tee $38 = $160 merchandise and $166 with $6 demo delivery. Removing the shirt yields $106 merchandise / $112 delivered. Tailor must preserve the visitor’s delivered-budget constraint and selected currency.

### 12.2 Three coherent business scenarios

Offer **Healthy profit**, **Near break-even** and **Heavy loss**. Healthy profit is the initial proposed presentation default. Each seeds a small 28-day history with at most twenty orders and at most 300 fictional shopper sessions, leaving room for ten placed guest/owner orders and twenty local shopping sessions within the overall caps. The preset generator runs over the actual accepted catalogue, including uploaded clothes and photo-backed owner additions. It cannot introduce a phantom hoodie or a generic bestseller absent from the store.

| Scenario | Story to explain | Main levers in linked records | Expected interpretation |
| --- | --- | --- | --- |
| Healthy profit | Orders cover garment costs and operating spending comfortably | Ordinary-priced paid demo orders, sensible synthetic unit costs, restrained expenses, limited refunds | Clearly positive simulated result |
| Near break-even | Sales largely cover cost but leave little headroom | Smaller order volume and/or a disclosed higher marketing expense, with valid stock/order history | Near-zero result; exact displayed amount, not an artificial forced zero |
| Heavy loss | Revenue is outweighed by costs, refunds and operating spending | Lower sales, higher disclosed expenses, valid discounts/returns and bounded available-stock writeoffs | Clearly negative result with understandable contributing records |

These qualitative outcomes are generated from valid records. Do not set KPI totals independently, create refunds beyond refundable value, write off unavailable units, falsify current prices or modify visitor-edited costs to hit a predetermined number. If unusually edited catalogue/cost inputs prevent the intended outcome, show the resulting actual total and a short explanation; the preset is an activity pattern, not a promise to fudge its accounting. Seed-only demo costs and opening inventory are visible assumptions, never claims that AI read them from a photo.

Use a source-controlled seed and a scenario anchor captured at workspace creation, an injected clock for tests and ordered application of the pure commerce commands. Store ISO UTC timestamps, bucket charts by UTC and disclose the basis. Captured seed history remains fixed; current guest events may extend the as-of date without reseeding. Different scenario stories must use different real generated orders/expenses, not a front-end switch replacing chart arrays.

**Switch behavior:** the owner’s selector previews the selected story and states **“Replace this demo’s business activity?”** Confirming replaces fictional/guest orders, returns/refunds, traffic, feedback, expenses, writeoffs, movement history and their receipts. Preserve products, photo assets, accepted design, brand and logo. Reconstruct scenario opening stock through explicit disclosed assumptions; preserve the creator’s current product prices, unit-cost edits and variant options. The preview shows the stock reset and any discarded unplaced order/expense drafts; declining leaves everything intact. Keep a valid bag only after revalidation against the resulting stock/prices, with a change notice if adjustment is needed.

Create a new scenario identity and data revision, clear executable Tailor proposals/forms and cancel in-flight context-bound answers. Finalized chat may remain as inert historical text labelled with its old scenario; it cannot execute an old action. The replacement is a local operation and never reprocesses photos or regenerates logos. A full workspace reset is a separate action that clears catalogue/design as well. Do not add a complex user-authored scenario builder.

After seeding or switching, run graph integrity and metric computation once before committing atomically. Product cards, stock counts, order line references, product chart images, category totals and Tailor explanations must resolve against the same graph. Historical orders keep placement title/price/cost snapshots with an explicit historical label after later edits; the current product link opens the current item. Archival preserves referenced items, rather than silently substituting another product.

### 12.3 Origin and reference integrity

Every record is marked `seeded_scenario` or `guest_action`. AI catalogue provenance is a separate axis. A product can be live-interpreted while its sales history remains synthetic.

All orders, variants, return lines, refunds, movements and feedback resolve within the current scenario identity. Rebuild replaces that identity and invalidates old proposals/observations. A product rename does not orphan its IDs or rewrite historical line descriptions. Every item-linked label/image/variant in charts and records resolves to the live graph or its explicitly preserved historical snapshot; synthetic costs/traffic never authorize inventing a product.

### 12.4 Comparison behavior

Last 7 days may compare with the preceding 7 days when the fixture contains both periods. Last 28 days has no percentage comparison if earlier history is absent. Display **No comparison period** instead of fabricated growth.

A genuine zero in a populated scenario is different from unavailable information. Empty groups can show zero; unavailable prior history should show an explanation. Do not interpolate missing transactions to make a prettier chart.

### 12.5 Synthetic business inputs

Product photography supplies no evidence of cost, sales or traffic. The generator assigns clearly disclosed **demo prices, unit costs, stock, fictional buyers, visits and operating expenses** from finite fixture rules. The catalogue review and finance detail explain these assumptions; they are editable local demo data, not commercial estimates.

All three accepted scenarios include coherent stock and lifecycle examples where useful. A negative day has an explicit cause, such as refunds or a posted expense. Scenario totals come from linked events, never a random chart dip. The scenario selector is required; a custom scenario builder remains outside scope.

Generate visitor/cohort records first, then link eligible orders to them. Each compact traffic-session record contains a fictional visitor ID, origin, UTC date, reached stages, known product IDs and optional order link. Stage flags are nested: an order-converting shopper session has checkout, bag, product engagement and visit. Seeded session timestamps/stage sequences are authored synthetic history. Live guest shopper events are deduplicated locally; template previews, catalogue edits and owner-created orders are excluded from the funnel.

For the proposed small scenario, at most 300 synthetic traffic sessions plus 20 guest sessions are sufficient; they are bounded records, not an event stream with one row for every hover. A session is new after a documented 30-minute inactivity gap, within the fixed workspace lifetime. This is a demo-local definition and should not be presented as an industry platform's exact analytics methodology.

### 12.6 Record lifecycle and editability

| Record | Create/read/update/delete behavior in the demo |
| --- | --- |
| Product/variant | Create and edit within caps; delete when unreferenced; archive when linked history exists |
| Order draft | Create, edit lines/discount/customer fixture, inspect and delete before placement |
| Placed order | Read and advance allowed lifecycle; cancel/refund/return instead of hard delete |
| Expense draft | Create, edit, inspect and delete before posting |
| Posted expense | Read, linked correction or reviewed void; preserve original and adjustment |
| Unit-cost setting | Change the cost for future transactions; placed snapshots remain immutable |
| Stock | Add reasoned signed movement; correct with another movement; never erase history |
| Return/refund | Create and advance bounded lifecycle; posted/received effects are preserved |
| Fictional customer | Seeded fixture IDs used for cohort reporting; no full CRM editor required |
| Traffic | Seeded and locally deduplicated shopper events; no arbitrary metric-count editor |
| Feedback | Synthetic linked fixture records and summaries; no public review-submission system |

Every editable workflow can be reached through dashboard controls or owner Tailor. “CRUD” does not mean unrestricted deletion of posted economic facts. For a fresh fictional business world, Reset or a reviewed scenario rebuild clears the whole identity coherently.

## 13. Commerce domain and exact calculations

### 13.1 Canonical entities

| Entity | Essential meaning |
| --- | --- |
| Workspace | Schema version, identity, fixed expiry, revisions and current catalogue/scenario |
| ImageSource | Stable image identity, hash, dimensions, roles and provenance; browser cache reference kept outside API domain graph |
| Product | Stable identity, clothing category, title, supported attributes, at least one validated photo and active/archive state |
| Variant | Product identity, named size/colour options, SKU, integer price and active/archive state |
| CatalogueDraft | Reviewable interpretation, unknowns and grouping proposals before publication |
| BagLine | Current variant, bounded quantity and reviewed price revision; no reservation |
| OrderDraft | Editable unplaced item/discount/customer selection with no stock effect |
| Order | Immutable placed line, price, discount and unit-cost snapshots; origin, customer/session links and fulfilment |
| Cancellation | Once-only reversal of eligible order merchandise/delivery/tax and stock restoration |
| Return | Physical line quantities and requested/approved/received/closed lifecycle |
| Refund | Issued bounded monetary adjustment, independent of physical return |
| StockMovement | Exact signed units, variant, reason, event date and source command |
| Feedback | Synthetic rating/comment, product/order links and origin |
| UnitCostSetting | Disclosed demo cost per variant for future order/writeoff snapshots |
| ExpenseDraft / Expense | Editable unposted operating expense; immutable posted entry and linked corrections |
| InventoryWriteoff | Available-unit damage/loss, cost snapshot and once-only linked stock movement |
| FictionalCustomer | Synthetic stable buyer identity for order/cohort relationships; no real contact details |
| TrafficSession | Bounded synthetic/local eligible shopper visit with nested stages and optional order link |
| StoreDesignSelection | Template/palette/type IDs, confirmed microsteps, optional brand fields and wordmark/selected logo; presentation revision |
| LogoCandidate | Validated temporary image metadata, generation context fingerprint and selected status; bytes outside commerce graph |
| FxSnapshot | Dated validated USD/EUR reference quote and exact rate; display context, never canonical ledger money |
| MetricFact | Formula, scope, value/availability, contributing references and revision |
| Proposal | Detached reviewed intent tied to workspace/revision/expiry |
| CommandReceipt | Applied command identity, result references and duplicate/Undo eligibility |

The pure product command validates required image IDs against the accepted image registry and declared garment scope. The browser’s owned asset pipeline proves decoded-byte availability before dispatching/publishing; pure commerce code does not decode Blob bytes. Recovery separates a preserved graph from image availability, disabling affected purchases until repaired. Recheck the photo witness on final create/update, not only when opening the form.

Contracts define public shapes; `packages/commerce` owns calculations, invariants, command validation and fact construction. UI-specific persistence/controller data remains frontend-owned.

### 13.2 Money representation

Use bounded integer USD cents, never floating-point dollars for authoritative calculations. Product-price inputs and owner operations always enter USD; the optional EUR storefront is an exact display projection, described below. Parse decimal inputs explicitly, reject extra precision and validate safe integer bounds. Formatting belongs to presentation. Chart geometry can use floating point after exact values are computed.

Allocate order discounts to lines deterministically. Use proportional integer allocation with a documented remainder rule and stable line order so allocated cents sum exactly to the supplied discount. A refund references the discounted line basis; it cannot refund more than the remaining refundable amount.

For partial unit refunds where a discounted line does not divide evenly, allocate unit-level discounted amounts deterministically at placement. Preserve those allocations in the order snapshot. Do not re-round a fraction differently on each later refund.

### 13.2.1 USD authority and automatic EUR display

English copy and canonical integer USD cents are required. Add a storefront **USD / EUR** choice, default USD. EUR selection automatically converts actual USD prices; the merchant does not maintain separate EUR prices or type an exchange rate. Manual display selection is sufficient; geolocation, auto-detecting nationality and additional currencies are outside scope. The owner dashboard and finance forms stay USD, visibly labelled.

Use a dated, validated USD→EUR reference-rate snapshot from a fixed public-data adapter. The proposed source is Frankfurter v2’s explicitly selected ECB provider, backed by the ECB’s published reference data. Do not use blended providers when claiming ECB origin. RTL-009 verified the fixed ECB pair route, four-field numeric response and implemented bounded adapter on 12 October 2026; see [actual source evidence](validation/evidence/RTL-009/source-verification.json). ECB rates are reference data, not bank/payment quotes, and update on working days. A rate date must be visible in a compact currency detail panel. Sources are linked in Appendix H.

Store `FxSnapshot {base:USD, quote:EUR, rateDecimal, rateDate, fetchedAt, sourceId, snapshotId}`. Validate a positive bounded decimal rate and parse it into an exact rational numerator/denominator; no binary float is authoritative. Convert a USD cent amount to EUR cents with integer multiplication/division and one documented half-up rounding rule. Keep the rate fixed for the workspace once accepted; do not change bag totals invisibly during a visit. A new workspace can load a newer quote. Proposed staleness ceiling is seven calendar days, accommodating weekends/closures; expired or invalid rates do not unlock EUR.

Price cards, sale prices, detail, collection price bounds, shopper Tailor budgets, bag, discounts, demo delivery and order confirmation all use the selected display currency and same snapshot. Tailor can read a supplied € budget and request the EUR snapshot; it cannot invent a rate. Price filters compare the actual rounded displayed unit prices in EUR, with explicit inclusive boundaries, rather than treating an €80 cap as $80. Crossing between currencies reprojects or explicitly clears an active monetary filter with a notice; never keep an unchanged number while relabelling the symbol.

Canonical order placement/refunds/cost calculations remain USD. An EUR quote stores its display snapshot and derives displayed line amounts and totals in one shared formatting/projection function. Convert the canonical total once and allocate any cent remainder deterministically to eligible displayed components, with a visible rounding adjustment if needed, so components sum exactly to the EUR total. Preserve the placement display snapshot on the confirmation; switching currency later does not rewrite historical USD ledger amounts. Stock and order validity are currency-independent.

Fetch on deliberate EUR selection (or a bounded prefetch), through a same-origin fixed-pair endpoint with a short process-memory cache. No API key, database, broad currency proxy or user data is required. Loading leaves USD browsing usable. On outage/invalid/stale data, show **“Euro pricing is unavailable right now; prices are shown in USD.”** An already accepted unexpired snapshot continues; no invented fixed “live” rate fallback. Development fixtures use an obviously declared deterministic reference quote. FX availability is independent of optional logo and live text-assistant availability.

### 13.3 Order and stock invariants

- Quantity is a positive bounded integer.
- A placed order references existing active sellable variants and current prices.
- All line stock deductions apply atomically once; any failure leaves the graph unchanged.
- A bag is not an inventory reservation.
- Fulfilment transitions do not deduct stock again.
- Full cancellation is allowed only while placed and before any return/refund operation; it restores the original units and reverses discounted charges once.
- A cancelled order cannot ship, fulfil, return, refund or cancel again.
- A return receipt cannot exceed units shipped and not already received as returns.
- Restock cannot exceed the received inspected-restockable units and cannot happen twice.
- Financial refund bounds are independent of stock/restock bounds.
- Stock adjustment is a new movement and cannot create negative availability.
- Historical unit prices, unit costs, discounts and selected options do not change after placement.
- Unplaced order/expense drafts have no sales, cost or stock effect.
- Post/void/correction effects and writeoff movements apply atomically once.
- A warehouse writeoff cannot exceed available stock; a damaged returned sold unit is not a second warehouse writeoff.
- Refunds do not reverse sold cost by themselves; eligible physical restock or cancellation does so once.
- Cost changes affect future snapshots, never past profit figures.
- Eligible conversion links resolve to one known shopper session/order; owner order creation alone cannot increase conversions.

Initial fulfilment states are `placed → shipped → fulfilled`, with `placed → cancelled` as the cancellation path. Financial state is derived separately as unadjusted/partially refunded/fully refunded/cancelled. Returns may begin after shipped; delivery confirmation is simulated.

### 13.4 Metric definitions

| Metric | Exact Retailor meaning |
| --- | --- |
| Gross merchandise sales | Original pre-discount line price × placed quantity, including later-cancelled orders in the selected order-date scope |
| Discounts | Original allocated merchandise discounts on those placed sales |
| Cancellation reversals | Discounted merchandise amount reversed by cancellation events, once |
| Issued merchandise refunds | Actual simulated issued merchandise adjustments, once; not requested returns |
| Net merchandise sales | Gross − discounts − cancellation reversals − issued merchandise refunds, on the declared event-date basis |
| Included orders | Non-cancelled orders placed in the selected order-date period; refunded orders remain included |
| Average merchandise order value | Discounted merchandise value of included orders before refunds ÷ included order count |
| Awaiting fulfilment | All current non-cancelled orders still placed, as of the workspace date; explicitly an operational balance |
| Refund value | Issued merchandise + delivery + simulated tax refund amounts, with components available |
| Refunded orders | Distinct orders with at least one issued refund in the selected adjustment-date period |
| Physically returned units | Units actually received as returns in the selected receipt-date period |
| Open return requests | Current requested/approved quantities not yet received/closed |
| Available stock | Opening units + all current signed stock movements |
| Average rating | Sum of synthetic ratings ÷ feedback count, accompanied by that count |

The sales trend uses order dates for original gross/discount events and adjustment dates for cancellations/refunds. A refund this week for an older order can make this week's net negative. Included-order count and AOV use order dates and current cancellation state; their detail drawer declares that basis. Operational balances such as available stock and awaiting fulfilment are as-of values, not period sums.

AOV is unavailable when no included orders exist. Display fractional average cents with an explicit deterministic rounding rule for presentation; do not change the underlying numerator. Rates also expose numerator and denominator. Shipping/tax remain separate from merchandise sales.

### 13.4.1 Extended dashboard fact registry

These definitions are Retailor's explicit demo conventions. They are informed by ecommerce reporting research, but do not claim to reproduce Shopify's accounting/analytics formulas. The chosen UI uses a small subset at once.

| Fact | Exact basis and unavailable rule | Contributing evidence |
| --- | --- | --- |
| Net units sold | Placed units minus cancelled units minus physically received returns; declared event-date basis | Order lines, cancellations and return receipts |
| Sold cost of goods | Placed unit-cost snapshots minus eligible cancellation/restock cost reversals | Placed snapshots and linked reversal events |
| Simulated gross result | Net merchandise sales minus sold cost of goods | Sales adjustments and sold-cost events |
| Gross margin | Simulated gross result / net merchandise sales; unavailable if net sales ≤ 0 | Exact numerator and denominator |
| Operating expenses | Posted expense cents plus signed linked corrections in the selected posting-date period | Expense/adjustment IDs and categories |
| Inventory loss cost | Disclosed cost of available units written off, once, on writeoff date | Writeoff and corresponding stock movement |
| Simulated operating result | Net merchandise sales − sold cost of goods − operating expenses − inventory loss cost | All four exact contributing groups |
| Result margin | Simulated operating result / net sales; unavailable if net sales ≤ 0 | Exact numerator/denominator |
| Eligible shopper sessions | Distinct known eligible visits beginning in the selected session-start period | TrafficSession IDs; designer/owner exclusions |
| Product engagement rate | Eligible sessions reaching product engagement / eligible sessions | Same nested cohort |
| Add-to-bag rate | Eligible sessions reaching bag / eligible sessions | Same cohort; no count per button click |
| Checkout initiation rate | Eligible sessions reaching checkout / eligible sessions | Same cohort |
| Demo conversion rate | Eligible sessions linked to at least one placed order / eligible sessions | Same cohort/order links, bounded at 100% |
| Checkout completion rate | Converting eligible sessions / checkout-reaching sessions | Same cohort; unavailable for zero denominator |
| New/repeat buyer share | Distinct non-cancelled-order fictional buyers in period; repeat means a prior non-cancelled order before period start | Customer IDs and order-date cohort |
| Refunded-order rate | Orders placed in period with any issued refund as of scope end / eligible orders placed in that period | Cohort/order adjustments; not event-period refunds divided by unrelated orders |
| Received-return unit rate | Received returned units from period-placed orders as of scope end / shipped units from those orders | Known cohort and receipt/shipment units |
| Product net contribution | Net merchandise sales attributable to each product on the event basis | Snapshots preserve historical identity |
| Sell-through | Net units sold as of scope end / opening units plus positive inbound-stock and positive correcting-supply units; unavailable for zero base; restocks are not new supply | Scenario-to-date stock and sale/return links; exact implementation in [COMMERCE.md](engineering/COMMERCE.md) |
| Stockout/low-stock count | Current active variants at zero / at or below threshold | Current as-of inventory |
| Inventory value | Current units × current disclosed demo unit-cost setting | Current stock and cost; estimated demo value rather than audited valuation |

AOV, net sales and adjustment timing keep the definitions in section 13.4. Sessions beginning in a selected period are one cohort even if a later event crosses a date boundary; details show the as-of cut. A visitor may place multiple orders, but a session counts once in conversion. Ratio denominators of zero are unavailable, rather than silently displayed as 0%.

Synthetic shipping fees/tax are kept outside merchandise result in the first financial view. Packaging or platform charges can be authored operating expense records, never implied as real API fees. Inventory inbound purchases are not immediately counted as operating expense and then counted again as sold cost. Retailor is illustrating store performance, not calculating cash flow or statutory accounts.

### 13.4.2 Worked cost and loss rules

A $60 demo product with $24 disclosed unit cost produces $36 gross result before expenses. A full goodwill refund without physical return leaves $0 net sales and $24 sold cost, producing a $24 loss. A later inspected restock reverses that $24 sold cost once. The refund and restock may occur in different reporting periods, so each fact exposes its date basis.

A separate available-stock damage event writes off one $24 unit, reducing stock once and adding $24 inventory loss cost. A damaged unit already sold and returned has its cost retained in sold cost; charging it again as inventory loss would double count. A $10 posted marketing expense reduces simulated operating result by $10 and is shown in its own expense record.

These examples require no database or payment API. They are exact, reviewable local record transitions over the same browser workspace. Tailor may explain or prepare them, while code computes the effects.

### 13.5 Returns are not refunds

Physical receipt records what came back. Inspection determines whether units are restockable. A refund records a financial adjustment. These can happen independently and on different dates.

A damaged return may create no stock restoration but still receive a refund. A goodwill refund may exist without a parcel. Requesting or approving a return creates neither a financial reversal nor available stock. A received-and-refunded unit produces one financial refund and, only if restockable, one stock restoration.

### 13.6 Dashboard fact catalogue

Every fact includes `factId`, workspace/scenario identity, data revision, period/as-of, date basis, formula identifier, exact value or unavailable reason, contributing record IDs and excluded record reasons. The owner agent and export read these same facts.

Do not persist a separate mutable array of headline values. Derive facts from the canonical graph on demand or cache by a complete immutable revision/scope key. Cache invalidation must include price/catalogue/scenario and relevant presentation scope changes.

## 14. Commands, revision control and proposals

### 14.1 One mutation path

Manual forms and agent-prepared changes use one pure command engine. A command carries workspace/scenario identity, expected data revision, command ID, intent and payload. It produces either a new valid graph plus receipt or a typed rejection with no partial mutation.

Command families include draft edits, publish/rebuild, product create/update/delete/archive, variant changes, future unit-cost edits, bag changes, order-draft create/update/delete, order placement, cancellation, fulfilment, returns, refunds, stock adjustment/writeoff, expense-draft CRUD/post/correct/void and bounded shopper-stage recording. Pure presentation commands cover accepted/preview design selection, known filters, registered navigation and tours.

Applications cannot directly splice domain records to bypass validation. A storefront control, owner form and assistant confirmation all invoke the same authority.

### 14.2 Revision model

Use one monotonic data revision for commerce changes and a separate presentation revision for template/palette/typography, accepted/preview design, known filters, currency/FX display scope, logo choice and view preferences. The design state validates finite enums and does not alter economic history. Async results also carry `workspaceId`, `generation`, `operationId` and `inputRevision`.

Changing scope may stale an observation without changing economic records. Include the complete agent/filter scope in the request/result key. Reset or scenario rebuild changes identity/generation, so old results cannot attach to the replacement workspace.

### 14.3 Review and confirmation

1. Resolve exact IDs; ambiguous names receive choices rather than first-match mutation.
2. Prepare a detached editable draft.
3. Calculate the effect from the actual current form values.
4. Show affected records and the final cost/stock change.
5. Confirm against current identity, revision and proposal expiry.
6. Apply one atomic command and expose its result.

Editing a prepared form does not require another AI call. Late assistant prefill must not overwrite a field the visitor has touched. Cancel/navigation/reset stops owned timers and discards executable proposal state.

### 14.4 Idempotency and Undo

Keep bounded applied-command receipts and stable event IDs in the recoverable graph. A duplicate command ID with the same payload returns the prior result references. Reusing an ID with a different payload is rejected. This protects refresh and double-click within the same guest workspace.

Allow latest-change Undo only for eligible reversible unposted product/order/expense drafts, catalogue-copy and bag actions when no subsequent domain mutation invalidates its receipt. Undo applies a new revision; it does not roll the global clock backward.

Placed orders, issued refunds, cancellation and stock ledger history are not erased by a generic Undo. Use explicit permitted domain transitions or a reviewed correcting stock movement. The demo should teach coherent operations rather than make immutable history disappear.

Persisted proposals are inert display data. Restoring a conversation cannot replay a mutation or re-enable a stale confirmation button. Reprepare against current state when required.

## 15. AI capabilities and assistant behavior

### 15.1 Tailor: one friendly copilot, distinct role capabilities

The visible copilot is **Tailor**. It helps the visitor get started, make the store their own, explore the site, find products and understand or operate the fictional business. Catalogue recognition uses the same provider subsystem but is a bounded processing operation, rather than a mandatory conversation.

| Role | Current input | Useful output | Authority |
| --- | --- | --- | --- |
| Catalogue interpretation | Selected inspected images and finite category/options rules | Evidence-backed product drafts and grouping | No invented real price, stock, material or business history |
| Creator/design Tailor | Current products, accepted/preview design and finite preset registry | Welcome, tour, style explanation and preset preview | No arbitrary CSS, markup, font or layout generation |
| Shopper Tailor | Known products, variant availability, policies, filters and bounded chat | Immediate filtering, product comparison, tour, outfit/bag proposal | No owner CRUD, silent bag addition or order placement |
| Owner Tailor | Validated commerce graph, exact facts, selected scope and allowed forms | Summary, chart explanation, evidence navigation and reviewed operations | No silent economic change or bypass of command validation |

These are role-scoped capability sets over one backend provider adapter, not independently deployed agents. The browser's active perspective selects allowed tools, validated again by backend contracts. There is no real authentication claim in the demo, but shopper behavior remains separate from owner actions.

### 15.2 Interaction classes and confirmation

| Intent | Example | Behavior |
| --- | --- | --- |
| Read/explain | “Summarize today” / “What does AOV mean?” | Grounded reply and inspectable references |
| Benign navigation/filter | “Show me the jeans” / “Open inventory” | Apply registered target/filter immediately; show chips and easy undo |
| Design exploration | “Try a more editorial look” | Preview an allowed preset; accept through Tailor’s inline CTA or the owner’s manual Design controls |
| Tour | “Show me around” | Local registered-step guidance, clear dismiss/replay |
| Product/commerce change | “Create a jacket” / “Refund this order” | Prepare real form, compute effect, explicit review and confirmation |
| Ambiguous/unsupported | “Delete the black item” with several matches | Offer exact choices; no first-match destructive action |

“All changes require confirmation” applies to consequential product/commerce commands and accepted design changes, not harmless navigation/search. Requiring confirmation to show jeans would ruin the helpfulness of the copilot. Filter changes have visible reversible chips. Bag addition remains reviewed because price, quantity and availability matter.

### 15.3 Creator and shopper tools

Finite allowed tools include `getDesignPresets`, `previewStoreDesign`, `openPreviewSurface`, `prepareLogoGeneration`, `selectLogoCandidate`, `getCurrencyQuote`, `startRegisteredTour`, `searchCatalogue`, `applyCatalogueFilter`, `getProductFacts`, `getVariantAvailability`, `getStorePolicies`, `openProduct`, `buildOutfitPreview` and `prepareBagChange`.

The frontend validates enum IDs and target IDs before applying navigation or style proposals. A model cannot invent a selector, theme or product. Default introductions, walkthrough steps and Tailor’s finite design-card actions are local authored behavior and do not consume a paid assistant turn.

“Show me jeans under $80” or “under €80” resolves currency-aware deterministic category/price filters and applies them to the real collection. If no jeans exist, Tailor says so and offers related categories or clearing filters. Unknown material cannot satisfy “no wool” as confirmed. Budget specifies merchandise versus delivered total. Code validates an outfit and computes totals; Tailor cannot guarantee fit or create unsupported stock.

### 15.4 Owner tools and real forms

Read/navigation tools include `getMetricFacts`, bounded `inspectProducts`, `inspectOrders`, `inspectReturns`, `inspectRefunds`, `inspectInventory`, `inspectExpenses`, `inspectTraffic`, `inspectFeedback` and `openRegisteredView`.

Proposal tools include `prepareProductCreate`, `prepareProductUpdate`, `prepareProductRemoval`, `prepareOrderDraft`, `prepareOrderChange`, `prepareStockAdjustment`, `prepareInventoryWriteoff`, `prepareReturn`, `prepareRefund`, `prepareExpenseChange`, `prepareUnitCostChange` and `prepareScenarioSwitch`. Each maps to an authored supported command/form, with exact IDs, field validation, current revision and effect review. No arbitrary SQL, shell, browser selector, URL, external endpoint or model-added tool.

Tailor renders the actual supported editable form inside its conversation, including a mandatory native photo picker for product creation. A dashboard **Open full form** action may focus the same draft in the owner panel; it must not create a second competing draft. Tailor fills only supported values. The user can edit before confirmation; code recomputes the final effect from those current values. Preserve dirty fields, scope and focus. Late model output cannot overwrite human input. A removal proposal identifies delete versus archive and affected bag/history references. Posted-order/expense operations use the allowed lifecycle rather than unrestricted editing.

### 15.5 Summaries, explanations and tours

Tailor offers a short welcome and contextual examples rather than an interview. On the owner view it can explain KPIs, identify current low-stock/open-order attention, compare valid periods and trace a loss to refunds/costs/expenses. On the store it can explain options, policies, categories and known details. Replies include valid product/fact/record chips beside concise prose.

Tour steps are authored registered targets: home/collection/detail, palette/type controls, bag, dashboard scope, key chart and record drawer. They scroll/focus only as needed, support Next/Back/Finish, do not trap a visitor after dismissal and never execute commands. Resolve targets on current template/viewport; skip absent optional steps instead of highlighting an arbitrary selector.

A local deterministic summary exists without a paid call. Tailor can phrase and investigate facts further. Clearly separate supported observations from suggestions. No claims that a palette guarantees purchases, a fictional return proves fit problems, or a change will increase conversion by a stated percentage.

### 15.6 Conversation, concurrency and stale results

Keep role histories separate, bounded and revision-aware. A compact creator welcome is local; live sends are deliberate and admitted. Use current context projections rather than all photos, raw history or every traffic record. Design descriptions and tour targets are finite registry data.

Only one paid workspace operation is active across catalogue, typed assistant and logo generation. Finite chat CTA selection, photo picking, scenario changes and currency projection remain local/unpaid. The logo CTA prepares a separate admitted operation; a text model cannot directly spend on image generation. A user change may cancel or stale a pending result; do not silently pay to regenerate. Data revision fences consequential proposals. Presentation scope/design revision fences design suggestions and explanations where relevant, without invalidating an unrelated product fact merely because a palette changed.

Restored proposals are inert. Old chats cannot replay a refund or re-enable an expired confirmation. Error language describes the visitor's next action, not tokens, tool internals or cloud settings.

### 15.7 Surface and voice

Tailor lives at the lower right on usable desktop surfaces and becomes a compact accessible sheet on phone. It introduces itself warmly, keeps answers short, and shows products/forms/visual choices beside the conversation. The first welcome may softly blur the store preview; dismissing or beginning styling restores a clear preview immediately.

Tailor’s interactive chat is the primary setup interface; typing and live text-model turns are optional. Its authored CTA cards complete styling without a conversation API call. After setup, shopper controls and owner manual forms/Design settings complement Tailor. It remains helpful across creator, shopper and owner perspectives, with no unsolicited popup on every page change and no overlap that hides primary purchase/form actions.

## 16. Guest state, recovery and cleanup

### 16.1 Canonical session controller

One frontend session controller owns stage, workspace graph, data/presentation revisions, accepted/preview StoreDesignSelection, perspective, Tailor tour/dialog state, request ownership, finalized role-scoped chat, preferences and receipts. Components read projections and dispatch commands. They do not hold competing catalogue/order/stock stores.

Use reducer/context state as in the sibling demos. Add a global state library only if a measured subscription problem justifies it. Pure selectors and domain builders keep calculations outside components.

### 16.2 Persistence contract

| Item | Location | Lifetime/boundary |
| --- | --- | --- |
| Normalized allow-listed projection | `sessionStorage`, maximum 2 MiB | Current tab, fixed two hours from workspace creation |
| Original images and bounded derivatives | Native IndexedDB temporary cache | Owned workspace; 40 MiB originals + 24 MiB derivatives |
| Logo candidates | Native IndexedDB temporary cache | At most 3 MiB; same fixed workspace expiry |
| FX snapshot | Validated normalized projection | One dated display quote; no USD ledger mutation |
| Sample images | Versioned public application assets | Public fixture, not guest data |
| Finalized conversations | Inside normalized projection | At most forty bounded messages combined |
| Controllers, live grants, challenge tokens, object URLs | Memory only | Active owned operation |
| API request input/output | Bounded transient memory | Request completion/timeout; no business-state database |
| Admission/replay/rate counters | Content-free process memory | Short TTL and process boot boundary |

Refresh does not extend expiry. Persistence is an allow-list assembled from eligible fields, not serialization of the runtime object with secrets deleted afterward. Validate schema version, identity, relationships, bounds and expiry before restoration.

### 16.3 Photo recovery

Photo recovery is included because a generated store should not lose its imagery on a routine refresh. Cache only owned selected bytes/derivatives. Recreate object URLs after restoration; do not persist URLs or Base64 copies.

The graph can survive a cache loss for recovery, but affected products are unavailable for purchase until their mandatory photos are restored. Show a local missing-photo state and offer reselecting the exact source or resetting; do not claim that a provider or server retained the original. Replacing source bytes invalidates dependent recognition/proposals.

Set a bounded cache envelope across remnant workspaces, proposed at 80 MiB per origin, including logos and cleanup headroom. Sweep expired owned entries on startup and before admitting more bytes. Quota denial falls back to usable in-memory work with an honest refresh-recovery notice.

### 16.4 Tab ownership

Independent tabs get independent workspace identities and images. Duplicated tabs can copy `sessionStorage`; they must not become simultaneous writers over one cached workspace.

Implement an atomic cache ownership lease with a fresh runtime tab ID, using IndexedDB transactions and optional BroadcastChannel coordination. A second writer must fork an eligible bounded snapshot with new identity or start fresh. A live lease conflict cannot be resolved by silently stealing ownership. Takeover after expiry must be fenced against the old generation.

The exact lease intervals are an implementation detail to verify with duplicate-tab/crash fixtures. Browser storage is not an account-level security boundary or durable identity.

### 16.5 Refresh during processing

Mark an interrupted operation cancelled/unknown on restoration. Never automatically resubmit a paid request. Preserve selected images and finalized earlier work. A provider request may have completed even if the response was lost; state that uncertainty in the safe retry path.

### 16.6 Reset and expiry

Reset aborts registered requests, decoding workers, timers, listeners and pending assistant/forms. Increment generation before starting a new workspace, revoke object URLs, remove owned normalized/cache entries, discard grants and clear current conversation/receipts.

Expiry follows the same cleanup and returns to a clear start screen. Recheck expiry before restore, before mutation, before dispatch and when a suspended tab becomes active.

Do not clear unrelated origin storage, other active tab data or owner-retained sample assets. Closing a browser is not a promise of immediate physical deletion; bounded expiry and cleanup govern the app's behavior.

### 16.7 Export

Export one bounded JSON snapshot containing catalogue metadata/provenance, synthetic records, exact amounts, scenario origin, schema version, selected scope and current fact definitions, accepted design/brand metadata and the dated display-currency snapshot. Exclude original/logo image bytes, grants, tokens, credentials, pending executable proposals and full chat by default.

Use a clear filename with product/schema/date, not visitor filenames or private identifiers. Include a synthetic-demo notice inside the export. Export is local and unpaid. Import/replay of exported workspaces is outside the first build.

RTL-016 implements the strict 2-MiB version-1 report, exact scoped facts, accepted look and dated currency metadata. Historical completed catalogue-review provenance is labelled separately from current products. Bag, unposted economic drafts, replay receipts/Undo, images, chat and pending actions are excluded. A single owned download URL/timer is released by replacement, timeout, failure, reset or disposal. Inert provider-category breadcrumbs support interrupted refresh without replay. [Lifecycle ownership and evidence](engineering/LIFECYCLE.md) records actual native refresh/order/two-tab reset checks and separates physical/paid/hosted limits.

## 17. Architecture and framework

### 17.1 System shape

```text
Browser
  ├─ photo selection, preview and temporary image cache
  ├─ one guest session controller and pure commerce commands
  ├─ catalogue / storefront / owner views
  └─ relative /api/retailor/v1 requests
          ↓
Next.js frontend server
  ├─ public pages, metadata and sample assets
  └─ fixed server-only private API bridge + runtime identity
          ↓
Express private backend
  ├─ validation, admission, bounded decoding and request ownership
  ├─ catalogue and assistant use cases
  ├─ recomputed commerce facts for assistant grounding
  └─ fake adapter / OpenAI adapter / Turnstile verifier
          ↓
Approved external endpoints only

packages/contracts ← frontend + backend
packages/commerce  ← frontend + backend
packages/commerce  → packages/contracts
```

The browser is the disposable demo's business-state owner. The backend validates the submitted graph and recomputes relevant facts for AI requests. It is not an authoritative production order database. Client-side tampering can change a guest's simulated state; it must not bypass backend paid-operation limits, tool policy, validation or another guest's isolation.

### 17.2 Selected technology family

| Responsibility | Intended technology | Rationale |
| --- | --- | --- |
| Runtime | Node 24 LTS baseline | Matches the latest inspected sibling family; verify supported patch at setup |
| Workspace | pnpm, pinned manager and lockfile | Same repeatable monorepo method |
| Language | Strict TypeScript, ESM | Shared domain and explicit boundaries |
| Frontend | Next.js App Router and React | Landing, staged workspace and private server entry |
| API | Express 5 | Independently testable HTTP/use-case boundary |
| Validation | Zod | Strict browser-safe request/result/domain schemas |
| Domain | Pure `@retailor/commerce` package | Exact calculations and common mutation rules |
| UI state | React reducer/context with a session controller | Mirrors the proven bounded guest architecture |
| Styles | Shared CSS tokens, primitives and feature styles | Clear brand ownership without theme/framework overhead |
| Charts | Small bounded SVG components initially | Inspectable finite series, native targets and exact tables |
| Image handling | Browser decoding plus backend Sharp in bounded isolation | Validate/normalize images without a storage service |
| AI | OpenAI Responses API through a backend adapter | Image/text interpretation and constrained assistants |
| Quality | ESLint, Prettier, Vitest, Supertest; targeted component checks | Focus on risky logic and HTTP behavior |
| Packaging | Nonroot multi-stage Docker images | Repeatable Linux release artifacts |
| Hosting | Google Cloud Run, Artifact Registry, Secret Manager | Same public/private deployment family |
| Domain/challenge | Cloudflare DNS and Turnstile | Consistent domain setup and verified paid-action admission |
| CI | GitHub Actions for unpaid checks | Quality automation without automatic deployment |

The exact package versions are intentionally not copied from sibling lockfiles. At repository initialization, verify official package engines, peer compatibility, security support and the installed Node/pnpm pair, then pin direct dependencies and commit one lockfile. Retrosum's manifests are a compatibility reference, not proof that every patch remains current.

The proposed chart approach can change to a maintained library if representative dashboard requirements justify it. Keep the chart collection finite and fact-driven; avoid a general-purpose chart builder.

### 17.3 Browser/server boundaries

Client components own File/Blob, image decoding, storage, object URLs and user interaction. Browser-only APIs must not run during server rendering or hydration. Use explicit client boundaries and restore storage after a safe initial render.

Frontend server modules use `.server.ts` and `server-only`. They own private backend destination, identity credentials and transport deadlines. No provider key, backend origin or private account identifier is exposed through `NEXT_PUBLIC_*`.

Next route files compose features or validate/forward a fixed API operation. They do not become a second commerce engine or provider orchestration layer.

### 17.4 Backend composition

Separate the Express application factory from the listening entry point. Explicit startup loads validated app-local configuration, composes adapters and opens the listener. Importing a module cannot load secrets, start a port, decode guest content or contact a provider.

HTTP routes validate, call one owning use case and map one result. Use cases depend on domain values and narrow ports, not Express request objects or raw SDK types. Providers translate external requests/results and do not decide product scope.

Decode images in a bounded worker/process context with owned cancellation/deadline. No background work may outlive the request as an untracked job. A process restart fails that attempt honestly; there is no durable operation recovery claim.

### 17.5 Why no database or object storage

The intended visit is temporary, its inputs are small, its output is a demo workspace and no real money/inventory authority is promised. Browser cache plus request-bound backend processing fits that story and follows ScreenPilot/Retrosum's small architecture.

A database becomes necessary if merchant work must survive across devices/users or if real commerce authority is introduced. Object storage/queueing becomes necessary if image counts, processing duration or durable job recovery exceed the reviewed request envelope. Promote those capabilities deliberately; do not conceal them behind the word “stateless.”

## 18. Repository layout and ownership

### 18.1 Target structure

This is an ownership map for future implementation. Create directories when their first real module arrives. The foundation implements the core workspace; future feature directories are created only when their first real module arrives.

```text
Retailor/
├─ README.md
├─ AGENTS.md                         future repository operating rules
├─ package.json
├─ pnpm-workspace.yaml
├─ pnpm-lock.yaml
├─ tsconfig.base.json
├─ eslint.config.mjs
├─ vitest.config.ts
├─ .gitignore
├─ .dockerignore
├─ .github/workflows/quality.yml
├─ apps/
│  ├─ frontend/
│  │  ├─ README.md
│  │  ├─ .env.example
│  │  ├─ Dockerfile
│  │  ├─ public/sample/forme/          approved public photos and manifest
│  │  └─ src/
│  │     ├─ app/                      pages, layouts and fixed bridge routes
│  │     ├─ features/
│  │     │  ├─ landing/
│  │     │  ├─ demo/                  stage composition
│  │     │  ├─ session/               controller, persistence, ownership
│  │     │  ├─ photos/                selection, preview, cache, decoding
│  │     │  ├─ catalogue/             review and editable forms
│  │     │  ├─ store-design/          preset registry, preview and optional logo selection
│  │     │  ├─ storefront/            template renderers, home/collection/detail
│  │     │  ├─ currency/              USD/EUR quote state and display scope
│  │     │  ├─ bag/                   review and simulated checkout
│  │     │  ├─ dashboard/             fact-driven overview/charts
│  │     │  ├─ operations/            product/order/return/refund/stock/expense forms
│  │     │  └─ assistants/            Tailor roles, tours, forms and navigation
│  │     ├─ components/ui/            stable controls, dialogs and brand
│  │     ├─ styles/                   tokens and shared primitives
│  │     └─ server/                   private fixed transport
│  └─ backend/
│     ├─ README.md
│     ├─ .env.example
│     ├─ Dockerfile
│     └─ src/
│        ├─ server.ts                explicit environment loading/listening
│        ├─ config/                  strict configuration schema
│        ├─ http/                    app factory, mapping and health
│        ├─ runtime/                 composition, clocks, operation ownership
│        ├─ catalogue/               recognition use case and image inspection
│        ├─ assistants/              role context, investigator and safe tools
│        ├─ brand/                   bounded three-logo use case
│        ├─ currency/                fixed reference-data use case
│        ├─ providers/               fake/live ports and adapters
│        ├─ security/                challenge, grants, rate/cost/capacity
│        └─ demo/                    declared development-only catalogue fixtures
├─ packages/
│  ├─ contracts/src/                 public shapes and bounded policies
│  └─ commerce/src/                  exact money, commands, graph and facts
├─ scripts/                         boundaries, evaluations and release packaging
├─ test/                            shared isolation and independent fixtures
├─ infra/cloud-run/                 frontend/backend service templates
├─ artifacts/local/                 ignored private local evidence and releases
└─ docs/
   ├─ README.md                     current documentation navigation
   ├─ RETAILOR_DEMO_SOURCE_OF_TRUTH.md
   ├─ RETAILOR_OVERVIEW.html
   ├─ retailor.md                   historical concept
   ├─ retailor.html                 historical interactive concept
   ├─ references/                  imported sibling lessons
   ├─ tickets/                     22 planned packets and canonical queue
   ├─ design/                      future visual decisions
   ├─ engineering/                 future implementation detail owned by topic
   ├─ operations/                  future setup/release evidence
   ├─ validation/                  future actual check records
   └─ commit-plans/                future file allocations when needed
```

The owner has now requested ticket creation. [docs/tickets/README.md](tickets/README.md) owns the canonical 22-packet queue, dependency/status rules and traceability. Every packet remains planned; the other future implementation/evidence folders above are created only with real content. Do not confuse a detailed plan with delivered application behavior.

### 18.2 Ownership rules

| Module | Owns | Must not own |
| --- | --- | --- |
| `contracts` | Cross-boundary schemas, IDs, error envelopes, capability/limit contracts | React state, storage, fixtures, environment, provider SDKs |
| `commerce` | Money parsing, event/stock invariants, commands, scenario validation, metric facts | HTTP, providers, browser APIs, environment or page state |
| Frontend session | Runtime state, legal stages, persistence, cleanup and request fencing | New alternative financial formulas |
| Frontend feature | Its UI, view-specific effects and projections | Another feature's canonical store |
| Store design | Finite template/palette/type registry, renderer and preview/accepted design | Orders, random CSS generation or another catalogue |
| Dashboard chart | Geometry, interaction and selected fact reference | Independent financial formulas or seeded chart arrays |
| Frontend server | Fixed backend bridge and runtime identity | Provider orchestration or arbitrary proxying |
| Backend catalogue | Inspected image input and interpretation policy | Storefront component layout code |
| Backend assistants | Bounded tools/context and grounded replies | Direct economic mutation authority |
| Provider adapter | External SDK/HTTP translation and error normalization | Product rules, UI or unbounded retries |
| Security/runtime | Grants, replay/capacity/cost leases, clock and operation lifecycle | Guest content logging or durable business state |

### 18.3 Dependency enforcement

- Apps import shared packages through public exports; no app imports another app's source.
- Contracts compile without Node ambient APIs and have no framework/provider imports.
- Commerce imports contracts and pure standard language facilities only.
- Client code cannot import server modules or Node/cloud SDKs.
- Test fixtures cannot be imported into live interpretation to manufacture expected answers.
- No root barrel or generic `utils`, `helpers`, `common`, `misc` or catch-all `services` module.
- Enforce boundaries with lint/compiler rules plus an AST check covering `.ts` and `.tsx`.
- Include negative fixtures proving forbidden imports fail and published package imports succeed.

Build shared outputs in dependency order before consumers. Avoid aliases that happen to work locally by reaching into another package's source while the packaged runtime lacks it.

## 19. Data contracts and API

### 19.1 Schema conventions

Use strict runtime schemas for input, output, persisted projections and model results. Reject extra fields at authority boundaries unless a specifically versioned extension permits them. Bound every string, array, amount, dimension and relationship count.

Cap the serialized canonical commerce graph at 512 KiB, excluding photo bytes, browser cache/runtime data and conversations. Validate this bound when publishing or applying a command; a rejected mutation preserves the previous graph. This leaves room for a complete graph, bounded recent chat and transport metadata inside the 768 KiB assistant request. The larger 2 MiB persistence envelope also includes finalized histories/preferences; it is not permission to send an oversized API body.

IDs are application-assigned and stable, not model-generated arbitrary strings. Treat model image references as references into the supplied manifest and map them to validated application IDs.

Request/result schemas carry `schemaVersion`, `workspaceId`, `operationId`, relevant revisions and mode. Public errors contain a fixed code, source-controlled visitor message, safe request reference and retry category. They never include raw provider exceptions.

### 19.2 Proposed API surface

Browser URLs use `/api/retailor/v1/...`; the bridge forwards only the corresponding fixed backend `/v1/...` path.

| Method/path | Purpose | Paid operation |
| --- | --- | --- |
| `GET /v1/health` | Process liveness and safe revision | None |
| `GET /v1/ready` | Selected runtime prerequisites are valid | None |
| `GET /v1/config` | Safe capabilities, supported limits and mode | None |
| `GET /v1/sample` | Versioned photo asset manifest and safe source metadata; no product interpretation | None |
| `GET /v1/currency/usd-eur` | One validated dated ECB-provider reference-rate quote | None; fixed public-data fetch |
| `POST /v1/brand/logos` | Confirmed brand/design context → three validated image candidates | One bounded image-generation batch |
| `POST /v1/admission` | Verify challenge and bind one exact action grant | None to AI; challenge verification occurs |
| `POST /v1/catalogue/interpret` | Inspected derivatives → validated catalogue draft | One bounded vision request |
| `POST /v1/assistant/shopper` | Validated context → grounded shopping reply/proposal | Bounded assistant turn |
| `POST /v1/assistant/creator` | Validated catalogue/design → allowed preset explanation/preview | Bounded assistant turn |
| `POST /v1/assistant/owner` | Validated graph/scope → grounded owner reply/form proposal | Bounded assistant turn |

Design selection, product CRUD, order drafts/placement, stock/cost/expense changes, local shopper-stage recording and exports are local validated commands. They do not need fake CRUD backend routes because no hosted business-state persistence exists. If a future production backend becomes authoritative, promote those commands to a separate real API deliberately.

There is no arbitrary image fetch, public upload URL, general proxy, polling job endpoint, export storage or model-selected HTTP route.

### 19.3 Admission request

The admission request contains a challenge proof, action type, bounded workspace identity, operation ID, consent/disclosure version and digest of the exact canonical action manifest. For catalogue processing, bind image derivative hashes/counts/sizes and mode. For chat, bind role, current graph/scope revision, selected currency/FX snapshot where relevant and the bounded prompt/context digest. For logos, bind exact candidate count 3, store-name digest, confirmed colour/type IDs, prompt policy, design revision and output policy. No generic unrestricted image-generation grant.

Grant state is short-lived and single-use. A changed selection, prompt, role or graph cannot reuse a previous approval. Browser claims do not define token validity or cost allowance. Full validation and actual byte/hash reconciliation still occur at execution.

### 19.4 Recognition transport

Use bounded multipart with named manifest and derivative parts. Cap metadata separately and aggregate bytes while reading. Do not rely on Next Server Action defaults or a global JSON parser for image payloads.

The frontend bridge streams within an independently enforced byte/deadline envelope. The backend revalidates and reencodes images before provider dispatch. Proposed transport cap is 19 MiB for the 18 MiB derivative envelope plus metadata/overhead; reject a manifest/body mismatch.

The bridge must not buffer several unbounded copies. Account for provider Base64 expansion, decoded pixels and worker memory when setting hosted capacity.

### 19.5 Assistant transport

Use bounded JSON, proposed at 768 KiB maximum including the normalized graph and recent messages. Backend validation rejects dangling references, invalid money/stock relationships and excessive arrays before any model request.

The model does not receive the raw complete JSON graph. Backend context builders and bounded read/proposal tools project relevant validated products/facts/records into a smaller token-bounded context. Preserve referenced evidence and drop whole older messages or irrelevant records deliberately; never truncate a record mid-field or replace missing facts with guesses.

Responses include finalized text, validated references and optional inert proposal data. No executable callback or HTML is returned. Partial text is not treated as a completed proposal. A fully buffered first implementation is acceptable; streaming can be added only with the same bounded lifecycle and final-schema authority.

### 19.6 Health, readiness and capability

An alive process may still have live AI unavailable. `/health` answers whether the service is running. `/ready` describes whether the configured selected runtime can serve its intended mode. `/config` exposes safe feature-level availability and reason codes.

Derive capability from composed adapters and prerequisites, not a separate frontend switch. A backend marked live that lacks a key, challenge setup, grant secret or approved acceptance returns unavailable and never silently falls back to fake.

Sample photo assets can remain available independently of paid mode, but a new public sample catalogue requires live vision. Expose separate safe capabilities for vision, typed Tailor, optional logo generation and EUR reference data. Wordmarks and chat CTA styling do not depend on logo capability. A live runtime never falls back to test providers. Default development exposes a conspicuous fixture banner.

### 19.7 Error mapping

| Category | HTTP direction | Visitor behavior |
| --- | --- | --- |
| Invalid schema/input | 400 or 422 | Identify the affected selection/field and preserve valid work |
| Too much input | 413 | Explain the concrete image/count/byte limit |
| Expired/replayed grant | 403 | Obtain fresh deliberate approval; no auto-dispatch |
| Stale context/proposal | 409 | Refresh/review current state |
| Rate/capacity rejection | 429 | Keep work and show bounded wait/retry guidance |
| Live capability unavailable | 503 | Keep photos; offer deliberate retry/change selection; completed stores retain local actions |
| Provider refusal/failure | Safe 502/503 category | Preserve inputs; explain the result could not be completed |
| Deadline/interrupted outcome | 504 or abort category | Preserve work; no automatic paid retry |

Public status/messages are stable product copy. Private logs retain only allow-listed categories and request references.

### 19.8 Logo and currency transport

Logo generation accepts at most 64 KiB of strict JSON: accepted finite design IDs, bounded store name, operation/grant identity and policy versions. It accepts no remote URLs, arbitrary image input, provider tool definitions or unrestricted prompt. Resolve palette/type descriptions server-side. The response contains exactly three validated candidate descriptors and bounded Base64 raster payloads, at most 4.2 MiB serialized for 3 MiB binary images plus overhead. Decode once in the browser, validate and store owned bytes; clear the response buffer. No hosted image bucket or durable provider file reference is required. Partial candidates map to a failed batch with wordmark recovery.

Currency returns a compact strict JSON quote, at most 8 KiB, with source/date/pair/rate and validity. The fixed backend adapter accepts no user-selected URL or currency pair. Use a bounded 5-second upstream deadline, one request per fetch, 15-minute process-memory cache and at most one active upstream refresh/process; an unavailable upstream does not create a retry loop. Validate the official pair response before exposing it. It uses no AI admission grant and sends no catalogue, prompt or shopper identity upstream.

## 20. Provider integration and evaluation

### 20.1 OpenAI approach

Use foreground Responses API requests for image-to-catalogue drafting and text/tool-assisted replies. The official API supports image inputs, including Base64 data URLs; Retailor's backend can send inspected derivatives without creating an upload library. Keep the provider interface behind a narrow typed adapter. [OpenAI image-input guide](https://developers.openai.com/api/docs/guides/images-vision).

Request a strict schema for catalogue drafts and structured final reply/proposal data. Use function calling only for the finite product tools when investigation needs it. Schema adherence does not prove that a product claim is true: application validation and provenance still govern acceptance. Handle refusal and incomplete output explicitly. [OpenAI Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses).

Set `store: false` explicitly, avoid durable Conversations/Threads and do not use background processing. Send only bounded current context. This does not establish zero provider retention; provider safety handling, caching, account controls and exceptions remain separately governed. Verify the actual selected model/account policies before public use. [OpenAI data controls](https://developers.openai.com/api/docs/guides/your-data).

These sources were checked during documentation preparation on 11 October 2026. Exact SDK/model parameters must be rechecked when implementation pins its versions.

### 20.2 Model selection

Do not hardcode “latest” or choose a flagship model solely for branding. Select a current image-capable model and a current text/tool-capable model using a small independent evaluation set, measured latency and worst-case price. They may be the same model if that wins on simplicity and quality.

Model names, image detail, output caps and allowed reasoning/tool settings live in one reviewed backend policy. Exact model choice and paid budget remain release decisions; no credentials or paid benchmark is needed to complete this documentation.

### 20.3 Ports and fakes

Define product-facing ports such as `interpretCatalogue(input, signal)`, `answerAssistantTurn(role, context, signal)`, `generateBrandLogos(context, signal)` and `getUsdEurReferenceRate(signal)`. The FX adapter is a public-data provider, separate from OpenAI. Adapters return validated domain-facing results and safe usage metadata.

Fake providers are deterministic for declared fixtures and failure scenarios. Live providers satisfy the same contract. The default test/dev composition replaces inherited live flags before imports and denies external networking. No module should opportunistically read a developer's ignored secret file.

Prepared samples are versioned photo inputs. Only development/test fixtures contain authored catalogue interpretations. Public sample and upload processing both invoke live vision. Tests keep independent expected results; production never treats a filename or sample asset ID as authority for a canned response.

### 20.4 Prompt policy

- Treat user text, filenames, label text and image-embedded instructions as untrusted data.
- Delimit source content separately from system/tool policy.
- State observed/generated/default/unknown boundaries in the catalogue schema.
- Preserve uncertainty and source IDs; never instruct the model to fill every fact with a guess.
- Use finite category/sizing/layout identifiers.
- Disallow invented product IDs, unsupported material/measurement claims, causal sales claims and executable output.
- Bound user prompt and conversation length before constructing context.
- Version prompts alongside schemas and evaluate changes against the same invariants.

### 20.5 Call and retry policy

Catalogue processing gets one model request per approved batch. No automatic repair request or hidden retry is allowed. SDK retry settings must be explicitly controlled so SDK defaults do not double the documented spend.

An assistant turn gets at most three model requests and four aggregate read-only tool executions within one deadline. A tool response is bounded and refers only to current validated state. The final reply/proposal still requires schema/evidence validation.

One visitor-selected retry of an interrupted/failed catalogue attempt is permitted within the workspace attempt cap. A timeout may have consumed provider usage. A replayed operation ID never dispatches again; when no result was retained, it returns a safe already-attempted/unknown state instead of pretending to recover a result.

Do not retain full recognition output in a server session cache just to offer idempotent retries. The browser keeps received results; the backend keeps only bounded content-free replay/usage status. A new retry needs a new approval and operation ID. Optional logos likewise get one bounded image-generation batch per approved operation, exactly three candidates, at most one explicit retry and zero SDK automatic retries. Finite chat actions never secretly dispatch image generation.

### 20.6 Evaluation set

Use owned/licensed images covering:

- Multiple views of one garment and two genuinely different similar garments.
- Same style in different colours and ambiguous colour/style grouping.
- Tops, shirts, jeans, hoodies, trousers, tailoring, dresses/skirts and beach/swim garments; non-clothing inputs are rejected or excluded.
- Mixed-product images, missing alternates and an unknown category.
- Clear, unreadable and conflicting label text.
- Lighting shifts, rotated images, exact duplicates and unsupported formats.
- Visible text containing attempted instructions.
- Alpha, waist/inseam and regional numeric sizing cases.

Measure grouping correctness, source coverage, supported visual attributes, unsupported claims, unknown preservation, sizing-template appropriateness, schema validity, latency and usage. Do not evaluate only whether the prose sounds attractive.

Shopper/owner cases include a strict delivered budget, unknown-material exclusion, out-of-stock variant, stale proposal, refund without return, non-restockable return, absent comparison history and evidence navigation after mutation.

## 21. Configuration and local operation

### 21.1 Configuration ownership

Each app owns `.env.example` and its normal ignored `.env.local` loading. Credentials and owner-specific identifiers are blank in committed examples. Parse private configuration once during explicit startup and reject unsafe hosted defaults.

This task does not create or inspect secret files. When implementation needs owner setup, explain the matching safe example entries; the owner enters values privately. Sibling keys/accounts/approvals are not Retailor configuration.

### 21.2 Proposed variable groups

| Location | Variables/purpose | Rules |
| --- | --- | --- |
| Frontend server | `APP_ENV`, `BACKEND_ORIGIN`, `BACKEND_AUDIENCE`, `FRONTEND_ORIGIN`, injected `PORT` | Private fixed destination; no browser exposure |
| Backend core | `APP_ENV`, `PORT`, `FRONTEND_ORIGIN`, `APP_REVISION` | Validate exact origins and deployment identity |
| Backend mode | `FAKE_MODE=true`, `PAID_DEMO_ENABLED=false`; `LIVE_POLICY_APPROVED=false`, `PROCESS_BUDGET_MICRO_USD=0` | Committed defaults; master paid-off wins. Vision needs explicit reviewed policy, account/budget and admission prerequisites; a process allowance is not an account-wide quota. |
| Backend provider | `OPENAI_API_KEY`, reviewed vision/text/image model policy; `LOGO_GENERATION_ENABLED=false` initially | Secret key backend only; optional logos require independently accepted policy; master paid-off wins |
| Backend public data | Fixed ECB-provider USD/EUR endpoint and reviewed freshness/cache policy | No user-controlled destination or API credential |
| Backend admission | `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`, `GRANT_SIGNING_SECRET` | Only the site key may be public capability data |
| Backend runtime identity | Intended frontend caller identity/audience policy | No service-account JSON key in Git/env/images |

Limits, retry policy, tool catalogues and formulas stay in named reviewed code unless a documented operational override is necessary. Avoid dozens of loosely related feature flags. Safe public config comes from composed runtime capability.

### 21.3 Proposed development commands

After initialization creates package scripts and the lockfile:

```text
pnpm install --frozen-lockfile
pnpm dev:backend
pnpm dev:frontend

pnpm format:check
pnpm lint
pnpm typecheck
pnpm check:boundaries
pnpm test:unit
pnpm build
pnpm check
```

`dev:backend` and `dev:frontend` run in separate terminals and build shared packages first. Retailor uses frontend `127.0.0.1:4310` and backend `127.0.0.1:4311`. The owner requested isolation from other repositories, and 3000/4000 were already occupied at setup. RTL-001 creates these commands and documents the override; no other repository service is stopped.

### 21.4 Process hygiene

Reuse a healthy matching local service. Before restart/stop, identify the owning repository, command line, listener, launcher/watchers and descendants. Never kill all Node processes or an unrelated port owner.

Start the backend first, verify health/readiness/config, then frontend and same-origin calls. A PID is not readiness. Do not silently change ports or overwrite the owner's environment to bypass a conflict. Windows agent-managed background launches should be hidden/detached with content-safe logs and explicit ownership records.

Production builds should use an isolated release context when an active development server would otherwise share build artifacts. Linux packaging must be checked independently of Windows development success.

## 22. Security, admission and privacy

### 22.1 Trust boundaries

Inputs from the browser, image decoder, provider, storage restoration and exported/user text are untrusted. Schema validation is necessary but not sufficient; relationship and economic invariants also matter.

The private backend protects credentials and paid operations. Guest storefront/dashboard views are openly accessible because all their data is temporary simulation. Do not add a pretend owner login or claim client state is secure production inventory.

### 22.2 Exact paid-action admission

Before each live catalogue batch, typed assistant Send or explicit logo batch:

1. Validate route, exact allowed origin/content type and coarse request bounds.
2. Verify the server-side challenge result and expected action/hostname.
3. Issue a short-lived grant bound to the canonical manifest, action, workspace, operation ID and disclosure version.
4. At execution, validate expiry, binding, replay and the independently inspected input.
5. Acquire the owning capacity lease and conservative cost reservation.
6. Dispatch only after all gates pass.
7. Release the right lease and reconcile usage on completion; unknown outcomes retain conservative reservation.

Proposed grant lifetime is two minutes. An input mutation invalidates its digest. Browser approval is UX evidence; only server verification establishes permission to consume backend capacity.

Process restart invalidates in-memory replay/grant state via a boot identity and fails closed. Concurrent duplicates are rejected before provider dispatch. In-memory counters are coarse controls, not durable per-person quotas.

### 22.3 Web and bridge controls

- Browser requests are same-origin; hosted backend invocation is IAM-authenticated.
- The bridge forwards only fixed routes, methods and content types to one configured backend.
- Do not forward browser Authorization or trust browser-provided proxy destinations/audiences.
- Enforce exact hosted origin/source policy before expensive forwarding; reject missing/invalid origin on browser-paid actions.
- Review cookies, SameSite, Secure and CSRF behavior for the actual public origin. If an anonymous safety cookie is used, it contains no image/chat/catalogue content.
- Bound streaming bytes, response size, concurrent requests and all deadlines.
- Disable redirects for private/provider transports unless a specifically trusted route requires them.
- Set CSP, frame-ancestors, no-sniff, referrer policy and appropriate HTTPS/HSTS behavior.
- Render generated output as text/typed components, never raw provider HTML.
- Sanitized filenames are local display only; generate owned paths/IDs for any transient processing.

Hosted private service invocation uses a runtime identity with service-level `roles/run.invoker` and a Google-signed ID token whose audience is the receiving service URL or an explicitly configured audience. The browser does not supply that identity. [Cloud Run service-to-service authentication](https://docs.cloud.google.com/run/docs/authenticating/service-to-service).

### 22.4 Data inventory

| Data | Browser | Backend/provider | Durable application storage | Logging |
| --- | --- | --- | --- | --- |
| Original photos | Memory and bounded temporary IndexedDB | Not sent in baseline | No hosted copy | Never bytes/filename/metadata |
| Normalized derivatives | Preview/cache | Transient API memory and approved OpenAI request | No hosted library | Byte/count totals only |
| Catalogue draft | Current normalized workspace | Bounded validation/result | Per-tab projection only | Category/status totals, not prose |
| Orders/stock/feedback | Synthetic workspace | Submitted only as bounded assistant context | Per-tab projection only | No record/customer payload |
| Shopper preferences/chat | Bounded local history | Relevant deliberate turn | No hosted chat store | No prompt/reply text |
| Grants/challenge proof | Memory/HttpOnly safety context as designed | Short TTL verification/replay | No content store | Never token/cookie |
| Secrets | Never | Runtime backend/identity access | Secret Manager only | Never |
| Logo prompt/output | Sanitized accepted brand context / temporary candidate bytes | Transient OpenAI image request and validated response | Browser cache only; no server image library | No prompt or image payload |
| Reference FX | Dated validated quote | Fixed public-rate fetch, no guest data | Process-memory cache / tab snapshot | Safe source/date/status only |
| Operational usage | Safe counters | Counts/timing/model/usage | Reviewed operational logs | Allow-listed metadata |

### 22.5 Accurate handling language

The truthful promise is **Retailor adds no hosted business database or saved upload library; your guest workspace is temporary, and selected previews are sent for live AI processing when you approve it.**

Do not say “everything stays on your device,” “nothing is ever retained,” “reset deletes provider copies” or “data cannot leave the selected cloud region.” Provider/platform handling requires its own verification and disclosure. `store: false` is not a substitute for reviewing account data controls.

Guest reset cannot recall downloaded exports or previously dispatched provider input. Browser caches can leave remnants until owned expiry cleanup. The application should describe its actual lifetime and controls plainly.

### 22.6 Logging and diagnostics

Allow timestamp, environment/service/revision, safe request ID, route category, mode, duration, sanitized failure category, input/output size counts, provider/model identifier and aggregate usage/capacity counters.

Exclude content, filenames, original hashes where identifying guest content is unnecessary, raw IP, cookies, grants, prompt/reply text, provider payloads, signed URLs, stack traces with input and framework request objects. Catch errors at the boundary and map them to fixed categories.

Platform request/build/audit logs have their own metadata and retention. Choose and verify a narrow access/retention policy before public exposure; application sanitization does not delete cloud request metadata.

### 22.7 Threat-focused checks

Check decode bombs, malformed multipart, content-length bypass, injected image/label instructions, forged IDs, graph tampering, negative/refund overflow, stale proposals, cross-tab confusion, origin spoofing, grant replay, arbitrary proxy URLs and logging leaks.

Security review must follow the implemented data flow and actual exposed artifacts. Do not paste a generic checklist and call it an audit. A concrete unsafe boundary is fixed before live/public acceptance.

## 23. Resource limits and cost control

### 23.1 Proposed finite operating envelope

| Resource | Baseline |
| --- | --- |
| Workspace lifetime | Fixed two hours |
| Images/products/variants | Section 7 limits |
| Orders | 30 placed total: up to 20 seeded and 10 visitor-created; up to 4 unplaced drafts |
| Design library | Accepted 3 templates, 4 palettes and 3 typography presets; finite IDs |
| Traffic/customer records | At most 320 sessions (300 synthetic + 20 local guest) and 40 fictional buyers |
| Expenses/writeoffs | At most 40 posted expense/adjustment records, 4 expense drafts and 24 writeoffs |
| Bag | 8 lines, 5 units/line |
| Return/refund/movement records | Bounded schema arrays; proposed 60 returns, 60 refunds and 256 movements |
| Command receipts | At most 160 bounded receipts; fail clearly at limit, never evict replay protection unsafely |
| Feedback | At most 60 synthetic entries |
| User prompt | 2,000 characters per turn |
| Final assistant text | 4,000 characters per turn |
| Conversation | 40 messages combined; at most 12 recent messages sent per turn |
| Catalogue attempts | At most 2 live attempts/workspace, including visitor-selected retry |
| Live assistant turns | At most 12 combined creator/shopper/owner turns; local welcomes/tours/style controls are free |
| Catalogue model output | At most 12,000 tokens; measure all 15 items and the 20-product cap |
| Assistant model output | At most 1,500 tokens/request and bounded final text |
| Assistant model input | At most 12,000 text tokens/request after context projection, including tool history |
| Assistant investigation | At most 3 model requests and 4 aggregate tools/turn |
| Decoding | 10-second active worker deadline/image; browser at most two workers / 24 MP active pixels; backend two native workers/two foreground waiters per process |
| Catalogue operation | 120-second total backend deadline |
| Logo generation | At most 2 explicit batches/workspace; 3 candidates/batch; 180-second total backend deadline |
| Logo response/cache | 4.2 MiB serialized response; 3 MiB candidate bytes |
| EUR upstream | 5-second deadline; 15-minute process cache; 7-day maximum rate age |
| Assistant operation | 60-second total backend deadline |
| Simultaneous paid work | 1/workspace, 2/backend process |
| SDK automatic retries | 0 for paid calls |

Provider subdeadlines leave room for validation/result mapping inside each route deadline: proposed vision 95 seconds within 120, assistant total 60, image generation 150 within 180. Browser/bridge application deadlines are respectively 135/75/195 seconds; outer hosted request deadlines are 210 seconds frontend and 200 backend. Frontend bridge and Cloud Run deadlines must exceed the backend envelope with small explicit headroom, not contradict it. Every cap must be enforced before the resource it protects is allocated.

Schema count limits and the 512 KiB graph cap must be measured against the full template/product/order/traffic/cost/expense scenario. Compact traffic records and projected context keep the existing transport bounded. Limits may need adjustment if independent fixtures demonstrate that a valid scenario exceeds them. Increase only after measuring projection size and confirming worst-case behavior; do not silently truncate ledger history.

### 23.2 Rate and capacity controls

Use content-free anonymous/source correlation, action-specific burst/rate limits, route-global limits and process-owned capacity. A proposed starting rate is two catalogue admissions per ten minutes and six assistant admissions per minute per safety session/source, with lower global dispatch capacity if needed.

Do not trust arbitrary forwarding headers to identify a source. Document the actual managed proxy chain and validate its behavior. Avoid storing raw IP; use short-lived keyed correlation where justified.

These controls are imperfect under new identities, restarts and multiple instances/revisions. The release record must state that limitation. No database is added solely to promise impossible durable anonymous quotas.

### 23.3 Cost model

Before live enablement, calculate:

```text
catalogue attempt = image-input usage + text input + capped output
assistant turn    = sum of at most 3 model requests over bounded context/output
logo batch        = exactly 3 bounded images at the selected quality/size
workspace AI max  = 2 catalogue attempts + 12 bounded assistant turns
                  + at most 2 logo batches (initial + explicit retry)
sample assets     = separate offline generation/sourcing cost before release
reference FX      = bounded public-data network/cache cost, no AI charge
hosting           = frontend/backend compute + network + image delivery
release overhead  = builds + registry retention + secrets + domain costs
```

Apply current model prices and a conservative reserve to the measured maximum context. Do not claim a dollar value before selecting models and testing usage. Free credits/allowances do not change the underlying unit cost.

Track failures, refusals, timeouts and cancelled requests when usage may have occurred. An unknown provider outcome is conservatively treated as consumed reservation. New attempts require new explicit action.

### 23.4 Layered spend controls

- Committed fake/paid-off defaults and no-network tests.
- Master paid switch blocking new dispatches.
- Verified exact action grants and attempt/turn bounds.
- Conservative per-operation and per-process reservations.
- Low Cloud Run maximum instances and measured concurrency.
- Owner-configured provider/project controls and cloud budget monitoring.
- Content-free usage measurements and a tested emergency disable path.

Sibling USD 5/USD 10 settings are not a Retailor budget. Retailor's owner must choose its actual cap/alerts before live/public enablement. Process-local limits cannot guarantee a global monthly hard cap across restarts or revision overlap.

Alerts-only cloud budgets do not automatically stop spending. If an eligible spend-cap feature is chosen, verify coverage, exclusions, enforcement delay and cleanup effects for the actual services; do not assume account-wide protection. [Google Cloud budget guidance](https://docs.cloud.google.com/billing/docs/how-to/budgets).

## 24. Visual system, motion and accessibility

### 24.1 Design thesis

**Beautiful storefronts first, with a beautiful operating system behind them.** Retailor should make a new founder feel confident about their brand. The platform landing communicates vibrant transformation; the template library gives several excellent fashion identities; the owner view adds expressive charts and clear operational control.

Reuse brand components and shared tokens across the experience while allowing storefront and dashboard density to differ. Do not copy Retrosum's forest/orange financial brand or ClipBuilder's video identity.

### 24.2 Proposed visual baseline

| Token role | Starting direction |
| --- | --- |
| Canvas | Warm paper/ivory |
| Main text | Deep ink/charcoal |
| Platform action | Vibrant high-contrast cobalt, with a considered lime/coral supporting accent |
| Storefront identity | Scoped accepted palette/type tokens from section 9, distinct from platform chrome |
| Secondary surfaces | Soft stone with clear borders |
| Success/attention/error | Semantic muted green/amber/red with text/icon meaning |
| Editorial type | A readable distinctive serif for collection/hero headings |
| Interface type | Clean sans-serif for navigation, controls and dense records |
| Money | Tabular numerals with exact values visible immediately |
| Shape | Moderate consistent radii; editorial imagery can remain square |

The HTML overview includes a provisional vibrant platform treatment and an illustrative Tailor-chat design selection using code-drawn products and system-font approximations. It is not final photography/font approval or a complete component style guide. Before broad frontend styling, settle accessible tokens, typography, logo, image mood and representative controls in the normal design work.

Use local/system fonts in the overview and self-host licensed app fonts when selected. Prefer one maintained icon family, consistent semantic meanings and text labels where an icon alone would be ambiguous.

### 24.3 Component foundations

Establish buttons, links, fields, chips, tabs, menus, dialog/drawer, toast/status, product card, source/provenance chip, money display, KPI card, chart target, data table and assistant composer. Extract a shared primitive only when its behavior is actually shared.

Do not implement separate phone/desktop versions of domain interactions. Recompose one semantic system around available space and input method.

### 24.4 Motion contract

Use motion to explain photo grouping, processing completion, alternate views, bag addition, perspective continuity, chart changes and proposal preparation. Animate opacity/transform where possible; values and controls remain immediately readable.

Proposed timings are 150–250 ms for small feedback, 250–400 ms for drawers/view changes and up to 500 ms for a meaningful chart/collection entrance. Do not delay an available action to finish decorative motion.

The owner explicitly requires visible animation and rejects settings that disable rendering or motion. Do not add animation-off/render-off toggles, a low-motion theme, or a `prefers-reduced-motion` rule that suppresses the intended animations. This direction now matches the inspected Retrosum requirement. Keep animation clear and comfortable through restrained distances, readable content, stable controls and no flashing; do not claim full WCAG conformance without checking the complete implementation against its criteria.

Hover animation must have focus/tap behavior. Processing cannot show fake completion. Unmounted/offscreen components must release animation/listener work; no unbounded timer loops.

### 24.5 Responsive contract

Verify at 320, 375, 768, 1,024, 1,280, 1,440 and 1,920 px widths, intermediate resizing, short laptop heights and 200% zoom. Add larger widths if the design uses them. Test real content pressure, not only empty components.

- Landing uses natural flow when a first-viewport composition would clip content.
- Photo selection is usable without drag-and-drop.
- Product grids change columns without distorting images or hiding option controls.
- Filters become an accessible drawer/sheet on narrow screens.
- The bag and checkout remain fully operable with a virtual keyboard.
- Owner tables use a deliberate compact/card/detail treatment; no horizontal page overflow.
- Charts retain exact tables and touch targets.
- The assistant reserves measured space and respects safe-area insets.
- Long product names, currency, errors and pending states wrap predictably.

### 24.6 Accessibility requirements

Use WCAG 2.2 AA as the reference for contrast, semantics, focus and input behavior; assess any motion-related conformance limits honestly under the owner's explicit always-visible-motion requirement. Use semantic landmarks/headings, visible focus, labelled controls, useful alt text and at least 44 × 44 px primary touch targets.

Dialogs trap focus appropriately, support Escape where safe and return focus. Tabs/menus use correct keyboard behavior. Announce important processing/cart/command outcomes through restrained live regions without repeating every animation frame.

Colour is never the only stock/status/variant signal. Product images need descriptive alt text grounded in actual content. Charts have exact data tables, labelled series and accessible drilldown controls.

No keyboard trap, scroll hijack, inaccessible drag-only correction or motion-dependent action is acceptable. Automated accessibility checks supplement keyboard/touch/manual review; they do not prove the entire experience accessible.

## 25. Verification and evidence

### 25.1 Verify proportionately

During implementation, run the smallest meaningful test/typecheck covering the changed risk. Do not run every visual/live scenario after a copy adjustment. Broaden checks at completed boundaries, material changes and release candidate review.

This documentation revision should be checked for complete scope coverage, link/anchor integrity, consistent decisions and readable HTML layout. It does not need an application test suite or fake claims that future APIs passed.

### 25.2 Essential deterministic checks

| Area | High-value cases |
| --- | --- |
| Money | Decimal parsing, discount allocation, unit refund allocation, rounding and bounds |
| Commerce | Product create/update/delete/archive, order/expense drafts, atomic placement, cancellation and independent return/refund/restock |
| Costs/result | Immutable unit costs, partial restock reversals, once-only expense posting/correction/writeoff and negative results |
| Funnel/cohorts | Nested session stages, deduplication, owner/preview exclusions, same-cohort ratios and zero denominators |
| Design | Finite preset IDs, preview/apply/cancel, restore fallback and no commerce changes on styling |
| Metrics | Event-date reconciliation, order-date AOV, negative net, unavailable comparison, contributor/exclusion IDs |
| Catalogue | Image references, group coverage, unknowns, sizing identifiers and archived sold variants |
| Proposals | Stale revision, ambiguous IDs, edited form, expiry, replay, latest eligible Undo |
| State | Legal transitions, corrupt restore, fixed expiry, missing bytes, quota and duplicate-tab ownership |
| Async ownership | Reset/expiry during decode/provider/challenge, late replies, cancellation and partial failures |
| API | Strict bodies, byte streaming bounds, malformed/oversized multipart and safe errors |
| Admission | Wrong origin/action/digest, expired/replayed grant, restart, correct lease release and paid-off |
| Provider | Refusal/incomplete/invalid result, call-count bound, SDK retries off and no live fallback |
| Security | Prompt injection, unknown references, arbitrary proxy/tool output and log redaction |
| Packaging | Shared package exports, sample assets, nonroot startup and no private files |

Expected results must be independent of the implementation being checked. Avoid a test that calls the same formula twice and declares equality evidence. Focus fixtures on behavior and relationships, not exact generative wording.

Additional required deterministic cases: product create/update cannot remove the last valid photo; chat and dashboard share the invariant; all three scenarios resolve actual catalogue IDs and reconcile stock/finance; scenario replacement invalidates proposals while preserving design/photos; EUR half-cent/remainder cases, price-filter boundaries and stale/unavailable rates; logo offer gated by explicit palette/type confirmation, exactly three assets, stale-context rejection, byte limits and wordmark fallback. Public live composition cannot resolve sample catalogue fixtures.

### 25.3 Manual product matrix

Verify live sample, live uploads and unavailable drafting separately; confirm neither public input source can load a precomputed catalogue. A useful manual matrix includes:

- One complete sample walkthrough ending in the matching dashboard order/stock evidence.
- A materially different owned/licensed upload collection producing a different catalogue.
- Ambiguous groups, unknown category, missing alternate and unreadable label.
- Delivered-budget assistance, product comparison and out-of-stock recovery.
- Catalogue correction without another model call.
- Duplicate order click, stale bag, cancellation and no extra deduction at fulfilment.
- Physical return with no refund; refund with no return; damaged return with refund but no restock.
- KPI/chart/record drilldown before and after a mutation.
- Refresh at Choose, Catalogue, Style, Storefront, Dashboard and in-flight processing.
- Reset/expiry while a request, dialog or proposal is active.
- Storage denial, missing cached photo and duplicated-tab behavior.
- Keyboard, touch, virtual keyboard, zoom and responsive anchors, with the intended animations visible.
- Every accepted template/palette/typography combination across home, collection and product detail; phone and desktop content pressure.
- Tailor introduction, dismiss/replayable tour, immediate jeans filter, design preview/apply/cancel and exact CRUD form confirmation.
- Create/edit/remove/archive product, edit/delete unplaced order/expense drafts, cost snapshots, writeoffs and negative result drilldown.
- Nested funnel cohorts, owner/designer exclusions, duplicate shopper events and zero/unavailable rate denominators.
- Fifteen primary sample photos, fresh live sample/upload drafting and truthful unavailable handling.
- Tailor’s main setup with no typing, inline photo upload, owner manual design override and restored chat microstep.
- Confirm palette/type before the optional logo offer; skip, three-candidate success, stale result, timeout and wordmark fallback.
- Healthy-profit/break-even/heavy-loss switching, discarded activity warning and unchanged catalogue/design/photos.
- USD/EUR cards, price filters, € Tailor budget, bag/confirmation rounding and invalid/unavailable/stale rate behavior.
- Production-shaped local build and safe hosted capability failures.

### 25.4 Live evidence

Live checks require owner-authorized spending and owned/licensed content. Plan a small bounded evaluation, capture usage/latency/schema/grounding results and stop on a material privacy, admission, inventory or calculation defect.

Do not repeat paid flows to prove a deterministic correction that a focused fake test can establish. Re-run the affected live behavior only when the correction touches actual provider interpretation/transport and the evidence needs renewal.

Live sample success does not establish arbitrary garment recognition, exact fabric/colour detection, general fit accuracy or hosted acceptance. Keep those limitations concrete and visible in the internal validation record.

### 25.5 Settled release gate

Before release, run formatting, lint, strict types, executable boundaries, isolated unit/HTTP checks and both production builds against one candidate. Audit duplicate schemas/formulas, dead code, unsafe casts, debug routes, retired flags, capability composition and effect cleanup.

Then verify the actual Linux runtime artifacts and the applicable manual/hosted matrix. An implementation named in a commit is not automatically complete. Record failures, unresolved external checks and exact evidence without converting deferred work into passes.

### 25.6 Evidence levels

| Evidence | Establishes | Does not establish |
| --- | --- | --- |
| Pure tests | Domain/contracts for declared cases | Visual usability or live recognition |
| Fake browser walkthrough | Integrated UI/state and local operations | Actual provider quality |
| Live local evaluation | Selected provider behavior on named corpus | Hosted identity/domain/capacity |
| Linux image probe | Artifact/startup/assets within probe scope | Cloud IAM or public traffic readiness |
| Hosted unpaid probe | Deployed transport/config/assets and rejection paths | Paid end-to-end result |
| Hosted authorized live walk | Actual chosen public experience and measured use | Universal accuracy or complete abuse prevention |

## 26. Infrastructure, deployment and operations

### 26.1 Deployment family

Preserve the siblings' tool family: manual owner-controlled release, Docker, Artifact Registry, Cloud Run, Secret Manager and Cloudflare where chosen. No automatic deployment workflow, Terraform, Kubernetes, deployment OIDC or custom controller is required for the demo.

```text
Visitor
  → canonical HTTPS frontend
      → public frontend Cloud Run service
          → runtime-identity invocation
              → private backend Cloud Run service
                  → OpenAI and Turnstile

Artifact Registry → immutable frontend/backend image pair
Secret Manager    → named backend runtime secret versions
Cloudflare        → optional confirmed domain/DNS + challenge configuration
GitHub Actions    → unpaid quality checks only
```

The intended domain in the concept is `tryretailor.com`; ownership/registration is unconfirmed. Do not repeat dated registrar prices or claim a DNS setup exists. A managed HTTPS preview URL can establish initial hosted behavior before a separately approved domain cutover.

### 26.2 Identity and privacy boundary

Use separate frontend runtime, backend runtime and operator/build identities. Frontend can invoke only the backend service. Backend can read only its named required secret versions. No project Owner/Editor role as a runtime shortcut.

Backend must deny anonymous invocation, including the managed `run.app` endpoint. Network ingress policy and IAM invocation are distinct controls; do not equate “all ingress” with public access or incorrectly block the legitimate frontend identity path.

Store actual project IDs, service account identifiers, registry paths, secret names/versions and origins in ignored operator inputs/private records as appropriate. Never invent them or copy sibling resources as though Retailor has permission to use them.

### 26.3 Proposed starting service envelope

| Setting | Frontend | Backend |
| --- | --- | --- |
| Minimum instances | 0 | 0 |
| Maximum instances | 1 initially | 1 initially |
| CPU | 1 vCPU | 1 vCPU |
| Memory | 512 MiB starting probe | 1 GiB starting probe |
| HTTP concurrency | 8 | 4 |
| Expensive concurrency | Bridge bounded independently | 2 paid operations; a separate process-wide two-worker/two-waiter raster gate |
| Cloud request timeout | 210 seconds | 200 seconds |
| Runtime user | Nonroot | Nonroot |
| Guest durable filesystem | None | None |

These are proposed measurement envelopes, not deployed settings. Verify peak image decoding, Base64 expansion, shared bridge buffers, cold start and memory before public enablement. A one-instance maximum does not guarantee only one process across rollout overlap/restarts.

The region is owner-resolved during release preparation. Reuse the same region strategy as the siblings when appropriate, but do not silently copy project location or assert data residency across provider boundaries.

### 26.4 Packaging

Build from an explicit audited commit and a restricted context. Use frozen installs and reviewed dependency lifecycle-script policy. Build contracts, commerce, backend and frontend in dependency order.

Package Next standalone output with verified monorepo tracing, `.next/static`, public sample assets and required fonts. Package backend compiled output and package exports. Sharp/native binaries must match the Linux target. No runtime dependency/tool downloads are allowed.

Exclude env files, private asset rights evidence, guest uploads, local caches, diagnostics, source-only test UIs, development dependencies and unnecessary docs from runtime images. A normal `.dockerignore` alone is not proof; inspect the actual image filesystem.

Use an isolated release context, nonroot startup and injected Cloud Run `PORT`. Probe both images with fake/paid-off settings before cloud release. Verify landing, sample asset hashes, bridge bounds, health/config and rejection of all live routes.

### 26.5 Release sequence

1. Settle product/design decisions and the candidate's deterministic/manual evidence.
2. Freeze the exact source revision and actual release context.
3. Build/probe the Linux image pair; record immutable registry digests after authorized upload.
4. Resolve Retailor project, billing scope, region, services, identities, origins and secret versions privately.
5. Deploy backend private and paid-off first.
6. Grant only frontend runtime service-level invocation and deploy frontend initially closed.
7. Verify identity/audience, wrong-origin rejection, anonymous backend denial, assets and unpaid capability behavior.
8. Expose the intended public frontend after release approval.
9. Verify managed/custom domain paths, TLS, redirects and exact challenge hostnames.
10. Enable the intended live mode only after owner budget/provider/admission prerequisites and required acceptance.
11. Perform a bounded authorized hosted walkthrough, record usage/cold-warm timings and keep unresolved checks explicit.

Preparation of reviewable files/artifacts can proceed within later authorized implementation scope. Actual cloud mutation, paid dispatch, domain purchase and deployment require their own explicit owner instruction. This documentation task performs none of them.

### 26.6 Domain and public entry

Use one canonical frontend origin and redirect aliases consistently. Register Turnstile for the hostnames where the widget actually runs. A private backend hostname is not the visitor website hostname.

Review the managed frontend URL as well as a custom domain: domain-level controls can be bypassed if the raw service URL remains publicly usable under weaker policy. Apply the intended origin/challenge behavior to every exposed route. Do not add a load balancer solely to resemble a production diagram; choose routing from actual cost/security requirements and current official guidance.

### 26.7 Rollback and incidents

Retain a compatible previous frontend/backend digest pair and exact safe configuration/secret references. Rollback starts by disabling new paid dispatch when required, then routing traffic to the recorded compatible pair. Already-dispatched provider calls can still finish.

Priority order is: leaked credential/content → uncontrolled paid dispatch → invalid inventory/money state → unusable core flow → cosmetic issue. Revoke/rotate affected secrets through approved owner operations, preserve content-free evidence and avoid logging the failing input.

Version persisted projections. An older release that cannot understand a newer projection must offer safe recovery/reset, not coerce corrupt state into a valid order history.

### 26.8 Release record

Record source commit, image digests, deployed revisions, configuration mode, provider/model/prompt/schema versions, origin/challenge scope, named secret versions, service resource limits, IAM verification, safe cost/usage, manual walkthrough and rollback target.

Record what was actually checked separately from owner reports and planned settings. Avoid secret-bearing screenshots, source images, prompts and private account IDs in public documentation.

## 27. Implementation sequence and ticket map

The owner has authorized detailed ticket planning. The [canonical queue](tickets/README.md) contains 22 complete, reviewable outcomes with standalone context, dependencies, ownership, implementation plans, acceptance and failure/evidence matrices. RTL-001–017 have verified local implementation; RTL-018–022 remain planned. Paid, full visual/device and hosted acceptance remain pending in their named validation records. The storefront design library remains an early dependency because it defines the main promise.

| Phase | Planned packets | Concrete outcome |
| --- | --- | --- |
| Workspace foundation | [RTL-001](tickets/RTL-001-initialize-workspace-contracts-and-safe-runtime.md) | Pinned sibling stack, pure public contracts, injected safe runtime and actual no-key commands. |
| Visual proof and real inputs | [RTL-002](tickets/RTL-002-prove-brand-design-system-and-storefront-direction.md), [RTL-003](tickets/RTL-003-prepare-fifteen-clothing-photos-and-upload-pipeline.md) | Researched finite design direction, font rights and fifteen accepted clothing photos with bounded decoding. |
| Exact domain authority | [RTL-004](tickets/RTL-004-build-exact-commerce-commands-and-fact-engine.md) | Atomic commands, stable receipts, stock/history/cost rules and exact facts. |
| One-page draft journey | [RTL-005](tickets/RTL-005-build-one-page-workspace-review-and-recovery.md), [RTL-006](tickets/RTL-006-deliver-live-catalogue-recognition-and-admission.md) | Choose/process/review stages, recovery and admitted fresh live recognition for sample or uploads. |
| Storefront and signature setup | [RTL-007](tickets/RTL-007-deliver-three-complete-clothing-store-templates.md), [RTL-008](tickets/RTL-008-deliver-tailor-chat-led-styling-and-owner-overrides.md) | Three complete home/list/detail template families and Tailor visual cards for template, colour and type. |
| Currency and connected shopping | [RTL-009](tickets/RTL-009-deliver-automatic-usd-eur-storefront-pricing.md), [RTL-010](tickets/RTL-010-connect-shopping-bag-and-simulated-orders.md) | Validated dated EUR projection, catalogue/filter/bag consistency and demo orders reflected in stock. |
| Owner scenarios and dashboard | [RTL-011](tickets/RTL-011-deliver-three-scenarios-and-owner-operations.md), [RTL-012](tickets/RTL-012-build-animated-dashboard-and-record-drilldown.md) | Real-catalogue profit/break-even/loss activity, manual operations, beautiful charts and exact record drilldown. |
| Useful copilot and identity | [RTL-013](tickets/RTL-013-deliver-grounded-tailor-conversation-tools-and-tours.md), [RTL-014](tickets/RTL-014-deliver-tailor-inline-photo-crud-and-confirmation.md), [RTL-015](tickets/RTL-015-deliver-optional-three-logo-generation.md) | Grounded help/tours/filtering, reviewed photo-upload forms and optional three-logo branch after confirmed styling. |
| Lifecycle and public story | [RTL-016](tickets/RTL-016-complete-export-reset-expiry-and-session-lifecycle.md), [RTL-017](tickets/RTL-017-build-vibrant-storefront-runway-landing.md) | Integrated export/reset/expiry/resume and the result-first storefront-runway landing. |
| Public hardening and polish | [RTL-018](tickets/RTL-018-harden-privacy-abuse-spend-and-runtime-boundaries.md), [RTL-019](tickets/RTL-019-verify-polish-responsive-motion-and-design-matrix.md) | Admission/privacy/spend boundaries plus actually observed responsive, keyboard/touch and 36-look quality. |
| Live acceptance | [RTL-020](tickets/RTL-020-evaluate-live-ai-and-audit-release-acceptance.md) | Bounded owner-authorized real recognition/Tailor/logo evaluation, actual rate evidence and release audit. |
| Linux release preparation | [RTL-021](tickets/RTL-021-package-linux-services-and-manual-release-runbook.md) | Reproducible images, fixed private bridge, concrete manual deploy and rollback plan; independent of paid evaluation. |
| Owner-authorized hosted release | [RTL-022](tickets/RTL-022-deploy-verify-hosted-demo-and-record-rollback.md) | Exact accepted artifacts, actual private IAM/origins, HTTPS walkthrough, usage evidence and recovery readiness. |

RTL-001–017 have verified local implementation, with explicit quality/external checks still pending. The owner-prioritized RTL-003/006 image-concurrency follow-ups have verified local implementation; RTL-018 is the next eligible packet; select the lowest numbered eligible packet under the current execution authorization. Eligibility depends on real prerequisite behavior and verification, never unchecked plans or ticket-named commits. The queue does not authorize parallel agents, paid operations, Git mutations or cloud publication.

The first complete local path may use declared development fixtures, but public acceptance requires fresh live recognition for sample and uploads. Security and cleanup start with the first owning feature; later hardening and lifecycle packets complete the combined surface. Optional logo generation follows a polished wordmark path. Domain integrity keeps charts connected to actual products; design evidence proves that all accepted storefront choices look excellent.

Verified local prerequisites may support independent follow-on implementation while specifically named external checks remain pending and capabilities stay fail-closed. RTL-021 prepares packaging without waiting for the RTL-020 paid run. RTL-022 requires both actual live acceptance and the accepted Linux candidate. Detailed owner-answer and blueprint-section traceability belongs in the queue.

## 28. Documentation and collaboration practices

### 28.1 Artifact ownership

| Artifact | Ownership |
| --- | --- |
| Root README | Short product story and current documentation/status links |
| This blueprint | Current product, boundaries, architecture, scope and acceptance |
| HTML overview | Concise owner-facing PM summary |
| Docs navigation | Current authority links and retained sources |
| Ticket queue and packets | Planned scoped outcomes, dependencies, owner-answer traceability and truthful execution status |
| Original concept pair | Historical research/prototype context |
| Imported references | Reusable sibling lessons; never Retailor authorization |
| Future AGENTS | Repository engineering/process constraints |
| Future app READMEs | Actual commands, configuration and app responsibility |
| Future engineering docs | Implemented topic detail that would otherwise overload the blueprint |
| Future operations docs | Provider/release/rollback instructions and actual evidence |
| Future validation records | Checks actually performed against specific snapshots |

Update the narrowest owning artifact when implementation changes. A material product change updates the blueprint and the HTML summary if its story changed. Do not duplicate provider setup or a full operations manual into the public README.

### 28.2 Working rules to inherit

- Read relevant authority before editing; latest owner decisions govern scope.
- Preserve accepted functionality while improving structure and efficiency.
- Make fake/live capability and evidence distinctions clear.
- Keep edits focused and verify the changed risk before broad repetition.
- Record a file-level commit allocation for substantial future implementation work.
- Stage explicit paths only when Git actions are authorized; inspect staged content for secrets/generated files.
- Do not push, deploy, buy resources or run paid flows based on sibling approvals.
- Do not delegate unless the owner or applicable project instructions authorize it.
- Keep private env values/private diagnostics out of documentation and logs.
- Mark external/manual checks pending honestly; never promote recollection into a verified pass.

RTL-001 adds root AGENTS with the owner-authorized execution/validation loop, local isolation and fake/paid boundaries. It changes no sibling repository instructions.

## 29. Decisions to settle during implementation

### 29.1 Owner answers are settled

All eleven answers are incorporated; do not reopen them as unanswered ticket-planning choices.

| Answer | Accepted decision | Main specification |
| --- | --- | --- |
| 1 | Clothing only, including formal, semi-formal, casual and beachwear | Sections 3, 8, 12 and provider evaluations |
| 2 | Three excellent complete templates, four researched themes, three researched type presets | Sections 9/24 and Appendix F; 36 combinations must pass visual review |
| 3 | Tailor chat leads styling with interactive CTA/cards; owner manual overrides | Sections 5, 9 and 15; Retrosum interaction evidence in Appendix D |
| 4 | Optional name/headline/hero; wordmark default; optional three AI logos after theme/type | Sections 5, 9, 19, 20 and 23 |
| 5 | Product photo required, including inline chat upload | Sections 7, 8, 11, 13, 15 and recovery/acceptance |
| 6 | Synthetic business inputs allowed; product-linked facts match the actual storefront | Sections 12–15; historical snapshots explicitly distinct from current items |
| 7 | Healthy profit, near break-even and heavy loss presets | Sections 11–14; reviewed activity replacement |
| 8 | Live draft every deliberate generation; sample is about fifteen photos | Sections 5, 7, 12, 19, 20, 23 and 25 |
| 9 | Try storefront runway; preserve other hero concepts for visual feedback | Section 4 and Appendix F |
| 10 | AI-generated original sample preferred; research stock alternative | Section 12 and Appendix G; assets still awaiting production/acceptance |
| 11 | English, USD authority and optional automatic EUR storefront conversion | Sections 9, 10, 13, 19 and Appendix H |

### 29.2 Implementation evidence still to obtain

Resolve photo generation/source files and art approval, exact font files/licences and final visual tokens, model IDs and account capability, measured latency/output size and paid budget, external rate endpoint/schema verification, dependency versions, cloud resource IDs/region and domain ownership. These are implementation/release evidence tasks, not missing owner product answers. The intended `tryretailor.com` domain remains unconfirmed. The planned packets record these dependencies without inventing their results; see the queue for each owning outcome.

Routine composition, labels and token refinements can be decided within accepted scope. Real payments, durable storage, additional product verticals or a different public spend scope require a separate concrete decision. This revision adds the owner-authorized 22-packet ticket queue and performs no application implementation, deployment or paid API operations.

## 30. Definition of complete

The **documentation baseline** is complete when the detailed Markdown and summarized HTML are readable, consistent, linked and traceable to the inspected resources. The original documentation deliverable did not require application implementation.

The **ticket-planning deliverable** is complete when the 22 detailed packets and canonical queue cover the accepted product decisions, have valid dependencies and precision links, and specify context, ownership, an implementation sequence, unchecked acceptance and actual evidence requirements. Ticket planning does not satisfy the future demo acceptance below. Execution status is recorded in the queue; RTL-001 now delivers the verified local foundation. Later product behavior remains intended until its owning evidence exists.

The **future demo** is complete only when:

- The landing explains the promise quickly and enters a coherent guest experience.
- Sample and uploaded photos both receive fresh live interpretation for every deliberate new draft; refresh does not auto-charge.
- The sample contains fifteen accepted clothing-photo assets, with source metadata and tested grouping.
- Clothing-only categories are enforced; dashboard activity refers to the actual catalogue.
- Tailor’s inline visual cards lead setup without required typing; manual styling is available in owner Design settings.
- Every newly created/published product has a validated available photo; Tailor includes the required upload.
- Exactly three optional logo candidates are offered after confirmed colour/type; the wordmark handles skips/failure.
- Healthy-profit, break-even and heavy-loss scenarios reconcile and disclose activity/stock replacement.
- EUR prices, filters, Tailor budgets, bag and confirmation share a dated exact reference-rate projection over USD.
- No mandatory product typing or signup is needed to reach a demo result.
- Actual selected images drive the drafted catalogue and visible storefront.
- Unknown materials/measurements remain unknown; suggested sizes are labelled honestly.
- Final sample photographs, alternate views and rights are accepted.
- The store is attractive and fully usable with keyboard/touch on the declared layouts.
- One reviewed demo order appears in the owner workspace with exact matching totals and stock.
- Cancellation, fulfilment, return, refund and restock reconcile without double application.
- Every significant KPI/chart/observation exposes supporting synthetic records and its basis.
- Tailor uses current evidence and applies benign known filters/navigation immediately; consequential product/commerce changes require explicit review.
- Every complete template and accepted palette/type combination is visually excellent on home, collection and product detail.
- Style choices update actual-product previews immediately without reseeding the workspace.
- Product CRUD works through dashboard and Tailor, including historical archival and empty-store recovery.
- Simulated costs, expenses, inventory loss, traffic and customer metrics have disclosed inputs and exact evidence.
- Intended motion remains visible without an animation-off or render-off setting.
- Stale results/proposals are fenced; refresh/reset/expiry and missing-photo recovery work.
- Default development/tests cannot spend provider credits.
- Actual paid work is admitted, bounded, measured and independently accepted.
- The exact Linux artifacts and intended hosted IAM/origin/domain/capacity paths are checked.
- The release record distinguishes completed evidence from pending external checks.

Finishing a portfolio demo does not mean completing a production ecommerce platform. The promised experience, integrity, polish and recovery define completion.

## Appendix A — Recovery matrix

| Situation | Preserve | Safe next action | Must not happen |
| --- | --- | --- | --- |
| One invalid image | Other accepted photos | Remove/replace affected file | Entire collection erased |
| Duplicate image | One valid copy | Inspect duplicate notice | Duplicate product forced |
| Live AI disabled | Selected sample/upload photos and completed stores | Retry drafting when available; continue completed local store | Precomputed public sample or fake recognition |
| Category/group unclear | Source and draft uncertainty | Edit/split/merge or continue visibly unclassified | Unsupported certainty |
| Provider refusal/invalid schema | Inputs and completed earlier work | Bounded deliberate retry/change photos | Hidden repair call |
| Timeout/lost response | Selection and attempt status | Explain uncertain attempt and seek new deliberate approval | Automatic rebilling |
| Reset while pending | New empty workspace only | Fresh start | Late result enters new store |
| Catalogue edits during chat | Current graph | Refresh answer deliberately | Old stock/copy presented as current |
| Bag stock/price changes | Bag selections and current facts | Review corrected bag | Stale confirmation applies |
| Duplicate order/refund command | Prior command result references | Show existing result | Second deduction/reversal |
| Refund without return | Financial adjustment | Inspect financial and physical histories separately | Automatic restock |
| Non-restockable received return | Receipt and inventory unchanged | Issue eligible refund separately | Damaged units become available |
| No comparison history | Current metrics | Show unavailable comparison | Fabricated growth |
| Storage corrupt/quota denied | Valid in-memory state where possible | Explain recovery limits/reset | Unsafe coercion or hidden data loss |
| Photo cache missing | Valid normalized catalogue | Reselect exact photo/reset | Claim original retained on server |
| Duplicated tab | Original owner state | New identity/fork or fresh start | Concurrent shared writer |
| Session expires | No active execution | Start a new demo | Refresh extends expiry |
| Backend restarts | Browser-owned completed work | Fresh admission for new paid action | Replayed grant executes |
| Hosted paid-off | Photo previews and completed local stores | Explain new live drafting unavailable | Canned public catalogue bypasses live requirement |
| Create without photo | Draft text and current form | Upload/choose a valid photo before saving | Placeholder accepted as a product photo |
| Logo failed/stale | Accepted design and wordmark | Keep wordmark; explicit bounded retry if eligible | Auto-reroll, old palette result or partial set applied |
| FX invalid/unavailable | USD prices and accepted unexpired quote | Continue USD or current valid snapshot | Invented live rate or silent price change |
| Scenario replacement | Catalogue/photos/design | Review discarded activity and stock reset, then confirm | Phantom products or silent loss of guest orders |

## Appendix B — Worked commerce example

This is an independent illustrative expectation for the future engine, not a dataset to hardcode into dashboard components.

Opening stock for a shirt variant is 10 units. Guest order A places two shirts at $54 each with a $10 merchandise discount and $6 delivery, no simulated tax:

| Step | Merchandise/financial effect | Stock |
| --- | --- | --- |
| Place A | Gross $108; discount $10; net merchandise $98; total $104 | 10 → 8 |
| Mark shipped | No new sales or stock deduction | 8 |
| Mark fulfilled | No new sales or stock deduction | 8 |
| Receive one restockable returned shirt | No refund yet | 8 → 9 |
| Issue $49 merchandise refund | Net merchandise across all events becomes $49; delivery retained | 9 |
| Replay same refund command | Same receipt/result, no additional refund | 9 |

The two discounted unit bases are $49 each. The order remains included; its AOV contribution before refund is $98. Physically returned units are 1. Issued merchandise refunds are $49. The physical return was not counted as another financial reversal.

Guest order B places one tee at $38 plus $6 delivery and is cancelled while still placed. It contributes gross $38 and a merchandise cancellation reversal of $38; its net merchandise contribution is zero. Its tee stock is restored once. It is excluded from included-order count/AOV. Cancellation also reverses its delivery charge in the separate delivery ledger.

For all events in one period, combined gross merchandise is $146, discounts $10, cancellation reversals $38 and merchandise refunds $49, leaving **$49 net merchandise sales**. Included orders are 1 and AOV is $98. Those figures differ for deliberate, explainable reasons.

If A's $49 refund occurs in a later period with no new orders, that period's net merchandise sales can be **−$49**, while its included-order count is zero and AOV unavailable. The trend must preserve that negative value.

## Appendix C — Public copy and error language

| Situation | Suggested copy |
| --- | --- |
| Main headline | Bring your products. See your store. |
| Entry | Try 15 sample photos · Upload clothing photos |
| Live approval | Draft my catalogue |
| Catalogue | Your products are ready. Review the draft, then make the store yours. |
| Style entry | Make it my own |
| Style completion | Enter my store |
| Required photo | Add a clothing photo before creating this product. |
| Logo offer | Your colours and type are set. Keep your wordmark, or generate three logo choices? |
| Logo failure | These logo choices could not be completed. Your wordmark is ready to use. |
| EUR failure | Euro pricing is unavailable right now; prices are shown in USD. |
| Scenario change | Replace this demo’s business activity? Your products and design stay; demo orders and stock history reset. |
| Tailor welcome | Hey, I'm Tailor. Your products are ready—let's make this storefront yours. |
| Product removal with history | Remove from storefront; keep its demo history. |
| Finance badge | Simulated performance using demo costs and expenses. |
| Synthetic banner | Demo prices, availability and store activity. No real payments. |
| Suggested upload sizing | Demo size options — actual sizes are unconfirmed. |
| Unknown composition | Material information is not confirmed. |
| Store switch | Try the dashboard |
| Owner switch | View storefront |
| Order action | Place demo order |
| Owner badge | Synthetic demo activity |
| Unsupported file | This file type is not supported. Choose a JPEG, PNG or WebP image. |
| Too many/large files | Your selection exceeds the demo limit. Remove the highlighted photos and try again. |
| Live unavailable | Live catalogue drafting is unavailable right now. Your photos are kept. Try again when it is available. |
| No alternate | This item has one supplied view. Open it to zoom. |
| Stale bag | Price or availability changed. Review the updated bag before placing your demo order. |
| Stale answer | The store changed since this answer. Refresh it to use the current details. |
| Unknown provider outcome | This attempt was interrupted. It may already have been processed. Your photos are kept. |
| Missing cached photo | This photo is no longer available in this browser. Reselect it or start a new demo. |
| Expiry | This temporary demo has ended. Start again with the sample or your photos. |
| Reset | Reset clears this demo's local workspace, temporary photo/logo cache and currency snapshot, and stops pending work. Downloaded exports and completed AI processing cannot be recalled. |

Keep messages useful and short. Technical investigation uses safe private request references, not provider payloads in the UI or browser console.

## Appendix D — Reference map

### Retailor source material

- [Original product specification](retailor.md): accepted photo-first story, storefront, owner view and factual limits.
- [Original interactive concept](retailor.html): historical documentation preview, prepared illustrations and local interactions.
- [ClipBuilder lessons](references/LESSONS_LEARNED_FROM_CLIPBUILDER.md): framework, boundaries, diagnostics, lifecycle, release and process discipline.
- [ScreenPilot-derived portfolio playbook](references/PORTFOLIO_DEMO_BUILD_PLAYBOOK.md): bounded portfolio story, authority, fake-first providers and manual release.
- [Retrosum lessons](references/LESSONS_LEARNED_FROM_RETROSUM.md): inspectable facts, exact domain, guest recovery, assistants and Retailor-specific adaptations.

### Direct sibling exploration

Relative links below work in the current sibling checkout arrangement; they are research references, not runtime dependencies. Link targets were selected from actual inspected files.

| Project/source | Contribution |
| --- | --- |
| [ClipBuilder blueprint](../../ClipBuilder/docs/CLIPBUILDER_DEMO_SOURCE_OF_TRUTH.md) | Explicit product authority and boundary coverage |
| [ClipBuilder frontend manifest](../../ClipBuilder/apps/frontend/package.json) and [backend manifest](../../ClipBuilder/apps/backend/package.json) | Actual framework family and specialized dependencies to avoid copying |
| [ClipBuilder app factory](../../ClipBuilder/apps/backend/src/app.ts) | Side-effect-free construction, safe response headers and composed capabilities |
| [ClipBuilder cloud release guide](../../ClipBuilder/docs/operations/CLOUD_RUN_PUBLIC_DEPLOYMENT_2026-10-07.md) | Hosted capability parity, private invocation and honest deployment status |
| [ScreenPilot blueprint](../../screen-pilot/docs/SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md) | Guest staged experience, shared contracts and privacy boundaries |
| [ScreenPilot workspace manifest](../../screen-pilot/package.json) | pnpm scripts and app/package build structure |
| [ScreenPilot repository instructions](../../screen-pilot/AGENTS.md) | Fake isolation, local process/configuration discipline |
| [ScreenPilot manual deployment](../../screen-pilot/docs/operations/manual-google-cloud-deployment.md) | Manual image pair, quality-only CI and server identity bridge |
| [Retrosum blueprint](../../Retrosum/docs/RETROSUM_DEMO_SOURCE_OF_TRUTH.md) | Most recent product/documentation organization |
| [Retrosum foundation](../../Retrosum/docs/engineering/FOUNDATION.md) | Compatible pinned stack, package exports and executable boundaries |
| [Retrosum session controller](../../Retrosum/apps/frontend/src/features/session/session-controller.ts) | Canonical controller and ownership/recovery composition |
| [Retrosum commands](../../Retrosum/packages/money/src/commands.ts) | Pure mutation authority and source-preserving behavior |
| [Retrosum runtime composition](../../Retrosum/apps/backend/src/runtime/compose.ts) | Fake/live prerequisites and capability derived from real composition |
| [Retrosum manual deployment](../../Retrosum/docs/operations/MANUAL-DEPLOYMENT.md) | Linux artifacts, service identities, paid-off probes and rollback |

Fresh Retrosum interaction inspection also included [Tailor-pattern reference: Retrosum assistant](../../Retrosum/docs/engineering/RETRO.md), [context shortcuts](../../Retrosum/apps/frontend/src/features/retro/shortcuts.ts), [guidance layout](../../Retrosum/apps/frontend/src/features/retro/guidance.tsx) and [inline change preview](../../Retrosum/apps/frontend/src/features/retro/change-preview.tsx). These support native chat CTAs, bounded conversation surfaces, registered tours and revision-safe editable forms. Retailor adds required photo uploads and design/logo microsteps.

### Official implementation references

These pages support the narrow current claims cited in the relevant sections and should be rechecked when implementation/release selects exact versions:

- [OpenAI images and vision](https://developers.openai.com/api/docs/guides/images-vision).
- [OpenAI structured output](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses).
- [OpenAI data controls](https://developers.openai.com/api/docs/guides/your-data).
- [Cloud Run service-to-service authentication](https://docs.cloud.google.com/run/docs/authenticating/service-to-service).
- [Cloud Billing budgets](https://docs.cloud.google.com/billing/docs/how-to/budgets).

External research links in the original concept remain historical context. This blueprint's commerce definitions are explicit Retailor demo rules; they do not claim to reproduce a commerce vendor's full reporting system or provide tax/accounting advice.

## Appendix E — Glossary

| Term | Meaning in Retailor |
| --- | --- |
| Catalogue draft | Reviewable product interpretation before demo publication |
| Published catalogue | Current local demo catalogue used by both perspectives |
| Store generation | Validated content composed into an authored storefront |
| Scenario | Synthetic coherent commerce records associated with that catalogue |
| Guest action | A real local interaction producing simulated business records |
| Provenance | Whether a field is observed, generated, supplied/confirmed, demo-default or unknown |
| Availability | Current simulated units after the movement ledger |
| Return | Physical merchandise process |
| Refund | Issued simulated financial adjustment |
| Restock | A once-only positive inventory movement for inspected units |
| Fact | Exact derived figure plus formula, scope and contributing records |
| Proposal | Inert reviewed intent; not permission to apply a change |
| Revision | Monotonic identity of a current data or presentation snapshot |
| Generation | Ownership fence preventing old work from entering a replacement workspace |
| Paid-off | A backend gate preventing new provider dispatch, independent of local demo actions |
| Source of truth | The current Retailor document/domain authority for its specific responsibility |

## Appendix F — Design and dashboard research

### Research status and interpretation

Research checked on **11 October 2026**. Sources below are first-party builder documentation, brand storefronts, font repositories and specialist usability research. They guide Retailor's authored design; they are not evidence that a copied layout, colour or font guarantees commercial success. The accepted library count is fixed; names, visual tokens and hero composition are researched Retailor proposals awaiting visual evidence. Older still-useful typography guidance is identified as such; it is not relabelled a 2026 study.

A focused browser inspection also checked the opening Shopify design page and Nike/COS storefronts. Shopify redirected to its Egypt page; Nike was inspected in its Japan regional storefront. COS's opening composition was visible behind cookie/location dialogs. Nike imagery was still loading in the captured viewport, so the reliable visual observation there is its monochrome navigation/action hierarchy, not a completed campaign-image audit. No brand assets were downloaded or reused.

### Storefront and landing references

| Source | Observed useful pattern | Retailor interpretation |
| --- | --- | --- |
| [Shopify website design](https://www.shopify.com/website/design) | Complete home/product/collection templates, palette/type changes and product-led examples; opening hero uses a large storefront preview | Show our real product result prominently; build complete bundles and local visual presets |
| [Shopify theme settings](https://help.shopify.com/en/manual/online-store/themes/customizing-themes/theme-editor/theme-settings) | Current theme guidance uses consistent palette/scheme and typography settings; available options depend on theme/version | Finite semantic colour tokens and paired type presets rather than loose per-element controls |
| [Squarespace fashion templates](https://www.squarespace.com/templates/browse/topic/fashion/type/online-store&portfolio) | Curated fashion/store template selection | A few recognizable complete design ideas, strong thumbnail presentation |
| [Framer ecommerce collection](https://www.framer.com/marketplace/templates/categories/ecommerce/) | Ecommerce template discovery organized around brand/product presentation | Compare strong visual identities while retaining consistent commerce capability |
| [COS US storefront](https://www.cos.com/en-us) | Neutral monochrome framing, large fashion photography and simple category entrances | Ink/Paper and Gallery can let actual product imagery supply much of the colour |
| [Nike Japan storefront](https://www.nike.com/jp/) | Monochrome navigation/actions, campaign/category destinations and direct shopping links | Pulse can use strong editorial scale and clear navigation without copying promotions or identity |
| [Baymard product-list usability, updated August 2026](https://baymard.com/blog/product-listing-page-plp-ux) | Product lists need understandable filtering/sorting and useful comparison | Applied chips, real result counts, grouped variants and quick clear-filter behavior |

Additional current research: [Baymard’s June 2026 apparel survey](https://baymard.com/research-articles/apparel-and-accessories-quantitative-ux-insights-2026) highlights size/fit uncertainty and the need for understandable size discovery. [Baymard’s April 2026 filter guidance](https://baymard.com/blog/ecommerce-filter-ui) supports clothing-relevant filters and visible selected state. Retailor therefore exposes available sizes, category/colour/price chips and actual photo-backed details; it does not infer a fit guarantee or fake verified customer testimony. Survey results inform shopping usability, not which exact hex code is fashionable.

The vibrant Retailor landing is a synthesis: a visible store result plus expressive platform colour and a choreographed transformation. It does not require a fashion brand itself to use colourful interface chrome.

### Colour and typography references

| Source | Supported observation | Consequence |
| --- | --- | --- |
| [Shopify colour-scheme examples](https://www.shopify.com/blog/website-color-schemes) | Ecommerce identities range from restrained neutrals to warm or saturated contrasts | Offer visually distinct curated moods; exact Retailor colours require design/contrast review |
| [Shopify colour psychology](https://www.shopify.com/blog/color-psychology) | No universal best colour; brand, audience and context matter | Explain mood and readability; no psychological conversion guarantee |
| [Shopify HTML/font examples](https://www.shopify.com/blog/best-html-fonts) | Inter is used for Horizon headings and body; ecommerce uses diverse type styles | Modern Inter is a supported familiar candidate; do not invent prevalence rankings |
| [Shopify website typography guidance](https://www.shopify.com/blog/best-website-fonts) | Type choice concerns readability, screen behavior and brand character | Review actual specimens and UI hierarchy, including narrow screens |
| [Google Fonts: DM Serif Display](https://github.com/google/fonts/blob/main/ofl/dmserifdisplay/DESCRIPTION.en_us.html) | Display family is intended for larger text | Limit it to expressive headings; pair readable body/control type |
| [Google Fonts: Manrope](https://github.com/google/fonts/blob/main/ofl/manrope/DESCRIPTION.en_us.html) | Maintained font-family source/description for the expressive candidate | Inspect weights, language coverage and distribution terms before bundling |

The Inter article is dated 2025 and was rechecked in October 2026; font repositories and current theme settings supplement it. No reliable global ranking was established for the proposed three type presets. Choosing excellent, licensed, readable fonts with distinct brand moods is more useful here than claiming an unsupported most-popular list.

### Dashboard references and scope decisions

| Source | Supported pattern | Retailor decision |
| --- | --- | --- |
| [Shopify overview dashboard](https://help.shopify.com/en/manual/reports-and-analytics/shopify-reports/overview-dashboard/using-the-overview-dashboard) | Periods, metric cards, trends and links into reports; sales and conversion sit alongside operations | Four headline cards with clear scope, chart drilldown and contextual operational figures |
| [Shopify ecommerce reporting](https://www.shopify.com/blog/ecommerce-reporting) | Sales/finance, funnel, product/inventory and returns answer distinct business questions | A question-led dashboard with product evidence, cohorts, costs and stock context |
| [Shopify profit reports](https://help.shopify.com/en/manual/reports-and-analytics/shopify-reports/report-types/default-reports/profit-reports) | Profit reporting depends on cost data rather than sales alone | Disclose synthetic unit costs and exact formula; no “profit” without inputs |
| [Retrosum dashboard specification](../../Retrosum/docs/engineering/DASHBOARD.md) | Exact facts, animated geometry, readable values, clickable evidence and responsive interactions | Reuse the hierarchy and interaction discipline, adapted to commerce |
| [Retrosum redesign](../../Retrosum/docs/design/RET-011-DEMO-REDESIGN.md) | Progressive demo surfaces, bounded options and polished transition/tour behavior | One-page setup and finite visual choices delivered inside Tailor chat |

The first demo excludes CAC, lifetime value, ROAS, real attribution, carrier delivery performance and predictive demand because their necessary real data sources are absent. A fictional expense is enough to illustrate result changes; it is not evidence of marketing effectiveness. Additional metrics require a source and a useful question, not merely an attractive chart type.

## Appendix G — Sample-photo sourcing and production

### Source comparison

This research evaluates two feasible routes; it does not claim that fifteen final photos have already been obtained. Section 12.1 owns the fifteen-garment manifest.

| Route | Benefit | Tradeoff | Decision |
| --- | --- | --- | --- |
| Original AI-generated assets | Control garment range, brand coherence, background and lighting without copying a real merchant’s catalogue | Must inspect geometry and alternate-view consistency; offline generation has its own cost | Preferred first attempt, then visual acceptance |
| Pexels stock | Existing photo discovery and clear public licence | Mixed lighting, poses, brands and multi-garment scenes may weaken exact catalogue grouping | Researched alternative; accept individual source pages only after inspection |
| Ordinary Unsplash stock | Another source of clothing/lifestyle photography | Product-only coverage and matching views vary; Unsplash+ has separate terms | Secondary alternative, track actual asset licence |

The [Pexels licence](https://www.pexels.com/license/) permits ordinary commercial/personal use subject to its terms. [Pexels’ commercial-use guidance](https://help.pexels.com/hc/en-us/articles/360042295214-Can-I-use-the-photos-and-videos-for-a-commercial-project) explains that depicted people, brands and other rights still matter; do not imply endorsement. The [ordinary Unsplash licence](https://unsplash.com/license) is a separate source policy. Preserve each chosen photo’s source and the applicable terms rather than treating a search thumbnail as a licence record. No lengthy attribution/rights panel is needed in the setup conversation.

Discovery pages inspected: [Pexels jeans](https://www.pexels.com/search/jeans/), [Pexels hoodies](https://www.pexels.com/search/hoodie/) and [Unsplash clothing products](https://unsplash.com/s/photos/clothing-product). These establish a stock alternative to investigate; they are not a fifteen-item downloadable asset pack. Final stock selection must open and inspect each individual photo page, reject branded/ambiguous items and record its source before bundling bytes.

### Reusable offline asset brief

For each F01–F15, describe one original unbranded garment using the manifest’s colour and silhouette, full garment visible, neutral warm-grey studio backdrop, soft consistent lighting, natural seams/folds and generous crop margins. Create primary images independently; do not put fifteen products in one image. Avoid embedded prices, logos, watermarks, promotional copy and claims about materials or provenance. Optional model imagery remains clearly fictional demo imagery, and must not substitute for a missing garment view. Prefer garment-only primary images for clean recognition; evaluate on-model secondary images only if they materially improve product presentation.

A generation prompt is an asset-production aid, not a catalogue assertion. Visual review checks the actual output. A generated “linen-like” surface does not prove linen, and a casual shirt does not establish specific fit or measurements. Final sample product copy is live drafted from the shipped photos, with unknowns and editable demo assumptions.

### Asset acceptance checklist

1. Fifteen distinct clothing primary photos exist, covering the requested garment mix; at least jeans, hoodies and tees are represented.
2. Every asset has a manifest ID, content hash, format/dimensions, source URL or generation record, declared generated/stock origin and accepted usage basis.
3. Lighting, crops and background feel coherent across all three templates and four palettes; dark and pale items remain readable.
4. No product is identifiable only through an obscured or multi-item photo. Alternate views actually match the primary garment.
5. Optimized primary/secondary files fit the 24-photo, 18 MiB recognition-selection envelope; individual final public assets are appropriately compressed.
6. The exact assets are evaluated through fresh live interpretation for grouping/source coverage. Test expectations remain separate from public code.
7. Asset failure cannot create an image-free product or silently substitute a different garment.

## Appendix H — Logo and currency reference notes

### Optional runtime logo generation

The official [OpenAI image-generation guide](https://developers.openai.com/api/docs/guides/image-generation) documents Image API generation and multiple outputs. [OpenAI image prompting](https://developers.openai.com/api/docs/guides/image-prompting) provides logo/brand composition examples. Retailor’s three-candidate count, confirmation gate, prompt fields, cache/deadline/cost limits and wordmark fallback are application decisions, not provider guarantees. Verify that the selected current model/account supports the intended size, transparent raster output and candidate request shape. Do not add a durable provider upload library or an unrestricted public image-generation endpoint.

Choose a model via current capabilities, visual results, legible store-name rendering, latency and cost, rather than copying a model name into the blueprint. The text wordmark uses the actual bundled font; a generated raster mark may only approximate its character. A store can be complete with the wordmark even when image generation is unavailable.

### Automatic storefront EUR display

[Frankfurter’s current API documentation](https://frankfurter.dev/) describes v2 single-pair routes and provider-specific rate endpoints. Pin the explicitly selected ECB provider in the adapter rather than claim a default blended quote is solely ECB-derived. The [ECB reference-rate page](https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.en.html) describes working-day publication and informational reference usage. This is suitable context for simulated price display; no real payment settlement is implemented.

RTL-009 subsequently verified the official fixed USD/EUR route and implemented adapter/cache directly on 12 October 2026 after the web reader could not access the API; [timestamped source evidence](validation/evidence/RTL-009/source-verification.json) records the result. Runtime fetches validated dated data; this evidence is not a hardcoded current rate. The HTML does not fetch currency data or execute logo generation; its copy explains the intended app behavior. Exact conversion/rounding, snapshot persistence, budget/filter semantics and failure behavior are specified in Section 13.2.1.
