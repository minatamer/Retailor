# RTL-103 — fixed sandbox checkout settings

Status: **Locally implemented and validated.** Exact fixed backend settings and private removal of only the three old `.env.local` entries are verified. [Evidence](../validation/RTL-103.md):29/29focused tests; five passing code/build gates;623/624units with only the existing strict Linux source-proof mismatch; actual running checkout capability and fresh laptop/phone footer proof. No external API or staging/commit action; actual fresh Linux/hosted release acceptance remains pending.

Acceptance:

1. Keep the three exact non-secret settings in backend source and remove their environment schema/example/test overrides and ignored backend `.env.local` entries. No client secret/config leakage or arbitrary environment destination override.
2. Retain optional server-only `STRIPE_API_KEY`, test-only key/result validation and inert imports/construction/health/config. Blank key means unavailable. Keep every existing origin, signed identity, finite rate/concurrency, actual photo, exact quote and return/cancellation/expiry control.
3. Provide `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"` for the existing `GRANT_SIGNING_SECRET` in backend `.env.local`. Do not generate, display or overwrite a real secret.
4. Run focused tests and settled six gates; review full incremental diff read-only, preserve prior unstaged work, record actual capability/browser proof and existing pending release limitations. No Stripe/storage/cloud API mutation or staging/commit/publication.

Precision: [allocation](../commit-plans/RTL-103.md), [private storage/ADC](../operations/CHECKOUT-STORAGE.md), [current single checkout behavior](RTL-097-single-checkout-order-return.md), [RTL-023 approved security dispositions](../audits/RTL-023-SECURITY.md), [security controls](../engineering/SECURITY.md). This changes only the three named non-secret configuration choices; paid AI and all existing test/network isolation remain.
