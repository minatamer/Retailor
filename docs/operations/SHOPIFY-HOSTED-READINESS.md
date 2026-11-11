# Paid and Shopify deployment preparation

11 November 2026. **Deployment is on hold at the owner's request.** No service, DNS record, Shopify setting, secret, IAM grant, bucket or schedule was changed. [Remaining implementation](../tickets/RTL-191-enable-hosted-shopify.md).

## Current baseline

Use the existing `retailor-511714` project in `europe-west1`, services `retailor-frontend` and `retailor-backend`, and **https://tryretailor.com**. Keep this domain mapped to the same frontend service. Updating its image does not require replacing the domain or DNS records.

Read-only observations on 11 November:

- Frontend revision `retailor-frontend-00002-xj6` and backend `retailor-backend-00004-22g` still serve100%. Both configured origins are `https://tryretailor.com`; the frontend's backend origin/audience remain `https://retailor-backend-xmacampiyq-ew.a.run.app`.
- The domain returns200 with normal HTTPS certificate validation. Anonymous backend health returns403. The first public config request returned `DEADLINE`; one deliberate follow-up returned200, live mode, paid enabled and Stripe sandbox ready. The cause of that first timeout is **not established**; verify first/cold as well as warm requests before cutover.
- Existing resource limits, service identities and exact secret-version references were captured without values. Cloud Build and Cloud Scheduler APIs are currently disabled. Repository push automation is an unpaid quality workflow, with no deployment step.
- Current application code passes all six Linux gates,895 tests. Fresh **production runtime images, asset probes and scans** are still needed; the unchanged release preflight correctly reports stale runtime-image evidence. Local quality validation is not deployed-image acceptance.

Paid mode enables live AI. Stripe checkout continues in sandbox, preserving the existing behavior.

## First owner input: a production Shopify registration

Keep the existing local app/client ID `31874998d05aff3f0b7463e109913066` and loopback callbacks working. **Recommended:** create a separate production Shopify app in the existing organization. Shopify supports linking separate development/production apps to one codebase; changing the existing registration's App URL would redirect its local store-picker flow too. [Shopify app configurations](https://shopify.dev/docs/apps/build/cli-for-apps/manage-app-config-files), [hosting configuration](https://shopify.dev/docs/apps/launch/deployment/deploy-to-hosting-service).

Use these fields in Dev Dashboard when ready; no form has been submitted:

| Field                                                                    | Production value                                                                    |
| ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| App name                                                                 | `Retailor` (use a clearly identified production registration)                       |
| App URL                                                                  | `https://tryretailor.com/api/retailor/v1/shopify/install`                           |
| Embed app in Shopify admin                                               | Unchecked                                                                           |
| Allowed redirection URL                                                  | `https://tryretailor.com/api/retailor/v1/shopify/callback`                          |
| Use legacy install flow                                                  | Unchecked; retain managed installation                                              |
| Scopes                                                                   | `read_products,write_products`                                                      |
| Webhooks API version                                                     | `2026-10`, matching current code                                                    |
| Webhook destination, when registering supported lifecycle/privacy topics | `https://tryretailor.com/api/retailor/v1/shopify/webhook`                           |
| Version/description                                                      | e.g. `production-1` / `Production connection configuration for Retailor’s web demo` |

Copy the new **Client ID** from Settings: it is public app metadata and belongs in the production source-controlled profile. The **Client secret** stays server-only. Visitors supply neither value; each visitor chooses their store inside Shopify and grants Retailor access. Hosting does not change Shopify's store/distribution eligibility. A separate-organization dev-store test remains pending; no App Store submission or universal-install claim is included.

## Server resources and code still needed

| Item                              | Concrete next step                                                                                                                                                                                                                                                                                                                                                     |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Environment-specific app metadata | Select local/production public Client IDs and storage settings using existing `APP_ENV`. Preserve the current local registration and filesystem ledger. Keep provider/resource metadata in code; add no non-secret local env knobs.                                                                                                                                    |
| Production refusal                | Replace the current unconditional production refusal with fail-closed prerequisites: actual production app identity, shared credentials and a valid dedicated durable store. Production must never use a fixture or local/ephemeral ledger. This code change is **not implemented yet**.                                                                               |
| Durable integration state         | Proposed bucket `retailor-511714-shopify-ledger`, same project/region, private/uniform access. Use only the existing encrypted `shopify/v1/ledger.bin` ledger. Do not reuse the checkout-photo bucket: its one-day lifecycle is unsuitable for active cleanup authority. No new Retailor media bucket is needed.                                                       |
| Shared platform secrets           | Pin numeric Secret Manager versions for production `SHOPIFY_CLIENT_SECRET` and `SHOPIFY_ENCRYPTION_KEY`. Generate a fresh32-byte production encryption key (64hex characters) for the new empty ledger. Do not rotate/copy the local ledger's key or merchant tokens. Secret values go only to the backend/maintenance runtime, never Git, chat, URLs or the frontend. |
| IAM/retention                     | Give only the intended runtime access to the ledger and these two secrets; configure/verify object generations, disabled version retention/soft deletion and the existing credential-use/metadata cutoffs. Preserve checkout storage and existing AI/Stripe secret bindings.                                                                                           |
| Independent cleanup               | Add and verify the lower-cost private maintenance path below, with the existing leases, reserved slot,40-call/55-second sweep bounds and one-minute heartbeat. Preserve the existing one-shot `node dist/shopify/cleanup-cli.js` for operator/recovery use.                                                                                                            |
| Prompt Disconnect                 | Provide a request-owned bounded first cleanup pass within the existing control deadline, with truthful partial/pending status; the independent sweep is the backstop after disconnect, browser close and expiry. Do not rely on a web-process timer after Cloud Run stops allocating CPU.                                                                              |
| Packaged Shopify logo             | The actual root Docker context includes the existing `public/integrations/shopify-logo.svg` with identical bytes, verified by a scratch-image COPY/export probe. No Docker allowlist change is needed. Include it in fresh production runtime HTTP asset checks; context inclusion and Next quality builds alone do not prove runtime delivery.                        |
| OAuth/webhooks/logs               | Register the exact URLs above, verify signed callback/uninstall/privacy deliveries and platform query-log handling, and test the original expiry, owned-only removal and delete-before-uninstall flow.                                                                                                                                                                 |

Only the two **platform app secrets** are needed for Shopify. There is no manually configured merchant-store access token. The storefront/catalogue remains a temporary browser demo; the private ledger retains only the limited connection/cleanup authority already designed in [the resource worksheet](SHOPIFY-RESOURCES.md).

### Cleanup cost decision

The earlier every-minute Cloud Run Job proposal needs revision. Jobs have a minimum one-minute instance charge; a1CPU job launched every minute implies720 instance-hours over a30-day example before free allowances, even when an empty sweep exits quickly. This is not an exact bill estimate. [Google's billing rules](https://cloud.google.com/run/pricing).

**Recommended for implementation/review:** Cloud Scheduler invokes a narrow authenticated maintenance operation on the **existing IAM-private backend**, using request-based billing and a dedicated invoker identity. Reuse the same bounded sweep. Do not add a public frontend cron operation or trust a caller-supplied scheduler header. This requires a small private-handler/IAM integration and negative-access tests; it is a proposal, not existing deployed functionality. [Google's authenticated Scheduler pattern](https://docs.cloud.google.com/run/docs/triggering/using-scheduler).

The existing cleanup CLI remains useful for deliberate operator jobs. No every-minute billable Job or new maintenance resource is being created now. Verify actual Scheduler/storage/runtime costs and the scope of existing account limits before activation.

## Future sequence, after the owner resumes

1. Obtain the production Client ID/secret, implement [RTL-191](../tickets/RTL-191-enable-hosted-shopify.md) locally and validate profile isolation, durable state, private maintenance, responsive connection/cleanup and packaged assets. Keep current live service traffic unchanged.
2. Prepare exact bucket/secret/IAM/Scheduler resources and numeric versions, then verify a real private sweep heartbeat and original-expiry cleanup. No application flag replaces these prerequisites.
3. Build/scan current immutable production images, run actual Linux runtime/asset/security probes, refresh exact source/image evidence and resolve the first-request config observation. Do not normalize hashes or accept the stale-image preflight result.
4. Create no-traffic revisions of the **same** web services, preserving domain origins/audience, service accounts, existing secrets, resource limits, backend privacy and owner-selected paid mode. Verify the new pair before switching traffic.
5. Test hosted Shopify picker/consent/callback, photo-bearing imports/exports, collection/logo, updates, disconnect and browser-closed expiry; preserve unrelated merchant products. Test Stripe sandbox return and explicit live-AI behavior under the existing budget. Then switch traffic only under renewed owner instruction, preserving the recorded rollback pair and domain.

After hosted native acceptance, update GitHub About/README, portfolio copy/screenshots and proposal wording together. Current source-controlled Shopify wording must retain its actual local/eligibility limits until those checks are done.
