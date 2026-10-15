# Retailor private checkout-photo storage

15 October 2026 · RTL-091/092. The owner authorized private storage, completed ADC login and then authorized implementation with a sandbox Stripe key. Actual synthetic visitor-upload checks now reach hosted Stripe and verify cancellation/payment returns. See [RTL-092 evidence](../validation/RTL-092.md); the initial setup-only evidence remains in RTL-091.

## Named resources

| Setting                   | Value                                                                                                                                       |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Google Cloud project      | `retailor-511714`                                                                                                                           |
| Bucket                    | `gs://retailor-511714-checkout-photos`                                                                                                      |
| Region / class            | `europe-west1` (Belgium) / Standard                                                                                                         |
| Storage identity          | `retailor-checkout-storage@retailor-511714.iam.gserviceaccount.com`                                                                         |
| Bucket access             | Uniform bucket-level access; public access prevention enforced                                                                              |
| Temporary-object backstop | [Lifecycle rule](checkout-storage.lifecycle.json): delete objects after one day; asynchronous processing, not an immediate erasure deadline |
| Extra copies              | Soft delete disabled; versioning and retention lock not enabled                                                                             |

The service account receives `roles/storage.objectUser` on this bucket only. The owner receives `roles/iam.serviceAccountTokenCreator` on that service account only, enabling short-lived impersonation/signing without a downloaded key. The storage identity also has `roles/serviceusage.serviceUsageConsumer` on `retailor-511714`: the explicit quota-project test required `serviceusage.services.use`. This is API-consumer access, not project-wide storage administration. IAM and IAM Credentials APIs are enabled. These grants do not confer access to sibling projects/buckets.

Signed read links authorize specific selected derivatives without public bucket access. The backend checks actual hashes/descriptors, fully decodes/re-encodes through the existing bounded sanitizer and uploads only the selected photos. Paths include a server-instance namespace plus validated attempt/photo IDs, so a restart cannot clean up an earlier instance's objects through caller-selected ID reuse. Preparation failure stops Stripe creation; known cancelled/failed/expired copies are removed. Unreturned/complete copies rely on the one-day asynchronous lifecycle. Signed reads expire within one hour and no later than workspace expiry; hosted attempts last about 31 minutes. URL expiry does not physically delete an object or recall an image Stripe already fetched. Stripe test Products/Sessions/coupons can retain metadata and fetched images under Stripe's own retention rules.

## Owner ADC step

After provisioning/CLI checks, the owner runs this in PowerShell and completes the Google browser sign-in as the project's owner:

```powershell
gcloud auth application-default login --project=retailor-511714 --impersonate-service-account=retailor-checkout-storage@retailor-511714.iam.gserviceaccount.com
```

This creates local ADC for supported client libraries using the dedicated storage identity. It is separate from `gcloud auth login`, and local ADC is shared by applications that use the standard discovery location. No existing ADC is overwritten automatically by this setup task. Do not paste the credentials JSON or access tokens into chat or the repository. No `GOOGLE_APPLICATION_CREDENTIALS` service-account key file is needed. A pre-existing environment override can affect ADC discovery; verify the effective identity without printing credential contents.

[Google documents impersonated local ADC for Node.js/Python](https://docs.cloud.google.com/docs/authentication/use-service-account-impersonation#local-adc).

## Verification and subsequent implementation

Actual provisioning, scoped IAM and synthetic-object upload/read/signed/unsigned/delete results are in [RTL-091 validation](../validation/RTL-091.md). CLI impersonation upload/read/sign/delete passed, unsigned read returned403, and the deleted signed object returned404. The owner subsequently completed ADC login; application-default upload/read/delete also passed using the expected identity. These are two separate actual checks.

The impersonated ADC has no embedded quota project. The CLI `application-default set-quota-project` command rejects impersonated credentials because they are not user credentials; no credential file was manually modified. Actual ADC storage requests succeeded with the explicit Retailor quota header. Application code must use the named Retailor project/bucket rather than depend on the unrelated global CLI default.

Every command explicitly targets `retailor-511714`; do not change the shared gcloud default project. Backend configuration uses the named project/bucket and ADC, with no cloud request from health/config. No browser credential, public upload or original-photo publication is introduced. A deployed runtime identity and external release approval remain pending.

## Enable locally

RTL-103 fixes sandbox enablement to `true`, project to `retailor-511714` and bucket to `retailor-511714-checkout-photos` in backend-only `apps/backend/src/config/checkout.ts`. They are not secrets or environment options. The owner-requested three old entries were removed from backend `.env.local`; obsolete inherited overrides are ignored.

Set only the secret in the backend's ignored `apps/backend/.env.local`:

```dotenv
STRIPE_API_KEY=<your Stripe sandbox secret or restricted test key>
```

Blank/missing key leaves checkout unavailable. Remove/revoke the key to disable it. Restart with the documented backend launcher after environment changes. The feature rejects live keys/results and remains independent of fake AI/paid AI configuration. Checkout deliberately shares the selected photos and store details; the information control beside its button explains this. Use Stripe's test card `4242 4242 4242 4242`, any future expiry and three-digit CVC, with fictional contact/name details. RTL-097 disables Link's save-information offer per session. The hosted page displays the chosen store name and supported theme colour; Stripe account identity can still appear in other account/legal surfaces. No connected merchant account is created for the visitor.

RTL-097 supersedes the original gateway-only behavior: the app verifies payment on return, places the reviewed local demo order once, clears the purchased bag and updates connected stock/order views. Duplicate return cannot place it again. Pending attempts require the original browser session and running backend instance; missing browser storage blocks departure safely. Restart/lost response/closed browser can leave a Stripe attempt until its short expiry and images until lifecycle cleanup. No background retry, public bucket, real payment or durable webhook fulfilment is implied.

For the existing server-only grant signing secret, generate32random bytes as hex in PowerShell:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Copy that output into `GRANT_SIGNING_SECRET` in backend `.env.local`, then restart normally. Keep it private; do not commit it or send it to the browser. Changing it invalidates existing grants/cookies; pending checkout already requires its original backend instance. No secret is generated or overwritten automatically by this setup.
