# RTL-106 — align product draft hover with card borders

Status: **Locally implemented and reviewed.** Actual laptop/phone/tablet hover/focus and connected controls verified; five code/build gates pass and624/625units pass with only the existing strict Linux source-proof mismatch. [Validation](../validation/RTL-106.md) records current evidence and remaining Linux/hosted/physical acceptance. Prior unstaged work stays intact; nothing staged/committed or externally invoked.

Acceptance:

1. Product draft review hover follows the full card's existing outer border, including its footer, with no inset/cross-card rounded ring above the metadata/Exclude row. Match the edit region's top corners to the card and preserve image stacks/layout/motion.
2. Keyboard focus on the edit region remains clear, now around the outer card. Include/Exclude and linking controls keep their independent usable focus/action behavior. Do not change click targets, product data or session/domain rules.
3. Shared upload photo preview hover/focus remains unchanged. Actual linked/single product and responsive checks verify the changed path; no implementation-shaped tests or runtime/dependency changes for a CSS fix.
4. Complete a settled read-only incremental review, six repository gates and current validation/status evidence. Keep the existing Linux source-proof check strict and report pending Linux/hosted/physical acceptance honestly. No staging/commit, cloud/provider call or publication.

Precision: [allocation](../commit-plans/RTL-106.md), [current draft flow](RTL-104-upload-preview-draft-grouping.md), [RTL-023 quality](../audits/RTL-023-CODE-QUALITY.md), [approved security](../audits/RTL-023-SECURITY.md), installed Next CSS Modules guidance. Latest owner feedback changes only the visible review-card interaction treatment.
