# Catalogue recognition and admission

RTL-006 implements the production transport and provider adapter with injected local verification. No account key, approved paid budget, real Turnstile widget, paid model output or hosted acceptance has been supplied. The public capability remains unavailable in the committed configuration. The declared development branch retains its authored fixture; live failure cannot select that branch.

## Deliberate request lifecycle

Both sample and visitor uploads enter the same photo controller. Originals stay in the browser. That controller independently decodes, orients and strips metadata into bounded previews. Selecting or inspecting photos performs no admission or model call. Draft my catalogue means interpreting the current selection afresh. Reloading a completed draft restores local data without resubmitting.

The session controller passes exact photo descriptors, available derivative blobs, workspace creation/expiry, input revision and a new operation ID to one live processor. It first reads safe capability data; unavailable vision fails before loading a challenge or submitting photos. An enabled runtime asks for the action-specific Turnstile proof, obtains one signed grant, then sends multipart with `manifest` first and one derivative part per photo ID. Filenames are replaced by `preview`; they do not determine names, categories or any action. Progress follows checking, approval, drafting, validation and preview preparation; no invented percentages or waiting interval imply success.

Cancellation, reset, expiry, navigation and changed input invalidate the controller's result fence. A late response cannot publish to a replacement workspace. Failure returns to photo selection, preserves available photos and requires a deliberate new request. A provider timeout may have incurred cost; cancellation never promises otherwise. A later outage does not erase a completed local catalogue or its commerce records.

## Strict shared authority

`packages/contracts/catalogue` owns the same strict draft parser used by backend output reconciliation and frontend review/recovery. Local human correction operations remain in the frontend feature. The parser checks unique product/variant/option identities, exact photo coverage, supported provenance and non-dangling grouping. A product requires at least one validated available photo; metadata alone is not an availability witness.

`packages/contracts/recognition` defines a live-only action with the exact two-hour workspace lifetime, disclosure version `catalogue-previews-v1`, operation/input revision and 1–24 unique photo descriptors. It separately defines admission, execution/result and model observation schemas. Model observations cannot supply product IDs, prices, costs, stock, sizing systems, variants, URLs or commands. Every model field is required; unknown category/value uses an explicit null.

Model dispositions must cover every submitted source exactly once. Their garment index references must equal the actual source-to-garment relationship. Unknown, missing, repeated or invented references reject the entire result. Non-clothing photos receive an explicit rejected disposition with no product. Ambiguous classification or grouping produces an excluded draft for human confirmation. A merely similar garment is not a supported alternate view.

The application assigns fresh IDs and clearly editable demo defaults: alpha sizing S/M/L, $45 price, $20 cost and ten opening units per option. Those are never inferred from a photo. The existing review labels these defaults. Visual colour/pattern/closure/sleeve/neckline observations remain draft facts. Material and care need legible label references and remain unconfirmed. Fit remains unknown. Unsupported material/performance/sustainability claims in generated copy reject the result; no second repair call is made. Schema checks enforce structure and provenance, while actual semantic quality still needs the independent RTL-020 image evaluation.

## Admission, replay and capacity

The private backend accepts only exact configured frontend Origin writes. The fixed frontend bridge supplies hosted IAM identity itself; caller Authorization, arbitrary targets and caller cookies are not forwarded. Only `retailor_safety` passes on the two admitted operations, with a bounded syntactic shape. Successful admission reissues a fixed HttpOnly, SameSite Strict, two-hour cookie at `/api/retailor/v1`, Secure on HTTPS. An upstream Domain/Path cannot override those attributes. The cookie carries a signed opaque safety identity and process boot; it contains no photos, catalogue text or personal/IP data.

The challenge verifier sends one bounded, deadline-owned request to Cloudflare's fixed Siteverify endpoint. It requires success and exact configured hostname plus action `catalogue`. No client success bit, forwarded IP or caller action can replace that check. Turnstile proofs are verified server-side. The backend then signs a grant bound to the process boot, safety identity, workspace, operation, normalized strict action digest, disclosure, exact image hashes/counts/bytes, input revision, live mode and expiry. Grants last at most two minutes and never outlive the workspace.

The operation is recorded before awaiting challenge verification, so concurrent approval replay fails. Grants are consumed before allocating file buffers; rejected or malformed multipart cannot reuse them. Only actual provider dispatch consumes one of two workspace attempts. At most one paid lease per workspace and two per process are active. Lease release is idempotent and checks its identity. The one-use operation ledger survives within the fixed workspace lifetime; expired entries are swept. A new process boot invalidates old grants/cookies.

Rate rejection precedes allocation. Provisional workspace records are removed when all their proofs fail; a concurrent verified grant preserves its ledger. Exhausted reservation capacity updates the public vision capability to unavailable and rejects proof admission before verification. It exposes no billing balance. Service readiness retains its startup/prerequisite meaning rather than causing budget exhaustion to restart the process and reset its ledger.

Baseline proof admission is limited to two per safety identity per ten minutes and twelve globally per minute. The process bounds its workspace ledger at 256, safety-rate entries at 1,024 and operation records at 24 per workspace. These controls are deliberately process-local. New cookies, changed workspace IDs, service restarts and overlapping deployments prevent them from being an account-wide quota. RTL-018/021/022 retain release hardening and operational controls.

## Resource and spend envelope

| Boundary | Enforced local limit |
| --- | --- |
| Action/manifest metadata | 64 KiB; unknown fields rejected |
| Selected input | 24 images; unique IDs and actual submitted hashes |
| Original metadata | 4 MiB each, 40 MiB aggregate; originals never uploaded |
| Derivative | Static JPEG/PNG/WebP; 1,600-pixel side, 768 KiB each |
| Derivative transfer / complete multipart | 18 MiB / 19 MiB, counted while reading |
| Decode | One worker at a time, 64 MiB JS heap, hard owned ten-second deadline |
| Backend / provider | 120 seconds / 95 seconds |
| Provider output | 12,000 output tokens; 768 KiB raw response; 96 KiB observation text |
| Deliberate vision attempts | Two per fixed workspace; one model call each |
| Active paid work | One/workspace, two/process |

Manifest-first parsing validates and reserves before file chunks accumulate. Named parts, count, duplicate coverage, actual byte lengths and hashes are checked independently of Content-Length. Header inspection rejects private metadata/unsupported or animated input. A fresh serial worker fully decodes and re-encodes metadata-free WebP. Its parent terminates the worker on cancellation/deadline and settles only after termination, keeping the lease owned until image work stops. Provider images are never persisted to disk or a server library. Rejected bodies may drain only a 64 KiB already-in-flight tail for at most 250 ms to deliver a useful error; a slow/unbounded remainder closes. Admission's eight-second deadline starts before JSON parsing; server header/request timeouts provide an additional outer boundary.

A noisy valid preview can expand during format conversion. The worker uses at most three finite WebP passes: original bounded dimensions at quality 85, 1,024-pixel containment at quality 60, then 768-pixel containment at quality 55. Aspect ratio is preserved, no pass enlarges input and the same parent deadline covers every pass. The 768 KiB per-image and 18 MiB aggregate output caps still apply. Original accepted photos and their exact submitted descriptors remain available for storefront/review; provider sanitization does not replace them. Actual recognition quality at those settings remains RTL-020 evidence.

`PROCESS_BUDGET_MICRO_USD=0` and `LIVE_POLICY_APPROVED=false` keep dispatch closed even when other secrets are present. The provisional reservation is 1,000,000 micro-USD per dispatch. This is a conservative internal allowance, not a reported charge. Pre-dispatch failure releases it. Once dispatched it remains held even on success, until real account/pricing acceptance supports a narrower reconciliation policy. Known input/output token counts are recorded once as content-free aggregates; unknown outcomes increment an anonymous counter and do not release budget. No public UI/log exposes billing or raw counters.

The allowance is per process boot, not a monthly hard quota. Owner approval, actual account capability/retention and measured price/usage remain prerequisites for activation. No environment variable alone authorizes a paid run. The committed examples contain blank secrets, fake mode, paid-off, policy-off and zero budget.

## Provider policy and official references

The backend-only provisional model is `gpt-6-luna`, using Responses image input at high detail, low reasoning effort and strict JSON Schema output. Current official documentation lists image input and structured outputs for this model. Actual clothing accuracy, grouping, latency and account access have not been measured. RTL-020 must accept or replace the policy before release. [Official model reference](https://developers.openai.com/api/docs/models/gpt-6-luna).

The adapter uses one foreground `responses.create`, `store:false`, `background:false`, no tools and no Files/conversation resources. SDK retries are zero both at construction and request. Endpoint and redirect behavior are fixed. A refused, incomplete, malformed, oversized or invalid result becomes a sanitized failure. There is no hidden repair, provider fallback or durable provider-result cache. [Image input guide](https://developers.openai.com/api/docs/guides/images-vision), [structured output guide](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses).

`store:false` is not a promise of zero retention: provider safety and caching policies depend on the actual account and model. No Zero Data Retention entitlement is assumed. RTL-020 records account-specific policy before approved usage. [OpenAI data controls](https://developers.openai.com/api/docs/guides/your-data).

The widget is loaded only for an enabled deliberate draft and removed when its operation settles. The server checks Siteverify's action/hostname; proof reuse and expiry are rejected by that service. Local tests inject the verifier and never solve a real challenge. [Cloudflare server validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/), [explicit rendering lifecycle](https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/).

Official sources checked 11 October 2026. Source snippets/model pricing do not constitute account billing evidence. Raw provider exceptions, challenges, grants, cookies, photo hashes, prompts and responses are not written to application logs.

## Verification and next ownership

The injected suite covers pre-spend rejection, exact hashes/pixels, sample sanitization, 24-image transfer envelope, one-use and cross-input grants, concurrent capacity, cancellation, unknown usage, refusal/truncation, unsupported claims, unavailable public capabilities and strict bridge cookies/results. The actual fifteen assets and independently authored semantic expectations are listed in [the evaluation seam](../evaluation/catalogue/README.md). Those expectations are neither runtime output nor measured model results.

See [RTL-006 validation](../validation/RTL-006.md) for actual settled gates and browser observations. Paid quality/token/latency/spend, real challenge, account retention, hosted IAM and Linux memory remain explicit later evidence. RTL-007 consumes accepted photo-backed drafts for complete templates; RTL-011 supplies coherent activity for public publication. RTL-013/015 reuse the admission boundary with their own action contracts and budgets, rather than bypassing it.
