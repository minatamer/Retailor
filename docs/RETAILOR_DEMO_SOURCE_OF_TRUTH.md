# Retailor — product, architecture and delivery blueprint

**Status:** documentation baseline for a new portfolio demo; implementation has not started.\
**Prepared:** 11 October 2026.\
**Product:** Retailor. **Sample clothing brand:** FORME.\
**Companion:** [Retailor product overview](RETAILOR_OVERVIEW.html).\
**Signature promise:** **Bring your products. See your store.**

Retailor helps an anonymous visitor turn product photographs into a drafted catalogue, a desirable storefront and a connected owner workspace. AI interprets the photographs and assists shoppers and owners; application code controls prices, stock, calculations and changes. The visitor can complete the experience without signing in, typing product descriptions, paying for an order or connecting a commerce platform.

This document describes what to build, why it belongs in the demo, how its parts work together and how completion will be demonstrated. It deliberately goes beyond a feature list. It defines screen behavior, boundaries, state, domain rules, AI responsibilities, privacy, infrastructure, engineering practices and acceptance.

The target is a coherent five-minute portfolio experience demonstrating a reusable ecommerce foundation. A production store, payment processing, shipping services, legal store policies and an authenticated merchant platform are separate work.

> **Planning boundary:** this revision creates documentation, not application code, cloud resources, paid provider operations or implementation tickets. All routes, packages, commands and operating settings below are the intended implementation unless explicitly identified as inspected sibling evidence. No ticket queue is created by this document.

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
27. [Implementation sequence without tickets](#27-implementation-sequence-without-tickets)
28. [Documentation and collaboration practices](#28-documentation-and-collaboration-practices)
29. [Decisions to settle during implementation](#29-decisions-to-settle-during-implementation)
30. [Definition of complete](#30-definition-of-complete)

Appendices: [recovery matrix](#appendix-a--recovery-matrix), [worked commerce example](#appendix-b--worked-commerce-example), [public copy](#appendix-c--public-copy-and-error-language), [reference map](#appendix-d--reference-map), [glossary](#appendix-e--glossary).

## 1. Authority, status and reference inheritance

### 1.1 Documentation authority

Use this order when decisions conflict:

1. The latest explicit owner instruction.
2. This Retailor blueprint, updated to incorporate that instruction.
3. A subsequently accepted Retailor architecture or design decision.
4. The future implementation packet for the specific work, once tickets are requested.
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

Retailor uses OpenAI for catalogue interpretation and text assistants. It has no reason to inherit video rendering, FFmpeg, Remotion, voice interviews, PDF parsing or financial-document recognition. Those solve the siblings' product problems. Retailor adds bounded image decoding and a pure commerce package because its own workflow requires them.

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

No Retailor implementation or hosted acceptance is claimed in this revision.

## 2. Product contract and audience

### 2.1 The product sentence

**Retailor turns a collection of product photos into an AI-drafted demo store that a visitor can shop and operate, with clear sources, editable drafts and connected demo data.**

The visible output is more than an AI description. It is a storefront and operations workspace using the same catalogue. The AI work becomes visible in grouped imagery, useful product drafts, shopping suggestions and explanations of store activity.

### 2.2 Audience and portfolio value

The primary visitor is a potential client evaluating what the developer can build. They may be a brand owner, ecommerce operator, agency or product manager. They are not expected to behave like a fully onboarded merchant or provide a real customer database.

The visitor can explore three perspectives in one guest workspace:

- **Creator:** provide photographs and see a catalogue/store appear.
- **Shopper:** browse the products, ask for help, fill a bag and place a demo order.
- **Owner:** inspect the matching sales, orders, returns, stock and feedback.

These perspectives demonstrate product breadth without adding accounts, tenancy or a permissions system. “Owner dashboard” is the name of a demo view, not an authorization claim.

The commercial takeaway is a brandable ecommerce frontend/backend with AI-assisted catalogue setup and useful assistants. Production commerce integrations can be separately tailored to a client's needs.

### 2.3 Ten-second comprehension

Before interacting, the visitor should understand:

1. Bring photos or use a prepared collection.
2. AI drafts the products; the visitor can correct them.
3. The result includes both a store and an owner workspace.
4. All purchases and store history in this experience are simulated.
5. No signup or payment details are needed.

The landing must communicate this through a short headline, concrete visual progression and one primary CTA. A technical architecture explanation should not be necessary to understand the product.

### 2.4 Useful visit and success targets

The prepared sample should reach a usable store in under one minute of deliberate interaction. A guided sample visit through browsing, a demo order and owner inspection should fit roughly five minutes. These are design targets to measure later, not existing performance evidence.

The memorable connected moment is: **place a demo order in the storefront, switch to the dashboard, and open the exact order and stock movement behind the changed figures.** The memorable AI moment is: **several photographs become a coherent, reviewable catalogue without mandatory product typing.**

## 3. Decisions and scope

### 3.1 First-demo decisions

| Decision | Baseline | Consequence |
| --- | --- | --- |
| Product type | Public portfolio demo | Optimize one complete visit and credible behavior |
| Brand | Retailor; FORME for the sample store | Keep platform identity distinct from store identity |
| Entry | Landing, then sample collection or uploads | No direct storefront-first entry |
| Required form fields | None before catalogue drafting | Names, categories and descriptions start as drafts |
| AI provider | OpenAI, backend only | One provider family; no hidden fallback provider |
| AI roles | Catalogue, shopper assistance, owner assistance | Separate context and tools, shared provider transport |
| Store generation | Authored layout/components populated with validated content | No arbitrary AI-generated executable website |
| Commerce | Simulated orders and operations | No payment, shipping or Shopify API |
| Guest state | One current tab workspace, fixed two-hour lifetime | No account or saved merchant library |
| Calculation authority | Pure shared commerce package | UI and AI cannot invent totals or stock |
| Backend | Request-bound private API | No durable business state |
| Deployment | Two Cloud Run services using the sibling tool family | Public frontend, IAM-private backend |
| Language and money | English; USD demo source amounts | No FX service or multilingual interface initially |
| Default development | Fake mode, paid disabled | A clean checkout needs no provider credentials |
| Documentation deliverables now | This Markdown and one summarized HTML | No tickets or application scaffolding |

### 3.2 Included capabilities

- Public landing with a clear photos-to-store story and previews of both perspectives.
- Sample gallery and bounded JPEG/PNG/WebP uploads with visible previews.
- Honest prepared sample interpretation and an explicitly enabled live image route.
- Photo grouping, category/title/copy drafting and category-specific demo size options.
- Nonblocking catalogue review, edit, image reassignment and split/merge correction.
- One polished storefront with categories, filters, product detail, alternate images, zoom and a bag.
- Product-backed shopper assistance, reviewed outfit/bag proposals and useful policy answers.
- Explicit simulated checkout without a real card, address, email or phone number.
- A dashboard with exact metrics, charts, contributing records and a clear synthetic-data badge.
- Orders, simulated fulfilment, return receipt, refunds, restock and inventory inspection.
- Synthetic customer feedback and evidence-linked owner observations.
- Owner assistance for explanations, record navigation and reviewed catalogue-copy preparation.
- Same-tab recovery, bounded JSON export, reset, expiry and failure recovery.
- Meaningful motion, keyboard/touch interaction and complete responsive layouts.

### 3.3 Explicit exclusions

The initial demo has no real checkout provider, shipping API, Shopify integration, tax service, real bank refund, email/SMS sending, customer support system, supplier ordering or advertising platform.

It also has no merchant authentication, organizations, multitenancy, roles, hosted database, persistent upload library, durable chat history, cross-device cart, public store publishing, custom store domains, drag-and-drop site builder, app marketplace or subscription billing.

Do not infer fabric composition, garment measurements, authenticity, selling price, stock, demand or historical sales from photography. Do not generate on-model photographs or claim virtual try-on accuracy in the first build.

No live browsing, external search, voice assistant, image generation, vector database or recommendation-training pipeline is needed. The current catalogue is small enough for deterministic search and filtering.

### 3.4 Roadmap context

Later work may add authenticated merchant sessions, real catalogue import/export, payment/shipping connections, confirmed product facts, durable inventory, analytics integrations, localization and richer owner customization. Each needs a separate scope decision and its own acceptance.

Dashboard widget/layout customization, advanced merchandising experiments and multiple storefront themes are optional follow-ups. They should not delay the first complete photos-to-store-and-owner story. The initial owner assistant can prepare catalogue copy without becoming a general admin agent.

## 4. Landing page specification

### 4.1 Structure and content

| Order | Section | Purpose and content |
| --- | --- | --- |
| 1 | Header | Retailor wordmark, How it works, Store + dashboard, FAQ and Try demo |
| 2 | Opening viewport | “Bring your products. See your store.”; one short explanation; Try demo; See how it works |
| 3 | Signature product visual | Supplied photo cards → drafted catalogue → storefront + owner view, using original sample assets |
| 4 | Three-step story | Bring the photos; review the AI draft; explore both sides of the store |
| 5 | Storefront preview | Editorial collection, alternate views, useful filters, shopping help and bag |
| 6 | Owner preview | Connected order, stock change, meaningful KPIs and inspectable observations |
| 7 | Where AI helps | Catalogue preparation, product-backed shopping, grounded owner explanations |
| 8 | Trust and boundaries | Guest session, editable drafts, synthetic activity, no real payments |
| 9 | FAQ | Inputs, unknown facts, what is simulated, session handling and integration scope |
| 10 | Final CTA and footer | Try demo; restrained commercial line; documentation/contact link only if an actual destination exists |

The opening stage should feel complete in the first viewport while remaining usable on short screens. The visual can overlap image cards and store previews, but text and controls must remain readable. Do not put a carousel or video download ahead of the CTA.

### 4.2 Copy direction

Suggested opening copy:

> Bring your products. See your store.
>
> Turn product photos into a drafted catalogue, a beautiful demo storefront and a connected owner dashboard. Explore what AI can do for ecommerce.
>
> Try demo · No signup. No real payments.

Use “draft” for generated catalogue information and “demo” for transactions. The commercial line **Retail, tailored to your brand** may appear near the end. The landing should sell the result without promising a verified production store from photos alone.

### 4.3 Landing interaction and motion

- Try demo enters `/demo` at Choose, or offers to resume an existing unexpired workspace.
- Secondary section links scroll to real semantic anchors without hiding headings under a sticky header.
- Product visuals animate a short meaningful transformation or use a lightweight interactive preview. They must not call AI or create a workspace just by becoming visible.
- Avoid looping fake processing, permanently moving background ornaments and unsupported customer logos/testimonials.
- A still poster must explain the visual if motion is reduced or an asset fails.
- Image loading must reserve dimensions; the layout must not jump while the visitor aims at the CTA.

### 4.4 FAQ answers

Keep answers short and concrete:

- **What can I upload?** A small collection of product photographs in the supported image formats.
- **Do I have to enter product details?** No. AI drafts the starting catalogue; edits are optional.
- **Can it know materials or measurements?** Only supplied, confirmed or clearly readable information supports those fields. Unknowns stay unknown.
- **Can I buy something?** You can place a simulated order to see the connected store/dashboard behavior.
- **Is the sales history real?** No. The dashboard starts with clearly labelled synthetic activity.
- **Do you save my store?** The demo is a temporary guest workspace with a stated lifetime and reset control.
- **Can this connect to real commerce tools?** That is separately scoped implementation work.

## 5. Canonical visitor journey

### 5.1 The complete path

```text
Landing
  → Choose sample / upload photos
  → Inspect selection and approve processing
  → Process
  → Review drafted catalogue
  → Open storefront ↔ Try the dashboard
  → Shop / ask / place demo order / inspect operations
  → Export or reset
```

Sample and uploaded-photo paths converge at the same catalogue/storefront contract. Different acquisition paths must not produce unrelated demo apps.

### 5.2 Stage contract

| Stage | Entry condition | Visitor goal | Main action | Result and recovery |
| --- | --- | --- | --- | --- |
| Choose | No workspace, or explicit fresh start | Select photos with confidence | Use sample / Choose photos | Keep previews when an individual file fails |
| Selection | At least one accepted image | Inspect the exact input | Build my demo store | Live processing starts only after disclosure and deliberate approval |
| Process | Approved manifest and available selected mode | See real progress and stay in control | Cancel | Preserve accepted input; failure offers bounded retry or prepared sample |
| Catalogue | Validated draft with at least one usable product | Inspect/correct the starting collection | Open storefront | Continue with honest defaults; unresolved items are visible |
| Storefront | Published demo catalogue and coherent scenario | Browse, ask and shop | Add to bag / Try the dashboard | Preserve filters, bag and images when switching views |
| Dashboard | Same workspace and scenario | Understand and operate the demo | Open records / View storefront | Mutations update the shared domain and invalidate stale observations |
| Reset/expiry | Deliberate reset or lifetime elapsed | Leave or begin again | Start a new demo | Abort old work and clear owned state before new identity |

### 5.3 Sample mode

Sample selection shows the actual photographs before use. Prepared sample mode uses authored interpretation linked to those exact assets. Its action should say **Use prepared sample** where a fresh AI request would otherwise be implied. It reaches the same review and storefront screens quickly and uses no model call.

Development fakes exercise the same contracts with declared fixtures. They may simulate processing for test visibility, but the product must not label a stored answer as live recognition.

If a live sample-analysis option is offered later, it is an explicit secondary action with the same consent/admission/cost limits as uploads. Public sample availability does not itself require paid vision processing.

### 5.4 Upload mode

Selection and previews work locally without a provider call. No merchant onboarding form is required. The live action explains which photos/derivatives will be sent and why.

When live recognition is unavailable, retain the images, explain the limitation and offer the prepared sample or manual draft correction. Unknown uploads in fake mode remain unprocessed; a generic dress/shirt answer is not a valid substitute.

### 5.5 Processing behavior

Visible stages are **Checking photos → Drafting products → Validating catalogue → Preparing demo store**. Only transitions actually completed by the owning operation are shown as completed. A provider's internal progress is unknown; show an indeterminate activity state rather than an invented percentage.

After a valid result, transition into the catalogue preview without imposing a celebratory delay. The visitor can inspect source images, review flagged items or open the store immediately. Cancellation stops further owned work; it does not promise that a provider request already dispatched was free or recalled.

### 5.6 The five-minute walkthrough

1. Start with the sample and inspect a few source photos.
2. Review the grouped products and a category-appropriate size preset.
3. Open FORME and compare an alternate image.
4. Ask for an outfit within a delivered budget; review the proposed bag.
5. Place a clearly labelled demo order.
6. Switch to the dashboard and open its stock movement and order details.
7. Ask why the headline figure changed, then reset or export.

This is the preferred portfolio walkthrough. It should feel natural without a compulsory tour, giant checklist or developer diagnostic panel.

## 6. Routes, shell and navigation

### 6.1 Route baseline

| Route | Responsibility |
| --- | --- |
| `/` | Public landing, metadata and shareable product explanation |
| `/demo` | One client-owned staged guest workspace |
| `/api/retailor/v1/*` | Narrow same-origin frontend bridge to approved backend routes |
| Backend `/v1/*` | Private validated API |

Choose, Process, Catalogue, Storefront and Dashboard are canonical state inside `/demo`. Do not create query/hash route state that competes with the session controller. A direct `/demo` visit restores an eligible workspace or starts at Choose with a helpful explanation.

Browser Back should leave the demo for the landing without silently clearing it. In-workspace back actions are explicit state transitions. Storefront/dashboard navigation uses the same workspace, not a copied state object. Product details and record drawers can be local view state; they resolve stable IDs against current data.

### 6.2 Global shell

Before generation, the shell includes Retailor identity, a compact stage indicator and reset/help where relevant. The storefront prioritizes FORME or the guest's optional store name, with discreet Retailor attribution and a visible **Try the dashboard** action. The owner shell includes **View storefront**, selected period and a persistent **Synthetic demo activity** badge.

Preserve one application-level dialog layer. Dialogs own focus, cancellation and focus return. Photo viewer, product quick view, bag, record detail and confirmation must not independently compete for overlays or keyboard shortcuts.

### 6.3 Perspective switching

- Switching views does not regenerate the catalogue, reseed history, clear the bag or call AI.
- Keep storefront filter and dashboard period preferences independently.
- Preserve pending editable forms only when the destination can safely retain them; otherwise explain and offer cancellation before discarding a meaningful unsaved edit.
- A shopper suggestion cannot continue displaying old stock after an owner mutation.
- Agent context changes explicitly with perspective. The shopper agent never gains owner mutation tools from a view switch.

## 7. Photo selection, preview and handling

### 7.1 Proposed input envelope

These are first-build limits to implement and measure. They are Retailor choices, not copied provider maxima.

| Resource | Proposed limit | Reason |
| --- | --- | --- |
| Accepted image formats | Static JPEG, PNG and WebP | Widely supported bounded decoding |
| Images per selection | 12 | Enough for a small collection and alternate views |
| Original size | 4 MiB per image | Limits browser/cache memory and decoding pressure |
| Original selection | 20 MiB total | Bounded same-tab recovery |
| Decoded original | 24 megapixels; no dimension above 10,000 px | Reject compressed/decode bombs |
| Provider/display derivative | Longest side at most 1,600 px, at most 1 MiB/image | Useful visual detail with bounded transfer |
| Derivative batch | 10 MiB total | Leaves explicit transport/headroom bounds |
| Products after drafting | 12 | No larger than the bounded photo story requires |
| Variants | At most 24/product and 144/workspace | Keep size/colour options and state finite |

HEIC, animated GIF/WebP, SVG, archives, URLs and videos receive specific unsupported-format handling. Do not silently discard animation or fetch remote image URLs. HEIC can be added only after a tested decoder and updated resource budget.

### 7.2 Validation order

1. Check count and claimed byte bounds before decoding.
2. Inspect actual signatures and decode the selected format; extension and MIME are hints only.
3. Reject unsupported/animated/overdimension images.
4. Apply orientation, create a deterministic bounded derivative and strip metadata from the derivative.
5. Compute source/derivative identities and show useful local previews.
6. Reject exact duplicate bytes or offer one retained image with a duplicate notice.
7. Bind the selected derivative manifest to the eventual processing approval.

Backend validation repeats the derivative signature, size, dimension, hash and decoding checks independently. The backend never trusts a browser statement that a photo is safe. Reject excess data while streaming, even when Content-Length is absent or false.

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
| Category | AI inference with review state | Pretending ambiguous footwear/accessories are certain |
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

An image can show several items. The draft may propose multiple products with a shared source reference and a review reason. It must not silently crop out and invent unavailable separate product photos. An ambiguous photograph can remain an unclassified item with its original preview.

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
| Belt/accessory | Appropriate length or one-size preset | One-size only where appropriate to the demo configuration |
| Unclassified | Neutral demo option or explicit pending options | Continue without invented garment precision |

Store `sizingSystemId`, category, labels and provenance. Do not encode one universal US↔EU mapping. FORME may have an authored sample chart with units and clear sample identity. Uploaded items do not get an invented measurement chart.

### 8.5 Catalogue review screen

Lead with a collection preview and **Open storefront**, not a large required spreadsheet. Each product card opens a compact edit panel for title, category, copy, visible facts, images and sizing preset. Show the source image and a small draft/confirmed/default marker at the relevant field.

Actions include rename, revise category, choose primary image, reorder alternatives, split a group, merge selected drafts and exclude an unusable draft. Editing one field does not automatically re-run vision. Human changes are deterministic commands over the current draft.

Demo price and stock defaults are disclosed in one coherent configuration summary. Detailed field provenance remains available without placing warning banners on every card.

At least one usable product is required to open a store. Unknown composition or unconfirmed measurements do not block the demo. Invalid option structures, missing images or broken IDs do block the affected product until corrected/excluded.

### 8.6 Publication boundary

**Open storefront** publishes a catalogue snapshot into the current demo workspace and constructs its synthetic scenario once. It does not publish a website externally.

Before any orders exist, a structural regroup/rebuild may replace the scenario with a clear reset notice. After orders exist, preserve product/variant IDs and historical snapshots; removing a sold variant becomes archival. A split/merge or wholesale regroup that cannot preserve references requires an explicit **Rebuild this demo** confirmation and a fresh scenario identity.

Do not silently attach an old order, review or stock movement to a newly generated product.

## 9. Storefront and product experience

### 9.1 Art direction

The generated store should feel like a considered clothing brand: generous photography, restrained editorial type, quiet surfaces, legible product information and useful interaction. FORME is a coherent capsule, not a collection of unrelated placeholder cards.

Retailor can choose content and arrangement within authored layouts. There is one dependable storefront preset initially. Palette suggestions are constrained to validated tokens and readable contrast. Model output never becomes CSS, arbitrary HTML or script.

### 9.2 Storefront hierarchy

1. Store identity and navigation: collection/category links, shopping help, bag count and Try the dashboard.
2. Compact demo context: synthetic prices/availability and no real payments.
3. Collection hero using an appropriate supplied image or a typography-led fallback.
4. Category controls, filters, removable chips and result count.
5. Product grid with coherent image crops, prices and useful variant access.
6. A short collection/policy section containing only supported demo content.
7. Footer with Retailor attribution and reset/export access.

Avoid newsletter gates, discount popups, fake urgency, hidden fees and unsupported bestseller claims. Synthetic ratings should not masquerade as actual customer endorsement.

### 9.3 Product cards and imagery

- One card per product style; supported colour variants use swatches with text names.
- Hover/focus can crossfade to a real supplied alternative. Tap and keyboard get an explicit image toggle.
- If no alternate exists, keep the original and offer zoom. Do not synthesize a worn image.
- The selected colour determines the image and variant data consistently.
- Reserve image dimensions and show a useful loading/error fallback.
- Long titles wrap without hiding the price or action.
- Quick view preserves scroll and filters and restores focus on close.

A worn image is a view of the garment, not a fit promise. Uploaded photography must remain recognizable in the resulting store; unrelated sample imagery cannot replace it.

### 9.4 Filters and search

Initial filters are category, available size within its named system, primary colour and price. Material filters appear only when enough confirmed values make them useful. Unknown material does not match a claim such as “wool-free.”

Text search uses deterministic bounded product title/category/confirmed attribute matching. No embedding service is needed for twelve products.

Show active chips, clear-all, result count and an empty state with one useful recovery action. Filters preserve compatible selections and explain when size systems differ. Colour swatches cannot rely on colour alone for accessibility.

### 9.5 Product detail

Include primary/alternate gallery, zoom, title, price, supported copy, exact options, available demo stock, size help, quantity, add-to-bag and policy summary. Unknown facts are displayed neutrally when relevant; do not bury them in contradictory marketing copy.

Variant selection must be explicit when several sellable variants exist. Disabled sizes remain discoverable with an unavailable explanation. The quantity control respects per-line and available-stock bounds. Bag addition uses the current variant identity and shows local success feedback.

### 9.6 Shopping assistant surface

Use a compact composer/drawer that does not cover product actions or the bag. Suggested prompts include **Build a look under $150**, **Compare these two items** and **What size information is available?**

An outfit board references actual products and selected variants. Show exact merchandise/delivery/tax totals calculated by code. The visitor can swap a piece, correct preferences and explicitly add the reviewed group to the bag.

Simply opening the assistant or a suggested prompt list does not spend credits. A live Send action is a deliberate bounded operation. Prepared sample examples remain clearly prepared.

## 10. Bag and simulated checkout

### 10.1 Bag contract

The bag contains at most eight distinct variant lines and five units per line. It is temporary workspace state and does not reserve stock. Adding the same variant merges quantities within bounds.

Show title, selected colour/size, image, unit price, quantity, removal and totals. Product price edits or stock changes make old line snapshots stale; recalculate and surface changes before order confirmation. Never silently buy a replacement size/colour.

The bag survives perspective switching and eligible refresh. Quantity, removal and opening the bag are local and unpaid.

### 10.2 Checkout interface

Use a small review panel with a seeded fictional delivery identity, sample delivery cost and zero simulated tax by default. Real names, addresses, emails, phone numbers and card details are unnecessary and must not be requested.

The primary action is **Place demo order**. A nearby sentence states **This simulates an order and updates this demo's stock and dashboard. No payment or shipment occurs.**

The initial pricing policy uses integer USD cents. A $6 sample delivery fee and $0 simulated tax may be the default. These are demo constants, not jurisdictional tax or carrier calculations.

### 10.3 Confirmation and connected result

1. Validate the current workspace, revision, command ID, variants, quantities and stock.
2. Recompute prices, discounts and full totals using the domain engine.
3. If the reviewed values changed, show the new review instead of applying the stale confirmation.
4. Apply the order and all stock deductions atomically once.
5. Clear purchased bag lines, show a demo order reference and offer **See it in the dashboard**.

Double-click, replay or refresh must not duplicate the order or deduct stock twice. If the total order-record limit is reached, explain the boundary and offer reset/export; do not overwrite earlier records.

## 11. Owner workspace

### 11.1 Information hierarchy

Use Retrosum's inspectable hierarchy: **scope → headline KPIs → purposeful charts → observations → underlying records**. Every visible amount must derive from the same commerce state as checkout and inventory.

The shell includes Overview, Orders, Returns & refunds, Inventory, Feedback and Catalogue. Keep the storefront switch conspicuous. The overview should feel substantial without making twenty metrics equally prominent.

### 11.2 Overview

| Area | Content | Interaction |
| --- | --- | --- |
| Scope bar | Last 7 days, last 28 days or all scenario activity; as-of and USD | Declares period/date basis; no hidden filter |
| Primary cards | Net merchandise sales, included orders, average merchandise order value, awaiting fulfilment | Open formula, contributors and exclusions |
| Operations strip | Issued refunds, physically returned units, low-stock variants, open return requests | Open the relevant current record view |
| Sales trend | Daily gross/discount/reversal/net event series | Point/series drilldown and exact table |
| Product performance | Merchandise sales by product, with bounded Other grouping if needed | Supporting order lines and adjustments |
| Stock attention | Current available stock and low-stock threshold | Movement ledger for the selected variant |
| Useful observations | Code-derived attention flags and optional grounded AI summary | Evidence links and current revision |

“Net merchandise sales” is intentionally explicit. Do not label it profit, real collected revenue or cash balance. Shipping and tax have separate totals. The initial demo has no cost-of-goods evidence and therefore no gross margin/profit metric.

### 11.3 Drilldown contract

A KPI or chart target opens a detail drawer containing the exact metric value, formula, period, date basis, contributing IDs, exclusions and origin markers. From there the visitor opens an order, refund, return or stock movement.

The drawer resolves its fact ID against the latest revision. After a mutation, recompute or clearly mark it stale; do not leave an old total attached to a current chart. Closing a record returns to the same metric context and scroll position.

Every chart has an exact data table and keyboard/touch targets. Negative net values are valid and require meaningful axes, not clipping to zero. Legend isolation is a presentation filter unless the scope bar also changes.

### 11.4 Orders

The register shows reference, date, origin, item count, merchandise amount, delivery/tax, total, fulfilment state and financial summary. Filtering/sorting is deterministic. The detail includes immutable placed line prices, variant options, discount allocation and linked movements/adjustments.

Supported demo operations are cancel eligible placed orders, mark placed orders shipped and mark shipped orders fulfilled. Each shows a reviewed effect and a local/demo label. Shipping does not call a carrier or fabricate live tracking.

### 11.5 Returns and refunds

Use distinct tabs/sections for physical returns and financial refunds. A return can be requested/approved/received/closed; refund status is independently derived from issued adjustments.

Return creation selects order lines and bounded quantities/reasons. Receipt records inspected disposition: restockable or not restockable. Only restockable received units affect inventory. Refund review shows remaining refundable merchandise/delivery amounts and final effect. The UI must not imply that accepting a parcel automatically sends money.

### 11.6 Inventory

Show product, variant/SKU, options, opening stock, deducted/restored units and current availability. A stock-history drawer explains each movement and source command. Low stock is a demo threshold, initially two units or fewer for active variants.

A deliberate demo stock adjustment may correct available quantity with a reason and an exact signed movement. It must not rewrite old movements. Reject a final negative balance. Price and stock are separate commands; editing copy does not change either.

### 11.7 Feedback

Show clearly synthetic ratings/comments tied to known products and, where the fixture supports it, known orders. Include count and provenance. Simple deterministic themes can group seeded reasons such as sizing clarity or missing detail views. AI summaries reference specific comment IDs.

A small synthetic sample is not statistical proof of customer demand, fit problems or commercial performance. The assistant can suggest inspecting the relevant records, not claim causality or guaranteed improvement.

### 11.8 Catalogue operations

The owner can edit draft copy, category, active price, demo stock and size-option templates through the same command path as manual review. Once sold, historical line snapshots are immutable and removed variants are archived.

The owner assistant can prepare revised copy from current supported facts and open the real editable form. The visitor decides what to apply. Full dashboard layout customization is a later extension; initial charts and metrics are authored.

## 12. Synthetic collection and activity

### 12.1 FORME capsule

Author a coherent sample collection including a tee, button-front shirt, trousers, jacket/suit item and belt/accessory. Prefer six to eight distinct products with enough alternate images to demonstrate the experience within the twelve-image cap.

Assets must be original, licensed or explicitly approved. Record source/rights privately as appropriate and include only public-use assets in the application. This documentation revision does not generate or acquire final product photography.

Useful sample fixture values from the existing concept are retained:

| Item | Demo price |
| --- | --- |
| Shirt | $54 |
| Trousers | $68 |
| Belt | $22 |
| Tee alternative | $38 |

A shirt/trousers/belt look costs $144 merchandise and $150 with $6 demo delivery. Replacing the shirt with the tee costs $128 merchandise and $134 delivered. The assistant should preserve a visitor's delivered-budget constraint, not quietly switch to merchandise-only arithmetic.

### 12.2 Scenario generation

Construct one reproducible scenario over the published catalogue. Seed a small 28-day history with up to twenty initial orders, leaving up to ten guest orders inside the thirty-order total cap. Include coherent cancellation, partial refund, physical return, restock, low-stock and feedback examples.

The generator uses a source-controlled seed and an explicit scenario anchor date captured at workspace creation. It applies deterministic events in date order through the same commerce rules as guest actions. Opening stock is authored so the generated sequence remains valid. It must not independently generate a chart array or KPI values.

The anchor defines a fictional scenario ending on the captured demo day. Seeded timestamps are labelled synthetic; they are not actual orders from the previous month. Tests use a fixed injected clock/anchor and independent expected results.

Store event timestamps in ISO 8601 UTC and bucket daily charts by UTC date, with that date basis visible in details. Seed dates remain fixed after creation. Guest events use the injected current clock; the current as-of is the later of the scenario anchor and latest accepted event date. If a two-hour session crosses midnight, roll the displayed relative period forward so its new order remains visible; do not reseed history.

Uploaded catalogues receive the same kind of openly simulated business scenario with their own product IDs. Photography affects the catalogue; it does not reveal historical business activity.

### 12.3 Origin and reference integrity

Every record is marked `seeded_scenario` or `guest_action`. AI catalogue provenance is a separate axis. A product can be live-interpreted while its sales history remains synthetic.

All orders, variants, return lines, refunds, movements and feedback resolve within the current scenario identity. Rebuild replaces that identity and invalidates old proposals/observations. A product rename does not orphan its IDs or rewrite historical line descriptions.

### 12.4 Comparison behavior

Last 7 days may compare with the preceding 7 days when the fixture contains both periods. Last 28 days has no percentage comparison if earlier history is absent. Display **No comparison period** instead of fabricated growth.

A genuine zero in a populated scenario is different from unavailable information. Empty groups can show zero; unavailable prior history should show an explanation. Do not interpolate missing transactions to make a prettier chart.

## 13. Commerce domain and exact calculations

### 13.1 Canonical entities

| Entity | Essential meaning |
| --- | --- |
| Workspace | Schema version, identity, fixed expiry, revisions and current catalogue/scenario |
| ImageSource | Stable image identity, hash, dimensions, roles and provenance; browser cache reference kept outside API domain graph |
| Product | Stable identity, title, category, supported attributes, images and active/archive state |
| Variant | Product identity, named size/colour options, SKU, integer price and active/archive state |
| CatalogueDraft | Reviewable interpretation, unknowns and grouping proposals before publication |
| BagLine | Current variant, bounded quantity and reviewed price revision; no reservation |
| Order | Immutable placed line snapshots, costs, origin and fulfilment state |
| Cancellation | Once-only reversal of eligible order merchandise/delivery/tax and stock restoration |
| Return | Physical line quantities and requested/approved/received/closed lifecycle |
| Refund | Issued bounded monetary adjustment, independent of physical return |
| StockMovement | Exact signed units, variant, reason, event date and source command |
| Feedback | Synthetic rating/comment, product/order links and origin |
| MetricFact | Formula, scope, value/availability, contributing references and revision |
| Proposal | Detached reviewed intent tied to workspace/revision/expiry |
| CommandReceipt | Applied command identity, result references and duplicate/Undo eligibility |

Contracts define public shapes; `packages/commerce` owns calculations, invariants, command validation and fact construction. UI-specific persistence/controller data remains frontend-owned.

### 13.2 Money representation

Use bounded integer USD cents, never floating-point dollars for authoritative calculations. Parse decimal inputs explicitly, reject extra precision and validate safe integer bounds. Formatting belongs to presentation. Chart geometry can use floating point after exact values are computed.

Allocate order discounts to lines deterministically. Use proportional integer allocation with a documented remainder rule and stable line order so allocated cents sum exactly to the supplied discount. A refund references the discounted line basis; it cannot refund more than the remaining refundable amount.

For partial unit refunds where a discounted line does not divide evenly, allocate unit-level discounted amounts deterministically at placement. Preserve those allocations in the order snapshot. Do not re-round a fraction differently on each later refund.

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
- Historical unit prices, discounts and selected options do not change after placement.

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

### 13.5 Returns are not refunds

Physical receipt records what came back. Inspection determines whether units are restockable. A refund records a financial adjustment. These can happen independently and on different dates.

A damaged return may create no stock restoration but still receive a refund. A goodwill refund may exist without a parcel. Requesting or approving a return creates neither a financial reversal nor available stock. A received-and-refunded unit produces one financial refund and, only if restockable, one stock restoration.

### 13.6 Dashboard fact catalogue

Every fact includes `factId`, workspace/scenario identity, data revision, period/as-of, date basis, formula identifier, exact value or unavailable reason, contributing record IDs and excluded record reasons. The owner agent and export read these same facts.

Do not persist a separate mutable array of headline values. Derive facts from the canonical graph on demand or cache by a complete immutable revision/scope key. Cache invalidation must include price/catalogue/scenario and relevant presentation scope changes.

## 14. Commands, revision control and proposals

### 14.1 One mutation path

Manual forms and agent-prepared changes use one pure command engine. A command carries workspace/scenario identity, expected data revision, command ID, intent and payload. It produces either a new valid graph plus receipt or a typed rejection with no partial mutation.

Command families include draft edits, publish/rebuild, product copy/category/price edits, variant archive/options, bag updates, order placement, cancellation, fulfilment, return creation/approval/receipt, refund issue and stock adjustment.

Applications cannot directly splice domain records to bypass validation. A storefront control, owner form and assistant confirmation all invoke the same authority.

### 14.2 Revision model

Use one monotonic data revision for domain changes and a separate presentation revision for meaningful layout/view preferences if necessary. Async results also carry `workspaceId`, `generation`, `operationId` and `inputRevision`.

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

Allow latest-change Undo only for reversible draft/catalogue-copy/bag actions when no subsequent domain mutation invalidates its receipt. Undo applies a new revision; it does not roll the global clock backward.

Placed orders, issued refunds, cancellation and stock ledger history are not erased by a generic Undo. Use explicit permitted domain transitions or a reviewed correcting stock movement. The demo should teach coherent operations rather than make immutable history disappear.

Persisted proposals are inert display data. Restoring a conversation cannot replay a mutation or re-enable a stale confirmation button. Reprepare against current state when required.

## 15. AI capabilities and assistant behavior

### 15.1 Three roles, one provider subsystem

| Role | Input | Useful output | Authority limit |
| --- | --- | --- | --- |
| Catalogue agent | Selected inspected image derivatives and finite preset definitions | Structured product/grouping/copy drafts with evidence and unknowns | Cannot set real commerce facts or execute UI markup |
| Shopper assistant | Current products/variants, supported policies, preferences and bounded chat | Comparisons, outfit board, alternatives and reviewed bag proposal | Cannot silently add items, place an order or guarantee fit |
| Owner assistant | Validated current commerce graph/facts, scope and bounded chat | Explanations, attention summary, evidence navigation and copy draft | Cannot issue refunds, fulfil orders or change stock without real form confirmation |

These are product roles and bounded tool catalogues, not three independently deployed agents. Use one backend provider adapter with role-specific prompts and context builders.

### 15.2 Shopper tools

Allowed product-facing tools:

- `searchCatalogue`: deterministic filtering over current known products.
- `getProductFacts`: supported facts, provenance and source IDs.
- `getVariantAvailability`: current demo stock and exact options.
- `getStorePolicies`: source-controlled demo delivery/return language.
- `buildOutfitPreview`: validated IDs and constraints; code computes totals.
- `prepareBagChange`: detached proposal, with explicit visitor confirmation.
- `openProduct`: registered known product target.

The assistant should ask together for missing important constraints rather than run a long interview. Budget must distinguish merchandise from delivered total. A vague request can receive a useful proposal with clearly stated assumptions.

Unknown material cannot satisfy “no wool” as confirmed. Unknown size information cannot become guaranteed fit. If no valid combination meets the constraints, explain the conflict and suggest relaxing one named constraint.

### 15.3 Owner tools

- `getMetricFacts`: exact current scope and contributors.
- `inspectOrders`, `inspectReturns`, `inspectRefunds`, `inspectInventory`: bounded record queries.
- `inspectFeedback`: known synthetic comments and counts.
- `openRegisteredView`: known owner section/record/fact target.
- `prepareCatalogueCopy`: draft from current confirmed/observed facts.

No arbitrary browser selector, URL, SQL, shell, network endpoint or new tool is accepted from a model. The backend recomputes facts from a validated bounded graph; it does not trust a client-supplied KPI total.

Requests to refund, fulfil or adjust stock may open the appropriate registered form and explain the required review. Those changes remain deterministic manual confirmation in the first build. Automatic execution is outside scope.

### 15.4 Grounding and visible usefulness

Assistant replies reference product, metric, order, feedback or movement IDs. The UI turns valid references into inspectable chips. References absent from the current workspace are rejected or omitted with an honest limitation.

Distinguish observations from suggestions. “Two received returns mention sizing clarity” can be an evidence-backed observation over synthetic comments. “Changing the size guide will increase conversion by 12%” is unsupported and forbidden.

The owner summary should be useful without another model call: deterministic low-stock, awaiting-fulfilment and open-return facts remain available. AI can phrase/explore them, but it is not required to make the dashboard function.

### 15.5 Conversation and concurrency

Keep shopper and owner histories separate, bounded and revision-aware. Send only relevant current context. Do not attach every original photo to every chat turn. Image inspection, if later supported within chat, must be an explicit bounded capability.

Opening a composer is local. Send dispatches one deliberate turn. Only one assistant turn is active per workspace; catalogue interpretation cannot overlap another paid workspace operation. Stop/cancel preserves final earlier messages and drops unfinished execution state.

If stock/catalogue/scope changes while a reply is pending, discard or mark the result stale. Offer **Refresh answer** as an explicit action; never silently charge for a regenerated reply.

### 15.6 Assistant surface and voice

Use concise, direct language with the product beside the reply. Prefer an outfit board, source chip, highlighted record or real editable copy form to long generic prose. Keep the composer compact and reserve enough viewport space around it.

The assistant should not describe tokens, internal tools, provider errors or deployment settings to ordinary visitors. It should say what it understood, what is unknown and what the visitor can do next.

## 16. Guest state, recovery and cleanup

### 16.1 Canonical session controller

One frontend session controller owns stage, workspace graph, domain revision, perspective, request ownership, finalized chat, preferences and receipts. Components read projections and dispatch commands. They do not hold competing catalogue/order/stock stores.

Use reducer/context state as in the sibling demos. Add a global state library only if a measured subscription problem justifies it. Pure selectors and domain builders keep calculations outside components.

### 16.2 Persistence contract

| Item | Location | Lifetime/boundary |
| --- | --- | --- |
| Normalized allow-listed projection | `sessionStorage`, maximum 2 MiB | Current tab, fixed two hours from workspace creation |
| Original images and bounded derivatives | Native IndexedDB temporary cache | Owned workspace; 20 MiB originals + 10 MiB derivatives |
| Sample images | Versioned public application assets | Public fixture, not guest data |
| Finalized conversations | Inside normalized projection | At most forty bounded messages combined |
| Controllers, live grants, challenge tokens, object URLs | Memory only | Active owned operation |
| API request input/output | Bounded transient memory | Request completion/timeout; no business-state database |
| Admission/replay/rate counters | Content-free process memory | Short TTL and process boot boundary |

Refresh does not extend expiry. Persistence is an allow-list assembled from eligible fields, not serialization of the runtime object with secrets deleted afterward. Validate schema version, identity, relationships, bounds and expiry before restoration.

### 16.3 Photo recovery

Photo recovery is included because a generated store should not lose its imagery on a routine refresh. Cache only owned selected bytes/derivatives. Recreate object URLs after restoration; do not persist URLs or Base64 copies.

A valid catalogue can survive missing image bytes. Show a local missing-photo state and offer reselecting the exact source or resetting; do not claim that a provider or server retained the original. Replacing source bytes invalidates dependent recognition/proposals.

Set a bounded cache envelope across remnant workspaces, proposed at 60 MiB per origin. Sweep expired owned entries on startup and before admitting more bytes. Quota denial falls back to usable in-memory work with an honest refresh-recovery notice.

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

Export one bounded JSON snapshot containing catalogue metadata/provenance, synthetic records, exact amounts, scenario origin, schema version, selected scope and current fact definitions. Exclude original image bytes, grants, tokens, credentials, pending executable proposals and full chat by default.

Use a clear filename with product/schema/date, not visitor filenames or private identifiers. Include a synthetic-demo notice inside the export. Export is local and unpaid. Import/replay of exported workspaces is outside the first build.

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

The proposed chart approach can change to a maintained library if the actual chart requirements justify it. Do not implement a general chart engine or choose a complex dependency merely to draw three finite series.

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

This is an ownership map for future implementation. Create directories when their first real module arrives. None of this tree is scaffolded by the current documentation task.

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
│  │     │  ├─ storefront/            browsing, filters and product detail
│  │     │  ├─ bag/                   review and simulated checkout
│  │     │  ├─ dashboard/             fact-driven overview/charts
│  │     │  ├─ operations/            order/return/refund/inventory views
│  │     │  └─ assistants/            shopper/owner conversation surfaces
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
│        ├─ providers/               fake/live ports and adapters
│        ├─ security/                challenge, grants, rate/cost/capacity
│        └─ demo/                    declared prepared fixture interpretation
├─ packages/
│  ├─ contracts/src/                 public shapes and bounded policies
│  └─ commerce/src/                  exact money, commands, graph and facts
├─ scripts/                         boundaries, evaluations and release packaging
├─ test/                            shared isolation and independent fixtures
├─ infra/cloud-run/                 frontend/backend service templates
├─ artifacts/local/                 ignored private local evidence and releases
└─ docs/
   ├─ RETAILOR_DEMO_SOURCE_OF_TRUTH.md
   ├─ RETAILOR_OVERVIEW.html
   ├─ retailor.md                   historical concept
   ├─ retailor.html                 historical interactive concept
   ├─ references/                  imported sibling lessons
   ├─ design/                      future visual decisions
   ├─ engineering/                 future implementation detail owned by topic
   ├─ operations/                  future setup/release evidence
   ├─ validation/                  future actual check records
   └─ commit-plans/                future file allocations when needed
```

There is deliberately no ticket directory/queue in this baseline. Add tickets only when the owner requests that next step. Do not convert the implementation sequence below into numbered task packets now.

### 18.2 Ownership rules

| Module | Owns | Must not own |
| --- | --- | --- |
| `contracts` | Cross-boundary schemas, IDs, error envelopes, capability/limit contracts | React state, storage, fixtures, environment, provider SDKs |
| `commerce` | Money parsing, event/stock invariants, commands, scenario validation, metric facts | HTTP, providers, browser APIs, environment or page state |
| Frontend session | Runtime state, legal stages, persistence, cleanup and request fencing | New alternative financial formulas |
| Frontend feature | Its UI, view-specific effects and projections | Another feature's canonical store |
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

Cap the serialized canonical commerce graph at 384 KiB, excluding photo bytes, browser cache/runtime data and conversations. Validate this bound when publishing or applying a command; a rejected mutation preserves the previous graph. This leaves room for a complete graph, bounded recent chat and transport metadata inside the 512 KiB assistant request. The larger 2 MiB persistence envelope also includes finalized histories/preferences; it is not permission to send an oversized API body.

IDs are application-assigned and stable, not model-generated arbitrary strings. Treat model image references as references into the supplied manifest and map them to validated application IDs.

Request/result schemas carry `schemaVersion`, `workspaceId`, `operationId`, relevant revisions and mode. Public errors contain a fixed code, source-controlled visitor message, safe request reference and retry category. They never include raw provider exceptions.

### 19.2 Proposed API surface

Browser URLs use `/api/retailor/v1/...`; the bridge forwards only the corresponding fixed backend `/v1/...` path.

| Method/path | Purpose | Paid operation |
| --- | --- | --- |
| `GET /v1/health` | Process liveness and safe revision | None |
| `GET /v1/ready` | Selected runtime prerequisites are valid | None |
| `GET /v1/config` | Safe capabilities, supported limits and mode | None |
| `GET /v1/sample` | Versioned prepared catalogue manifest/output | None |
| `POST /v1/admission` | Verify challenge and bind one exact action grant | None to AI; challenge verification occurs |
| `POST /v1/catalogue/interpret` | Inspected derivatives → validated catalogue draft | One bounded vision request |
| `POST /v1/assistant/shopper` | Validated context → grounded shopping reply/proposal | Bounded assistant turn |
| `POST /v1/assistant/owner` | Validated graph/scope → grounded owner reply/draft | Bounded assistant turn |

Order placement, stock changes, catalogue edits and exports are local pure commands. They do not need fake CRUD backend routes because no hosted business-state persistence exists. If a future production backend becomes authoritative, promote those commands to a separate real API deliberately.

There is no arbitrary image fetch, public upload URL, general proxy, polling job endpoint, export storage or model-selected HTTP route.

### 19.3 Admission request

The admission request contains a challenge proof, action type, bounded workspace identity, operation ID, consent/disclosure version and digest of the exact canonical action manifest. For catalogue processing, bind image derivative hashes/counts/sizes and mode. For chat, bind role, current graph/scope revision and the bounded prompt/context digest.

Grant state is short-lived and single-use. A changed selection, prompt, role or graph cannot reuse a previous approval. Browser claims do not define token validity or cost allowance. Full validation and actual byte/hash reconciliation still occur at execution.

### 19.4 Recognition transport

Use bounded multipart with named manifest and derivative parts. Cap metadata separately and aggregate bytes while reading. Do not rely on Next Server Action defaults or a global JSON parser for image payloads.

The frontend bridge streams within an independently enforced byte/deadline envelope. The backend revalidates and reencodes images before provider dispatch. Proposed transport cap is 11 MiB for the 10 MiB derivative envelope plus metadata/overhead; reject a manifest/body mismatch.

The bridge must not buffer several unbounded copies. Account for provider Base64 expansion, decoded pixels and worker memory when setting hosted capacity.

### 19.5 Assistant transport

Use bounded JSON, proposed at 512 KiB maximum including the normalized graph and recent messages. Backend validation rejects dangling references, invalid money/stock relationships and excessive arrays before any model request.

The model does not receive the raw complete JSON graph. Backend context builders and read-only tools project relevant validated products/facts/records into a smaller token-bounded context. Preserve referenced evidence and drop whole older messages or irrelevant records deliberately; never truncate a record mid-field or replace missing facts with guesses.

Responses include finalized text, validated references and optional inert proposal data. No executable callback or HTML is returned. Partial text is not treated as a completed proposal. A fully buffered first implementation is acceptable; streaming can be added only with the same bounded lifecycle and final-schema authority.

### 19.6 Health, readiness and capability

An alive process may still have live AI unavailable. `/health` answers whether the service is running. `/ready` describes whether the configured selected runtime can serve its intended mode. `/config` exposes safe feature-level availability and reason codes.

Derive capability from composed adapters and prerequisites, not a separate frontend switch. A backend marked live that lacks a key, challenge setup, grant secret or approved acceptance returns unavailable and never silently falls back to fake.

Prepared sample availability can remain true independently of paid mode. The UI can always explain which supported route is usable.

### 19.7 Error mapping

| Category | HTTP direction | Visitor behavior |
| --- | --- | --- |
| Invalid schema/input | 400 or 422 | Identify the affected selection/field and preserve valid work |
| Too much input | 413 | Explain the concrete image/count/byte limit |
| Expired/replayed grant | 403 | Obtain fresh deliberate approval; no auto-dispatch |
| Stale context/proposal | 409 | Refresh/review current state |
| Rate/capacity rejection | 429 | Keep work and show bounded wait/retry guidance |
| Live capability unavailable | 503 | Offer prepared sample or supported local actions |
| Provider refusal/failure | Safe 502/503 category | Preserve inputs; explain the result could not be completed |
| Deadline/interrupted outcome | 504 or abort category | Preserve work; no automatic paid retry |

Public status/messages are stable product copy. Private logs retain only allow-listed categories and request references.

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

Define product-facing ports such as `interpretCatalogue(input, signal)` and `answerAssistantTurn(role, context, signal)`. Adapters return validated domain-facing results and safe usage metadata.

Fake providers are deterministic for declared fixtures and failure scenarios. Live providers satisfy the same contract. The default test/dev composition replaces inherited live flags before imports and denies external networking. No module should opportunistically read a developer's ignored secret file.

Prepared samples are asset-linked authored product data. Tests keep independent expected results. Unknown uploads cannot be routed through a known sample answer merely because a filename matches.

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

Do not retain full recognition output in a server session cache just to offer idempotent retries. The browser keeps received results; the backend keeps only bounded content-free replay/usage status. A new retry needs a new approval and operation ID.

### 20.6 Evaluation set

Use owned/licensed images covering:

- Multiple views of one garment and two genuinely different similar garments.
- Same style in different colours and ambiguous colour/style grouping.
- Tops, shirts, trousers, jackets/suits, dresses/skirts and accessories.
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
| Backend mode | `FAKE_MODE=true`, `PAID_DEMO_ENABLED=false` | Committed defaults; master paid-off wins |
| Backend provider | `OPENAI_API_KEY`, selected reviewed model policy | Secret key backend only; models must be allow-listed |
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

`dev:backend` and `dev:frontend` run in separate terminals and build shared packages first. Proposed local ports are frontend `127.0.0.1:3000` and backend `127.0.0.1:4000`, matching the siblings. These scripts do not exist yet and are not commands to run in the current documentation-only repository.

### 21.4 Process hygiene

Reuse a healthy matching local service. Before restart/stop, identify the owning repository, command line, listener, launcher/watchers and descendants. Never kill all Node processes or an unrelated port owner.

Start the backend first, verify health/readiness/config, then frontend and same-origin calls. A PID is not readiness. Do not silently change ports or overwrite the owner's environment to bypass a conflict. Windows agent-managed background launches should be hidden/detached with content-safe logs and explicit ownership records.

Production builds should use an isolated release context when an active development server would otherwise share build artifacts. Linux packaging must be checked independently of Windows development success.

## 22. Security, admission and privacy

### 22.1 Trust boundaries

Inputs from the browser, image decoder, provider, storage restoration and exported/user text are untrusted. Schema validation is necessary but not sufficient; relationship and economic invariants also matter.

The private backend protects credentials and paid operations. Guest storefront/dashboard views are openly accessible because all their data is temporary simulation. Do not add a pretend owner login or claim client state is secure production inventory.

### 22.2 Exact paid-action admission

Before each live catalogue batch or assistant Send:

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
| Orders | 30 total, including up to 20 seeded and 10 guest orders |
| Bag | 8 lines, 5 units/line |
| Return/refund/movement records | Bounded schema arrays; proposed 60 returns, 60 refunds and 256 movements |
| Command receipts | At most 160 bounded receipts; fail clearly at limit, never evict replay protection unsafely |
| Feedback | At most 60 synthetic entries |
| User prompt | 2,000 characters per turn |
| Final assistant text | 4,000 characters per turn |
| Conversation | 40 messages combined; at most 12 recent messages sent per turn |
| Catalogue attempts | At most 2 live attempts/workspace, including visitor-selected retry |
| Live assistant turns | At most 12 combined shopper/owner turns per workspace |
| Catalogue model output | At most 6,000 tokens, subject to measured schema fit |
| Assistant model output | At most 1,500 tokens/request and bounded final text |
| Assistant model input | At most 12,000 text tokens/request after context projection, including tool history |
| Assistant investigation | At most 3 model requests and 4 aggregate tools/turn |
| Decoding | 10-second owned worker deadline/image, serial within a batch |
| Catalogue operation | 90-second total backend deadline |
| Assistant operation | 60-second total backend deadline |
| Simultaneous paid work | 1/workspace, 2/backend process |
| SDK automatic retries | 0 for paid calls |

The provider subdeadline leaves enough time for validation/result mapping inside the overall route deadline. Frontend bridge and Cloud Run deadlines must exceed the backend envelope with small explicit headroom, not contradict it. Every cap must be enforced before the resource it protects is allocated.

Schema count limits may need adjustment if independent fixtures demonstrate that a valid thirty-order scenario exceeds them. Increase only after measuring projection size and confirming worst-case behavior; do not silently truncate ledger history.

### 23.2 Rate and capacity controls

Use content-free anonymous/source correlation, action-specific burst/rate limits, route-global limits and process-owned capacity. A proposed starting rate is two catalogue admissions per ten minutes and six assistant admissions per minute per safety session/source, with lower global dispatch capacity if needed.

Do not trust arbitrary forwarding headers to identify a source. Document the actual managed proxy chain and validate its behavior. Avoid storing raw IP; use short-lived keyed correlation where justified.

These controls are imperfect under new identities, restarts and multiple instances/revisions. The release record must state that limitation. No database is added solely to promise impossible durable anonymous quotas.

### 23.3 Cost model

Before live enablement, calculate:

```text
catalogue attempt = image-input usage + text input + capped output
assistant turn    = sum of at most 3 model requests over bounded context/output
workspace AI max  = 2 catalogue attempts + 12 bounded assistant turns
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

**A desirable fashion storefront with an understandable operating system behind it.** Retailor should make the goods attractive and the information legible. The platform landing communicates transformation; FORME communicates a clothing collection; the owner view communicates calm operational control.

Reuse brand components and shared tokens across the experience while allowing storefront and dashboard density to differ. Do not copy Retrosum's forest/orange financial brand or ClipBuilder's video identity.

### 24.2 Proposed visual baseline

| Token role | Starting direction |
| --- | --- |
| Canvas | Warm paper/ivory |
| Main text | Deep ink/charcoal |
| Primary action | Restrained cobalt or similarly legible distinct brand accent |
| Secondary surfaces | Soft stone with clear borders |
| Success/attention/error | Semantic muted green/amber/red with text/icon meaning |
| Editorial type | A readable distinctive serif for collection/hero headings |
| Interface type | Clean sans-serif for navigation, controls and dense records |
| Money | Tabular numerals with exact values visible immediately |
| Shape | Moderate consistent radii; editorial imagery can remain square |

The HTML overview uses a provisional editorial interpretation of this direction. It is not visual approval or a complete component style guide. Before broad frontend styling, settle accessible tokens, typography, logo, image mood and representative controls in the normal design work.

Use local/system fonts in the overview and self-host licensed app fonts when selected. Prefer one maintained icon family, consistent semantic meanings and text labels where an icon alone would be ambiguous.

### 24.3 Component foundations

Establish buttons, links, fields, chips, tabs, menus, dialog/drawer, toast/status, product card, source/provenance chip, money display, KPI card, chart target, data table and assistant composer. Extract a shared primitive only when its behavior is actually shared.

Do not implement separate phone/desktop versions of domain interactions. Recompose one semantic system around available space and input method.

### 24.4 Motion contract

Use motion to explain photo grouping, processing completion, alternate views, bag addition, perspective continuity, chart changes and proposal preparation. Animate opacity/transform where possible; values and controls remain immediately readable.

Proposed timings are 150–250 ms for small feedback, 250–400 ms for drawers/view changes and up to 500 ms for a meaningful chart/collection entrance. Do not delay an available action to finish decorative motion.

Retailor follows an accessible reduced-motion alternative: preserve state feedback and clarity while replacing large spatial movement with static or restrained opacity changes. Retrosum's always-running-motion owner instruction is specific to that project and is not imported here.

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

Target WCAG 2.2 AA behavior and contrast for the implemented surfaces. Use semantic landmarks/headings, visible focus, labelled controls, useful alt text and at least 44 × 44 px primary touch targets.

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
| Commerce | Atomic placement, duplicate command, cancellation, shipped/fulfilled, independent return/refund/restock |
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

### 25.3 Manual product matrix

Verify prepared sample and live/unavailable upload entry separately. A useful manual matrix includes:

- One complete sample walkthrough ending in the matching dashboard order/stock evidence.
- A materially different owned/licensed upload collection producing a different catalogue.
- Ambiguous groups, unknown category, missing alternate and unreadable label.
- Delivered-budget assistance, product comparison and out-of-stock recovery.
- Catalogue correction without another model call.
- Duplicate order click, stale bag, cancellation and no extra deduction at fulfilment.
- Physical return with no refund; refund with no return; damaged return with refund but no restock.
- KPI/chart/record drilldown before and after a mutation.
- Refresh at Choose, Catalogue, Storefront, Dashboard and in-flight processing.
- Reset/expiry while a request, dialog or proposal is active.
- Storage denial, missing cached photo and duplicated-tab behavior.
- Keyboard, touch, virtual keyboard, reduced motion, zoom and responsive anchors.
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
| Expensive concurrency | Bridge bounded independently | 2, with serial decoding per batch |
| Cloud request timeout | 120 seconds | 110 seconds |
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

## 27. Implementation sequence without tickets

These phases express dependency order and reviewable outcomes. They are not tickets, estimates or an implementation queue. The owner will request ticket creation separately.

| Phase | Result | Exit evidence |
| --- | --- | --- |
| Product/design foundations | Accepted identity, sample rights/assets, screen hierarchy and scope | Representative landing/catalogue/store/dashboard review |
| Workspace foundation | pnpm apps/packages, strict contracts, side-effect-free startup, fake defaults and boundaries | No-key start, isolated tests and first build |
| Commerce/session foundation | Exact engine, scenario generator, commands, facts, expiry/cache/ownership | Independent reconciliation and lifecycle cases |
| Prepared complete journey | Sample selection → review → storefront → order → matching dashboard | Coherent free walkthrough with source/record drilldown |
| Bounded live catalogue | Image inspection, exact admission, provider draft and optional correction | Actual image evaluations, safe failure and usage evidence |
| Storefront polish | Final images, options, filters, quick view, zoom, bag and responsive motion | Keyboard/touch/device/content checks |
| Owner operations | Orders, fulfilment, independent returns/refunds/restock, inventory and feedback | Cross-view calculations and operations matrix |
| Useful assistants | Grounded shopper/owner replies, reviewed bag/copy proposals and staleness | Deterministic tool/revision checks and bounded live cases |
| Hardening/release candidate | Cleanup, privacy/admission, costs, accessibility, packaging and documentation | Exact candidate root gate and unresolved-check ledger |
| Hosted release | Approved immutable service pair, identity/domain and measured walkthrough | Separate unpaid and authorized live hosted evidence |

Build the entire free prepared story before expanding provider work. Domain/session foundations should precede attractive charts that otherwise have no reliable source. Final photography and visual design are first-class dependencies, not last-minute replacements for placeholders.

Do not leave catalogue recognition as an isolated API demo while the storefront/dashboard use hardcoded unrelated products. The signature flow is complete only when all views consume the same generated catalogue and domain graph.

## 28. Documentation and collaboration practices

### 28.1 Artifact ownership

| Artifact | Ownership |
| --- | --- |
| Root README | Short product story and current documentation/status links |
| This blueprint | Current product, boundaries, architecture, scope and acceptance |
| HTML overview | Concise owner-facing PM summary |
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

Root AGENTS does not exist in this documentation-only repository yet. This blueprint describes the operating approach to encode when initialization is requested; it does not silently install process rules into sibling repositories.

## 29. Decisions to settle during implementation

The baseline makes enough choices to guide implementation. The remaining items do not block writing/reviewing these documents and must not trigger a long questionnaire before useful work.

| Decision | Current position | When to resolve |
| --- | --- | --- |
| Final visual identity/logo/fonts | Proposed editorial Retailor direction; FORME preserved | Before broad UI styling |
| Final product photos | Original/licensed coherent capsule required | Before sample/visual acceptance |
| Exact dependency versions | Same family as Retrosum; verify and pin compatible maintained patches | Workspace initialization |
| Live model IDs/detail settings | Capability/evaluation-based selection; no “latest” alias | Before bounded live evaluation |
| Dollar budget and external controls | No Retailor amount approved or verified | Before paid enablement |
| Exact cloud resources/region | Two-service topology; identifiers not resolved | Release preparation |
| Domain ownership | `tryretailor.com` intended, unconfirmed | Before any domain action/cutover |
| Hosted memory/concurrency | Proposed measured starting envelope | Linux/hosted capacity acceptance |
| Provider handling/account controls | Must be inspected for actual selected project/model | Before public live uploads |
| Chart dependency | Small SVG series proposed | When representative chart requirements are proven |
| Wider store themes/widget customization | Later extension | After the complete first story |

Routine module names, component composition and small visual refinements can be resolved within the accepted scope. A change to privacy, real-commerce authority, persistent storage or public spend requires a concrete separate decision.

## 30. Definition of complete

The **documentation baseline** is complete when the new detailed Markdown and summarized HTML are readable, consistent, linked and traceable to the inspected resources. No tickets or app implementation are required for that deliverable.

The **future demo** is complete only when:

- The landing explains the promise quickly and enters a coherent guest experience.
- Prepared sample and uploaded-image behavior are truthful and distinguishable.
- No mandatory product typing or signup is needed to reach a demo result.
- Actual selected images drive the drafted catalogue and visible storefront.
- Unknown materials/measurements remain unknown; suggested sizes are labelled honestly.
- Final sample photographs, alternate views and rights are accepted.
- The store is attractive and fully usable with keyboard/touch on the declared layouts.
- One reviewed demo order appears in the owner workspace with exact matching totals and stock.
- Cancellation, fulfilment, return, refund and restock reconcile without double application.
- Every significant KPI/chart/observation exposes supporting synthetic records and its basis.
- Assistants use known evidence, compute through the engine and never silently apply changes.
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
| Live AI disabled | Local previews and prepared sample access | Use prepared sample | Fake recognition of uploads |
| Category/group unclear | Source and draft uncertainty | Edit/split/merge or continue visibly unclassified | Unsupported certainty |
| Provider refusal/invalid schema | Inputs and completed earlier work | Bounded deliberate retry/sample | Hidden repair call |
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
| Hosted paid-off | Prepared sample and local domain actions | Continue free demo | Live fallback bypasses switch |

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

Guest order B places one belt at $22 plus $6 delivery and is cancelled while still placed. It contributes gross $22 and a merchandise cancellation reversal of $22; its net merchandise contribution is zero. Its belt stock is restored once. It is excluded from included-order count/AOV. Cancellation also reverses its delivery charge in the separate delivery ledger.

For all events in one period, combined gross merchandise is $130, discounts $10, cancellation reversals $22 and merchandise refunds $49, leaving **$49 net merchandise sales**. Included orders are 1 and AOV is $98. Those figures differ for deliberate, explainable reasons.

If A's $49 refund occurs in a later period with no new orders, that period's net merchandise sales can be **−$49**, while its included-order count is zero and AOV unavailable. The trend must preserve that negative value.

## Appendix C — Public copy and error language

| Situation | Suggested copy |
| --- | --- |
| Main headline | Bring your products. See your store. |
| Entry | Use prepared sample · Upload product photos |
| Live approval | Build my demo store |
| Catalogue | Your catalogue draft is ready. Review it or explore the store. |
| Synthetic banner | Demo prices, availability and store activity. No real payments. |
| Suggested upload sizing | Demo size options — actual sizes are unconfirmed. |
| Unknown composition | Material information is not confirmed. |
| Store switch | Try the dashboard |
| Owner switch | View storefront |
| Order action | Place demo order |
| Owner badge | Synthetic demo activity |
| Unsupported file | This file type is not supported. Choose a JPEG, PNG or WebP image. |
| Too many/large files | Your selection exceeds the demo limit. Remove the highlighted photos and try again. |
| Live unavailable | Live catalogue drafting is unavailable right now. Your previews are kept; you can use the prepared collection. |
| No alternate | This item has one supplied view. Open it to zoom. |
| Stale bag | Price or availability changed. Review the updated bag before placing your demo order. |
| Stale answer | The store changed since this answer. Refresh it to use the current details. |
| Unknown provider outcome | This attempt was interrupted. It may already have been processed. Your photos are kept. |
| Missing cached photo | This photo is no longer available in this browser. Reselect it or start a new demo. |
| Expiry | This temporary demo has ended. Start again with the sample or your photos. |
| Reset | Reset clears this demo's local workspace and stops its pending work. Downloaded exports and completed AI processing cannot be recalled. |

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
