# RTL-025 — Fix cross-platform release proof checks in CI

Status: **Local fix validated and committed; actual GitHub rerun pending**
Baseline: `306b3068b21b668f106f8216f10a26700e1e6f9a`
Owner evidence: screenshots of GitHub Actions run `38462129016`, job `115519705833`, for `306b306`, failing `test/release-preflight.test.mjs:145`: expected `matches-local-linux-candidate`, received `source-mismatch`.
Scope: investigate/fix the supplied quality-workflow failure locally. Follow-up owner approval explicitly authorizes staging/commits after the fix is validated. No GitHub rerun, push, paid operation, publication, credential installation or new service is authorized.

## Concrete problem and intended behavior

The workflow uses Ubuntu while development/packaging occurred on Windows with `core.autocrlf=true`. Snapshot inventory hashes actual file bytes, correctly including line endings. A checkout transformation can therefore make a committed source manifest differ from a previously built Windows-context Linux image, despite identical normalized Git content. Confirm the discrepancy file-by-file before implementing a fix; do not guess or weaken the test to accept mismatches.

Enforce LF for repository text checkouts using `.gitattributes`, with explicit binary asset exclusions. Retain exact byte counts/hashes and real image/source binding; do not normalize inside hashing, accept any fingerprint, skip the preflight test, or change Git global configuration. Canonicalize only known application build-input text in the current clean worktree, after proving each resulting byte sequence equals its committed Git blob; leave binaries, app-local env, outputs, sibling repos and unrelated content untouched. No semantic app change, flag, provider retry, log suppression or infrastructure redesign.

Add a meaningful temporary-Git regression: Windows-style (`core.autocrlf=true`) and Linux-style (`false`) fresh checkouts of the same committed fixture retain identical actual text/binary bytes and fingerprints; real text edits change the fingerprint. Test actual Git checkout policy, not a static assertion that the attribute file contains a string. Temp directories are task-owned and cleanup validates their resolved path before recursive removal.

Actual Linux checking also exposed a native stress-test isolation problem: the 24-image case passes alone but earlier native catalogue cases retain enough RSS in the same test process for the unchanged 640-MiB guard to reject it. Measure that difference and relocate the stress case into its own ordinarily isolated Vitest file. Preserve real fixture generation/decoding, actual RSS measurement, all 24 images, the 17–18-MiB input envelope, every existing assertion/log and the separate overload rejection test. No production worker/guard change, artificial low RSS, skipped test or test-pool relaxation.

## Execution and acceptance

- [x] Compare raw current build inputs with HEAD Git blobs and classify every mismatch; preserve non-secret reproduction evidence.
- [x] Document the exact allocation before source/policy edits; keep all related code/checks read-only during validation.
- [x] Add LF/binary policy and regression; canonicalized current app text exactly matches HEAD, binaries unchanged; no secret files read or replaced.
- [x] Focused snapshot/preflight regression checks pass on both the ordinary Windows workspace and an actual isolated Linux Git checkout where possible. Never label a host-side LF projection as a Linux/GitHub execution.
- [x] Fresh actual Linux image/build/runtime/assets/guard/upload/shutdown evidence identifies canonical bytes; old RTL-024 proof remains historical. Advance preflight selector atomically with new proof and refresh relevant image scanner evidence.
- [x] Six applicable settled gates pass; read-only execute/validate loop ends with no actionable findings. No browser visual claim is needed for checkout/verification policy changes without UI/style edits.
- [x] Current docs identify the corrected source identity and pending actual GitHub run/hosted/paid/physical acceptance. Stage/commit only the exact owned plan after clean validation under the owner's follow-up approval.

Evidence: [actual validation and review](../validation/RTL-025.md), [Linux quality result](../validation/RTL-025/linux-check.json), [exact allocation](../commit-plans/RTL-025.md). 381 tests/72 files and all six gates pass on both Windows and actual local Linux. The added Linux issue was test-process RSS retention; the original stress case now uses its own ordinary isolated worker, with real memory/decoder and unchanged production guard. GitHub's next remote run remains pending.

Implementation commit: `e7825a6bf26ef8604444bb7d045fa3933e375966` — `RTL-025: make release proof checks consistent across checkouts`. The second planned commit saves these final documentation/evidence records; its identity is in Git history. No remote green, paid or hosted completion is inferred.

## Precision references

- [Repository rules](../../AGENTS.md), [actual workflow](../../.github/workflows/quality.yml).
- [Exact snapshot](../../scripts/release/snapshot.mjs), [preflight](../../scripts/release/preflight.mjs), [snapshot tests](../../test/release-snapshot.test.mjs), [failing test](../../test/release-preflight.test.mjs).
- [Release source/image identity](../operations/RELEASE.md#candidate-construction-and-provenance), [current status](../operations/RELEASE-STATUS.md), [historical RTL-024 proof](../validation/RTL-024/containers.json), [its actual validation](../validation/RTL-024.md).
