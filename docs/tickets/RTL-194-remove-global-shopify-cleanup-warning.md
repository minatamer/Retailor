# RTL-194 — Remove the global Shopify cleanup warning

11 November 2026. Owner explicitly requests removal of the pictured yellow “Shopify cleanup could not be confirmed…” banner.

## Acceptance

1. Reset no longer adds this Shopify cleanup warning to the global recovery banner, including an unacknowledged end request.
2. Still request and await the existing bounded Shopify end/detach operation before replacing the session; preserve cleanup/expiry authority, remote status/recovery UI and private diagnostics. Preserve unrelated metadata/photo/browser-storage recovery messages.
3. Verify the real session integration's failed-acknowledgement/reset behavior and existing cleanup bounds, run applicable settled gates and record actual evidence. No cloud, deployment, credentials, payment, public telemetry or weakened cleanup limits.

Precision: root/frontend instructions; SessionController.reset, ShopifyController.endAndDetach and existing real-session/reset regressions. Latest owner request overrides the previous display of this specific warning. No generic banner/CSS hiding or removal of other recovery messages.

Status: **Complete, locally validated.** The specific warning is gone after reload and an ordinary native reset; failed acknowledgement still sends the old workspace's bounded end request in the real-session regression. Focused43/43 and all six root gates pass,896/896 full tests. [Actual evidence and limits](../validation/RTL-194.md). Deployment remains held.
