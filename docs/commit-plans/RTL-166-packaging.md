# RTL-166 file-level commit allocation

10 November2026. Latest owner instruction explicitly authorizes staging and committing the validated pending work in multiple ticket-prefixed commits, before walking through native Shopify setup. This supersedes historical no-stage/no-commit notes only for the paths below. No push, branch/history rewrite, app form submission, real credential read, native provider call, tunnel, cloud change or publication is authorized by packaging.

The earlier RTL-156 planning packet receives its own documentation commit; RTL-157–160 stay planned and unimplemented. Shared source files land once in their final validated state. The exact Zod4.6.6 security prerequisite is included with the contracts/manifests rather than producing inconsistent lockfiles. Backend wiring follows its modules; the integrated frontend stage, renderer and existing journey adjustments stay cohesive. Individual intermediate commits are not represented as separately tested releases; final combined bytes have the recorded Windows/Linux773-test/six-gate acceptance and fingerprint `6a5206b380a8af0f604ad7d300e10726733954c447e74337ec4b8aa43604a7f8`.

Before each commit: stage only its explicit paths, compare index blobs with frozen source bytes, inspect the staged diff for forbidden paths/secrets/generated outputs, and require `git diff --cached --check`. Preserve all files and prior evidence. No app inputs are edited during packaging. Documentation clarifies one app-wide OAuth client credential pair plus Retailor encryption, with user-specific tokens obtained only through consent and stored in the ignored encrypted ledger. Final index/worktree, hashes, source continuity and actual commits are recorded in [packaging evidence](../validation/RTL-166-COMMITS.md).

## 01 · RTL-156: preserve the validated demo improvement plan

- `docs/commit-plans/RTL-156.md`
- `docs/engineering/DEMO-IMPROVEMENTS-PLAN.md`
- `docs/tickets/RTL-156-plan-demo-improvements.md`
- `docs/tickets/RTL-157-baseline-production-mobile-performance.md`
- `docs/tickets/RTL-158-temporary-store-urls-and-public-seo.md`
- `docs/tickets/RTL-159-consented-ga4-ecommerce.md`
- `docs/tickets/RTL-160-measured-performance-improvements.md`
- `docs/validation/RTL-156.md`

## 02 · RTL-161: document the Shopify integration plan

- `docs/commit-plans/RTL-161.md`
- `docs/engineering/SHOPIFY-DEMO-INTEGRATION-PLAN.md`
- `docs/tickets/RTL-161-plan-shopify-demo-integration.md`
- `docs/validation/RTL-161.md`

## 03 · RTL-162: add Shopify contracts and patched validation dependencies

- `packages/contracts/src/shopify.ts`
- `packages/contracts/src/photos.ts`
- `packages/contracts/src/checkout.ts`
- `packages/contracts/package.json`
- `apps/backend/package.json`
- `apps/frontend/package.json`
- `pnpm-lock.yaml`

## 04 · RTL-162: persist encrypted connection state with bounded ownership

- `.gitignore`
- `apps/backend/src/shopify/product-model.ts`
- `apps/backend/src/shopify/model.ts`
- `apps/backend/src/shopify/storage.ts`
- `apps/backend/src/shopify/ledger.ts`
- `apps/backend/src/shopify/storage.test.ts`
- `apps/backend/src/shopify/gcs.test.ts`

## 05 · RTL-162: implement fixed Shopify OAuth transport

- `apps/backend/src/shopify/provider.ts`
- `apps/backend/src/shopify/provider.test.ts`
- `apps/backend/src/shopify/rate-limit.ts`

## 06 · RTL-162: bind OAuth grants to the original demo session

- `apps/backend/src/shopify/service.ts`
- `apps/backend/src/shopify/fixture.ts`
- `test/fixtures/shopify.ts`

## 07 · RTL-163: implement reviewed owned draft product operations

- `apps/backend/src/shopify/product-provider.ts`
- `apps/backend/src/shopify/product-provider.test.ts`
- `apps/backend/src/shopify/catalogue.ts`

## 08 · RTL-164: implement owned cleanup and signed lifecycle deliveries

- `apps/backend/src/shopify/cleanup.ts`
- `apps/backend/src/shopify/webhooks.ts`

## 09 · RTL-164: add the independent bounded cleanup runner

- `apps/backend/src/shopify/runner.ts`
- `apps/backend/src/shopify/runner.test.ts`

## 10 · RTL-164: wire guarded Shopify operations into the backend

- `packages/contracts/src/api.ts`
- `apps/backend/src/config/environment.ts`
- `apps/backend/src/config/shopify.ts`
- `apps/backend/src/shopify/routes.ts`
- `apps/backend/src/runtime/compose.ts`
- `apps/backend/src/http/app.ts`
- `apps/backend/src/server.ts`
- `apps/backend/src/shopify/cleanup-cli.ts`
- `apps/backend/.env.example`
- `test/no-network.setup.ts`

## 11 · RTL-162: verify OAuth configuration and session isolation

- `apps/backend/src/config/shopify.test.ts`
- `apps/backend/src/shopify/service.test.ts`

## 12 · RTL-163: verify draft ownership and bounded product validation

- `apps/backend/src/shopify/catalogue.test.ts`

## 13 · RTL-164: verify cleanup recovery retention and webhooks

- `apps/backend/src/shopify/cleanup.test.ts`

## 14 · RTL-162: forward fixed Shopify operations through the private bridge

- `apps/frontend/next.config.mjs`
- `apps/frontend/src/server/backend.server.ts`
- `apps/frontend/src/server/bridge.ts`
- `apps/frontend/src/server/shopify-bridge.test.ts`

## 15 · RTL-165: add typed browser requests and safe error references

- `apps/frontend/src/http/api-error.ts`
- `apps/frontend/src/http/response.ts`
- `apps/frontend/src/features/shopify/request.ts`
- `apps/frontend/src/features/shopify/request.test.ts`

## 16 · RTL-165: add the session-owned Shopify connection controller

- `apps/frontend/src/features/shopify/controller.ts`

## 17 · RTL-165: integrate optional onboarding and dashboard connections

- `apps/frontend/src/features/shopify/connections.tsx`
- `apps/frontend/src/features/shopify/connections.module.css`
- `apps/frontend/src/features/shopify/controller.test.ts`
- `apps/frontend/src/components/ui/icon.tsx`
- `apps/frontend/src/features/assistants/context.ts`
- `apps/frontend/src/features/dashboard/owner-navigation.tsx`
- `apps/frontend/src/features/dashboard/owner-workspace.tsx`
- `apps/frontend/src/features/demo/workspace.tsx`
- `apps/frontend/src/features/operations/state.ts`
- `apps/frontend/src/features/photos/controller.ts`
- `apps/frontend/src/features/session/context.tsx`
- `apps/frontend/src/features/session/controller.ts`
- `apps/frontend/src/features/session/projection.ts`
- `apps/frontend/src/features/assistants/conversation.test.ts`
- `apps/frontend/src/features/assistants/operations.test.ts`
- `apps/frontend/src/features/assistants/setup.test.ts`
- `apps/frontend/src/features/assistants/tour.test.ts`
- `apps/frontend/src/features/bag/shopping.test.ts`
- `apps/frontend/src/features/currency/currency.test.ts`
- `apps/frontend/src/features/checkout/checkout.test.ts`
- `apps/frontend/src/features/dashboard/model.test.ts`
- `apps/frontend/src/features/operations/operations.test.ts`
- `apps/frontend/src/features/logos/session.test.ts`
- `apps/frontend/src/features/session/auto-linking.test.ts`
- `apps/frontend/src/features/session/controller.test.ts`
- `apps/frontend/src/features/session/export.test.ts`
- `apps/frontend/src/features/session/hero-photos.test.ts`
- `apps/frontend/src/features/session/page-layouts.test.ts`
- `apps/frontend/src/features/session/reviews.test.ts`

## 18 · RTL-166: bind release preflight to the verified Linux candidate

- `scripts/release/preflight.mjs`
- `test/release-preflight.test.mjs`
- `docs/validation/RTL-166/containers.json`
- `docs/validation/RTL-166/dependencies.json`
- `docs/validation/RTL-166/linux-ci.json`
- `docs/validation/RTL-166/source.json`

## 19 · RTL-166: describe the locally verified integration in project guides

- `README.md`
- `apps/backend/README.md`
- `apps/frontend/README.md`

## 20 · RTL-164: document setup credential ownership and cleanup recovery

- `docs/operations/SHOPIFY.md`
- `docs/engineering/LIFECYCLE.md`

## 21 · RTL-166: prepare Shopify resource and portfolio handoffs

- `docs/operations/SHOPIFY-RESOURCES.md`
- `docs/operations/SHOPIFY-PORTFOLIO.md`

## 22 · RTL-166: record the pending native and hosted release gates

- `docs/operations/RELEASE.md`
- `docs/operations/HOSTED-VERIFICATION.md`
- `docs/operations/RELEASE-STATUS.md`

## 23 · RTL-162: record local validation and remaining native checks

- `docs/commit-plans/RTL-162.md`
- `docs/tickets/RTL-162-shopify-auth-and-durable-connections.md`
- `docs/validation/RTL-162.md`

## 24 · RTL-163: record local validation and remaining native checks

- `docs/commit-plans/RTL-163.md`
- `docs/tickets/RTL-163-shopify-products-and-owned-exports.md`
- `docs/validation/RTL-163.md`

## 25 · RTL-164: record local validation and remaining native checks

- `docs/commit-plans/RTL-164.md`
- `docs/tickets/RTL-164-shopify-cleanup-and-session-lifecycle.md`
- `docs/validation/RTL-164.md`

## 26 · RTL-165: record local validation and remaining native checks

- `docs/commit-plans/RTL-165.md`
- `docs/tickets/RTL-165-shopify-onboarding-and-connections.md`
- `docs/validation/RTL-165.md`

## 27 · RTL-166: finalize the documented Shopify delivery and commit record

- `docs/README.md`
- `docs/tickets/README.md`
- `docs/RETAILOR_DEMO_SOURCE_OF_TRUTH.md`
- `docs/RETAILOR_OVERVIEW.html`
- `docs/commit-plans/RTL-166.md`
- `docs/tickets/RTL-166-shopify-verification-and-portfolio-handoff.md`
- `docs/validation/RTL-166.md`
- `docs/commit-plans/RTL-166-packaging.md`
- `docs/validation/RTL-166-COMMITS.md`
