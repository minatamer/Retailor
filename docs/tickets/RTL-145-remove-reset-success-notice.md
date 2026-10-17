# RTL-145 — remove reset success notice

17 October 2026. Status: implemented; scoped read-only review has no actionable findings and the local frontend is refreshed. The owner requests removal of “Fresh collection. Your previous temporary workspace has been cleared.” The owner's subsequent instruction defers tests until the remaining additions are finished, unless an error requires investigation.

Acceptance:

1. A normal manual reset no longer adds that success notice or replacement success copy.
2. Preserve reset cleanup, fresh identity, cancellation/revision fences and explicit expiry, AI-attention and storage/cache recovery messages. Do not hide unrelated notices or change the shared notice renderer.
3. Preserve the unstaged RTL-144 work. Use a scoped read-only review; defer test/gate runs under the latest owner instruction unless an error warrants them. Updating the existing built local preview may require a frontend rebuild/restart with paid configuration preserved. No paid API call, deployment, staging, commit or delegation.

Precision: [allocation](../commit-plans/RTL-145.md), [validation](../validation/RTL-145.md), the owner's screenshot/latest testing instruction, `apps/frontend/src/features/session/controller.ts` reset/callers, existing reset tests, [lifecycle](../engineering/LIFECYCLE.md) recovery/reset requirements and root/frontend instructions.
