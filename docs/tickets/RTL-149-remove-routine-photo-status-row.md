# RTL-149 — remove the routine photo-status row

17 October 2026. Status: implemented; scoped read-only review has no actionable findings. The owner's latest correction requests removing every version of the persistent photo-status message area, including the restored-photo confirmation, rather than removing individual strings. Tests remain deferred unless an error requires investigation.

Acceptance:

1. Remove the generic persistent notice row from the photo picker, including its empty space. Routine restored/checked/removed/cancelled/grouping/cover/order/reset/repair confirmations must not reappear there under different text.
2. Preserve meaningful photo errors and recovery/storage/expiry warnings in the existing photo-issues area, with controller-owned classification rather than text matching. Keep actual progress, upload/selection/preview/processing, checks/limits, cancellation/revision/cache fences and contextual editor behavior intact.
3. Preserve earlier RTL-144–148 work, use hot reload without rebuild/restart, record scoped read-only review and defer tests/gates under the owner's instruction. No paid API call, browser data mutation, deployment, staging, commit or delegation.

Precision: [allocation](../commit-plans/RTL-149.md), [validation](../validation/RTL-149.md), the latest owner screenshot/correction and test deferral, current photo controller/picker/editor consumers, root/frontend instructions, retained RTL-023 error/privacy dispositions and installed Next client-component guidance. This supersedes the earlier approach of clearing individual success strings only.
