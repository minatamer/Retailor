# Retailor · archived original product concept

> **Superseded concept — 11 October 2026.** Use the [current detailed blueprint](RETAILOR_DEMO_SOURCE_OF_TRUTH.md) and [current visual overview](RETAILOR_OVERVIEW.html). The original exploration below is retained for context and does not define current requirements.
>
> **Current accepted decisions:** clothing only; three complete templates, four themes and three type presets; Tailor-led setup through inline visual CTA cards; optional name/headline/hero and three AI logos after colour/type confirmation; mandatory photos for every product and inline chat uploads; catalogue-linked fictional business records; three profit/break-even/loss scenarios; fifteen sample photo inputs with fresh live drafting; storefront-runway hero with alternatives retained; AI-generated sample photos preferred with stock sourcing researched; English/USD with optional automatic EUR storefront conversion. Owner manual design overrides remain available. [22 implementation tickets are now planned](tickets/README.md); application implementation has not started.

Updated **11 October 2026** to capture the owner's revised **product photos → generated storefront → owner dashboard** flow. This replaces the earlier storefront-first entry point. Selected identity: **Retailor**. Intended domain: **tryretailor.com**, registration unconfirmed. **FORME** is the fictional clothing brand used for the sample route.

Retailor turns a batch of product photos into an attractive, interactive demo store with an AI-drafted catalogue and a connected owner dashboard. A visitor opens the landing page, chooses their own images or the sample clothing collection, lets the agent organize and describe the products, then explores the storefront and synthetic store activity. No product names, descriptions or categories need to be typed before trying it.

The portfolio promise is **“Bring your products. See your store.”** The commercial offer remains a reusable ecommerce frontend/backend that the developer tailors to a client's branding, catalogue and store rules. The generated demo demonstrates the foundation; production checkout, verified merchandise facts and real integrations are separately scoped.

[Open the companion](retailor.html#retailor/landing). It contains a brief product description, numbered flow and interactive concept views. This archived Markdown is historical source material; the current implementation authority is the new blueprint. Job evidence and advertised rates remain in the [Upwork research folder](../../Codex/Upwork%20MCP/retailor-job-research.md), rather than becoming demo content.

- [Agreed product decisions](#agreed-product-decisions)
- [Main visitor flow](#main-visitor-flow-step-by-step)
- [Image recognition and catalogue creation](#image-recognition-and-catalogue-creation)
- [Sizing presets and factual limits](#sizing-presets-and-factual-limits)
- [Storefront and shopping experience](#storefront-and-shopping-experience)
- [Owner dashboard](#owner-dashboard)
- [Synthetic activity and metric definitions](#synthetic-activity-and-metric-definitions)
- [Order return refund and inventory rules](#order-return-refund-and-inventory-rules)
- [Agents and visible useful work](#agents-and-visible-useful-work)
- [Data model](#data-model)
- [Guest architecture and operating limits](#guest-architecture-and-operating-limits)
- [Research and resulting design choices](#research-and-resulting-design-choices)
- [Brand identity](#brand-identity)
- [Build order and acceptance](#build-order-and-acceptance)
- [Current companion coverage](#current-companion-coverage)

## Project references

Three supporting guides are collected in `docs/references`: [ClipBuilder lessons](references/LESSONS_LEARNED_FROM_CLIPBUILDER.md), [ScreenPilot portfolio playbook](references/PORTFOLIO_DEMO_BUILD_PLAYBOOK.md) and [Retrosum lessons and Retailor adaptations](references/LESSONS_LEARNED_FROM_RETROSUM.md). The first two are preserved existing documents; the Retrosum guide summarizes its implemented dashboard, agent, state, calculations and prepared Google Cloud release pattern. They are inspiration for implementation. This specification and the latest Retailor owner decisions govern product scope; sibling settings, budgets and approvals do not transfer.

## Agreed product decisions

- A public **landing page** comes first, following the easy-to-understand portfolio pattern of ClipBuilder, ScreenPilot and the owner's other demos.
- **Try demo** is a separate experience. The visitor either uploads product images or chooses a believable sample clothing collection.
- Start without product-type labels, names, descriptions, size entry or catalogue spreadsheets. The AI prepares the first draft. Optional review/editing must not turn the first visit into a lengthy merchant onboarding form.
- The primary AI capability is **image-to-catalogue-to-storefront**. The outfit/shopping concierge remains a useful secondary capability inside the store.
- Demonstrate a polished ecommerce design: strong imagery, desirable product cards, responsive layouts, smooth interaction and purposeful animation.
- The storefront has a conspicuous **Try the dashboard** navigation action. The dashboard has **View storefront**, preserving the same catalogue and session.
- The owner dashboard shows substantial retail information: sales, orders, ongoing fulfilment, returns, refunds, inventory and customer feedback, with charts and agent observations.
- Dashboard history is deliberately **synthetic**. A generated catalogue is not evidence of real sales, customers, reviews, prices or stock. New guest actions extend the same synthetic workspace.
- One frontend, one private backend, guest use, bounded state and no compulsory authentication. This is not a request to build a multitenant Shopify replacement or administrative onboarding system.
- Reuse lessons from Retrosum: clear financial meaning, period filters, source drilldown, revision handling, useful observations and a coherent choose/process/dashboard progression. Do not copy Retrosum's financial dataset or its distinct branding.

## Main visitor flow, step by step

1. **Understand the offer on the landing page.** Show the short promise, a visual photos-to-store example, and previews of the storefront and owner dashboard. Primary CTA: **Try demo**. No signup, email collection or popup interrupts entry.
2. **Choose an input on the demo page.** Show **Use sample collection** and **Upload product photos** as equally clear paths. The sample gallery shows high-quality front/back, detail and on-model photos in the actual build. Visitors can inspect the sample images before using them. Uploading does not require any product fields.
3. **Let the catalogue agent work.** Identify likely product types, group related photos, choose primary/alternate images, draft names, visible colour/pattern descriptions and concise merchandising copy. Apply category-appropriate size option templates and clearly identified demo prices/stock where actual values were not supplied. Validate the structured result in code.
4. **See the drafted collection.** Show a compact, attractive catalogue preview with generated cards, an image-source link and small provenance markers. The visitor can continue immediately with demo defaults or optionally rename an item, change a category, split/merge photo groups or edit details. Main action: **Open storefront**.
5. **Experience the generated store.** Arrange those products in a considered storefront, with collection hero, filters, product details, alternate imagery, quick view, size options, bag and shopping agent. Place a labelled demo order if desired; no card or real contact information is needed.
6. **Try the owner dashboard.** Use the store's top navigation action. Show the same products with a clearly labelled synthetic history, meaningful KPIs, charts, ongoing orders, returns, refunds, stock and feedback. Inspect supporting records and perform local operations; a new demo purchase appears here.
7. **Take away the story.** Switch freely between storefront and dashboard, optionally export the current demo state and reset. The final impression is that the developer can deliver both a desirable store and a useful operations workspace, including AI-assisted catalogue setup.

The main guided result should be reachable in about five minutes using samples. Branding entry is optional: a visitor may name their demo store or supply a logo later, but neither is required to generate the first result.

### Proposed actual app routes

`/` is the public landing page. `/demo` owns a single guest workspace progressing through **Choose → Process → Catalogue → Storefront / Dashboard**. Frontend tabs/subroutes may reflect view state, but direct visits without a workspace return to Choose with a useful explanation. This does not add a real owner authorization flow.

The companion uses local hash navigation to demonstrate these views; its routes are documentation-preview mechanics, not a prescribed backend architecture.

## Image recognition and catalogue creation

### Inputs and visual organization

Accept a batch of clear product images. Prioritize JPEG, PNG and WebP in the first build. Unsupported formats receive an explicit message; add HEIC only when a tested decoder is available. Preserve the original image for inspection and create bounded derivatives for inference/display. Do not silently send full-resolution originals on every request.

The sample should include shirts/T-shirts, trousers, a jacket or suit item, and accessories. Use original, licensed or explicitly approved assets. Provide authentic product-only, rear/detail and on-model views where available. A simple catalogue demo cannot prove which separate photos depict the same SKU, so AI grouping is a draft with an optional merge/split correction.

Useful recognition stages are **validate images → identify/group items → draft catalogue → apply demo configuration → compose storefront**. Show actual completed stage/status events, input counts and inspectable results. Do not disguise prepared sample output or a progress animation as fresh image analysis.

### What the agent produces without mandatory typing

| Output | Intended behavior | Provenance |
| --- | --- | --- |
| Product category | Identify likely garment/accessory type; flag uncertain classification | AI inference linked to input images |
| Product title | Short, useful, original title such as “Chalk button-front shirt” | Generated copy, editable |
| Visual description | Describe visible colour, pattern, neckline, sleeve length, closure and silhouette when supported | Image observation; uncertainty preserved |
| Marketing copy | Concise benefits grounded in visible/confirmed facts | AI-written draft; no invented performance/material claims |
| Image roles | Suggest primary, alternate, rear, detail and worn-view images | Linked supplied images; role/grouping is reviewable |
| Size options | Choose an appropriate category-specific size template | Suggested demo options; not image-measured stock |
| Price, available quantities | Use explicit synthetic demo defaults if not supplied | Demo configuration, never inferred selling price/stock |
| Measurement/material/care fields | Extract clearly readable label text if present, otherwise keep unknown | Image-label transcription or unknown; no fabricated composition |
| Collection/navigation | Organize categories and choose a coherent layout preset | Validated category data and authored design system |

There should be **no forced typing before the demo can open**. Generate a complete simulated store with honest defaults. A later real-commerce handoff needs confirmed prices, stock, materials, sizing, policies and product imagery; the same “zero initial input” demo flow does not verify those facts.

### Recognition quality and failure states

Detect unreadable/duplicate/unsupported images, mixed products in one image and conflicting views. Keep good items when one fails; show the affected item and an optional correction. If the agent cannot determine the category, use “Unclassified product” with a visible review state rather than inventing a precise garment type.

Do not claim colour precision under unknown lighting, infer authenticity/origin, promise fit, or guarantee composition from texture alone. “Looks woven” is different from “100% cotton.” Do not add a gender/body assumption solely from a garment. Draft typography/layout from authored templates; the AI fills validated content and suggests composition, rather than returning arbitrary executable HTML.

## Sizing presets and factual limits

The desired wow moment includes intelligent **choice of sizing interface**. Recognizing a T-shirt should lead to familiar alpha options; recognizing trousers should lead to appropriate waist/inseam or regional options; suits need a different template. It must not imply that a photo reveals a garment's actual measurements or warehouse quantities.

| Product type | Useful suggested demo template | Fields that remain unconfirmed |
| --- | --- | --- |
| T-shirts and casual tops | S, M, L, XL; XS/XXL where the selected demo preset includes them | Actual availability, chest/length and brand fit |
| Shirts | Alpha sizes or collar/sleeve system when the product/preset supports it | Collar, sleeve and chest measurements |
| Trousers/jeans | Waist/inseam options or US/EU category template | Waist/inseam, brand conversion, intended size system |
| Suits/jackets | Chest-size and length template, with region-specific labels | Actual chest fit, jacket length, trouser pairing and tailoring |
| Dresses/skirts | Selected regional numeric or alpha template | Actual length, waist/hip dimensions and conversion chart |
| Belts/accessories | Appropriate length/one-size preset where reasonable | Actual length and real size range |

US/EU conversions vary with brand, category and the chosen sizing convention. A men's waist-in-inches label and a women's US dress size are not the same system. Store the sizing-system ID, category and provenance. Do not make one universal numeric US↔EU conversion rule.

For a sample garment, author a coherent size chart and annotate it as a sample brand chart, with centimeters/inches and regional labels where useful. For uploads, any preset is labelled **Demo size options** until reviewed; do not invent a measurement chart. A quick nonblocking note can explain that the options are suggested. The store-wide demo banner covers synthetic prices/availability/activity without repeating intrusive warnings on every interaction.

Sizing research supports conventional labels, measurements, regional information and category-specific guides. It also documents brand variation. [Baymard sizing research](https://baymard.com/research-articles/apparel-size-information).

## Storefront and shopping experience

### Visual direction and product confidence

Use one considered fashion collection rather than an unrelated placeholder grid. Prefer generous product photography, restrained editorial type, consistent crops, useful white space and a clear collection story. The final gallery needs images that accurately show colour, cut, construction and drape. Uploaded photographs should drive the generated cards and catalogue, not disappear behind unrelated samples.

The initial design system has authored, tested storefront layouts. AI can group the collection and suggest a palette/hero arrangement; the application places those results inside these dependable components. A small preset switch is optional later. This is a generated **demo store**, not an unbounded website builder or a guaranteed production shop in one click.

### Interactions worth building

- **Alternate image on hover/focus.** Crossfade or lightly flip from product-only to a supplied worn/rear/detail view. Keep a visible image toggle for tap and keyboard. Preserve the selected colour, product and scroll position. Use real alternate assets; if none exist, keep the original and offer zoom.
- **Quick view and image zoom.** Inspect details, alternate views, visible size choices and delivery/returns without losing catalogue filters. Accessible dialogs restore focus and close normally.
- **Useful filtering.** Category, actual selected size availability, primary colour, price and confirmed material; visible removable chips, result count and helpful empty state. Unknown materials do not match a fabricated filter.
- **Grouped colour variants.** One card per product style, swatches with text labels and matching imagery. Avoid filling a catalogue with duplicate listings for each colour.
- **Clear sizing.** Category-appropriate options, a relevant guide and optional measurements where supplied. Keep unavailable options visibly distinct and label generated options as demo suggestions.
- **Persistent bag.** Smooth drawer, explicit quantity/removal controls and total including sample delivery/tax before checkout. No preselected extras.
- **Meaningful motion.** Short image transitions, product reveal, bag feedback, processing-to-store continuity and chart entrances. Motion should support the decision, preserve readable controls and work on touch/keyboard; avoid heavy scroll hijacking and animation that delays action.
- **Shopping concierge.** Ask for occasion, budget, sizes and exclusions; inspect a product-backed outfit board, swap a piece and explicitly approve adding it to the bag.
- **Owner switch.** A clearly styled **Try the dashboard** button in the storefront navigation. It is always discoverable, not buried after checkout.

Do not automatically fabricate on-model photography from a single flat-lay upload. Any future generated worn visualization is an explicitly labelled visualization requiring separate implementation/budget and garment-fidelity review; it is not proof of fit. The first build can deliver the hover feature using curated multi-view samples and supplied upload alternatives.

Avoid newsletter gates, intrusive discount popups, hidden charges, urgency countdowns and unsupported bestseller/review claims. Label synthetic feedback clearly wherever it is displayed. Useful polish helps the shopper inspect the product instead of concealing it.

### Shopper flow after generation

1. Browse the generated collection or apply visible filters.
2. Hover/focus/tap to compare available image views; open quick view for details.
3. Inspect relevant size options and known facts; optionally use the concierge.
4. Select exact demo variants and review the bag and complete sample cost.
5. Confirm **Place demo order** using a seeded delivery identity, without a real card.
6. Use **Try the dashboard** to inspect the corresponding order, sales and stock effects.

## Owner dashboard

### Overview hierarchy inspired by Retrosum

Use Retrosum's useful hierarchy: **period/currency and dataset scope → a few headline KPIs → purpose-driven charts → observations → evidence drawer**. Its current source separates dashboard widgets, chart hit targets and record views; those are useful patterns to adapt, not a reason to merge the products or copy its branding.

The first owner view should feel substantial without displaying dozens of equally loud numbers. Start with four headline cards, then a secondary operations strip. Keep a persistent **Synthetic demo activity** badge and a link explaining the seeded period and the new guest-session events. Use actual code-based totals from those records.

| Area | Content | Useful interaction |
| --- | --- | --- |
| Headline KPIs | Net merchandise sales, included order count, average merchandise order value, orders awaiting fulfilment | Click for contributing order/event records and formula |
| Secondary KPIs | Refund value/orders, physical returned units, open return requests, low-stock variants, average feedback rating/count | Drill into refunds, returns, stock or feedback |
| Sales trend | Merchandise sales and reversals by covered day, with net result | Select a day to inspect source orders/reversals |
| Best-performing products | Units and net merchandise sales by product/variant | Open relevant orders, variants and adjustments |
| Order operations | Placed, shipped, fulfilled and cancelled; ongoing orders and aging where dates support it | Inspect timeline; simulate eligible fulfilment/cancellation |
| Returns/refunds | Requested/received returns, reason, refund amount/status and restock decision | Separate receipt, refund and inventory controls |
| Inventory | Opening quantity, movements, availability and low-stock sizes/colours | Inspect order/return movement evidence |
| Feedback | Rating distribution, comments, product references and recurring themes | Filter by product/theme; show supporting comments |
| Owner agent | Current-state stock/return/feedback observations and a data copilot | Ask a question, inspect evidence, propose a reviewed local change |

### Dashboard sections

**Overview** contains KPIs, charts and the most useful observations. **Orders** handles order details, pending work and local operations. **Returns & refunds** separates physical logistics from money adjustments. **Products & stock** connects the generated catalogue to variants and movements. **Feedback** shows clearly synthetic customer examples and product-specific themes. These are tabs of one small owner workspace, not separate administrative systems.

Prioritize stock, fulfilment, refunds/returns and feedback themes the supplied data supports. Conversion rate, abandoned carts, CAC, ROAS, gross margin and forecasts need explicit session/ad/cost/time-series fixtures. Do not infer them from product photos or orders alone. They can be added later with visible synthetic source inputs and definitions; they are not mandatory headline cards in the first version.

### Owner flow, step by step

1. Open the dashboard from the storefront navbar; confirm the same collection and visible sample scope.
2. Understand the headline KPIs, compare the supplied days and open their records.
3. Inspect the guest's new order in ongoing orders and the corresponding stock movement.
4. Fulfil or cancel an eligible local demo order; see its effects once.
5. Inspect a seeded return, receive/restock it where appropriate and separately simulate a refund.
6. Review product feedback and agent observations with supporting order/comment references.
7. Return to the storefront, export the current demo state or reset the workspace.

## Synthetic activity and metric definitions

### Honest histories for samples and uploads

The uploaded products can have a **simulated store scenario** so the dashboard remains meaningful. The agent/application does not claim to recover past sales from images. Seed bounded, internally consistent orders, return requests, refunds, inventory movements and customer feedback referencing that generated catalogue. Clearly distinguish **seeded scenario** from **guest action** in record details.

Use a reproducible fixture generator, not disconnected random numbers on cards. Every chart and insight reads that state. Changing the catalogue must rebuild or explicitly remap the synthetic scenario; old IDs, feedback and sales cannot silently attach to unrelated new products. Reset replaces the current workspace and clears guest actions.

### Definitions for this simplified demo

These are explicit Retailor demo definitions, inspired by commerce reporting. They do not claim to reproduce every Shopify report behavior.

| Metric | Formula / basis |
| --- | --- |
| Gross merchandise sales | Sum original merchandise line prices × quantities for the supplied orders, before discount/reversal; cancelled order gross has a matching cancellation reversal |
| Discounts | Sum explicit supplied line/order discount amounts; zero when absent in the fixture |
| Merchandise reversals | Cancellation adjustments plus issued merchandise refunds, each represented once; receiving a returned parcel alone does not create another reversal |
| Net merchandise sales | Gross merchandise sales − discounts − merchandise reversals; delivery/tax shown separately |
| Included orders | Count non-cancelled orders in the displayed order scope; refunded orders remain orders |
| Average merchandise order value | Non-cancelled merchandise value after discounts and before refunds ÷ included order count; unknown/empty is shown as unavailable, not a divide-by-zero result |
| Awaiting fulfilment | Non-cancelled orders still in Placed status; shipped/fulfilled are distinct |
| Refund value / refunded orders | Issued refund amounts / distinct orders with issued refunds; a refund may exist without a physical return |
| Returned units | Units physically received as returns; requested or approved-but-not-received items do not count |
| Open return requests | Requested/approved returns not yet received/closed |
| Available stock | Opening units − placed order quantities + cancelled quantities restored + inspected return quantities restocked; each movement applied once |
| Average rating | Sum seeded feedback ratings ÷ feedback count, accompanied by count and synthetic provenance |

Trend charts use event dates: original sales on order date, cancellations/refunds on their event date. A future period filter must declare whether its order counts/AOV use order dates while reversal amounts use adjustment dates; do not silently mix bases. The companion initially shows one fixed six-day scenario plus guest actions on the final day.

Shopify documents a gross/discount/reversal/net distinction and distinguishes physical returns from broader sales reversals. We adapt those concepts explicitly for this small demo. [Sales reports](https://help.shopify.com/en/manual/reports-and-analytics/shopify-reports/report-types/default-reports/sales-report), [Order reports](https://help.shopify.com/en/manual/reports-and-analytics/shopify-reports/report-types/default-reports/order-reports).

## Order return refund and inventory rules

An accepted order command validates variant IDs, quantity bounds, current stock, price/policy totals and revision, then creates one order and stock deductions exactly once. A bag is not a reservation. Use stable command IDs; retrying returns the previous result instead of charging/deducting again. No negative stock.

Fulfilment and financial status are separate. Moving a placed order to shipped/fulfilled does not deduct inventory again. Eligible cancellation before fulfilment creates one merchandise reversal and restores its units once. A cancelled order cannot subsequently be fulfilled or cancelled again.

A return request records line IDs, quantity and reason. Approval/requesting alone does not restore stock or prove a refund. Receipt records physical units; only an inspected/restockable item restores inventory. A refund is a separate bounded adjustment, limited to the remaining refundable amount and quantities. It may be issued without restock. Do not count the same returned-and-refunded item as two financial reversals.

Every local operation increments the workspace revision. Old catalogue-dependent proposals and owner-agent observations become stale and require refresh. Prices on placed order lines are immutable snapshots; a later product edit does not rewrite that historical sale.

No real payment, bank refund, delivery, supplier order, campaign or customer message occurs in the demo. Buttons use explicit local/demo labels. The owner dashboard is accessible as a guest demo perspective; production permissions are separate implementation work.

## Agents and visible useful work

### Catalogue agent: the primary feature

Recognize/group image inputs, create structured catalogue drafts, choose category-specific demo option schemas and compose a polished authored storefront layout. Each field retains observed/generated/default/unknown provenance. It can propose a correction, not override schema/domain validation. Useful visible results are the generated product cards, grouped images, category navigation and storefront preview.

### Shopping concierge: a feature inside the generated store

The shopper asks for an occasion, budget, sizes and exclusions. The agent searches known catalogue IDs, reads variant availability, proposes an outfit board and explains visible/confirmed product facts. Code checks totals and stock. The user can swap a piece and explicitly approve the bag.

Retain the sample example: shirt $54 + trousers $68 + belt $22 = $144 merchandise; $6 demo delivery and $0 simulated tax produce **$150 delivered**. A $38 tee alternative produces **$134 delivered**. These are sample fixtures, not image-inferred prices. In a generated upload store, the concierge uses its current explicitly synthetic prices and options.

Supported tools: search catalogue; inspect images/facts; read variant availability; assemble a constrained look; propose a swap; prepare a reviewed cart; explain approved policies. No invented products, hidden bag changes, guaranteed fit or fabricated stock. Unknown material cannot satisfy a “no wool” request as though confirmed; either use confirmed sample facts or explain the unresolved constraint.

### Owner agent: explain the store and help review

Examples: “What needs attention?”, “Which product has return issues?”, “Why did stock change?”, “Summarize feedback on this item.” Query the current known orders, movements, return/refund events and comments; cite their IDs and period. Distinguish a factual observation from a suggestion to inspect data. Do not claim that changing copy or a price will guarantee higher sales.

A later useful extension can draft improved catalogue copy from confirmed facts or propose dashboard widgets/charts, using Retrosum's evidence/preview/confirmation pattern. Reviewed publication affects only the guest session. The agent does not independently change real prices, spend money, order inventory or message customers.

## Data model

| Entity | Required content |
| --- | --- |
| Input image | Stable ID, original/derivative references, file type/dimensions, local preview, proposed role and item-group association |
| Product draft | ID, source image IDs, category, title, visible attributes, generated copy, unresolved fields, field provenance and optional edits |
| Product / variant | Product ID, variant ID/SKU, image roles, sizing-system ID, colour/size labels, currency/price, availability and confirmed vs synthetic fields |
| Brand/layout | Merchant name, authored theme preset, palette/type/hero configuration, imagery and navigation; no compulsory branding form |
| Policy | Delivery, simulated tax, returns wording, currency and version, with fixture provenance |
| Bag / proposal | Exact variants/quantities, requested constraints, price breakdown and source revision; explicit confirmation required |
| Order / line | ID, command ID, origin, dates, fulfilment/cancellation state, immutable selected-product/price snapshots and totals |
| Refund / reversal | ID, order/line, bounded quantity/amount, reason, event date and command ID; separates refunds from cancellation adjustments |
| Return | ID, order/line, quantity, reason, request/receipt state, restock decision and dates |
| Stock movement | ID, variant, signed units, reason, source order/return/command and date |
| Feedback | ID, synthetic/guest origin, product/order references, rating, comment, topic tags and date |
| Insight | ID, source revision/period, supporting record IDs, observation, bounded proposed review and stale state |
| Workspace | Input route, catalogue/drafts, synthetic fixture version, revision, current views/filters, bag, orders/events, pending proposals and cleanup boundary |

Use exact bounded integer minor currency units for monetary calculations, including discounts, refunds, reversals and totals. All views and exports use the same domain calculation functions. Model output is untrusted structured data, not executable HTML or action authority.

## Guest architecture and operating limits

One frontend and one private backend, with shared validated schemas and domain functions. No hosted database, persistent uploaded-file library, durable agent scheduler, real checkout, tenant administration or visitor account is required for the first portfolio build. Provider credentials stay backend-only.

Proposed initial upload caps: **36 images, 12 MB per image and 120 MB per batch**, at most **18 products and 144 demo variants** after grouping. Validate decoded pixel bounds, MIME/signature, allowed formats and orientation. Model derivatives have a bounded long edge (initial proposal 1920 px), while original detail remains inspectable locally. These are design targets to test against the chosen vision provider and browser memory budget, not proven limits.

A guest session is bounded to **30 order records, 8 bag lines, 5 units per line** and a finite fixture history. Sample mode requires no paid call. Live catalogue extraction batches a bounded set of images and uses bounded structured output/tool calls; do not reanalyze the whole batch for every UI edit. Shopping/owner agents share revision-scoped context and bounded deliberate turns. Enable any live paid provider only with an explicit owner budget and backend spend/concurrency/timeout gates.

Separate **prepared sample output**, **real code-based local operations** and **live multimodal inference** in UI and evidence. Arbitrary uploads must not be relabelled as recognized by a stored sample answer. An unsupported provider path retains previews and explains what can be tried. Browser-local input alone does not mean enabled provider processing stays on the device.

Uploads are guest data; validate filenames/content, minimize logging and use isolated temporary backend paths only when necessary. Abort owned work and revoke previews on reset/expiry. Do not retain visitor photos as a public gallery or training collection. Explain the actual provider/handling before live transfer. Exports include current metadata/state, not original uploaded image bytes by default.

## Research and resulting design choices

Research refreshed **11 October 2026**. Reddit discussions are qualitative reports from particular communities, not a representative survey or measured conversion experiment. The implementation choices below are our design conclusions. No paid research, image service or model call was used for this revision.

| Source / signal | Retailor decision |
| --- | --- |
| [2026 clothing-site frustrations](https://www.reddit.com/r/womensfashion/comments/1si9kl3/is_it_just_me_or_are_some_clothing_websites_so/): people describe unclear styled photos, missing views, popup interruptions and repeated colour listings | Show accurate multi-view images, keep the product visible, group variants and avoid obstructive marketing popups |
| [Shopping filter discussion](https://www.reddit.com/r/AusFemaleFashion/comments/1puhd9u/filters_for_online_shopping_what_are_the_filters/): participants value useful size, primary colour and material filters | Match filters to actual product/variant facts and preserve multiple visible selections; unknown material remains unknown |
| [Customer-photo discussion](https://www.reddit.com/r/femalefashionadvice/comments/nw0lmp/): shoppers value seeing garments on different real people | Prioritize supplied worn views and useful fit context; future photo reviews need authentic/licensed or conspicuously synthetic examples |
| [Baymard image-resolution/zoom research](https://baymard.com/research-articles/ensure-sufficient-image-resolution-and-zoom) | Preserve useful image detail and make zoom easy rather than relying on decorative card animation |
| [Baymard apparel sizing](https://baymard.com/research-articles/apparel-size-information) | Use relevant size schemas, measurement units and brand/category-specific guides; distinguish suggested templates from confirmed measurements |
| [Shopify sales reporting](https://help.shopify.com/en/manual/reports-and-analytics/shopify-reports/report-types/default-reports/sales-report) and [order reporting](https://help.shopify.com/en/manual/reports-and-analytics/shopify-reports/report-types/default-reports/order-reports) | Make metric formulas visible and keep physical returns, issued refunds, cancellation reversals and fulfilment separate |
| [Shopify storefront filters](https://help.shopify.com/en/manual/online-store/storefront-search/search-and-discovery-filters), retained earlier reference | Use meaningful typed attributes and availability rather than arbitrary tags |

Earlier references such as COS/UNIQLO supplied collection/navigation inspiration; create original art direction and assets rather than copying their identity or proprietary work. This research supports purchase confidence and inspectable operations, not a promise of improved conversion.

## Brand identity

**Retail + tailor** expresses the complete commerce foundation adapted to a client's identity. Retailor names the product; FORME remains the fictional sample clothing company. Working descriptor: **AI-assisted ecommerce demo and brandable starter**. New flow line: **Bring your products. See your store.** Existing commercial line: **Retail, tailored to your brand.** Exact marketing copy remains editable.

The user selected Retailor and **tryretailor.com** on **3 October 2026**. The last recorded Cloudflare offer was **20:31:06 Cairo / 17:31:06 UTC** that day, showing $10.46 registration and $10.46 yearly renewal. No domain lookup/purchase occurred during this revision and registration remains unconfirmed. [Registrar](https://www.cloudflare.com/domains/search?q=tryretailor.com), [Dated observation](../../Codex/Upwork%20MCP/commerce-pun-domain-checks-2026-10-03.json).

Use a distinct Retailor/fashion identity. Retrosum's forest/ivory financial brand is not Retailor's mandatory theme. Decide one cohesive capsule moodboard covering landing, sample gallery, upload/process, generated catalogue, storefront, product detail, bag and dashboard. The sample assets should show consistent colour/construction across product-only and worn views.

## Build order and acceptance

1. **Design the complete image-to-store story.** Landing, image choice/preview, processing, catalogue draft, storefront and owner switch. Establish original sample assets and the fashion design system first.
2. **Build the shared domain state and fixture generator.** Typed products/variants, integer-money calculations, orders, separate return/refund events, inventory, feedback and one revision. Add the seeded dashboard before claiming image-derived business history.
3. **Implement multimodal catalogue drafting.** A clearly prepared sample route first, then a bounded live backend adapter with approved spend. Validate field provenance, grouping and category size templates.
4. **Polish the generated storefront.** Alternate-image/tap behavior, quick view/zoom, useful filters, product detail, bag and demo checkout. Keep a top-level dashboard action.
5. **Complete the owner experience and agents.** KPI/chart evidence, order/return/refund operations, feedback themes, shopping concierge and owner copilot. Add reviewed catalogue/widget changes only after the core flow works.
6. **Verify the connected guest experience.** Both routes, partial recognition failures, price/stock rules, reversals, stale outputs, reset/export, keyboard/touch, narrow screens, image loading and animation behavior.

Acceptance must prove that no mandatory typing is needed to reach a demo result; uploaded images actually drive the resulting catalogue; prepared/sample and live behavior are distinguished; category size presets are appropriate but not false measurements; a missing alternate image never turns into a fabricated photograph; seeded analytics are clearly synthetic and reconcile; a guest order updates both views; returns/refunds/cancellations do not double-count or restock twice; stale proposals cannot be approved; and reset cleans the old workspace.

Use an evaluation set containing multiple views of one garment, similar garments in different colours, trousers, shirts, suit items, accessories, unreadable labels, conflicting photos and unknown categories. Include ambiguous grouping and US/EU sizing-system cases. Measure recognized attributes and unsupported claims, not just visual appeal. Final photo/recognition/live-provider acceptance remains separate from the concept preview.

## Current companion coverage

The revised companion previews **Landing → Try demo → Catalogue → Storefront → Owner dashboard**, with sample intake, local image upload previews, generated sample cards, alternate illustrated views, quick view, bag/checkout, a shopper outfit example, owner KPI/charts, orders, returns/refunds, inventory, feedback, code-derived observations, JSON export and reset.

It is still a self-contained documentation preview. Its sample catalogue interpretation is prepared, and its uploaded-image route uses honest unprocessed placeholders to demonstrate layout; it does **not** recognize arbitrary images or call a vision API. SVG product/worn illustrations stand in for future high-quality photographs. The actual app still needs the backend, tested live catalogue agent, final assets, complete product/sizing/policy content and the supported richer agent conversations. Current local interactions demonstrate the story without paid calls or real commerce.
