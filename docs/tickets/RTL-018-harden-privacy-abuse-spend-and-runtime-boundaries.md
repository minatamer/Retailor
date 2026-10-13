# RTL-018 — Harden privacy, abuse controls, spend and runtime boundaries

Status: **Implemented locally — account/paid/Linux/hosted acceptance pending**\
Planning date: **11 October 2026**\
Milestone: **Public hardening**\
Depends on: [RTL-006](RTL-006-deliver-live-catalogue-recognition-and-admission.md), [RTL-009](RTL-009-deliver-automatic-usd-eur-storefront-pricing.md), [RTL-013](RTL-013-deliver-grounded-tailor-conversation-tools-and-tours.md), [RTL-015](RTL-015-deliver-optional-three-logo-generation.md), [RTL-016](RTL-016-complete-export-reset-expiry-and-session-lifecycle.md)\
Blocks directly: [RTL-019](RTL-019-verify-polish-responsive-motion-and-design-matrix.md), [RTL-020](RTL-020-evaluate-live-ai-and-audit-release-acceptance.md), [RTL-021](RTL-021-package-linux-services-and-manual-release-runbook.md)\
Suggested commit: `RTL-018: harden privacy, abuse controls, spend and runtime boundaries`\
Parent authority: [Retailor blueprint](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md)\
Queue and execution rules: [Ticket index](README.md)

## Outcome and standalone context

Harden the full anonymous application across catalogue, typed Tailor, optional logos and public FX, without adding a database or identity system. Admission/capacity/privacy baseline already exists in RTL-006 and each later provider path; this packet audits and closes whole-runtime gaps before public traffic. It cannot retroactively justify an earlier unprotected paid route.

Model outputs and submitted browser state are untrusted. Private backend transport, challenge/grant bindings, strict body/output limits, owned cleanup, bounded content-free counters and honest capabilities must agree. Process-local rate/replay/cost controls are useful but do not guarantee a durable per-person or monthly hard cap through restarts/rollouts. Actual provider account enforcement must be inspected separately.

## Dependency evidence and entry conditions

RTL-006, RTL-013 and RTL-015 provider routes; RTL-009 fixed public FX; RTL-016 complete browser lifecycle must be locally verified. Review actual adapter/parser/bridge behavior and budget formula before changing policy. No cloud/project or paid call is needed to implement deterministic controls. Exact secret/account settings remain blank until actual operator setup.

Dependency completion means required local behavior, owning contracts and checks actually exist. A planned checkbox or ticket-named commit alone is insufficient. Verified local dependencies may support local follow-on work while separately recorded live, owner-visual or hosted evidence remains pending. Never turn a fake pass into live acceptance.

## Files and responsibility boundaries

| Area | Responsibility owned here |
| --- | --- |
| `apps/backend/src/security, config, runtime and http` | Admission/replay/rate/cost/capacity/headers/error boundaries |
| `apps/frontend/src/server and assistants/catalogue/design` | Fixed bridge, action-specific verification and safe error UX |
| `packages/contracts/src` | Named caps and stable safe capability/error shapes |
| `docs/engineering/SECURITY.md and operations/PROVIDERS.md` | Threat/evidence, spend policy and operator setup |

Paths describe future ownership. Create modules/directories only with real behavior; reuse contracts, commands, assets and session state rather than a parallel authority.

## Implementation plan

1. **Audit all trust boundaries.** Trace browser graph/image/brand/prompt, frontend bridge, backend validators, model output and local command confirmation. Reject dangling IDs/money/stock/provenance conflicts before provider calls. Provider raw types never escape adapters and model data never becomes executable code.

2. **Prove exact paid-action ordering.** For catalogue/typed turns/logo batches, validate origin/type/coarse limits, challenge host/action, one-use manifest grant, expiry/replay, actual input hashes/context and capacity/cost reservation before dispatch. Two-minute grant binds workspace/operation/disclosure; a changed action requires fresh admission.

3. **Bound content-free control memory.** Implement capped TTL route/source/correlation/replay counters without raw IP/token/content logging. Boot identity fails old grants closed after restart. Concurrent duplicates acquire only one owned lease; no unbounded registry or durable identity claim.

4. **Enforce every resource envelope.** Check 19 MiB image transport, 768 KiB assistant JSON, 64 KiB logo request/4.2 MiB response, 8 KiB FX, array/text/token/output caps and whole-operation/subdeadlines. Reject streaming excess independently of declared length. Account for Base64/decoded memory and buffer copies.

5. **Keep kill switches and capabilities truthful.** Master paid-off disables all AI dispatch; fake/test and live never mix on error. Optional logos are independent capability; FX/local cards remain unpaid. Safe config reflects composed prerequisites without keys/private origins/internal billing details.

6. **Make safe failure categories useful.** Distinguish retryable temporary failure from operator-required auth/billing/configuration without exposing raw provider messages or account information. Keep work and provide deliberate bounded retry only when sensible. Timeout/cancel may have consumed usage; retain conservative reservation and never auto-dispatch.

7. **Verify the private bridge.** Use fixed allow-listed paths/origin/audience and runtime identity, strict forwarded-header/proxy assumptions, HTTPS/CSP/security headers and same-origin CSRF posture. Backend is IAM-private in hosting; no arbitrary proxy URL or service-account key file.

8. **Audit handling and logs.** Originals stay browser-owned; approved derivatives/context/name reach providers. Logs include only allow-listed request/category/timing/count/usage, never filenames/photos/prompts/replies/grants/cookies/customer payload. store false does not imply zero provider retention.

9. **Calculate a defensible spend envelope.** Reserve two catalogue attempts, twelve bounded text turns and at most two three-logo batches per workspace at selected current prices. Separate offline asset-production, hosting/build/network/domain costs. Record uncertainty for failed/unknown requests and process-local/global limitations.

10. **Run adversarial deterministic checks.** Wrong host/action/digest/role, malformed image/model output, replay/race, restart, capacity, oversized streams, quota/auth/timeout and log redaction all need observable zero-dispatch or correct bounded behavior. Document hosted/provider prerequisites for RTL-020/021/022 without mutating them.

## Acceptance criteria — required local outcome

- [x] Every paid route fails closed before dispatch on any admission/input/control failure.
- [x] Manifest/revision/role/count bindings prevent grants from authorizing changed actions.
- [x] Rate/replay/cost/capacity memory and lease ownership are bounded.
- [x] Body/output/token/array/deadline caps are consistent across layers.
- [x] Paid-off and unavailable states never silently invoke fakes/live adapters.
- [x] FX remains fixed, unpaid and free of guest data.
- [x] Logs/UI/errors contain no sensitive content or raw SDK payload.
- [x] Private bridge and safe config expose no general proxy or secret.
- [x] Actual cost assumptions and enforcement limitations are documented.
- [x] Deterministic adversarial checks pass; external account/hosted checks remain separate.

## Focused verification and evidence

| Case | Required observable evidence |
| --- | --- |
| Admission matrix | Missing/expired/replayed/wrong-action/host/hash grant gives zero calls |
| Race/restart/capacity | One lease/dispatch, old boot grant invalid and bounded memory |
| Oversized streaming body/output | Rejected within named envelope before protected allocation/dispatch |
| Provider billing/auth/transient fixtures | Safe retryability/category and no raw message leakage |
| Paid-off/live failure | No adapter-mode fallback or auto-retry |
| Logs/storage/bundle review | No photo/prompt/token/secret/private-origin exposure |
| Fixed FX route | No user-selected target, no guest payload and independent availability |
| Spend computation | Measured model policy and conservative unknown-outcome accounting |

Run meaningful focused tests during iteration. At the settled implementation snapshot run the applicable root gates established by RTL-001: `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm check:boundaries`, `pnpm test:unit` and `pnpm build`. Record actual commands/results and revision. UI acceptance needs real browser observations where available; DOM simulations or animation declarations alone do not prove appearance/movement. Do not add tests that merely mirror CSS or static labels.

## External evidence and scope limits

Actual challenge widget/domain behavior, provider account limits/retention and hosted IAM/capacity are external evidence owned by RTL-020/022. Produce concrete configuration/runbook and deterministic proof first; do not claim those external checks passed or perform cloud mutations in this hardening packet.

No Redis/database/auth/fingerprinting/paid WAF, durable uniqueness or guaranteed monthly cap from process memory. No account-dashboard values copied from siblings. No new approval flags that merely hide missing controls. Operator account/retention/hosted configuration must be checked against actual resources before enabling public paid usage.

## Precision references

- [17. Architecture and framework](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#17-architecture-and-framework)
- [19. Data contracts and API](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#19-data-contracts-and-api)
- [20. Provider integration and evaluation](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#20-provider-integration-and-evaluation)
- [21. Configuration and local operation](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#21-configuration-and-local-operation)
- [22. Security, admission and privacy](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#22-security-admission-and-privacy)
- [23. Resource limits and cost control](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#23-resource-limits-and-cost-control)
- [25. Verification and evidence](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#25-verification-and-evidence)
- [26. Infrastructure, deployment and operations](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#26-infrastructure-deployment-and-operations)

## Completion handoff and commit boundary

Keep this outcome under `RTL-018:`; adjacent cohesive commits may be planned when useful. At execution write file allocations under `docs/commit-plans/RTL-018.md` and actual check/review evidence under `docs/validation/RTL-018.md`. These are future records, not fabricated by this planning pass.

Local hardening and six final gates pass: 327 tests / 59 files, 156 boundary modules and both builds. [Validation](../validation/RTL-018.md) records actual failures/repairs, native CSP photo/style observations, production artifact checks, resolved operator-retry finding and clean revalidation. [Security](../engineering/SECURITY.md) traces actual controls/data/logs; [provider operations](../operations/PROVIDERS.md) records checked prices, USD 22 workspace reservation and the unknown actual logo-generation ceiling. [Commit allocation](../commit-plans/RTL-018.md) owns three cohesive slices. No API key/account, paid, Linux image, hosted IAM/challenge/retention or deployment acceptance is claimed. Those prerequisites stay pending under RTL-020/021/022; current owner authorization covers the validated local commits. RTL-019 is next eligible.
