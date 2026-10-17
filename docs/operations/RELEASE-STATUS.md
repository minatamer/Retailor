# Retailor release status

## Current deployed candidate — 17 October2026

The owner authorizes the first Retailor Cloud Run deployment. [RTL-154 actual validation](../validation/RTL-154.md) and [sanitized deployed metadata](../validation/RTL-154/hosted.json) identify project `retailor-511714`, region `europe-west1`, immutable registry tag `rtl154-eb704fb` and fingerprint **`645969e052880bbb143a0ff345e82c1b914520eeb1ea2f3c680342e027d4470f`**,307 exact application inputs. The F20 Docker-context omission is corrected. All six settled gates pass on actual local Linux at workflow Node24.19.0/pnpm11.25.0:674 tests/106 files,209 boundary modules and both production builds. [Exact current Linux record](../validation/RTL-154/linux-ci.json), [actual container proof](../validation/RTL-154/containers.json) and [fresh scans](../validation/RTL-154/scout.json) replace stale app evidence without changing hashing or the mismatch regression.

| Service                      | Actual active revision        | Runtime access                                                      |
| ---------------------------- | ----------------------------- | ------------------------------------------------------------------- |
| Frontend `retailor-frontend` | `retailor-frontend-00001-fp5` | Public, per the owner's latest explicit instruction                 |
| Backend `retailor-backend`   | `retailor-backend-00002-z6r`  | IAM private; frontend identity is the sole explicit service invoker |

The [public frontend](https://retailor-frontend-188132745113.europe-west1.run.app) opens without authentication; the backend remains **IAM private**. Backend bridge origin/audience use the observed primary `https://retailor-backend-xmacampiyq-ew.a.run.app`. Both services route100% to the recorded ready revisions, use distinct identities and the documented finite resource limits, request-based CPU, minimum0/maximum1 and TCP frontend/HTTP backend startup probes. All five owner-created environment-named secrets are bound as exact version1 to the backend only. No secret value or token is displayed/committed; the frontend has no secret binding or Secret Manager grant.

Initial private HTTPS verification passes10 denials across both managed URL pairs,3 authenticated backend health/ready/config checks and36 frontend page/config/asset checks. After the owner's explicit instruction to remove frontend authentication,36 public frontend delivery checks,4 continued backend denials and wrong-origin admission403 pass. The actual frontend workload identity reaches the private backend. All20 sample photos and fonts/licences match exact hashes. Paid AI stays off and vision/Tailor unavailable; native local logos remain available independently. Sandbox checkout credentials are bound, with actual checkout verification pending. The first verifier rejects native-logo availability using an obsolete paid-logo rule; current source/tests establish zero-model local logos, and three new regressions preserve paid-mode/vision/Tailor rejection while accepting native capability. The corrected hosted run passes; its initial failure remains recorded.

Fresh image scans retain50 entries per image,0 Critical/8 High/4 Medium/38 Low, with the same complete findings/fix metadata as RTL-143. No blanket safety or new vendor fix is claimed. The existing checkout bucket still has enforced public-access prevention, uniform access, one-day delete lifecycle and zero soft-delete retention; only the backend's required bucket/signing/quota permissions are added. No object, payment or model operation is exercised.

Google Cloud metadata confirms a monthlyUSD5 **Cloud Run-only** cap in `CONFIGURED` state and aUSD10 whole-project alert budget at50/80/100%. Other services and OpenAI are outside that Cloud Run cap; no cap-refusal/in-flight-delay test is claimed. The owner reports an OpenAIUSD5 cap; actual cutoff/reset/overlap/outstanding-usage/auto-recharge/retention evidence remains unverified. [Google's current cap scope and limits](https://docs.cloud.google.com/billing/docs/how-to/budgets-spend-caps) distinguish configured service pausing from a zero-overrun total-cost guarantee.

The owner has not purchased `tryretailor.com` and reports adding the generated hostname to Turnstile. After initially declining a temporary public paid exception, the owner explicitly requests removing **frontend** authentication and keeping the backend private. Frontend-only public invocation is applied and verified; paid AI remains off. Domain/Cloudflare seal/rate/all-origin and independent account checks, connected hosted paid smoke, storage signing/payment rechecks and physical/visual/lifecycle acceptance remain pending. Public access does not claim those requirements passed. First-release recovery is paid off plus frontend closure; there is no compatible prior pair. No Git push, domain purchase or paid provider call occurs. Historical records below remain dated evidence.

## Previous local candidate — 16 October2026

RTL-142 repeats the quality review and fixes restored runtime-mode authority. RTL-143 repeats STRIDE/dependency/native/image review, applies Next16.4.1 and removes multipart fragment-list memory amplification. Both preserve the demo's behavior and architecture. [Current quality evidence](../validation/RTL-142.md), [security review](../audits/RTL-143-SECURITY.md) and [actual security validation](../validation/RTL-143.md) distinguish checks from limitations.

Current fingerprint **`f7ffdfa63bed81093ab655bf271351450036b0993a633eef7d24b48bedb1e9c5`**,303 exact inputs. All six gates pass on Windows and actual local Linux at workflow Node24.19.0/pnpm11.25.0:648 tests/102 files,206 boundary modules, both production builds. [Independent Linux record](../validation/RTL-143/linux-ci.json) compares372 source/test/tool/config files byte-for-byte; it is not a GitHub job. Preflight now selects the [current exact container proof](../validation/RTL-143/containers.json) and still rejects stale/mismatched evidence, with public acceptance/publication false.

| Role     | Current tested local image                                                |
| -------- | ------------------------------------------------------------------------- |
| Frontend | `sha256:fec205daf664dc342c9182acc6d4621b146101119c65623f99a09d4729b6cbc3` |
| Backend  | `sha256:7fe980c0645e5bd4f573b7bb48b827d3af3fa2769c20098d656fd1fd33b106e3` |

Network-disabled Linux startup/assets/guard/full-upload/shutdown and [native logo/raster checks](../validation/RTL-143/native.json) pass. [Fresh scans](../validation/RTL-143/scout.json) retain50 entries per image:0 Critical/8 High/4 Medium/38 Low, with no offered Bookworm fix for the High matches. Two previously Unspecified entries were reclassified High; no IDs were added/removed. The development-only braces advisory remains unpatched. Primary14October Next notices justified the patch despite a zero-advisory production registry audit. Node schedules a further security release for21October; no future fix is invented.

## Current demo and external acceptance

- Normal local fake/paid-off operation: frontend4310, backend4311; `/` and `/demo`. Runtime identity/readiness/logs are recorded in the current validation file; environment secrets remain local.
- Clothing photo intake/review; three independent page-layout families, five palettes and three typography choices; local optional logos and wordmark; connected storefront/dashboard, exact commerce/evidence, USD/EUR display, tours, reset/restore/export and contextual Tailor. Scenario selection and the old36-look wording no longer describe the public onboarding.
- Sandbox-only checkout uses actual selected sanitized derivatives/private storage and verified test payment returns. Native logos use zero model calls. Earlier bounded paid recognition/chat/storage/Stripe observations are in RTL-091/092/097/102/138/140; they do not establish perfect recognition, current cloud policy or production acceptance.
- Public release remains unaccepted. Actual edge header overwrite/rates/all-origin denial, private backend IAM/audience, canonical domain/TLS, hosted capacity, account-wide cutoff/overlap/outstanding usage/retention, current storage lifecycle/IAM and physical/zoom/keyboard checks remain external acceptance. Local evidence is not deployment permission.

Use [manual release packet](RELEASE.md), [evaluation worksheet](EVALUATION.md) and [hosted verification worksheet](HOSTED-VERIFICATION.md). `node scripts/release/preflight.mjs` reads only bounded non-secret metadata and current bytes, never keys or networks. No push, deployment, cloud mutation, new paid request or automation occurs in this audit. Preserve owner-selected paid-master/credential/finite-limit policy; do not restore removed signoff/dollar/logo-enable flags. Retained upstream advisories and the announced Node release require supported vendor follow-up before relevant external acceptance.

## Historical 13October handoff

<details>
<summary>Earlier RTL-023/024/025 identities and dated acceptance record, retained verbatim</summary>

RTL-025 corrects the supplied GitHub CI checkout mismatch. Canonical LF app inputs now have fingerprint **`dc7d98dffa86fd6d72ab39c0057019c3a38b0585d4cd4cace5f028257e7930ac`**; [actual fresh Linux proof](../validation/RTL-025/containers.json) identifies frontend `sha256:c4600074e00eeeac5f382a5d585d86df25186ee9dce1d9d18a01531909ac1e82` and backend `sha256:10c8c31d19e65b1145339bd0dd99c3c4ee24d0b0a975f1bdb560b214fc79ded5`. Preflight selects this exact new proof. [New-image scans](../validation/RTL-025/scout.json) retain 50 entries/zero Critical/six unpatched High per image. [Settled validation](../validation/RTL-025.md) records all six gates and **381 tests / 72 files passing on both Windows and actual local Linux**, including the original strict preflight assertion and real 24-image stress case with unchanged RSS guard. The actual GitHub job remains unverified until a new owner push/run. No paid/cloud/publication action occurs.

## Historical RTL-024 configuration candidate

Historical RTL-024 configuration simplification is locally validated and committed under the owner-approved file allocation: [380-test/six-gate evidence and commit record](../validation/RTL-024.md), [its actual Linux proof](../validation/RTL-024/containers.json) and [its scanner records](../validation/RTL-024/scout.json). Its Windows-context fingerprint **`d06a9c85580ea0f3ef78f6cb6139bd35533f42fdff8aa809d79b20aabb9d72e0`** matches frontend `sha256:2892a766bb58bb9c0028ec3d0b1aa01dcd4792ecc65d1c7e20e6676c93f79037` and backend `sha256:9c924f7a85bb54b63124d2c3cfa63f0dff76990a3b1c91d65719372c4e072a8c`. This contains the CRLF workspace file diagnosed in RTL-025; current preflight now selects the corrected canonical proof above. Its scans retained the same 50 entries/zero Critical/six unpatched High as RTL-023. No paid/cloud/publication action was approved.

**All 22 tickets' currently authorized independent local work is covered. Public release is unaccepted and has no verified URL.** RTL-001–019 implement the clothing demo and recorded local checks; RTL-020 prepares bounded live evaluation/account acceptance; RTL-021 builds/tests actual Linux images; RTL-022 prepares preflight, read-only hosted verification and recovery worksheets. Required external work is deliberately pending. This is not a hosted Complete claim.

## Available now

- Fake/paid-off local app: frontend 4310, backend 4311; canonical landing `/`, demo `/demo`. Normal launchers refuse occupied ports and do not stop sibling apps.
- Photo/review/Tailor styling, 36 curated looks, optional wordmark/logo path, connected storefront/owner operations, exact chart evidence, simulated orders/stock/returns/costs/scenarios, USD/EUR projection and bounded browser lifecycle/export/reset.
- Retrosum-inspired concurrency: browser 2 jobs; native backend 2 workers/2 waiters; shared paid AI 2 slots, separate from HTTP/platform concurrency. [Actual concurrency research/timings](../engineering/IMAGE-CONCURRENCY.md).
- [Real local visual/keyboard/scenario/expiry evidence](../validation/RTL-019.md), [paid-off evaluation and actual fixed public FX audit](../validation/RTL-020.md), [actual non-root Linux build/asset/config/shutdown evidence](../validation/RTL-021.md), [final local verification-tool evidence](../validation/RTL-022.md).

## Historical RTL-023 candidate identity

Historical approved RTL-023 security application build-input fingerprint **`370eafb8afc5300e424f03ea96f60ace4e9873814a1dfa7ba198a995123cb537`**, 230 input files. [Actual security Linux evidence](../validation/RTL-023/security-containers.json) records baseline `8057f3c` plus its validated security worktree, explicitly dirty when verified; the fingerprint identifies those app bytes. Original RTL-021 and RTL-023 proof remains historical and unmodified; current preflight now reads RTL-025 proof above. Node24.21/OpenSSL3.5.8 and pinned Debian Perl u4/PCRE2 u2 preserve Sharp/native compatibility. [Historical scans](../audits/RTL-023/scout-after-fixes.json) reduced 70 entries/4 Critical to 50/0 Critical per image; six unpatched High OS-package records retain honest applicability. Its production npm audit had zero advisories; dev braces remained vendor-unpatched. No image is declared universally clean.

| Role     | Actual tested local image identifier                                      |
| -------- | ------------------------------------------------------------------------- |
| Frontend | `sha256:87a8ac7f3fe2d988fdb2e0b3e4cc0e70dad5bafb9005af7579e5232e85703566` |
| Backend  | `sha256:cabcd84a3d3fbddc33d7ffd20670f93b1d502fd49f315614cbb3e09eed85dfd7` |

Unpaid network-disabled Linux probes observed frontend 62.13 MiB/512 MiB and backend 53.5 MiB/1 GiB; non-root supplied PORT=8080, public photos/fonts/licences, safe paid-off config, production rejection, native raster and owned SIGTERM passed. Additional guarded probes reject missing/wrong seals, serve legitimate pages/assets and fail enabled missing config safely. A test-only local peer received all 10,485,761 upload bytes without the seal header being forwarded; no provider/IAM result is inferred. These are point-in-time local checks, not peak/registry/IAM/TLS/paid/hosted acceptance. All owned probe containers were removed; existing Retailor watchers were safely reused and sibling services untouched.

## Exact external inputs still needed

1. OpenAI project/key plus actual provisional-model availability, rate/billing, retention policy and approved bounded evaluation budget. Required fresh vision/Tailor results from RTL-020 must be accepted; optional logo quality/output cost must be accepted before enabling that branch. No key or budget was supplied.
2. Owner-approved cloud project/region/registry, distinct runtime service accounts, two service names, exact named secret versions and deploy/registry/IAM mutation scope. No sibling project/identity is inherited.
3. Canonical HTTPS frontend origin, actual backend primary service URL/audience, verified domain/TLS/Cloudflare and Turnstile hostname/site/secret setup. `tryretailor.com` is intended and unconfirmed.
4. Actual registry digests/revisions/traffic, private backend IAM enforcement and working frontend runtime identity, approved capacity/paid smoke and safe logs.
5. Owner aesthetic approval, actual browser zoom/OS/physical-device/virtual-keyboard acceptance and fresh hosted delivery/motion/lifecycle evidence. Captured local resized browser cells do not supply those checks.
6. Actual paid-disable verification and either a known compatible immutable prior pair or explicit first-release disabled/closed recovery. Any traffic-changing rollback drill needs its own authorized scope.
7. Actual Cloudflare trusted seal overwrite/rate calibration/all-primary-tag-alias rejection and external provider refusal/reset/overlap/outstanding-cost evidence, recorded in strict fresh `release-security.json`. Matching images and a process allowance cannot supply this proof. Defaults keep public/paid security readiness false; see [approved security dispositions](../audits/RTL-023-SECURITY.md).

## Next operator steps

Use [manual release packet](RELEASE.md), [evaluation worksheet](EVALUATION.md) and [hosted verification worksheet](HOSTED-VERIFICATION.md), in that order of prerequisites. Start with `node scripts/release/preflight.mjs`: local-only, no env/key/network. Fill only non-secret metadata in ignored `artifacts/local/release-inputs.json`; inspect the fixed read-only command arrays within approved resource scope. Preflight always keeps public acceptance/authorization false. No successful helper, fixture, budget reservation or CLI installation authorizes deployment.

Keep paid off until actual prerequisites/acceptance are satisfied. Default hosted GET checks expect disabled AI; optional capabilities retain honest wordmark/USD fallbacks. All deploy/enable/public-IAM/DNS/paid actions remain explicit future owner decisions. No auto deploy, recurring monitor, third service, storage/database/queue or purchase has been added. The current execute/validate local goal ends with a committed reviewable handoff; original RTL-022 hosted acceptance stays pending.

</details>
