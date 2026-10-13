# RTL-024 — Simplify paid AI configuration

Status: **Locally complete, validated and committed; live/hosted acceptance pending**
Owner request: **13 October 2026**
Baseline: `2fc41a7b6c09c856f08674b89d918aa6c32e3738`
Authority: latest owner instructions, [repository rules](../../AGENTS.md)
Commit prefix: `RTL-024:`. Latest owner feedback explicitly approves a file-level plan for all unstaged changes and staging/commits after validation; no push, paid call or publication.

## Requested behavior

Remove `LIVE_POLICY_APPROVED`, `LOGO_GENERATION_ENABLED`, `LOGO_POLICY_APPROVED` and `PROCESS_BUDGET_MICRO_USD` from configuration and their actual runtime branches. Do not leave a hidden equivalent dollar cap or approval flag. Follow-up feedback also removes `APP_REVISION` and its public health field; retain unrelated session/data revisions and actual immutable release/image identity. Retain `APP_ENV` because production/testing behavior depends on it. Retain `FAKE_MODE=true` and `PAID_DEMO_ENABLED=false` as safe development defaults. Live mode with paid enabled and all required credentials constructs recognition, Tailor and optional logos together. The optional logo flow remains a deliberate user action after theme/type confirmation; availability is not automatic generation.

The removed logo-policy flag was operator signoff, not content moderation. Preserve the real provider request's `moderation: auto`, literal store-name treatment and safe refusal handling; add explicit original, non-hateful brand-design instructions without promising that prompt wording proves moderation quality. No paid calls or keys are supplied to test the actual provider.

Remove the process monetary ledger, reserve constants/options, money-derived capability branches and stale tests. Preserve shared two-slot/one-per-workspace leases, HMAC/boot/expiry/grant digest, replay protection, rate limits, finite action counts, cancellation, image validation, private logs and bounded input/output/unknown-usage accounting. Release returns an owned concurrency slot exactly once; dispatched actions still consume their finite attempts. `PAID_DEMO_ENABLED=false` must prevent construction and dispatch of live AI even if keys are present. Fake behavior remains explicitly development-only.

## Connected surfaces and preservation

Update both the committed backend example and ignored backend `.env.local`, without exposing or replacing any credential. Update runtime composition, admission callers/tests, the injected evaluation fixture, explicit live capture wiring, Docker defaults and active setup/release instructions. Remove obsolete evaluation dollar-reservation metadata/authorization; its operator-approved exact case/count/usage envelope remains an explicit tool authorization, not a normal app environment setting. External account controls, edge/IAM and hosted/paid acceptance remain pending; removing local money reservations is not a provider billing cap or public-release approval. Historical RTL-001–023 evidence remains historical, with a clear supersession note rather than rewritten results.

No UI/layout/style/motion, shopping economics, photos, FX behavior, master paid switch, trusted origin guard, package dependency or sibling service changes. The health contract removes only its obsolete application-revision field. No database, extra moderation service, new feature flag, provider retry, hidden money constant, paid request, publication or push.

## Acceptance and checks

- [x] Removed settings have no active configuration, runtime, container or capture consumers.
- [x] Master paid-off + credentials constructs no live provider; missing each required credential stays unavailable with no fixture fallback.
- [x] Paid enabled + full injected prerequisites enables recognition, Tailor and logos without extra flag or money value; health/config do not dispatch.
- [x] No monetary admission ledger remains; actual leases, per-workspace dispatch/rate/replay/expiry and private usage accounting retain regressions.
- [x] Logo request keeps automatic moderation and safe refusals; constrained prompt does not treat the brand name as instructions.
- [x] Ignored local env and current docs agree; original logs and completed quality/security protections are preserved except the explicitly reopened money/signoff tradeoff.
- [x] Focused 58-test and all six settled gates pass (380 tests / 71 files, 165 modules); read-only V1 has no actionable findings.
- [x] Both fresh Linux images/runtime/guard/upload/shutdown checks and exact-image scans recorded, preflight matches; no older scanner/image result is claimed for the new candidate.

Actual commands/failures/resolutions, current fingerprint/images, commit records and live/hosted/physical limits are in [RTL-024 validation](../validation/RTL-024.md). The implementation handoff was initially unstaged; subsequent owner approval covers the exact three commits in [file-level allocation](../commit-plans/RTL-024.md). Runtime and evaluation are committed as `012e492` and `06f28d9`; this documentation/release-proof commit closes the allocation and is identified by Git history. Paid calls and publication remain unauthorized.

## Precision references

- [Environment parser](../../apps/backend/src/config/environment.ts), [runtime composition](../../apps/backend/src/runtime/compose.ts), [admission](../../apps/backend/src/security/admission.ts).
- [Logo prompt](../../apps/backend/src/brand/context.ts), [actual provider](../../apps/backend/src/providers/logos.ts).
- [Security preservation](../engineering/SECURITY.md), [provider operations](../operations/PROVIDERS.md), [release instructions](../operations/RELEASE.md), [release status](../operations/RELEASE-STATUS.md).
- [Blueprint configuration](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#21-configuration-and-local-operation), [security](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#22-security-admission-and-privacy), [resource controls](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#23-resource-limits-and-cost-control).
