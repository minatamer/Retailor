# RTL-191 — Enable hosted Shopify with preserved local development

Status: **Planned, not implemented. Deployment and cloud/App Dashboard mutations are held by the owner's latest instruction.**

Follow [the readiness guide](../operations/SHOPIFY-HOSTED-READINESS.md), [existing resource bounds](../operations/SHOPIFY-RESOURCES.md), root instructions and the current release packet. The owner wants Shopify included in the eventual paid-mode deployment while keeping `https://tryretailor.com` and the existing local experience.

Before implementation, write the file-level allocation. Obtain the actual production registration's public Client ID; secrets stay private and are not required for independent local mocked/configuration tests. Recommended separate local/production registrations avoid changing the working loopback App URL.

## Acceptance

1. Select source-controlled local/production app metadata with existing APP_ENV; keep local Client ID/current secrets/filesystem behavior working. No merchant credentials/address form, extra non-secret env flags, hardcoded visitor store or fake live fallback.
2. Replace the unconditional production refusal only with validated production prerequisites. Require a dedicated shared GCS ledger and exact platform credentials/encryption key. Reject local/fixture production storage and checkout-bucket reuse. Test profile isolation and inert construction/health/config.
3. Implement/review the proposed authenticated private-backend maintenance path, independently scheduled with existing60s cadence and40-call/55s sweep bounds. No public frontend cron operation, arbitrary targets, spoofable-header identity or weakened origin/admission/lease/cap controls. Negative public/anonymous tests and actual Google IAM verification are required. Preserve the one-shot cleanup CLI for operator recovery; avoid the every-minute minimum-billed Job plan without an explicit cost decision.
4. Ensure prompt Disconnect initiates bounded request-owned cleanup within existing control deadlines, persists partial/unknown outcomes and presents ended/pending/cleaned states honestly. Verify closed-browser expiry, restart, overlapping sweeps, ownership/sentinel preservation, heartbeat, delete-before-uninstall and retention.
5. Verify the existing Shopify SVG in fresh production runtime HTTP asset checks. The actual root Docker context already includes identical SVG bytes; no allowlist change is needed. Preserve all photo/font/runtime proofs.
6. Prepare exact non-secret resource/secret-version metadata and Shopify install/callback/webhook fields, separate identities/least-privilege permissions, private ledger generation/retention settings and query-safe logging. Keep real secret values out of artifacts/source/frontend; do not copy local merchant authority to production.
7. Run focused adversarial/config/maintenance/asset tests, six settled gates, actual current production image/runtime/scanner evidence and read-only review. Investigate the recorded first config DEADLINE versus warm success before cutover. Keep external installation eligibility and model/account acceptance honest.
8. When the owner explicitly resumes deployment, use no-traffic revisions and immutable images on the existing services, origins/domain, secret references, finite limits and private backend. Verify the real hosted Connect/read/import/reviewed photo export/update/remove/collection flow, Stripe sandbox and authorised live AI, then record actual traffic/rollback/domain checks. No DNS replacement, new public backend, App Store submission or real-money Stripe payment is included.

Separate-organization installation remains a native acceptance check rather than a guarantee. Independent local implementation should continue where possible when keys/hosted access are pending; do not silently waive required native checks or deploy during the hold.
