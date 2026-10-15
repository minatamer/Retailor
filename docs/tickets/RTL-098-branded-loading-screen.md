# RTL-098 — centered Retailor loading screen

Status: **Locally implemented and validated.** [Actual evidence](../validation/RTL-098.md) covers natural initial→ready behavior and laptop/phone/narrow-phone layout. Formatting, lint, types, boundaries and production build pass;615/616 units retain only the existing strict Linux source-proof mismatch. External Linux/image/scanner/release and physical-device acceptance remain pending. Nothing staged or committed.

Owner request: replace the plain top-left Opening your temporary collection screen, including after Stripe returns, with a large centered Retailor logo and a continuously spinning indicator underneath.

Acceptance:

1. Reuse the existing navy-on-white Retailor lockup; center the logo/spinner group within the viewport and size it responsively for laptop/phone. Remove the visible plain loading sentence; retain an accessible status.
2. Preserve continuous nonflashing motion, actual session initialization, persisted restore/checkout return/cancellation and normal completion. No artificial delay, new provider call, dependency, timer or session state owner; existing brand usages stay unchanged.
3. Actual visual and initial→ready checks, read-only settled review, six repository gates and accurate evidence/index. Preserve earlier unstaged work. No staging/commits/delegation/external mutation.

Precision: [allocation](../commit-plans/RTL-098.md), the existing SessionProvider fallback and Brand component; [RTL-097 return evidence](../validation/RTL-097.md). This presentation change supplies no new payment/cloud/release authorization.
