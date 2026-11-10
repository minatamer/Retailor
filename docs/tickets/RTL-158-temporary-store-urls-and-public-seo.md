# RTL-158 — add temporary local store addresses and truthful public SEO

Status: **Planned — awaiting owner review and later execution instruction.**\
Planning date: **19 October 2026**\
Depends on: [RTL-157 baseline](RTL-157-baseline-production-mobile-performance.md) recorded\
Blocks: RTL-159 GA4 navigation/privacy integration

## Outcome and authority

An accepted store named demostore uses `https://tryretailor.com/demostore` inside its existing browser-local demo session. The URL cannot recreate or expose that store on another browser/device/incognito session. Add collection and opaque-product-ID routes through existing storefront views and session ownership. Improve the persistent landing's technical SEO while delivering noindex metadata for temporary content.

Read [the complete address/SEO design](../engineering/DEMO-IMPROVEMENTS-PLAN.md#2-readable-addresses-inside-one-temporary-local-session), [lifecycle](../engineering/LIFECYCLE.md), [shopping](../engineering/SHOPPING.md), [checkout storage/returns](../operations/CHECKOUT-STORAGE.md), RTL-023 quality/security and RTL-143 security dispositions. Use the verified apex host from RTL-155; do not configure `www` or a new host. Write a fresh `docs/commit-plans/RTL-158.md` before implementation.

## File and responsibility allocation to refine before edits

- `apps/frontend/src/app`: store Home/Collection/Product route entries, a shared workspace layout/composition as needed, route metadata, `robots.ts`/`sitemap.ts`, landing metadata/structured data. New module names must fit actual App Router constraints.
- `features/session/context.tsx`, `controller.ts`, `projection.ts` and focused route/projection tests: one provider, bounded/default-compatible slug binding, restore/navigation/reset/expiry fences. A small route adapter may map URL intent, never own a parallel graph.
- `features/demo/workspace.tsx`, `features/storefront`, `features/store-design`, dashboard address/navigation surfaces: reuse existing rendering and actions; display address/lifetime copy with designed responsive styling.
- Existing backend checkout redirect/provider, frontend return handler and origin guard are preserved references; fixed `/demo` returns remain unchanged. No API, database, server store lookup or arbitrary redirect.
- Product/engineering/frontend docs, validation `RTL-158.md` and ticket/index: actual behavior/evidence. Preserve current security and release status.

## Acceptance criteria

1. Accepted look allocates a slug: lowercase ASCII/hyphens, max48 characters, deterministic empty/non-Latin fallback, reserved-route fallback and bounded malformed-path rejection. Test `/demo`, `/design`, `/api`, `_next`, metadata and public-file conflicts. Legacy eligible sessions receive local migration without recognition.
2. `/[storeSlug]`, `/[storeSlug]/collection` and `/[storeSlug]/products/[productId]` use the existing controller/BrowseState. All header/card/Tailor/owner/back actions agree with history, product membership and existing dirty-design confirmation. No provider remount per pathname, duplicate controller, navigation/effect loop or lost bag/checkout state.
3. Refresh/direct entry restores only the matching eligible accepted workspace. Missing/unmatched/reset/expired sessions show unavailable plus **Start your own demo**; neutral loading prevents unrelated-store flashes. No lookup by name, automatic sample, cached-other-workspace discovery or public reconstruction. Missing/archived products have a local unavailable state. Memory-only reload failure stays honest.
4. Draft renames leave the address unchanged; accepting a renamed look replaces its binding/current history URL. Old-slug history is unavailable. Same normalized slug remains stable; no alias server. Reset, storage wipe and fixed two-hour expiry retire content and nested URLs; pending/late operations cannot resurrect it. Do not extend lifetime.
5. Both sample and upload paths show the exact planned temporary/non-shareable explanation beside the address in store/owner surfaces. No Share store action or public-link promise. Fresh browser/device/incognito without matching session never shows the original content. Test same-browser new/duplicated tabs and cache-lease rules without weakening them.
6. Stripe fixed `/demo?checkout=...&attempt=...` success/cancel parsing/cleanup and verified once-only local order behavior remain intact before returning to the local address. Missing/reset/stale session creates no order. No caller-selected server return URL.
7. Landing has an apex self-canonical, suitable metadata/social preview and minimal truthful WebSite JSON-LD. Sitemap lists only persistent public routes. Temporary pages/workspace return generic server-visible noindex/nofollow, no inherited landing canonical or merchant/product/review/rating schema. Let crawlers read noindex; do not rely on robots disallow. Fictional reviews remain labelled. All crawler/metadata/route loads dispatch zero paid AI.

## Verification and handoff

Use behavior tests for slug/projection migration, route intents and rejection, one-controller continuity, reset/expiry/late responses and checkout-return fences. Inspect production response HTML/headers/sitemap with JavaScript disabled; assert no store content or AI/checkout-start request on route load. Perform actual changed-path browser checks at320/390px, tablet and desktop: acceptance/rename, refresh/direct-entry/Back/Forward, matching/mismatched sessions, address copy/focus, all storefront layouts, Tailor navigation, owner return and checkout cancellation/completion where authorized. Test external sessions with a known synthetic local store, not visitor data.

Run all six settled gates (`pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm check:boundaries`, `pnpm test:unit`, `pnpm build`), then a read-only complete-ticket review. Record actual environment/results in `docs/validation/RTL-158.md`; missing real Stripe/hosted/physical checks remain pending separately. Refresh applicable exact-byte Linux/image/scanner proof before any later release; no proof inheritance after build-input changes. No external configuration, publication, paid call or Git mutation is authorized by this planning request.
