# RTL-023 — Post deployment and pre sharing

Status: **Phase A committed; Phase B reviewed; approved local security remedies validated; final commit record below, external/upstream release evidence pending**\
Owner request: **13 October 2026**\
Baseline: `1b1714feb021e3393bb51d2dff77ce4e4fdc17d0`\
Depends on: local implementation/evidence from RTL-001–022\
Authority: latest owner audit instructions, [repository rules](../../AGENTS.md), [blueprint](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md), [release status](../operations/RELEASE-STATUS.md)\
Commit prefix: `RTL-023:`

The owner copied this title from another project. **Retailor has no verified deployment/public URL yet.** This is a local quality and pre-sharing review of the implemented two-service demo, plus preparation of the later security decision. It neither assumes deployment nor authorizes cloud/push/paid actions. Current local frontend/backend remain 4310/4311, fake/paid off; preserve other repos and read no ignored secret values.

## Owner approval sequence — binding

**Latest feedback, 13 October:** “go for all fixes in an execute validation loop” with file-level commit approval. This unlocks the locally executable remedies below and commits of the security artifacts after validation. The original sequence is retained as history; its manual audit gate has been satisfied. No cloud/paid/publication action is authorized.

1. Thoroughly inspect code quality, efficiency and structure across frontend/backend/contracts/commerce/tests/tooling/runtime packaging. Fully document the audit, concrete evidence, fixes, preservation contracts and checks **before application edits**.
2. Execute Phase A and validate settled changes read-only. Independently confirm findings, fix and repeat until no new actionable local findings. Preserve functionality over reducing line count. Retain every existing private/runtime/operator log; source-controlled user-facing errors are allowed, raw technical messages/UI/browser application logging are not.
3. Finalize the file-level allocation, stage explicit **Phase A paths only** and make cohesive `RTL-023:` commits. Owner authorizes these commits after clean validation. Do not push or publish.
4. **Only then** perform the detailed read-only STRIDE/general/dependency security audit. Document substantial evidence-backed findings and careful, functionality-preserving remedies; no invented severity or minor speculative hardening checklist.
5. Create a concise accessible HTML in PM language, ordered High → Medium → Low, explaining each material threat/impact and proposed remedy. Identify deployment/configuration unknowns separately from confirmed defects and fixed/existing controls.
6. Leave all Phase B findings, review HTML and security-related ticket/index updates **unstaged and uncommitted** for manual owner feedback. **No security fix, dependency upgrade, config enforcement, cloud mutation or remediation execution before that feedback.** A finding file does not approve itself. Separate approval for a read-only scan does not authorize remedies.

## Phase A outcome and protected behavior

Produce better module ownership, fewer proven redundant implementations/dead runtime declarations, efficient bounded response handling, useful private diagnostics and visitor-safe error presentation without changing the clothing demo's meaning or appearance. [Detailed quality audit/plan](../audits/RTL-023-CODE-QUALITY.md) owns the discovered finding evidence and disposition. [Commit allocation](../commit-plans/RTL-023.md) starts before substantial edits and is finalized from the settled diff.

Preserve these contracts throughout:

- Clothing only; every product retains a validated available photo. Public samples still require fresh live interpretation; no canned production fallback.
- One bounded session controller owns state, resource handles and late-response/expiry/reset fences. No parallel controller/store, redundant state mirrors or schema bypass.
- Thirty-six curated storefront looks, three-page composition, chat-led template/theme/type CTA flow, preview/apply/cancel, owner override and optional post-style three-logo/wordmark path.
- No style/CSS/design/layout/animation changes as a cleanup side effect. Keep the landing header/hero/main action fitting the first viewport; no motion-off/render-off/global console suppression switch.
- Exact USD authority, dated EUR conversion/rounding/filter behavior; product variants/stock/financial records/scenarios/evidence and reviewed CRUD/order/return/refund transitions unchanged.
- Existing session/report schemas and payloads, saved-state restore, cache ownership, duplicate-tab arbitration, bounded arrays/bytes/workers, expiry, reset, downloads and cleanup.
- Existing request operation/method/body/status, credentials/cache/redirect rules, challenge/action/replay semantics, provider call/retry/spend bounds, deadlines and shared native/AI concurrency. This quality phase does not implement new security admission or infrastructure controls.
- All existing backend startup/failure and operator/evaluation/release logs remain. New diagnostics stay private, content-free and useful: fixed event/category/operation/status/request reference/source locations; no raw guest body, prompt, key, cookie, grant or full SDK response.
- Imports/factories remain inert. Tests/normal development cannot spend; missing paid/account/hosted/physical/owner evidence stays explicitly pending.

## Phase A scope and execution slices

### A1. Visitor-safe errors and recovery

Audit every application-controlled visitor error path and browser log call. Replace raw unknown `Error.message` forwarding in photo acceptance/selection/repair and catalogue-edit notices with trusted source-controlled messages or generic recovery. Preserve useful expected validation copy by distinguishing explicit local user-input errors from unknown DOM/worker/Zod/provider/runtime errors. Keep known invalid-photo/type/count/pixel/money/stock messages and preserve valid photos/work. Centralize only the narrow shared error semantics; no arbitrary text bypass or unrelated catch-all utility.

Inspect installed Next error-handling guidance before adding an owned friendly route/global fallback if framework default failure UI currently exposes technical instructions. Do not monkeypatch console, suppress existing framework/private logs or forward raw browser stacks through a new public telemetry API. Report native browser/framework diagnostics honestly; project-controlled logging must not emit technical errors to browser console.

Regression cases: unknown injected exception contains a private marker → notice contains none; source-controlled invalid USD/stock/photo message remains helpful; failed selection keeps accepted bytes/order; exact-photo repair failure keeps old photo; cancelled/late selection cannot change fresh state; raw API error message is discarded in favor of public code. Normal flow and keyboard/touch semantics stay intact.

### A2. Bounded browser response ownership

The catalogue, Tailor, logo and FX requesters contain near-duplicate chunk-array response readers and allocate another joined buffer. Introduce one narrow browser-safe response primitive with a fixed byte envelope, cancellation/listener cleanup and existing error classification. Reuse it in the actual four execution paths; leave each feature's fetch/disclosure/grant/dispatch/result validation and deadline ownership with that feature.

Preserve current byte caps, parsed schemas, public error code handling, operation identity, strict UTF-8 behavior where currently required, paid dispatch marker and provider limits. Eliminate retained arrays/duplicate join copies, including zero-size chunks; bound iteration as resource correctness without changing accepted normal segmentation. A helper is real shared behavior, not a new generic fetch/proxy API. Remove replaced readers only after all consumers import the new owner; map the old catalogue-specific shared error class into a narrow API error module if needed, changing every real/test reference together rather than leaving a dead compatibility alias.

Regression cases: real segmented stream and exact cap accepted; cap+1, invalid JSON/UTF-8, missing body, malformed public errors, stalled/aborted/empty-chunk streams and listener cleanup; friendly code mapping and OPERATOR_REQUIRED freeze retained; unchanged fake/paid-off/full requester workflows, no extra fetch or provider retry, paid dispatch exactly once. Measure actual memory/copy differences honestly; no invented heap/latency gains.

### A3. Proven dead runtime declarations and reachability

Use AST inventory, identifier/import/export/package-subpath checks, Next entrypoint/worker/dynamic import inspection and full compile/tests. Confirm candidate unused runtime `HashSchema` and old catalogue-only `AdmissionRequestSchema` against **all consumers**, including tests/tools. Remove only proven unused runtime declarations; keep stable used schemas and intentional public type aliases. Next GET/POST/pages/layouts and useful development-reference routes are entrypoints, not dead code. CSS/dynamic selectors/animations and intentional fixtures are not removed from a token-count guess.

Audit circular/application dependency direction and duplicated formulas/state/schema authority. Do not split the 3,382-line controller merely for LOC: preserve its single-owner architecture; extract only independently testable actual shared behavior. Financial rules and transition semantics are not rewritten on a speculative optimization. Record reviewed/retained areas and any consciously deferred high-risk restructure with evidence, not a promise of complete absence of all future defects.

### A4. Private backend diagnostic continuity

Audit existing logs and error boundaries. Preserve startup/bind/operator output and current SDK privacy settings. The Express final failure boundary currently classifies errors but has no private request-failure observation. Add a narrow injected diagnostic port enabled by explicit backend startup, so the operator can correlate failures by fixed operation, code/status and request reference without leaking details to the public error response. Never log arbitrary body/query/header/user text, raw provider exception/payload/key or whole graph. Do not install a logging service/package, add browser telemetry/proxy route, alter middleware admission/status or turn on raw SDK debug logging.

Regressions: private sink sees sanitized failure metadata and safe source location; public envelope and request status unchanged; raw marker/secret/cookie/stack first line absent from visitor response and event; logger failure cannot break HTTP behavior; factory imports remain inert; healthy/config requests do not dispatch providers or add error spam; original log call sites remain. Diagnose expected unavailable versus unexpected failure clearly and document retained log inventory.

### A5. Full review and durable future-edit guidelines

Record coverage for all source groups: public schemas/pure finance and domain, session/projection/cache/resource owners, photo/decode/sample/review, style/store/gallery/bag, operations/scenarios/dashboard/metrics, Tailor roles/forms/tours/logo/FX, fixed bridge/backend startup/parsers/provider/admission, launchers/evaluation/release/CI/container context. Use focused tests per slice; actual end-to-end fake-mode browser evidence for changed paths and representative compact/wide/tablet layouts; no claimed new aesthetic pass from tests alone.

At settled Phase A run `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm check:boundaries`, `pnpm test:unit`, `pnpm build`. Do not repeat broad passing suites absent new edits/failures; validation is read-only and uses the complete ticket/current diff. Capture actual commands/environment/coverage/limits under `docs/validation/RTL-023.md`. Rebuild/recheck Linux only if application inputs affecting packaging changed; candidate/live/hosted evidence must be invalidated honestly, never silently inherited.

Add practical repository guidelines: preserve invariants/design; use meaningful regression evidence; retain private diagnostics; never display/log arbitrary exceptions to visitors; keep public schema/pure-rule/controller boundaries; maintain bounded cancellation/cleanup/concurrency; prove reachability before deleting; no speculative broad rewrite/extra dependencies; review approved security dispositions after future manual/visual edits; no security control silently regressed or assumed implemented.

## Phase A acceptance

- [x] Full code-quality audit/plan is documented before application edits, with base/inventory/evidence and concrete preservation/check matrix.
- [x] Confirmed raw visitor-error paths are corrected with helpful expected validation and generic unknown failures; no application technical browser logging added.
- [x] Shared response behavior removes actual reader duplication/retained chunk copies without changing request/schema/status/deadline/admission/dispatch semantics.
- [x] Only confirmed unused runtime declarations are removed; intentional public types, framework/worker entrypoints, development tools, motion and logs remain.
- [x] Useful private backend failure observation exists; all original logs remain and no visitor/provider payload or secret is logged.
- [x] Meaningful focused/full checks and real changed-path browser/resource evidence pass, with external limits named honestly.
- [x] Read-only validation loop ends with no new actionable local findings.
- [x] Final file allocation, explicit staged secret/artifact inspection, cohesive quality commits and future-edit guidelines are complete; no security findings accidentally committed.

## Phase B — read-only security audit, manual decision required

Audit the **settled committed Phase A candidate**, not an earlier dirty build, and document actual boundaries/limitations. Use STRIDE (Spoofing, Tampering, Repudiation, Information disclosure, Denial of service, Elevation of privilege) plus substantial generic dependency/operational threats. Cover browser/session/worker/cache/report, frontend static/server bridge and Next, Express admission/parsers/native images, role tools/provider transport/spend, logs/error boundaries, supply chain/lock/CI/Docker, and planned Cloud Run/IAM/origin/Turnstile/Secret Manager configuration.

Inspect actual pinned runtime and development dependency graph/advisories using read-only registry/primary advisory evidence. Verify affected version/range and real reachable usage; separate runtime exploitability from build/test-only issues. Do not upgrade/install/rewrite lockfiles or implement mitigations. No fake CVE, unsupported 2026-version recall, date-blind advisory, blanket “latest upgrade,” or severity inflated without an attack path.

Assess meaningful rate limits, replay/admission/origin, malicious images/stream/memory/queue/body cancellation, AI prompt/tool/reference abuse, shared paid/process/restart/overlap budget, public static/GET/config abuse, DDoS/Cloud Run scaling/cost controls and private identity/secret exposure. Distinguish a local simulation owned by its visitor from a protected multi-user database: do not invent auth/database/checkout/shipping threats outside this demo. Cloud IAM/domain/account evidence remains absent; a proposed deployment condition is not a confirmed deployed vulnerability. No cloud account/resource/DNS mutation, attack flood or paid request.

For every material finding include ID, severity/confidence/STRIDE class, exact source/line and dependency/runtime evidence, affected feature/trust boundary, realistic preconditions/attack sequence, bounded safe reproduction where possible, concrete impact, existing defenses and residual gap, minimal remedy alternatives, functionality/design/log/structure preservation, regression/rollout/rollback requirements and owner decision. Clearly separate confirmed defects, verified controls and release conditions. Exclude minor/speculative style hardening and demo-irrelevant enterprise recommendations. If no material issue is found, say so without manufacturing findings.

Deliver `docs/audits/RTL-023-SECURITY.md` plus `docs/audits/RTL-023-SECURITY-REVIEW.html`. HTML: easy PM-language summaries ordered High/Medium/Low, threat → impact → proposed solution → protected behavior/decision; comfortable desktop/mobile reading, no external scripts or analytics, no secret values. Show zero-count severity groups honestly and expected release prerequisites separately. A recommendation is a proposal, never an implemented fix.

## Phase B acceptance — documents only

- [x] Security audit starts after validated quality commits and references their exact candidate.
- [x] Whole-repository STRIDE/general/dependency coverage and actual evidence/limitations are recorded. Initial possible metadata-export rejection is preserved; subsequent explicit owner approval permitted completed Docker Scout scans of both exact local images. Each reports the same 70 advisory entries across 16 Debian source packages; applicability and native/static coverage limits are explicit.
- [x] Only substantial findings/release conditions are included with realistic severity, careful fixes, functionality/structure/log protections and verification plans.
- [x] PM HTML is severity-ranked, structurally checked, consistent with Markdown and ready for manual inspection. Browser local-file rendering was policy-blocked; rendered appearance remains owner review, not claimed verified.
- [x] All Phase B documents/findings/ticket-status changes remain unstaged and uncommitted for owner review.
- [x] No security implementation/dependency/config/cloud/paid action occurs before manual feedback; durable guidelines identify proposed versus approved controls correctly.

### Historical audit handoff (before remedy approval)

Quality commits: `e42bff5`, `d6bf6e6`, `8057f3c`; final clean preflight matched app fingerprint and Linux candidate. [Detailed security audit](../audits/RTL-023-SECURITY.md), [PM HTML](../audits/RTL-023-SECURITY-REVIEW.html), [actual evidence](../audits/RTL-023/security-evidence.json), [approved image scan summary](../audits/RTL-023/scout-summary.json) and [audit validation/limitations](../validation/RTL-023-SECURITY.md) are separate unstaged/uncommitted Phase B records. One confirmed Medium availability finding; conditional High paid-budget and Medium public-ingress decisions; no minor Low recommendations. Known dev-only advisory, completed Scout results and bounded OS applicability are explicit. BASE-01 compatible-base maintenance is a separately selectable proposal, without a newly demonstrated remotely reachable application High/Critical. Owner approval covered the read-only metadata scans only; all remedy choices await feedback. Application/package/lock/config files still equal the committed quality candidate.

## Phase C — approved security execution

Selected remedies: SEC-01 bounded issued-session fairness; SEC-02 paid off until verified external cutoff, with exact-candidate machine-readable operator evidence; SEC-03 Cloudflare header-overwrite origin seal plus required edge/normal-flow/bypass policy; BASE-01 compatible pinned official Node24/bookworm image and supported fixed Perl package. Dev braces has no vendor patch; retain fixed trusted lint patterns and record this upstream blocker. No database, account/login, queue, new purchased service, arbitrary override/fork or major framework migration.

Preserve every Phase A invariant and existing private log. The origin seal checks pages/RSC/static and the fixed API, without exposing a secret or cloning large uploads. Unknown requests cannot consume issued-session minute capacity or all body slots; one issued identity also cannot hold every slot. Keep initial-admission and distributed-identity/edge residual limits honest. Operator evidence is a gate and attestation, not a durable spend meter or deployed DDoS guarantee.

- [x] Initial file allocation and careful functionality-preserving remedies documented before application edits; manual execution/commit approval recorded.
- [x] Focused ingress/signature/origin/release-policy regressions pass; V1 active-fairness finding independently verified and corrected.
- [x] All six settled gates pass (375 tests / 71 files, 165 boundaries); actual fake sample/style/wordmark/filter/KPI/focus and phone/tablet/laptop observations recorded.
- [x] Fresh immutable Linux/native/assets/guard/misconfiguration/full-upload/shutdown proof and current-candidate scans recorded; 20 IDs/all Critical removed, unpatched residuals retained honestly.
- [x] Combined read-only V3 validation ends with no actionable local findings; V1 resolved and actual external/upstream blockers explicit.
- [x] Final exact allocation, staged secret/artifact inspection and cohesive `RTL-023:` commits complete; implementation hashes are recorded in the security validation file, with this documentation allocation identified by Git history.

Hosted Cloudflare/IAM/TLS/rate calibration, enforced provider refusal/reset/overlap/cost, paid/physical/owner acceptance and publication remain pending their actual inputs/authority. Locally preparing these controls does not mark those checks passed.

## Precision references and handoff

- Blueprint [17 architecture](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#17-architecture-and-framework), [18 ownership](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#18-repository-layout-and-ownership), [19 contracts/API](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#19-data-contracts-and-api), [21 operation](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#21-configuration-and-local-operation).
- [22 security/privacy](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#22-security-admission-and-privacy), [23 resource/cost](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#23-resource-limits-and-cost-control), [24 motion](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#24-visual-system-motion-and-accessibility), [25 verification](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#25-verification-and-evidence), [26 deployment](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#26-infrastructure-deployment-and-operations), [28 collaboration](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#28-documentation-and-collaboration-practices).
- [Current security controls](../engineering/SECURITY.md), [lifecycle](../engineering/LIFECYCLE.md), [image concurrency](../engineering/IMAGE-CONCURRENCY.md), [provider prerequisites](../operations/PROVIDERS.md), [actual prior quality evidence](../validation/RTL-019.md), [Linux evidence](../validation/RTL-021.md), [local handoff](../validation/RTL-022.md).

Owner return state: **Quality committed; all independently executable approved security remedies locally validated with refreshed images/scans; cohesive security commit record and final read-only review below.** Actual account/edge/hosted/paid/physical acceptance and upstream-unpatched advisories remain named blockers. No cloud/paid action or universal scanner-clean verdict is claimed.
