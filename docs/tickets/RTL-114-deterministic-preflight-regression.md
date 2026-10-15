# RTL-114 — fix the preflight unit test's historical-source assumption

16 October 2026. Owner reports629/630 tests passing with the default preflight test expecting `matches-local-linux-candidate` but receiving `source-mismatch`, then requests a fix. The current app has deliberate changes after the fixed RTL-025 Linux image record; the guard's rejection must stay truthful.

Acceptance:

1. The ordinary unit suite tests preflight behavior without requiring every app edit to match a historical image. Exercise the actual `preparePreflight` composition with explicit matching and stale source fixtures; assert exact positive/negative verdicts and candidate fingerprint/image binding.
2. The actual default reader still verifies its current raw source against the fixed saved Linux evidence, returns the correct comparison, reads bounded public metadata only and never loads app env or accesses a network. Retain public/publication/paid acceptance as false and request counts at zero for both controlled outcomes.
3. Real release preflight remains strict: stale evidence returns `source-mismatch` and CLI exit1. Do not accept/normalize a mismatch, skip a test, weaken source hashing/checkout policy, alter saved proof/image/scanner metadata, relax worker isolation or change production code/CI gates.
4. Record actual current-versus-historical source evidence, focused preflight/snapshot results, all six settled repository gates and read-only review. Keep real current Linux/image/scanner/hosted/paid/public/remote-CI acceptance explicitly pending; test fixtures do not provide any of those proofs.
5. Preserve other work, logs, network isolation, secrets and dedicated local services. Scope is the six allocated test/documentation paths, with no browser/provider/cloud/service action or Git mutation.

Precision references: [allocation](../commit-plans/RTL-114.md), [validation](../validation/RTL-114.md), [RTL-025 checkout/byte regression](RTL-025-fix-cross-platform-release-proof-check.md), [candidate source/image rules](../operations/RELEASE.md#candidate-construction-and-provenance), `scripts/release/preflight.mjs`, `scripts/release/snapshot.mjs`, current `test/release-preflight.test.mjs` and `test/release-snapshot.test.mjs`, root rules and RTL-023 quality/security source-binding dispositions. Latest owner fix request supersedes the old test's assumption of a fresh historical candidate, without reopening exact-byte mismatch rejection.

Status: **Locally implemented and reviewed.**11/11focused tests and all six repository gates pass, including632/632 tests across102files. Actual unmocked release CLI still rejects the historical image record with source-mismatch/exit1; production guard, source bytes, proof and CI/isolation controls are unchanged. [Validation](../validation/RTL-114.md) records actual evidence and clean read-only review. Remote GitHub/current Linux/image/scanner/hosted acceptance remains pending; six owned paths are unstaged, with no Git or external action.

Later owner approval explicitly authorizes staging/committing the six validated paths under the updated allocation. The earlier unstaged/no-Git status describes the implementation checkpoint. The single commit's identity and final clean-tree verification are recorded in Git history and the local packaging ledger; no push or new external acceptance is included.
