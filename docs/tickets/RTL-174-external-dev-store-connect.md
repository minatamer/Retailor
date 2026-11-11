# RTL-174 — Connect eligible external development stores

## Status and authority

11 November 2026. **Local candidate implemented and validated; full external-install acceptance incomplete.** The owner requests extensive research, implementation, documentation and an execute/validate loop for unrelated visitors connecting their own Shopify dev stores without supplying API keys or submitting for review. Latest direction: **continue local work first**, deferring Dev Dashboard sign-in. No distribution selection, app review submission, credential change, tunnel/certificate, deployment, paid request, delegation or Git staging/commit is included. Starting clean HEAD `e44423059932d7c6b9584381e529fa36aa92e78e`.

## Precision references

- [Research and evidence distinctions](../research/SHOPIFY-EXTERNAL-DEV-STORES.md): Shopify staff's April 2026 reproduction of unrelated partner dev-store installation for undecided/draft public apps; distinguish this from organization-bound previews and custom store-restricted distribution.
- [Standalone authorization code grant](https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens/authorization-code-grant), [distribution](https://shopify.dev/docs/apps/launch/distribution), [dev-store restrictions](https://shopify.dev/docs/apps/build/stores/development-stores).
- Existing RTL-162–172 contracts, service/provider/ledger, fixed bridge, one frontend session controller, tours, products/import/export/media/collection and cleanup controls remain authoritative. RTL-023 quality/security dispositions and root AGENTS.md remain required.
- [Owner setup](../operations/SHOPIFY-LOCAL-SETUP.md), [operations](../operations/SHOPIFY.md), [resource/acceptance worksheet](../operations/SHOPIFY-RESOURCES.md).

## Acceptance

1. Replace the organization-bound Dev Dashboard preview URL with a Shopify-hosted install entry derived from the shared public Client ID. Never hardcode a visitor's store, add a Retailor address/credential form, invent account discovery, or silently fall back to the owner-only preview. Keep full-page navigation and signed App URL → per-store code grant → callback.
2. Allow only the narrow Shopify install URL and existing per-shop OAuth destinations in the public contract; reject redirect, organization/store binding, credential, host, scheme and query tampering. Keep shared app secret/encryption key server-only and normal HTTP loopback locally; add no environment settings or dependencies.
3. Preserve HMAC/freshness, cookie/tab proof, nonce/single-use exchange, original expiry, dev-plan verification, capacity/conflict/cleanup and per-store encrypted tokens. Prove two distinct shops/workspaces can connect with shared app credentials and cannot read each other's status. Existing non-dev rejection and auth/cleanup regressions remain passing.
4. Prepare hosted configuration without the obsolete blanket owner-preview production refusal; require shared durable storage in production and retain all other existing guards. No deployment or hosted acceptance claim follows.
5. Fully document the recommended undecided/draft public + managed-install setup, identity/store eligibility, local callback limitations, exact public/secret fields, visitor flow and account troubleshooting. Do not recommend custom distribution as universal self-service access. Record primary docs, staff clarification, GitHub/tutorial evidence and conflicting/limited reports, with confidence boundaries. If already Custom, owner must resolve registration before external acceptance; never rotate a live ledger's app identity/key to work around this.
6. Run meaningful focused checks, all six repository gates, and a settled read-only review without edits. Record actual unauthenticated browser observation separately from injected auth tests. Native store picker/consent/callback on a separate organization, Dev Dashboard settings and hosted proof remain explicitly pending until performed. Do not mark the overall requirement complete from local simulation or own-store success.

## Progress

- Research distinguishes native distribution restrictions from Retailor's per-shop OAuth. Generic managed-install entry reaches actual Shopify sign-in in Codex's in-app browser; authenticated selection is unverified.
- **Material research correction:** newer August 2026 Shopify staff guidance limits public drafts to same-organization dev stores, contradicting the April reproduction. Undecided external behavior also remains unverified. Criterion 4's production enablement is deferred rather than silently accepted: retain the existing production refusal. The local organization-independent entry is a candidate to validate, not a proven review-free external flow. Full external acceptance remains incomplete.
- Focused six-file offline regression suite: 70 tests pass. All six final gates pass, including **834 tests / 124 files** and both builds. Settled read-only review finds no actionable local code defect; the overall ticket remains incomplete because supported outside-user installation and native acceptance have not been established. [Actual evidence and coverage](../validation/RTL-174.md). No staging or commits.
