# Shopify portfolio and GitHub handoff

Prepared10 November2026. Local implementation and simulated/injected verification are complete; **real Shopify credentials/consent/API, unrelated-organization installs, hosted cleanup and review are pending**. Root/app READMEs now describe that boundary. No external GitHub About/topics, portfolio or proposal has been edited/published.

## Copy usable now

**GitHub About:** Clothing commerce demo with a standalone Shopify OAuth and draft-product integration, locally tested with simulated providers; native Shopify verification pending.

**Topics:** `shopify`, `oauth2`, `graphql`, `nextjs`, `react`, `typescript`, `express`, `ecommerce`, `portfolio`.

**Portfolio description:** Built Retailor's optional Shopify connection for a temporary clothing-store demo: standalone OAuth, read-only catalogue browsing, reviewed draft product/variant/image exports and updates, and exact-owned cleanup on disconnect/reset/expiry. Added encrypted durable connection state, expiring-token refresh, signed webhooks, bounded independent cleanup and responsive onboarding/dashboard controls. Validated locally with simulated Shopify, real raster sanitization, SQLite restart/concurrency tests and the repository's quality gates. Native test-store and hosted verification are still pending.

**Job-proposal wording:** I have implemented a standalone Shopify integration in my Retailor portfolio project, including OAuth, fixed GraphQL product operations, variants/images and session-owned cleanup. Its automated and local simulation checks pass; I have not yet completed testing against a real Shopify store. I can discuss the code and failure handling concretely without claiming production merchant experience.

## Wording after native evidence

Only after the owner completes the [native worksheet](SHOPIFY-RESOURCES.md#native-acceptance-record), replace the pending sentence with the exact tested store class/date and supported operations. Example: “Tested on my Shopify development store with real consent, draft exports/read-back/updates/deletion and independent cleanup.” Keep outside-organization/public/hosted claims absent until their own checks pass. Do not imply Shopify theme development, App Store approval, production merchants, live orders, inventory synchronization or real payments.

## Screenshot and walkthrough checklist

- Capture optional Connect/Skip before the storefront and Connections after Personalize on desktop/phone.
- Show actual consent and eligible test-store destination only after owner setup. Current `artifacts/local/RTL-165/{onboarding-desktop,connections-desktop,review-phone}.jpg` are explicitly simulated local screenshots.
- Demonstrate that Connect creates nothing; a preexisting sentinel is read-only; garment selection/review precedes export; all variants/photos/prices are correct.
- Change a local field and show it remains unchanged remotely until Update; then selected Remove and whole Disconnect with verified outcomes.
- Explain unknown/partial/access-loss/manual states honestly. Native closed-browser expiry/restart and signed deliveries need their own actual observations.
- Exclude store/account-private identifiers, OAuth query values, tokens, credentials, signed staging URLs, raw payloads and unrelated browser tabs. Use fictional clothing/business data.

**Owner reminder:** after real Shopify testing, update the README feature/limitations line, GitHub About/topics, portfolio description/screenshots/video and reusable Shopify proposal wording together. The local drafts above are ready; publishing them remains your choice.
