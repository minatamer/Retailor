# Shopify resource and native-acceptance worksheet

**Current RTL-191 selection:** [hosted release guide](SHOPIFY-HOSTED-RELEASE.md) supersedes the historical holds/resource proposals below. Reuse the existing app/project/domain; both secret version1 values are owner-confirmed. Actual hosted implementation/checks are in progress, with Shopify sign-in/URL changes deferred. No external-store installation guarantee.

**RTL-190 superseding preparation,11November2026:** owner wants hosted Shopify but holds deployment. Use [the current readiness guide](SHOPIFY-HOSTED-READINESS.md) for the exact existing domain/project, separate local/production registration, current code/packaging gaps and proposed resource shape. The historical every-minute Cloud Run Job proposal below has a minimum-billing cost issue; a private scheduled backend operation is the current recommendation for implementation/review. No resources or permissions have changed. [RTL-191](../tickets/RTL-191-enable-hosted-shopify.md) tracks the remaining work; historical native/distribution evidence below retains its original limits.

**RTL-174, 11 November 2026:** the organization-bound developer-preview link is replaced with a local managed-install candidate derived only from the shared public Client ID. No Retailor shop-address/key form. Production remains refused: April and newer August Shopify staff guidance conflict on unrelated dev-store eligibility. The requested universal review-free connection is **not yet established**. [Research](../research/SHOPIFY-EXTERNAL-DEV-STORES.md), [current owner setup](../operations/SHOPIFY-LOCAL-SETUP.md) and [actual validation](../validation/RTL-174.md) govern; owner deferred dashboard sign-in/native checks. No distribution selection, review, deployment or credential change occurred.

Historical RTL-168 observation (10 November): the owner verified selection/consent/plain-HTTP callback with Retailor Test through the old own-organization preview link, with zero exports. That is not native acceptance of the new RTL-174 entry or unrelated users.

Prepared10 November2026; **no resource, key, permission, tunnel or schedule is created by this file**. This is the small integration ledger/runner extension to the existing two web services. The storefront remains a temporary browser session. [Setup/recovery](SHOPIFY.md), [current evidence](../validation/RTL-166.md).

## Fill with non-secret metadata before authorizing hosted work

| Input                                                      | Owner-selected value / verification                                                                                                                                 |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Project / region                                           | Pending; no historical project permission is inherited for new resources.                                                                                           |
| Shopify app identity / test organization relationship      | Client ID configured locally; actual distribution/install settings and unrelated-store eligibility pending. Keep private store identifiers out of public artifacts. |
| Canonical HTTPS origin / exact app, callback, webhook URLs | Hosted canonical HTTPS setup pending. Local tests use ordinary HTTP loopback; no certificate or tunnel. See SHOPIFY-LOCAL-SETUP.md.                                 |
| Backend immutable image / source fingerprint               | Current locally verified candidate only; record actual registry digest after separately authorized publication.                                                     |
| Separate private integration bucket                        | Pending explicit name/project/region; reject the checkout-photo bucket. Uniform access + public-access prevention, no public URLs or visitor object listing.        |
| Backend and cleanup runtime identities                     | Explicit scoped identities; access only ledger object/prefix and required app secret resources. No project-wide storage admin/signing/downloaded JSON key.          |
| Client-secret / encryption-secret references               | Named resources and exact numeric versions only; never values. App client ID stays server configuration.                                                            |
| Private Cloud Run Job / Scheduler identity / schedule      | Pending exact names; one task, parallelism1, platform retries0, one-minute schedule, application deadline55s, job timeout75s.                                       |
| Authorized operator / resource cost envelope               | Pending owner selection; no purchase or provider budget follows from local acceptance. Production remains refused until distribution is resolved.                   |
| Callback/install access-log policy                         | Verify edge/platform/proxy query exclusion/redaction before real OAuth. App-level redaction cannot erase an upstream log.                                           |

## Storage contract and lifecycle

The backend and private job share only the app-encrypted `shopify/v1/ledger.bin` object (AES-256-GCM, app-bound AAD,2MiB decrypted maximum). Generation-pinned reads and conditional writes have SDK retries disabled. Ten active/unresolved installations,128 session bindings, exact intent/ownership metadata, dispatch/sweep claims and rates are deployment-wide inside this one blob. No original photos, catalogue descriptions, customer payloads or public tokens belong here. Concurrent state conflicts are known-CAS-only retries; unknown storage results never become volatile live writes.

Prefer a custom role with only the needed object metadata/read/create/update/delete permissions on the designated bucket/prefix, plus Secret Manager accessor on the named app-secret/encryption-secret resources. Verify the actual GCS SDK replacement/generation behavior against that IAM before enabling. Account for noncurrent generations, soft deletion, backups and logs: configure no retained old credential generations/soft-deleted copies, or supply an explicitly accepted retention design. A generic one-day bucket lifecycle can delete active cleanup authority and must not be reused. Application deadlines govern24-hour credential use and seven-day unresolved metadata; the worker must be available to erase stored bytes. No application can promise physical erasure during storage/provider outages.

Sanitized clothing derivatives go directly to Shopify-managed PRODUCT_IMAGE staging; there is **no new Retailor media bucket**. The unused reservation TTL and any Shopify Files/shared-media behavior remain provider-owned/native-unverified. Minimum scope stays `write_products`; add no `write_files`/inventory/customer/order permissions to hide a failed native test.

## Prepared private runner configuration

Use the **same current backend image**; override command to `node`, single argument `dist/shopify/cleanup-cli.js`. Set the app's public Client ID, provider `live` and authorized storage project/bucket in `apps/backend/src/config/shopify-app.ts` before building that image. These are source-controlled non-secret settings, not environment secrets. Required normal environment:

```text
APP_ENV=production
FAKE_MODE=false
PAID_DEMO_ENABLED=false
FRONTEND_ORIGIN=<canonical HTTPS origin>
SHOPIFY_CLIENT_SECRET=<exact secret-version binding, never literal in this file>
SHOPIFY_ENCRYPTION_KEY=<exact secret-version binding, never literal in this file>
```

The job loads normal backend configuration, opens no HTTP listener, invokes the same bounded cleanup once, logs only fixed private counts/codes/request references and closes storage. It makes no AI/Stripe request. Set1CPU/1GiB, tasks1/parallelism1, retries0 and75s outer task timeout. Production web services start no cleanup timer. Native writes require a successful private sweep heartbeat within two minutes, so prove the job path before enabling connections. The75s sweep lease and140s per-shop claim reject overlapping invocations; max two provider-operation slots reserve one for maintenance.

Prepare an authenticated Scheduler HTTP POST to:

```text
https://run.googleapis.com/v2/projects/<PROJECT>/locations/<REGION>/jobs/<JOB>:run
```

Use the dedicated Scheduler service account's OAuth identity for the Google API, with invocation permission on that exact job only. The job runtime account independently owns ledger/secret access. No unauthenticated/public maintenance endpoint, web-service Origin exemption or arbitrary browser operation is needed. Confirm actual Cloud Run/Scheduler command syntax, timeouts and permissions at authorized provisioning time; these are configuration values, not an executed deployment.

## Native acceptance record

| Stage                               | Required actual result before claiming passed                                                                                                                                                                                                            |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Own-organization standalone install | Owner-created eligible test store; embedding off; actual managed-install setting, exact App URL/callback, granted minimal scope; new-entry consent/decline and same-tab local HTTP return. Old-entry success is historical only. No pasted visitor keys. |
| Current API + products              | Response version2026-10; single and multiple variants/photos, exact cents/SKUs/options, DRAFT, media Ready; read/update/remove; preexisting sentinel unchanged. Stop on schema/scope/media failure.                                                      |
| Cleanup + refresh                   | Rotating offline refresh/restart; original two-hour expiry while browser closed; independent runner, deletion-before-uninstall, unknown outcomes and revoked access show honest manual state. Observe actual signed uninstall/privacy subscriptions.     |
| Staging/shared media                | Confirm actual Files artifact/retention and shared references; no blanket physical-erasure claim. Resolve any additional cleanup requirement before native acceptance.                                                                                   |
| Separate organization               | Permitted install/distribution entry, transfer-disabled eligible store, ordinary visitor connects without app keys or unapproved review bypass. Own-org/collaborator success is insufficient.                                                            |
| Hosted ingress and privacy          | Canonical edge callback/webhook, direct-origin/private-backend denial, query-safe logs, restart/scale-to-zero recovery and correct secret/IAM ownership.                                                                                                 |
| Bounds/retention                    | Observe real schedule/heartbeat/cancellation, separate rates, duplicate workers,24h use cutoff and persisted erasure/7d metadata including object generations/backups.                                                                                   |

Record date, exact source/image/API version, store class and organization relationship, performed operations and non-secret outcomes. Public/paid and any App Store review remain independent owner-authorized gates. No new signoff/money flag is added to runtime configuration.

## Disable, recovery, rotation and teardown order

1. Disable new Shopify capability by removing its app credential configuration from an owner-approved replacement runtime while preserving the old key/app/ledger privately for cleanup. Never select fixture as live recovery.
2. Keep the private job and old secrets/identity available until exact owned drafts and uninstall are verified, or record unresolved/manual outcomes and enforce the use/metadata cutoff. Preserve known IDs/handles privately; no tag-wide cleanup or guessed ownership.
3. After successful cleanup, verify empty/unresolved counts and retention across current/noncurrent/soft-deleted objects. Stop the exact schedule and job only after settling work; inspect that no active execution/lease remains. Resource deletion requires applicable authorization.
4. Rotate by draining under the old app/key, then configuring a fresh ledger/key and exact secret versions. Replacing the key in place makes unresolved records unreadable. Native reauthorization does not extend original session/lifetime/hourly grants.
5. Remove only named integration IAM grants, secrets and bucket/job/schedule after evidence/retention obligations are resolved. Preserve existing checkout storage, private backend invocation, logs and unrelated resources. This file executes none of those mutations.
