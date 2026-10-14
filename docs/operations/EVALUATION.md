# Retailor controlled evaluation

RTL-020 prepares local evaluation; it does **not** authorize provider spend or public release. Default development, tests and these preparation commands remain paid-off. Live catalogue/text/logo acceptance, account access and provider retention/budget evidence are pending. Fixed public FX verification is separate and sends no visitor data.

## Commands and candidate freeze

**Current sample/evidence seam — RTL-051:** Preparation and guarded fixture input now decode19 exact fixed public photos (F01–19),15 original garments, including three alternate views and one fictional black colourway. Current prompt is catalogue-evidence-v2. Historical fifteen/eighteen-photo captures below retain their actual dates/builds. Before live acceptance, evaluate supported same construction/different angles, supported colourways with complete disjoint actual-photo mappings, merely similar cuts that must stay separate, ambiguous/multi-garment/non-clothing sources and embedded instruction attempts. Inspect resulting draft/colour labels/size×colour stock and selected bag/order photo; strict mock output is not a semantic accuracy score. No paid/live evaluation is authorized or executed by this update. [Current local validation](../validation/RTL-051.md).

From the repository root with pinned Node 24/pnpm:

```powershell
pnpm evaluate:prepare
pnpm evaluate:fixture
pnpm evaluate:fx
```

Prepare decodes the fifteen fixed public WebP files, checks their exact public manifest hashes/dimensions/bytes/order, hashes five WOFF2 fonts, provenance and the dependency lock, then prints the actual model/prompt/limit inventory and Git candidate. `worktreeDirty` is explicit. No guest filepath or environment secret is read. Fixture uses production HTTP origin/admission/multipart/image/reconciliation, assistant validation/tools and logo decoding with **declared injected fixtures**, not an unrestricted provider test client. Its live-shaped recognition envelope tests the protocol only; the emitted verdict is `fixture-only-pass`, live acceptance remains pending and usage/cost are null.

Root tools import narrow public workspace subpaths and run through the existing backend's pinned tsx. They do not need a terminal TypeScript install or stale compiled backend tests. The two workspace links introduce no external package. Ordinary tests deny external networking; the fixture command additionally denies external fetch and never instantiates a live provider from inherited keys.

For clean JSON rather than package-script progress output, build shared packages first, then:

```powershell
pnpm --filter @retailor/backend exec tsx ../../scripts/evaluate/run.mjs --plan
pnpm --filter @retailor/backend exec tsx ../../scripts/evaluate/run.mjs --fixture
```

`--live` deliberately refuses to perform paid work. `--record <path>` accepts one regular UTF-8 JSON file, at most 16 KiB before allocation/parsing, with strict allow-listed evidence fields. It rejects unknown content fields, secret-like request IDs and excessive values. A supplied owner record is an assertion to review, not automatic model or release approval.

## Exact provisional live sequence

Use the real `/demo` page, current catalogue/graph, normal source disclosure, actual challenge and each exact action grant. Complete all free/manual checks before adding a paid turn. Do not post directly to OpenAI, swap challenge verification, bypass admission/request limits or infer paid permission from a ticket/plan file.

| Case                       | Deliberate operation                                                       | Required inspection                                                                                                                                                                                          |
| -------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `catalogue_sample`         | One live batch of all fifteen accepted sample photos                       | Actual bytes reach fresh recognition; every source has a disposition; categories/grouping/copy are useful and uncertainty remains reviewable. No filename lookup supplies a public catalogue.                |
| `catalogue_upload_subset`  | One real picker batch of F02, F09 and F15, rather than the sample shortcut | Three actual clothing files use the same path. Inspect independent source associations and reviewed defaults. This is a different input collection, **not** an independent photography/accuracy dataset.     |
| `shopper_category`         | One typed request for current jeans                                        | Known filter applies immediately and references current available products. No order or owner mutation.                                                                                                      |
| `shopper_eur_budget`       | One typed € budget after accepting a real dated quote                      | Matches compare exact displayed EUR unit prices; source/date and delivery/bag semantics stay consistent. No invented rate.                                                                                   |
| `shopper_unknown_material` | One question about cotton/fit for unconfirmed items                        | Unknown stays unknown; no inferred composition or guaranteed body fit.                                                                                                                                       |
| `creator_summary`          | One current collection/design explanation                                  | Uses accepted products and choices; no manufactured sales/history or hidden logo dispatch.                                                                                                                   |
| `owner_loss_summary`       | One heavy-loss/selected-period explanation                                 | Names the synthetic scenario, scope and signed result; opens exact fact contributors, without causal sales claims.                                                                                           |
| `owner_photo_form`         | One request to create a product                                            | Opens an inert editable form. Native photo upload is mandatory; dirty-field/stale-result fences and explicit exact confirmation remain. Follow-up form filling/CRUD is local and free.                       |
| `shopper_unsupported_tour` | One unsupported owner/destructive request plus request for a tour          | Shopper cannot change products/finance; any permitted tour uses registered targets and does not execute commands.                                                                                            |
| `logos_optional`           | One optional explicit three-image batch after confirmed colour/type/name   | Inspect exact context, all three decoded transparent candidates, spelling/header legibility, wordmark skip/failure and no automatic regeneration. Currently blocked by missing account/output-cost envelope. |

Maximum: **2 catalogue batches, 7 text turns, 1 image batch, 3 logo outputs**. A text turn may use at most three model requests and four aggregate read tools; therefore the maximum is **24 provider requests** including the image batch, or 23 without logos. No automatic SDK/repair retry, extra “try again”, recurring evaluation or broad model benchmark is authorized. The separate three-file batch is the second catalogue attempt, not a free retry allowance.

Additional grouping/label/lighting/mixed-item/non-clothing and independent upload material remains a named acceptance limit. The shipped single-view corpus cannot establish all of those cases. Future expansion needs suitable owned/approved photos and a new concrete bounded case plan; do not fabricate a universal accuracy score. Adversarial product descriptions, stale proposals, photo witness failure, role restrictions, return/refund/restock and absent comparisons have deterministic owning checks; actual model resistance must still be inspected in authorized live output.

## Models, allowance and stop conditions

The plan imports actual source policy: catalogue and assistant **`gpt-6-luna`**, prompt versions `catalogue-evidence-v1` / `tailor-grounded-v1`; optional **`gpt-image-2.5-flare-2026-09-08`**, `clothing-brand-v1` / `transparent-png-v1`. These are provisional configured models, not verified account capability or quality recommendations. Responses use foreground `store:false`, default processing tier and zero SDK retries. Image generation is exactly n=3, 1024 square, medium quality, transparent PNG, foreground/nonstreamed.

RTL-024 removes the process dollar allowance and evaluation reservation metadata. The fixed plan still permits two catalogue batches, seven text turns and one optional three-logo batch, with exact case approval, bounded provider request counts, expiry and stop-on-unknown/failure. Source limits allow 24,000 aggregate catalogue output tokens and 31,500 text output tokens; text input is bounded at 12,000 tokens/request. Actual vision usage and the image-output envelope remain unmeasured.

The [provider policy](PROVIDERS.md) records the official price basis checked 13 October. At its short-context standard Luna prices, the text plan's 252,000 input-token upper bound and 31,500 output-token bound correspond to $0.04095; the catalogue's output component alone is $0.012. Those are component estimates from bounded tokens, excluding unmeasured vision input and logo generation, account adjustments and hosting. They are not the full evaluation budget or a measured bill. [Official pricing](https://developers.openai.com/api/docs/pricing), [Flare model](https://developers.openai.com/api/docs/models/gpt-image-2.5-flare).

Before any paid run the owner must identify the account/project, verify model/endpoint/tier access and retention policy, privately configure keys/challenge/grant secret, choose actual enforced spending limits and approve the exact cases. Optional logos additionally require a concrete accepted output/cost envelope; there are no logo policy environment flags. `store:false` does not promise zero provider retention. Account, aggregate usage/billing, unknown outcomes and platform costs need their own evidence.

Stop on model/tier/billing/retention mismatch, refusal or unexpected output, exceeded allowance/case count, invalid associations, missing usage, cancelled/unknown outcome, stale context, bad quote or a validation error. Preserve inputs and existing local controls. Unknown dispatch may have incurred an actual provider charge. No automatic fake fallback or unapproved repeated live case. Price/model/SDK policy changes require a newly frozen plan and review.

## Operator capture — prepared, never started here

The local capture observer wraps the existing runtime/provider ports and keeps the actual challenge/grants/image/tool validators. It records only candidate, fixed case, safe app/provider request IDs, duration, status/category, counts and aggregate tokens. It neither stores nor prints prompts, replies, graph fields, photos/Base64, filenames, cookie/grant/challenge tokens, key values or raw exceptions. SDK logging is explicitly off in the existing clients. HTTP success is emitted as **unknown semantic acceptance** until actual human inspection; measured cost remains null until actual billing evidence exists.

`--capture <authorization-file>` is a separately explicit operator startup. Before loading the normal backend-local environment it requires a clean exact Git candidate, matching plan digest, unique allowed cases, finite allowance, current at-most-two-hour window, actual owner approval and account/retention verification. Logos also require their verified envelope assertion. Those assertions must reflect a real trusted owner decision; the file itself cannot supply permission to this agent.

An operator authorization has these fields; the deliberately unapproved example cannot start capture:

```json
{
  "schemaVersion": 1,
  "approvalId": "00000000-0000-4000-8000-000000000000",
  "candidate": "REPLACE_WITH_EXACT_CLEAN_GIT_SHA",
  "planDigest": "REPLACE_WITH_PREPARE_PLAN_DIGEST",
  "ownerApproved": false,
  "accountAndRetentionVerified": false,
  "expiresAt": "REPLACE_WITH_APPROVED_WINDOW",
  "logoOutputEnvelopeVerified": false,
  "caseIds": []
}
```

After separate real authorization, keep this file and capture output in ignored local artifacts. Configure local live backend and frontend through their normal app-local files; the ordinary fake dev launcher is not a live evaluation environment. Capture requires backend development/test local mode, port **4311**, exact frontend origin **http://127.0.0.1:4310**, live/paid/credential prerequisites and exact approved case inventory. It never sets a missing paid switch/key; its wrapper refuses logo dispatch absent from the approved inventory even though runtime logos share live availability. The frontend must point to that same local backend and preserve normal real challenge behavior.

**Inspect listeners and process ancestry first.** Stop only a verified Retailor backend through the documented lifecycle workflow before starting its replacement. Never stop another repository, take its port or select a fallback port. Then use the pinned runtime explicitly:

```powershell
pnpm --filter @retailor/backend exec tsx ../../scripts/evaluate/run.mjs --capture C:\absolute\ignored\authorization.json
```

The server binds only 127.0.0.1:4311. It creates one exclusive ignored local `evaluation-<approvalId>.used.json` receipt, preventing accidental reuse after restart. Even a subsequent bind failure conservatively consumes that operator receipt; no service is killed and no startup paid request occurs. Resolve ownership and authorization deliberately rather than deleting the receipt to retry unknown work. This local safety record contains no guest business data and adds no hosted database.

Only one provider case is active. Exact role/count inventory and per-case model-network bounds are enforced; caller changes cannot add cases. Failed/aborted/unaccounted requests and exhausted inventory disable further AI capabilities, while health/local controls/FX remain independent. At most one extra pre-provider rejection record is kept, so repeated rejected traffic cannot grow the recorder. An incomplete response has nullable status and unknown outcome. Ordinary SIGINT/SIGTERM closes only this server and its owned connections.

Capture emits newline JSON metadata. Review that metadata and the actual native UI together. Per-request usage-derived costs are estimates until reconciled with the account; do not invent a value for `measuredCostMicroUsd`. Validate a final content-free operator record with `--record`, retain actual failures/unknowns, and attach useful screenshots/source references without visitor/provider payloads. The real challenge requires the human's normal participation. No challenge bypass is offered.

## Public FX source and release verdict

The independent `evaluate:fx` command invokes the production fixed-pair adapter and service, one request under its five-second deadline. It does not change the running fake demo's accepted 0.9 quote or enable paid AI. Invalid/stale/failed data returns a named pending result and USD remains canonical; ordinary tests remain offline.

Frankfurter documents direct provider routes, a no-key public API and default blended data; Retailor explicitly selects ECB. Its provider-specific terms apply. ECB reference data is informational; reproduction must attribute the source accurately and identify modifications/conversion. Existing UI says **ECB via Frankfurter**, gives the date and declares USD→EUR reference display. This is simulated pricing, with no real settlement. [Frankfurter documentation](https://frankfurter.dev/), [ECB reference rates](https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.en.html), [ECB reuse terms](https://www.ecb.europa.eu/services/using-our-site/disclaimer/html/index.en.html).

RTL-020's local harness, deterministic audit and actual public quote are separate evidence. Public release remains **unaccepted** until real catalogue/text, any enabled logos, account/budget/retention, owner/device quality and exact Linux/hosted acceptance pass. Packaging can proceed under RTL-021; RTL-022 receives these named gates and may prepare local deployment/rollback files without claiming publication.
