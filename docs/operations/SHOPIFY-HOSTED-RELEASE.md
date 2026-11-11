# Hosted Shopify release — current owner selection

11 November 2026, RTL-191. This supersedes RTL-190's deployment hold and separate-registration recommendation. The owner resumes deployment on the existing Google Cloud project, selects **reuse the current Shopify app**, and subsequently confirms both secret values are filled. Enabled version1 for both was independently verified using metadata only. Actual application, image, security and hosted checks still precede public cutover.

## Existing deployment to preserve

- Project `retailor-511714`, region `europe-west1`, domain **https://tryretailor.com**.
- Same services `retailor-frontend` / `retailor-backend` and their existing runtime service accounts.
- Frontend:1 CPU,512MiB, concurrency8, timeout210s, max instances1, request-based CPU, startup boostfalse.
- Backend:1 CPU,1GiB, concurrency4, timeout200s, max instances1, request-based CPU, startup boostfalse.
- Existing paid/live mode, frontend/backend origins and audience, Stripe sandbox, checkout-photo bucket, IAM and exact existing secret references are preserved. No DNS/domain replacement, new public backend, new web service or local port.

Before any revision change, sanitized service snapshots were captured under ignored `artifacts/local/RTL-191/`. The source-controlled read-only `scripts/release/shopify-hosted.mjs` hashes all preserved template configuration and ingress, emits only selected public values/reference metadata and rejects changes to those settings. Only new image/revision identity and the two exact backend Shopify secret references are permitted. Existing private-backend IAM is captured separately; only the required cleanup invoker is added.

## Secret values: owner confirmation received

Created only these initially empty automatic-replication secret containers, without a payload or version. The owner added the values and explicitly confirmed completion; metadata now shows enabled version1 for each:

| Secret                   | Source selected by owner                                            | Runtime binding                          |
| ------------------------ | ------------------------------------------------------------------- | ---------------------------------------- |
| `SHOPIFY_CLIENT_SECRET`  | Matching value for the existing Shopify app in backend `.env.local` | Backend only, `SHOPIFY_CLIENT_SECRET:1`  |
| `SHOPIFY_ENCRYPTION_KEY` | Existing64-hex-character key chosen by owner                        | Backend only, `SHOPIFY_ENCRYPTION_KEY:1` |

No local secret file or Secret Manager payload was read, printed, uploaded or put in Git. The new cloud ledger starts empty; local merchant tokens/ledger bytes are not copied. Existing AI, Turnstile, grant and Stripe secret bindings remain unchanged. Client ID/provider/resource names are public server configuration rather than extra local env fields.

## Existing Shopify app: required URL change

Reuse Client ID `31874998d05aff3f0b7463e109913066`. No new registration or distribution selection. The owner's last choice was **Continue preparation first** at Codex's Shopify sign-in, so actual dashboard inspection/URL change remains pending; do not claim it completed.

The published configuration must eventually use:

| Field                                 | Value                                                                                                                          |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| App URL                               | `https://tryretailor.com/api/retailor/v1/shopify/install`                                                                      |
| Allowed redirect URL                  | `https://tryretailor.com/api/retailor/v1/shopify/callback`                                                                     |
| Existing local redirect               | May retain `http://127.0.0.1:4310/api/retailor/v1/shopify/callback`                                                            |
| Embedded                              | Off                                                                                                                            |
| Legacy install flow                   | Off                                                                                                                            |
| Product scopes                        | Keep `read_products,write_products`                                                                                            |
| Webhooks API version                  | Keep `2026-10`                                                                                                                 |
| Lifecycle/privacy webhook destination | `https://tryretailor.com/api/retailor/v1/shopify/webhook`; inspect actual available registration controls before changing them |

Shopify has a single App URL per registration. After pointing it at the hosted app, the generic local store-picker flow is affected even if the loopback callback remains allowed. This is the tradeoff the owner explicitly accepted by choosing reuse. The local code/profile remains available; switching the app URL back is an account-setting operation, not automatic cross-origin routing. Do not invent unsupported installer parameters to bridge sessions.

Retailor still accepts only Shopify development stores. Outside-organization installation remains unverified, and the owner elects to keep the optional connection/Skip flow despite that uncertainty. Hosting neither guarantees eligibility nor substitutes for Shopify's approval for ordinary public-merchant distribution. No review submission or universal-install claim.

## Shopify-only resource additions

1. Private uniform-access bucket `retailor-511714-shopify-ledger` in `europe-west1`, public-access prevention, versioning/soft-delete disabled, no lifecycle that can delete active authority. The only app object is encrypted `shopify/v1/ledger.bin`. Do not reuse the checkout-photo bucket or add a media bucket; exports stage derivatives directly to Shopify.
2. Give the existing backend identity only ledger get/create/delete access on that exact object and accessor on the two new secrets. Object replacement requires create+delete; no object listing or project-wide storage administrator role is needed. Verify actual SDK behavior and conditional IAM, not just a policy description. [Google permissions](https://docs.cloud.google.com/storage/docs/access-control/iam-permissions).
3. Dedicated `retailor-shopify-cleanup@retailor-511714.iam.gserviceaccount.com` invokes the existing IAM-private backend. It receives no ledger/secret access. The app additionally verifies Google's signature, exact backend audience, verified email, expiry and this exact identity; a scheduler label/header is never authentication.
4. Cloud Scheduler `retailor-shopify-cleanup`, once per minute, timezoneUTC, retries0, bodyless POST to the private `/internal/shopify/cleanup` operation with OIDC audience `https://retailor-backend-xmacampiyq-ew.a.run.app`. Prefer the validated backend candidate tag for the maintenance target so rollback of ordinary traffic cannot strand the new ledger. Actual URL comes from Cloud Run metadata, not guessed hostnames. [Authenticated scheduling](https://docs.cloud.google.com/run/docs/triggering/using-scheduler).
5. Before real OAuth, verify platform request-log routing and exclude only sensitive install/callback request URLs where necessary; preserve application/operator diagnostics and all other request/error logging. Existing observed sinks are `_Default` and `_Required`; no custom sink was listed. Record the actual scoped policy and route proof before native OAuth.

This uses request-based CPU on the existing backend, without an always-running process or a minimum-billed every-minute Cloud Run Job. Existing cleanup limits remain:55s/40 calls,75s global lease,140s shop lease, finite retries/backoff/retention,2MiB ledger and10 active/unresolved installations. The private entry adds one active request, two admitted arrivals per minute,5s authentication,8KiB token and64KiB certificate bounds. Construction/health/config perform no certificate/storage/provider request.

An explicit hosted Disconnect starts a request-owned first sweep after the durable fence, with a7s abort budget and truthful current pending/cleaned status. Storage retains its existing bounded I/O and uncertain-write semantics; no public control deadline is enlarged or background browser task introduced. Reset/end still acknowledge durable cleanup without waiting for product deletion. The independent scheduled sweep handles closed browsers, expiry, partial failures and restarts.

## Ordered release checks

1. Focused configuration/auth/cleanup/preservation tests76/76 and all six gates924/924 pass; the initial24 single-file implementation commits are pushed at `5de9fa81f6f0f6490c77891847e9f259a35c918c`. Subsequent owner-requested manual audit adds100/100 focused security checks; exact records remain separate from hosted acceptance.
2. [RTL-195's two maintenance findings](../audits/RTL-195-MANUAL-SECURITY.md) are subsequently fixed/validated under RTL-191: verified official Node24.22.3 Bookworm base, APT2.6.2 and retained Perl/PCRE patches; no extra install step or dependency change. Fresh [Linux/runtime/asset proof](../validation/RTL-191/containers.json), [component/advisory evidence](../validation/RTL-191/runtime-security.json), nine native logos/photo sanitization, exact-source preflight and all six gates924/924 pass. Only the two Dockerfile base sections change application packaging. Manual advisory evidence is not a Docker Scout or independent scan; retained upstream/npm limits and hosted acceptance remain explicit.
3. Create only the named integration resources/bindings, verify actual object access/retention and private IAM, and add no-traffic revisions to the existing services with current immutable images. Compare preserved configuration before proceeding.
4. Verify anonymous/forged access denial, real scheduled OIDC invocation, heartbeat and fixed private diagnostics. Confirm the public frontend cannot forward the internal operation. Keep old public traffic while account URLs/native acceptance are pending.
5. Complete the deferred Shopify URL/login step and real hosted consent/read/import/reviewed photo export/update/remove/disconnect/expiry checks. Verify Stripe sandbox and the existing live-AI behavior under the existing limits, then perform the authorized paired cutover and domain/rollback checks. Record actual first/cold and warm config timing; RTL-190's earlier single DEADLINE has no established cause.

After hosted native acceptance, update GitHub About/README/portfolio descriptions and screenshots with the actual supported scope. [Ticket](../tickets/RTL-191-enable-hosted-shopify.md), [allocation](../commit-plans/RTL-191.md), [validation](../validation/RTL-191.md).
