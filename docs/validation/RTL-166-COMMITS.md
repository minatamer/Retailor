# RTL-166 staging and commit evidence

10 November2026. The owner explicitly authorizes file-level staging and multiple ticket-prefixed commits before native Shopify setup guidance. [Exact allocation](../commit-plans/RTL-166-packaging.md). This later authorization supersedes dated no-stage/no-commit observations for these128 allocated paths. The earlier RTL-156 research packet is committed separately; RTL-157–160 remain planned, with no feature implementation.

## Acceptance and index checks

Starting HEAD: `436f15b3605335538b1c535f795871e254ed12dc`. The index was empty. Frozen all128 working paths, checked exact coverage/no duplicate allocation, and refused unallocated paths. Before every commit, compared index blob hashes against frozen Git-filtered bytes, independently retained raw working-file hashes, read/screened the full staged diff for real credential shapes and generated/local paths, and required `git diff --cached --check`. Application build-input index bytes additionally equal the actual working bytes, preserving LF without normalizing inside hashing. Each completed commit's path set independently matches its allocation; the index is empty before final documentation staging.

The final combined application fingerprint remains `6a5206b380a8af0f604ad7d300e10726733954c447e74337ec4b8aa43604a7f8`, identical to the accepted Windows/Linux773-test, six-gate source/image evidence. No application inputs or tests changed while packaging. Full suites are therefore not rerun solely for Git object creation or Markdown changes. Current source preflight returns `matches-local-linux-candidate`; publication/public release acceptance remains false. Ignored app-local secrets/ledger, raw scanner output, build/log/browser artifacts and dependency output remain local.

## Actual implementation and evidence commits

| #   | Commit                                                 | Subject                                                              | Files |
| --- | ------------------------------------------------------ | -------------------------------------------------------------------- | ----- |
| 1   | `8b522e5`                                              | RTL-156: preserve the validated demo improvement plan                | 8     |
| 2   | `c0e775a`                                              | RTL-161: document the Shopify integration plan                       | 4     |
| 3   | `59863b6`                                              | RTL-162: add Shopify contracts and patched validation dependencies   | 7     |
| 4   | `75d8bc9`                                              | RTL-162: persist encrypted connection state with bounded ownership   | 7     |
| 5   | `00c5d75`                                              | RTL-162: implement fixed Shopify OAuth transport                     | 3     |
| 6   | `2c57208`                                              | RTL-162: bind OAuth grants to the original demo session              | 3     |
| 7   | `c4f4226`                                              | RTL-163: implement reviewed owned draft product operations           | 3     |
| 8   | `6565497`                                              | RTL-164: implement owned cleanup and signed lifecycle deliveries     | 2     |
| 9   | `ef404a7`                                              | RTL-164: add the independent bounded cleanup runner                  | 2     |
| 10  | `92b8f33`                                              | RTL-164: wire guarded Shopify operations into the backend            | 10    |
| 11  | `6864d78`                                              | RTL-162: verify OAuth configuration and session isolation            | 2     |
| 12  | `3249a02`                                              | RTL-163: verify draft ownership and bounded product validation       | 1     |
| 13  | `e7a0277`                                              | RTL-164: verify cleanup recovery retention and webhooks              | 1     |
| 14  | `7f57f0d`                                              | RTL-162: forward fixed Shopify operations through the private bridge | 4     |
| 15  | `f136258`                                              | RTL-165: add typed browser requests and safe error references        | 4     |
| 16  | `88a0c7e`                                              | RTL-165: add the session-owned Shopify connection controller         | 1     |
| 17  | `2dfee5a`                                              | RTL-165: integrate optional onboarding and dashboard connections     | 29    |
| 18  | `fab4b03`                                              | RTL-166: bind release preflight to the verified Linux candidate      | 6     |
| 19  | `04452bc`                                              | RTL-166: describe the locally verified integration in project guides | 3     |
| 20  | `abb6eed`                                              | RTL-164: document setup credential ownership and cleanup recovery    | 2     |
| 21  | `fa646d0`                                              | RTL-166: prepare Shopify resource and portfolio handoffs             | 2     |
| 22  | `564ed01`                                              | RTL-166: record the pending native and hosted release gates          | 3     |
| 23  | `faec5dc`                                              | RTL-162: record local validation and remaining native checks         | 3     |
| 24  | `3c36764`                                              | RTL-163: record local validation and remaining native checks         | 3     |
| 25  | `3a96dfa`                                              | RTL-164: record local validation and remaining native checks         | 3     |
| 26  | `1d1ff56`                                              | RTL-165: record local validation and remaining native checks         | 3     |
| 27  | This record's commit; exact identity is in Git history | RTL-166: finalize the documented Shopify delivery and commit record  | 9     |

The final commit includes this record, the file-level plan and current shared status/handoff docs. Its own hash is deliberately not self-embedded. Post-commit checks verify all27 subjects/path sets, a clean worktree/index, unchanged application fingerprint and continued false publication authority; actual results are reported to the owner and retained in ignored `artifacts/local/RTL-166-postcommit.json`.

## Credential model and remaining work

One Retailor OAuth app client ID/secret serves every Shopify-permitted user, including the developer through the same Connect CTA. A separate Retailor encryption key protects automatically obtained per-user grants. No manually supplied store access token or store selection is put in `.env.local`; real app credential values were not read, entered or committed in this packaging phase. [Setup explanation](../operations/SHOPIFY.md#owner-setup-later).

No push, branch switch/history rewrite, native provider request, app form submission, public tunnel, cloud mutation or deployment. The existing native/outside-organization/hosted/review/scanner-login prerequisites stay pending. A later HTTPS origin and owner-entered app credentials are needed before real local consent; `tryretailor.com` still identifies the older deployed build. GitHub/portfolio publication remains the owner's later action, with the prepared copy distinguishing simulation from native evidence.
