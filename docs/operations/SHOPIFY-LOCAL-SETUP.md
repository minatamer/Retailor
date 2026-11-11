# Connect Shopify locally: complete owner setup

**Updated 11 November 2026, RTL-174.** Retailor is a standalone web app. Ordinary HTTP loopback remains the owner-selected setup: no tunnel, certificate or trust-store changes. The old own-organization preview entry is replaced with a **local candidate** using Shopify's managed installer. Newer Shopify staff guidance contradicts earlier external-dev-store reports; universal no-review access is not established and production remains refused. The owner deferred Dev Dashboard sign-in; **the new authenticated entry and unrelated-organization install are not yet verified**. [Research and evidence](../research/SHOPIFY-EXTERNAL-DEV-STORES.md).

## Every required item

| Item                                            | Where to get it                                                               | Where it belongs                                                                                                                              |
| ----------------------------------------------- | ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Partner organization/app development permission | [Dev Dashboard](https://dev.shopify.com/dashboard), in Codex's in-app browser | Owner account setup only.                                                                                                                     |
| Eligible nontransferable dev store              | Stores → Create store → **Dev**                                               | Selected on Shopify; no Retailor address field. Client-transfer/trial/live stores are different.                                              |
| Shared app Client ID                            | Apps → Retailor → Settings → Credentials                                      | `clientId` in `apps/backend/src/config/shopify-app.ts`; owner-supplied ID already present. Public OAuth identifier, not an access credential. |
| Shared app Client secret                        | Same Credentials section                                                      | `SHOPIFY_CLIENT_SECRET` in ignored `apps/backend/.env.local`; already filled by owner.                                                        |
| Retailor encryption key                         | Generate locally for a fresh setup, command below                             | `SHOPIFY_ENCRYPTION_KEY` in the same ignored file; already filled. Preserve it for existing state.                                            |
| Distribution/install settings                   | App Home → Distribution; Versions → released version                          | Shopify account settings, not environment values. Check below.                                                                                |

The installer URL is derived from Client ID: `https://admin.shopify.com/oauth/install?client_id=<CLIENT_ID>`. No extra generated-link value is needed. Keep `provider: "live"` in source and hosted storage project/bucket blank locally. AI can remain fake/paid off while Shopify uses real OAuth/GraphQL. Health/config dispatch no external request.

## 1. Check the existing registration

1. Sign in at Dev Dashboard **inside Codex's in-app browser**, then open the existing Retailor app. Handle passwords, codes and account terms privately yourself. Do not create another organization if the current one works.
2. Inspect **Home/Overview → Distribution**. For the local external-dev-store experiment retain **Undecided** if already unset; do not change an existing distribution choice. Public/draft external installs have conflicting Shopify staff guidance, including a newer same-organization-only restriction. Neither state is a verified universal solution. Do not select Custom as a universal connect solution: its generated links target a store/Plus organization. Distribution choice is permanent. Do not submit a listing/review or pay an App Store registration fee for this local exercise.
3. If already locked to **Custom**, stop before replacing credentials. Shopify does not let you switch the choice. A separate registration may be needed, but first finish existing connection/export cleanup with the old registration. The encrypted ledger is bound to Client ID and encryption key: replacing either against the existing ledger makes it unreadable. Do not delete/reset state to force access. Plan separate storage/migration explicitly.
4. These actual account settings have **not** been inspected during RTL-174 because the owner chose local work first. Source changes cannot alter Shopify distribution.

## 2. Fill the app version form

Open **Versions → Create a version** for Retailor:

| Field                      | Value                                                                                |
| -------------------------- | ------------------------------------------------------------------------------------ |
| App name                   | `Retailor`                                                                           |
| Version name               | Optional, e.g. `local-dev-store-connect`                                             |
| App URL                    | `http://127.0.0.1:4310/api/retailor/v1/shopify/install`                              |
| Embed app in Shopify admin | **Off**                                                                              |
| Allowed redirection URL(s) | `http://127.0.0.1:4310/api/retailor/v1/shopify/callback`                             |
| Use legacy install flow    | **Unchecked**, enabling managed installation; supersedes the old checked-box recipe. |
| Scopes                     | `write_products` (includes reading products); no customer/order/inventory scopes.    |
| Webhooks API version       | `2026-10`                                                                            |

Review and release this settings version yourself. This is not an App Store submission. Optional description: `Development-store testing: standalone OAuth, product imports and reviewed Retailor draft exports with cleanup.` Managed installation grants released scopes; our standalone server still obtains per-store tokens through verified authorization code grant. Do not substitute client credentials, an embedded framework or visitor keys.

The exact HTTP App URL/callback worked for the **old own-store preview flow** on 10 November; the new managed entry needs its own native test. Shopify's localhost tooling documents HTTPS, so this is not a blanket HTTP guarantee. On rejection, record the safe error. Do not install certificates/tunnels automatically or change only the form to HTTPS while the app runs HTTP.

## 3. Check the test store

Use **Retailor Test**, or Stores → Create store → **Dev**. Basic is enough; skip previews and do not buy a plan or transfer the store. Sample data is optional and can automatically enable Shopify's testing Bogus Gateway. Retailor does not change payment settings. Use fictional data and a USD dev store for current import/export support; do not change a production merchant's currency for this exercise.

For third-party apps on someone else's dev store, Shopify may require identity verification by that visitor or their organization owner. The visitor also needs installation permission. These platform requirements are separate from app review and cannot be bypassed by Retailor. A client-transfer, normal trial or live shop is not an eligible nontransferable dev store.

Retailor's temporary browser storefront is separate from the real Shopify dev store that authorizes access and holds explicitly exported drafts. Connection does not create a theme or permanent merchant backend.

## 4. Fill only the two secrets (already done here)

Ignored `apps/backend/.env.local` contains:

```dotenv
SHOPIFY_CLIENT_SECRET=
SHOPIFY_ENCRYPTION_KEY=
```

Never paste values into chat, source, screenshots, `NEXT_PUBLIC_*` or committed examples. Client ID/provider/storage names belong in source. No merchant token, `SHOPIFY_SHOP`, visitor app secret or Shopify CLI is needed. For a **fresh setup only**, CMD and PowerShell both accept:

```cmd
node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('hex'))"
```

Privately copy its 64 hexadecimal characters into `SHOPIFY_ENCRYPTION_KEY`. Shopify does not issue this key. It encrypts automatically obtained tokens in ignored `apps/backend/.shopify-local/`. Keep key and app identity unchanged while connections/cleanup remain unresolved. A wrong key is not fixed by generating a new one. RTL-174 neither read nor replaced the existing secrets.

## 5. Run and test

Use **`http://127.0.0.1:4310/demo`** throughout. `localhost` is a different browser origin/cookie context. Run normal `pnpm dev:backend` and `pnpm dev:frontend` from the repository root after checking existing process ownership; do not launch duplicates over occupied 4311/4310. After secret changes restart only the verified Retailor backend. No extra non-secret environment values are required.

1. In Codex's in-app browser, start a fresh demo, load fictional clothes, review products and accept the design. Click **Connect Shopify** during onboarding or **Owner workspace → Connections** afterward. Skip stays usable; connecting creates no products.
2. Shopify's installer opens in the whole page. Sign in and use Shopify's store context/selector for the desired dev store. Retailor collects no address/keys. Actual fresh chooser and last-active-store behavior still need native verification; do not assume every account gets the same screen.
3. Approve product access yourself. Shopify sends a signed App URL request; Retailor verifies it, binds the pending same-browser demo, redirects to per-shop code grant and verifies the callback/dev plan. An unsolicited App URL visit cannot invent a pending demo. Confirm Connected shows the chosen shop and zero exports. Test decline/cancel and reconnection. Another pending attempt in the same browser must finish/cancel/expire before starting a different one.
4. On Connections, products load automatically. Browse All products or a collection, inspect photos/details/prices/variants, review a supported clothing import and confirm. Import changes only Retailor; stock is explicitly reviewed rather than live Shopify inventory sync.
5. Select a local garment, review/confirm draft export, then check Shopify admin → **Products → Draft**, and **Products → Collections → Retailor**. Verify actual photos Ready, description, variants, SKUs and prices. Processing/HTTP success is not proof of completed media upload.
6. Edit locally, review/confirm Update and read back; local edits never automatically sync. Remove one export, then test another export followed by Disconnect. Confirm preexisting Shopify products remain unchanged. The Shopify tour covers these controls.
7. Keep the backend running for expiry cleanup. Disconnect/Reset/original two-hour expiry request deletion of only Retailor-owned exports/collection. Closing a tab is not reliable immediate deletion; outages/stopped computers can delay cleanup.

Do not manually uninstall before cleanup: access is needed to remove owned drafts. Lost access requires inspecting/removing only known Retailor exports. Managed installation may occur before Retailor rejects an ineligible shop; preserve tracked credentials for cleanup instead of assuming no installation happened.

## 6. Resolve platform eligibility and prove another organization

Use the [prepared Shopify support question](../research/SHOPIFY-EXTERNAL-DEV-STORES.md#account-recipe-and-native-acceptance) if needed to resolve the contradictory guidance. Do not call a successful undocumented path policy acceptance. Then repeat the **new** CTA with a visitor whose eligible dev store belongs to a genuinely different Partner organization. Do not add them to Retailor's organization or ask for keys. Record account distribution/install settings, store class/relationship, actual Shopify store selection, consent and same-tab return, then isolation and cleanup. Own-store/collaborator success or injected two-shop tests are insufficient.

Loopback callbacks reach the machine running the browser. A person elsewhere cannot reach this machine through their own `127.0.0.1`. A remote public demo needs separately authorized hosted App URL/callback, shared encrypted storage, cleanup runner and ingress/privacy checks. RTL-174 prepares code; it does not deploy or expose a tunnel.

## Troubleshooting and pending checks

| Symptom                            | Check                                                                                                                                                                    |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Only owner organization stores     | CTA must use `/oauth/install?client_id=...` without `organization_id`/`redirect_from_developer_dashboard`; inspect actual distribution/managed-install settings.         |
| Invalid link/wrong organization    | App locked to Custom, client-transfer store, missing identity verification or installation permissions. Never fabricate a custom-link signature or ask for visitor keys. |
| Callback not verified              | Same browser/origin, fresh demo/pending attempt, exact released App URL/callback, owner app secret and scope. Never paste callback code/state/HMAC into chat.            |
| Wrong/last-active store            | Use Shopify's own store switcher; native multi-store selection is still pending. Never silently substitute another shop or add a Retailor address field.                 |
| Existing cleanup / needs attention | Preserve ledger, Client ID and encryption key; recover under the original registration.                                                                                  |

Pending: actual dashboard settings; new own-store and unrelated-organization consent/callback; native import/media/collection/update/remove/expiry; hosted IAM/storage/scheduling/ingress; real webhooks and current Linux/image/scanner proof. Webhooks cannot call localhost. Review submission is outside this dev-store exercise. Record actual outcomes in [RTL-174 validation](../validation/RTL-174.md).
