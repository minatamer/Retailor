# RTL-104 — photo previews then product draft review

Status: **Locally implemented and validated.** Both paths now preview/check individual photos, then explicitly create a draft whose review owns grouping. [Actual evidence](../validation/RTL-104.md):57/57focused tests, sample/personal desktop/phone preview→draft→separate/include/link/back/restore and sample cancel checks, five passing code/build gates and624/625units with only the existing strict Linux source-proof mismatch. Live semantic/physical/hosted acceptance remains pending. Nothing staged/committed.

Acceptance:

1. Upload shows individual photo previews, add/replace/remove and local file checks/errors only. No product-card/group/auto-link or manual linking/separating controls in upload or its photo dialog. Samples do not pre-group known views; use the same selection behavior as visitor uploads.
2. Exact CTA **Create product draft** starts existing deliberate catalogue processing once, with clear supporting text about garment recognition and suggested matching views/colours. Selection/preview never runs recognition. Public samples still require fresh live recognition; fixtures remain development-only.
3. Draft review clearly presents products and suggested groups. Existing Link photos and Separate photo controls let visitors fix results before Personalize, keeping all photo availability, clothing confirmation, option/colour, product limits and correction-history rules.
4. Preserve manual review decisions/session restoration, back navigation, cancellation/late-response/reset fences, file/dedup/raster/count/work limits, explicit admission and no hidden retries/provider fallback. No new server/cloud/paid action or dependency.
5. Focused meaningful tests, complete read-only incremental review and six settled gates; actual sample/personal-upload desktop/phone checks with evidence. Record known Linux source-proof limitation honestly, preserve earlier unstaged work and leave all Git actions unperformed.

Precision: [file allocation](../commit-plans/RTL-104.md), [lifecycle](../engineering/LIFECYCLE.md), [RTL-023 quality dispositions](../audits/RTL-023-CODE-QUALITY.md), [approved security dispositions](../audits/RTL-023-SECURITY.md), [photo packet](RTL-003-prepare-fifteen-clothing-photos-and-upload-pipeline.md), [recognition packet](RTL-006-deliver-live-catalogue-recognition-and-admission.md). Latest owner feedback changes upload/grouping timing and controls only; dated evidence for the old UX remains historical.
