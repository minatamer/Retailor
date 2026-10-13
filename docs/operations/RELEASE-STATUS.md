# Retailor release status

**All 22 tickets' currently authorized independent local work is covered. Public release is unaccepted and has no verified URL.** RTL-001–019 implement the clothing demo and recorded local checks; RTL-020 prepares bounded live evaluation/account acceptance; RTL-021 builds/tests actual Linux images; RTL-022 prepares preflight, read-only hosted verification and recovery worksheets. Required external work is deliberately pending. This is not a hosted Complete claim.

## Available now

- Fake/paid-off local app: frontend 4310, backend 4311; canonical landing `/`, demo `/demo`. Normal launchers refuse occupied ports and do not stop sibling apps.
- Photo/review/Tailor styling, 36 curated looks, optional wordmark/logo path, connected storefront/owner operations, exact chart evidence, simulated orders/stock/returns/costs/scenarios, USD/EUR projection and bounded browser lifecycle/export/reset.
- Retrosum-inspired concurrency: browser 2 jobs; native backend 2 workers/2 waiters; shared paid AI 2 slots, separate from HTTP/platform concurrency. [Actual concurrency research/timings](../engineering/IMAGE-CONCURRENCY.md).
- [Real local visual/keyboard/scenario/expiry evidence](../validation/RTL-019.md), [paid-off evaluation and actual fixed public FX audit](../validation/RTL-020.md), [actual non-root Linux build/asset/config/shutdown evidence](../validation/RTL-021.md), [final local verification-tool evidence](../validation/RTL-022.md).

## Candidate identity

Application build-input fingerprint **`ffc4eddf45f4a8e323537dd417363b1b9c51dd58766de85a1e49eb832a811d58`**, 220 input files. RTL-021's recorded dirty source is explicitly base `cf471463a944c2acad3f8f16a67029c17f98c5cc` plus its reviewed packaging worktree; it does not pretend those images came from a clean pushed commit. The current committed application inputs match that candidate; release-tool/docs work is outside its app input fingerprint. Rerun preflight on the final clean commit before future evaluation/publication and save fresh candidate evidence. Any application/lock/public-asset/Docker input change requires new Linux checks and relevant live acceptance.

| Role | Actual tested local image identifier |
| --- | --- |
| Frontend | `sha256:b8b05f084e202b239fa666fa11a91e471e1764c2eb23c29fa257f066efcaa2ad` |
| Backend | `sha256:8910fea7e8104f08461cd2607d7d7bac21cf6f0252c62facf0ea16f4c46f5e3e` |

No registry push or cloud service is inferred from these local identifiers. Final isolated Linux observation: frontend 58.85 MiB/512 MiB, backend 52.41 MiB/1 GiB; non-root supplied PORT=8080, all approved public photos/fonts/licences, paid unavailable, invalid production configs rejected, SIGTERM/owned cleanup successful. This is an unpaid point-in-time probe, not peak paid-load or hosted proof. Dedicated host 4310/4311 services were not displaced; Docker test containers publish no ports and are removed, and the existing Docker engine remains running.

## Exact external inputs still needed

1. OpenAI project/key plus actual provisional-model availability, rate/billing, retention policy and approved bounded evaluation budget. Required fresh vision/Tailor results from RTL-020 must be accepted; optional logo quality/output cost must be accepted before enabling that branch. No key or budget was supplied.
2. Owner-approved cloud project/region/registry, distinct runtime service accounts, two service names, exact named secret versions and deploy/registry/IAM mutation scope. No sibling project/identity is inherited.
3. Canonical HTTPS frontend origin, actual backend primary service URL/audience, verified domain/TLS/Cloudflare and Turnstile hostname/site/secret setup. `tryretailor.com` is intended and unconfirmed.
4. Actual registry digests/revisions/traffic, private backend IAM enforcement and working frontend runtime identity, approved capacity/paid smoke and safe logs.
5. Owner aesthetic approval, actual browser zoom/OS/physical-device/virtual-keyboard acceptance and fresh hosted delivery/motion/lifecycle evidence. Captured local resized browser cells do not supply those checks.
6. Actual paid-disable verification and either a known compatible immutable prior pair or explicit first-release disabled/closed recovery. Any traffic-changing rollback drill needs its own authorized scope.

## Next operator steps

Use [manual release packet](RELEASE.md), [evaluation worksheet](EVALUATION.md) and [hosted verification worksheet](HOSTED-VERIFICATION.md), in that order of prerequisites. Start with `node scripts/release/preflight.mjs`: local-only, no env/key/network. Fill only non-secret metadata in ignored `artifacts/local/release-inputs.json`; inspect the fixed read-only command arrays within approved resource scope. Preflight always keeps public acceptance/authorization false. No successful helper, fixture, budget reservation or CLI installation authorizes deployment.

Keep paid off until actual prerequisites/acceptance are satisfied. Default hosted GET checks expect disabled AI; optional capabilities retain honest wordmark/USD fallbacks. All deploy/enable/public-IAM/DNS/paid actions remain explicit future owner decisions. No auto deploy, recurring monitor, third service, storage/database/queue or purchase has been added. The current execute/validate local goal ends with a committed reviewable handoff; original RTL-022 hosted acceptance stays pending.
