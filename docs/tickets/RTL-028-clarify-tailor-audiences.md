# RTL-028 — clarify Tailor's customer and owner help

Owner visual feedback, 14 October 2026: make it clear that Tailor helps both customers and store owners, and separate the two illustrated conversations into two cards stacked vertically. The supplied landing-page screenshot identifies the existing Meet Tailor section.

## Required behavior and scope

- The Meet Tailor introduction explicitly names customers and store owners, with plain descriptions of useful help for each.
- Show exactly two distinct conversation cards, customer first and store owner second, stacked at every width. Each card has a visible semantic audience heading and its own complete example exchange.
- Retain the existing Retailor visual language, Tailor identity, illustrative-conversation disclosure, real catalogue context, and the section's surrounding layout. Examples are illustrative content, without new controls, workspace state, provider requests or capability claims beyond existing roles.
- Keep copy readable and cards free of clipping/overlap at phone, tablet and desktop sizes. Preserve designed motion and keyboard/navigation behavior.
- Preserve all pending RTL-026 and RTL-027 changes. No staging, commits, dependencies, paid/cloud actions or delegation.

## Precision references

- Owner screenshot and request in this chat; `apps/frontend/src/features/landing/landing.tsx` Meet Tailor section and its CSS module.
- [Source of truth](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md): sections 4.3–4.4 (landing hierarchy/copy), 15.1 (distinct Tailor role capabilities), and 24.4–24.6 (motion, responsive behavior and accessibility).
- [Landing design](../design/LANDING.md): responsive/copy decisions and static illustrative landing boundary.
- Root/frontend `AGENTS.md`; installed Next CSS Modules documentation at `apps/frontend/node_modules/next/dist/docs/01-app/01-getting-started/11-css.md#css-modules`.

## Verification and status

Check actual rendered content/card order and responsive fits at 320, 375, 768, 1024, 1280, 1440 and 1920 pixels, plus an intermediate width and short laptop height. Inspect headings and surrounding navigation without adding tests that merely assert static markup. Run the six required root gates and review the settled complete diff read-only. Retain the known current-source Linux/scanner evidence gap; do not weaken or skip strict preflight checks.

Status: requested local UI revision implemented; actual responsive and keyboard/heading checks pass. Format, lint, typecheck, boundaries and build pass. Full units: 388/389 pass, with the existing exact-source Linux-proof mismatch still pending. [File allocation](../commit-plans/RTL-028.md); [actual evidence and limits](../validation/RTL-028.md). No staging or commit.
