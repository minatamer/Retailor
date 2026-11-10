# Connect Shopify locally: complete owner setup

10 November 2026. Retailor is a standalone web app. Use ordinary local HTTP as requested: no tunnel, certificate, CA/trust-store change or public listener. The earlier certificate attempt was canceled and removed. The owner handles account terms, credentials and native app access approval.

## What you need

| Item | Source | Destination |
| --- | --- | --- |
| Shopify organization with app development permission | [Dev Dashboard](https://dev.shopify.com/dashboard) | Sign in through your browser; not an environment setting. |
| Eligible Shopify dev store | Dev Dashboard → Stores → Create store → Dev | Choose it inside Shopify after clicking Connect. No address field in Retailor. |
| Public app Client ID | Apps → Retailor → Settings → Credentials | `clientId` in `apps/backend/src/config/shopify-app.ts`; already supplied. |
| Public development install link | Retailor → Overview/Home → Install app | `developmentInstallUrl` in that same source file; already supplied. |
| App Client secret | Retailor → Settings → Credentials | `SHOPIFY_CLIENT_SECRET` in ignored `apps/backend/.env.local`. |
| Retailor encryption key | Generate locally below | `SHOPIFY_ENCRYPTION_KEY` in that same ignored backend file. |

No merchant access token, store-specific secret, `SHOPIFY_SHOP`, Shopify CLI, paid subscription or cloud bucket is required for this local test. One app registration provides OAuth for eligible users; each user authorizes their selected store. Shopify distribution still controls eligibility. The current development link is organization-bound and is refused in production; it is not public distribution for arbitrary merchants.

## 1. Organization and test store

1. Sign in at Dev Dashboard and choose the organization containing Retailor. If still onboarding, enter truthful contact details and review/accept the terms yourself. Do not create another organization if one already works.
2. Keep this first app and dev store in the same organization. An own-organization test does not prove unrelated users can install before review.
3. Open the existing **Retailor Test** dev store, or choose **Stores → Create store → Dev**. A basic dev plan is sufficient; do not purchase or convert a live store for this exercise. Skip feature previews.
4. Generated sample data is optional. It can automatically enable Shopify's testing Bogus Gateway. Retailor does not change payment settings. Existing products remain read-only to Retailor.
5. Confirm you can administer the store. Use **USD** for draft export tests: Retailor currently maps USD cents and refuses unsupported currencies. For an existing store with currency restrictions, use a separate test store rather than changing a merchant's production currency.

Retailor's temporary browser storefront and Shopify's dev store are different. Shopify needs a real test store on its side to authorize access and hold explicitly exported draft products. Shopify will list eligible stores in its own picker.

## 2. App and version fields

Open the existing **Retailor** app. If creating one from scratch: **Apps → Create app → Start from Dev Dashboard**. Do not create a new app for each visitor. Configure these fields during creation or under **Versions → Create a version**:

| Field | Value |
| --- | --- |
| App name | `Retailor` |
| Version name | Optional, e.g. `local-oauth` |
| App URL | `http://127.0.0.1:4310/api/retailor/v1/shopify/install` |
| Embed app in Shopify admin | Off: Retailor runs as its own web app. |
| Allowed redirection URL(s) | `http://127.0.0.1:4310/api/retailor/v1/shopify/callback` |
| Use legacy install flow | Checked: this standalone adapter requests authorization code consent with scopes in that request. |
| Scopes | `write_products` (also grants product read access). |
| Webhooks API version | `2026-10` |

Release this app configuration version yourself. That publishes settings to the developer app; it is not an App Store review submission. Optional description: `Local Retailor development test: Shopify OAuth, product reads and reviewed draft exports with cleanup.` Do not choose a distribution method or submit for review as part of this local setup.

The owner entered these exact HTTP fields and subsequently verified real store selection, consent and the callback to Connected locally. This proves this local app/store attempt; it is not a blanket guarantee for other origins or hosted installations. Shopify's official localhost tooling documents HTTPS and does not give a blanket plain-HTTP guarantee. Do not change only the form to HTTPS while the server runs HTTP. If Shopify rejects the callback or networking, record the exact safe error; credentials cannot bypass its rule. No certificate or tunnel will be installed automatically.

## 3. Public app settings in source

Open `apps/backend/src/config/shopify-app.ts`. The owner has already supplied the Client ID and the generated development install link. Both are public app identifiers, not credentials.

To obtain the link again: open **Retailor → Overview/Home → Install app**. Copy the generated link (or the store-picker page URL), without selecting a store yet. The current link starts with `https://admin.shopify.com/?organization_id=...` and contains `redirect_from_developer_dashboard` and this app's Client ID. Keep it exactly as generated. Retailor validates this narrow development entry and checks that its Client ID matches the app. Do not use an undocumented account-store discovery endpoint.

Leave `provider: "live"`. Hosted-only storage project/bucket fields stay blank locally. Non-secret provider/identity/install settings belong in source, not `.env.local`. Production refuses this organization-bound entry until a separately authorized public listing/distribution setup is implemented.

## 4. App secret and encryption key

In **Retailor → Settings → Credentials**, copy **Client secret** privately into the ignored file `apps/backend/.env.local`. The only Shopify secret fields are:

```dotenv
SHOPIFY_CLIENT_SECRET=
SHOPIFY_ENCRYPTION_KEY=
```

The owner has filled both. Never put secrets in source, `NEXT_PUBLIC_*`, committed examples, screenshots or chat. Do not copy a merchant Admin API token. This flow uses per-user browser consent, not a client-credentials grant connected to one hardcoded store.

If a new encryption key is needed for a fresh setup, the same command works in Windows **CMD** and PowerShell:

```cmd
node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('hex'))"
```

Copy its 64 hexadecimal characters privately into `SHOPIFY_ENCRYPTION_KEY`, without spaces or angle brackets. Shopify does not issue this key. It encrypts automatically obtained user tokens in ignored `apps/backend/.shopify-local/`. Keep it unchanged while any connection or cleanup remains unresolved; never delete the ledger to force a reconnect. Actual token exchange/storage happens automatically after approval.

## 5. Run locally

Use **`http://127.0.0.1:4310/demo`** throughout. `localhost` is a different browser origin and cookie context. Existing development defaults use frontend 4310 and private backend 4311 on loopback; no new origin environment variable is needed.

After filling secrets, restart only the verified Retailor backend normally (Ctrl+C in its terminal, then `pnpm dev:backend` at repository root). Never launch over occupied 4311. Preserve a healthy frontend; otherwise run `pnpm dev:frontend` in another terminal. Both commands load normal app-local configuration. AI remains fake and paid off while Shopify uses its real adapter.

An obsolete `SHOPIFY_PROVIDER=fixture` environment entry does not select simulation. Only explicit development/test source injection can do that; it is visibly simulated and refused in production. Health/config dispatch no external requests. Missing or unsafe app settings leave Connect unavailable and Skip usable.

## 6. Test real Connect

1. Start a **fresh Retailor demo** after configuration, so the original server deadline and per-tab proof exist. Load sample/uploaded clothing, review products and accept the design.
2. On optional Shopify onboarding, click **Connect Shopify**, or use **Owner workspace → Connections** later. No store address is requested.
3. Shopify opens its store picker. Choose **Retailor Test** or another eligible dev store. Sign in if needed and approve installation/product access yourself. Use the same browser as the Connect click. For agent-led testing and user login/consent handoffs, use only Codex's in-app browser; do not request external-browser access.
4. Shopify sends its signed selection to the registered App URL. Retailor verifies it, binds the selected store to the pending demo and completes standalone code-grant authorization. Return to the same local demo; confirm Connected before trying catalogue operations. Start from Retailor's CTA: an unsolicited App URL/admin launch cannot invent a pending demo.
5. Read products. An empty store is valid. Connection alone writes no products.
6. Review and export one fictional garment as a **draft**. Check title, description, photos, USD prices, sizes/colours and variants in Shopify admin. Wait for verified Ready; an HTTP success alone does not prove it.
7. Edit the local garment, choose **Review update**, approve and check the read-back. Local edits never automatically sync.
8. Remove the export, then test Disconnect with another explicitly exported draft. Verify only Retailor-owned products are removed and existing store products remain.
9. Keep the backend running for expiry cleanup. Explicit Disconnect, Reset or the original two-hour expiry requests cleanup; closing a tab is not a reliable immediate deletion signal. Provider failures or a stopped computer can delay removal.

Do not uninstall manually before testing cleanup: that can revoke the access needed to remove exports. If access was revoked, inspect and manually remove only known Retailor exports in Shopify admin. Lost access and unknown outcomes are reported rather than silently treated as successful deletion. Another tab with an active Connect attempt must finish/cancel/expire it before starting a different one in the same browser.

## Pending external acceptance

- The owner verified native store selection, consent and the plain-HTTP callback to Connected on 10 November 2026: Retailor Test, USD, zero exports. Native product reads, exports/media/variants, updates and deletion remain to be exercised; see RTL-168 validation.
- Shopify server-to-server webhooks cannot reach a localhost-only server. Do not register localhost webhook delivery as verified. Explicit local Disconnect can still make outbound cleanup requests while retained access works.
- Own-organization testing does not establish outside-user installation without review. Public launch later needs supported distribution/listing and separate proof; no irreversible distribution choice or review submission is included here.
- Hosted encrypted storage, IAM, cleanup scheduler, webhook ingress and current Linux/images/scanners remain separate acceptance. Before advertising Shopify experience, update GitHub/README/portfolio descriptions to match the operations actually verified, using `SHOPIFY-PORTFOLIO.md` as the worksheet.

Primary sources: [Dev Dashboard installation](https://shopify.dev/docs/apps/build/dev-dashboard/create-apps-using-dev-dashboard#step-3-install-your-app), [standalone authentication](https://shopify.dev/docs/apps/build/authentication-authorization), [Shopify staff on public installation](https://community.shopify.dev/t/shopify-developer-app-flow/36047/5), [distribution](https://shopify.dev/docs/apps/launch/distribution), [local networking](https://shopify.dev/docs/apps/build/cli-for-apps/networking-options).
