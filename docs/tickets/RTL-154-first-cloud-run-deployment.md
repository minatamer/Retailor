# RTL-154 — first Cloud Run deployment

Status: Linux candidate verified; owner-authorized private deployment in progress.

The owner requests deploying the manually accepted `4d908d4` candidate to Google Cloud. The existing Retailor project has billing enabled but initially lacks Cloud Run, Artifact Registry and Secret Manager APIs or runtime identities. Existing checkout storage belongs to Retailor and must be preserved. `tryretailor.com` is not purchased; use generated managed service URLs for a private first deployment and do not buy a domain.

Follow [the allocation](../commit-plans/RTL-154.md), [release packet](../operations/RELEASE.md), [hosted checks](../operations/HOSTED-VERIFICATION.md) and approved [security dispositions](../audits/RTL-023-SECURITY.md). Fix the discovered Docker context exclusion of F20, rebuild and verify actual Linux images and refresh scanner evidence. Preserve source mismatch checks, IAM-private backend, separate runtime identities, finite runtime settings, normal origin/admission controls and paid-off bootstrap. Do not substitute local manual success for required hosted edge/account acceptance.

Record actual immutable registry images, revisions, traffic, IAM, authenticated bridge and unpaid delivery/config observations. Keep missing domain, public origin protection, account cutoff/retention and connected hosted paid/physical tests explicit. First-release recovery is paid off plus private frontend until a compatible prior pair exists. No provider request or domain purchase is authorized by this ticket.
