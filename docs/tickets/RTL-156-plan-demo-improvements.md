# RTL-156 — research analytics, temporary addresses, SEO and performance

Status: **Planning documented; awaiting owner review. No application implementation authorized.**\
Planning date: **19 October 2026**\
Depends on: current source and [RTL-155 domain evidence](../validation/RTL-155.md)\
Follow-on packets: RTL-157 → RTL-158 → RTL-159 → RTL-160

## Outcome and scope

Research and document a portfolio-sized plan for Standard GA4 ecommerce tracking, readable temporary local-session store addresses, appropriate public/temporary SEO and measured performance. Preserve guest access, designs, motion, existing session ownership and working Stripe sandbox checkout. No authentication requirement, new application database, Shopify, A/B tests, public store sharing or paid analytics infrastructure.

This request permits documentation only. Do not implement, begin an implementation execute/validate loop, stage/commit, push, deploy, configure external accounts or dispatch paid requests. Do not touch Roomedy files, processes, ports or secrets. Past release/commit permissions do not authorize this new packet.

## Planning acceptance

1. Read repository instructions, relevant current lifecycle/checkout/release/audit docs and actual route/session/commerce/media/CSP implementation. Distinguish current code from obsolete blueprint assumptions.
2. Consult current official documentation. Explain Standard GA4 cost, automatic versus explicit events, consent, external storage, sensitive URL/content exclusion and purchase deduplication without an analytics service.
3. Provide a browser setup guide, checking the official API alternative without assuming gcloud provisions Analytics. Identify the owner's login/terms/Measurement ID/privacy decisions, build configuration and first-event verification.
4. Define exact local-session matching, reserved slugs, accepted rename, refresh/direct-entry/Back/Forward/reset/expiry behavior and honest non-shareable address UI. Preserve fixed Stripe returns and one controller.
5. Define indexable persistent landing metadata/canonical/sitemap/schema and server-visible noindex temporary routes. Fictional reviews remain fictional; crawler loads dispatch no paid AI.
6. Record actual source/payload findings and a reproducible production-build mobile baseline protocol, with later comparable optimization evidence. Do not invent performance results or browser acceptance.
7. Create dependency-ordered standalone tickets, narrow product Markdown/HTML updates and actual planning-validation notes. Mark every new capability planned.

## Outcome and precision references

- [Practical plan, research and GA4 guide](../engineering/DEMO-IMPROVEMENTS-PLAN.md).
- [Planning file allocation](../commit-plans/RTL-156.md) and [planning checks/limitations](../validation/RTL-156.md).
- [Lifecycle](../engineering/LIFECYCLE.md), [checkout storage/return behavior](../operations/CHECKOUT-STORAGE.md), [RTL-023 quality](../audits/RTL-023-CODE-QUALITY.md), [approved security dispositions](../audits/RTL-023-SECURITY.md), [current security review](../audits/RTL-143-SECURITY.md).
- Implementation candidates: [RTL-157](RTL-157-baseline-production-mobile-performance.md), [RTL-158](RTL-158-temporary-store-urls-and-public-seo.md), [RTL-159](RTL-159-consented-ga4-ecommerce.md), [RTL-160](RTL-160-measured-performance-improvements.md).

No production mobile timing, Google account readiness/event receipt, new route behavior, SEO indexing, live provider result or before/after improvement is claimed by this planning packet. These require their own later evidence.
