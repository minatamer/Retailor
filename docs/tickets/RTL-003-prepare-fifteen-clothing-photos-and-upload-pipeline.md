# RTL-003 — Prepare fifteen clothing photos and the bounded upload pipeline

Status: **Planned — not started**\
Planning date: **11 October 2026**\
Milestone: **Product inputs**\
Depends on: [RTL-001](RTL-001-initialize-workspace-contracts-and-safe-runtime.md), [RTL-002](RTL-002-prove-brand-design-system-and-storefront-direction.md)\
Blocks directly: [RTL-005](RTL-005-build-one-page-workspace-review-and-recovery.md), [RTL-006](RTL-006-deliver-live-catalogue-recognition-and-admission.md), [RTL-007](RTL-007-deliver-three-complete-clothing-store-templates.md), [RTL-014](RTL-014-deliver-tailor-inline-photo-crud-and-confirmation.md), [RTL-017](RTL-017-build-vibrant-storefront-runway-landing.md)\
Suggested commit: `RTL-003: prepare fifteen clothing photos and the bounded upload pipeline`\
Parent authority: [Retailor blueprint](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md)\
Queue and execution rules: [Ticket index](README.md)

## Outcome and standalone context

Prepare fifteen distinct photo inputs and the actual local upload experience. FORME spans casual, formal, semi-formal and beachwear: two jeans, two hoodies, two tees, shirt, overshirt, tailored trousers, blazer, cardigan, dress, skirt, resort shorts and swim shorts. Clothing is the demo’s permanent product scope.

Original AI-generated imagery is preferred; licensed Pexels/ordinary Unsplash photography remains an alternative if it produces a coherent unbranded collection. Search thumbnails and collages are not accepted assets. The sample supplies photos, never a ready catalogue. Every fresh public sample generation processes those bytes live. All new products require a real decoded photo; an SVG illustration or generated logo cannot satisfy that invariant.

## Dependency evidence and entry conditions

RTL-001 supplies image contracts and browser boundaries; RTL-002 supplies art direction. Read F01–F15 and the sourcing brief. Use available image-generation tools under the execution request and their skill policy, or inspect individual licensed stock pages. Do not request owner clothing photos as a prerequisite or silently make custom paid runtime API calls outside actual authorization.

Dependency completion means required local behavior, owning contracts and checks actually exist. A planned checkbox or ticket-named commit alone is insufficient. Verified local dependencies may support local follow-on work while separately recorded live, owner-visual or hosted evidence remains pending. Never turn a fake pass into live acceptance.

## Files and responsibility boundaries

| Area | Responsibility owned here |
| --- | --- |
| `apps/frontend/public/sample/forme` | Fifteen primary assets, alternates and source manifest |
| `apps/frontend/src/features/photos` | Picker, decoder, derivative, preview and temporary cache ownership |
| `packages/contracts/src` | Inspected image and recognition-manifest shapes |
| `apps/backend/src/catalogue` | Independent derivative-validation seam for RTL-006 |
| `docs/research/FORME-PHOTOS.md` | Sources, generation records and actual asset review |

Paths describe future ownership. Create modules/directories only with real behavior; reuse contracts, commands, assets and session state rather than a parallel authority.

## Implementation plan

1. **Prepare the garment manifest.** Use stable input asset IDs F01–F15, specified silhouettes/colours and useful alternates. These IDs identify photo inputs, not live product IDs. Public metadata cannot include a catalogue interpretation that bypasses recognition.

2. **Produce coherent photos.** Generate original unbranded garment-only studio photos or inspect licensed individual stock sources. Keep light/background/crops consistent and garments fully visible. Separate offline production cost/provenance from the app’s public live recognition.

3. **Inspect every actual output.** Reject impossible geometry, hidden garments, branding, collages and misleading labels. Alternates must match cut, pockets, stitching and colour. Generated imagery cannot establish fibre, fit, measurements, sustainability or certifications.

4. **Record source/rights evidence.** Each asset has hash, dimensions/format, origin and source URL or generation record plus usage basis. Distinguish ordinary Unsplash from Plus terms. Search pages are leads, not licence records or endorsement.

5. **Validate local selections early.** Accept static JPEG/PNG/WebP. Enforce 24 recognition photos, 32 cached garment/hero sources, 4 MiB per original, 40 MiB originals total, 24 MP and 10,000 px per side before large allocation. Preserve other valid selections when a file fails.

6. **Normalize and bound derivatives.** Apply orientation, strip metadata and encode at longest side 1,600 px and at most 768 KiB/image. Cap selected derivatives at 18 MiB and cached derivatives at 24 MiB. Hash source/derivative identities and detect exact duplicates.

7. **Make selection inviting.** Show photos, count, remove/replace and one primary processing CTA. Sample photos use the same inspected manifest path as uploads. Selection remains local; explain live derivative transfer at deliberate approval, not through repeated dialogs.

8. **Expose one mandatory-photo control.** Provide the labelled native picker, thumbnail/validation and replace/remove behavior for owner forms and Tailor’s inline product card. Block creating a photo-free product or removing its last usable photo. Selecting files does not itself call AI.

9. **Own cache and cancellation.** Use browser-only temporary Blob storage and scoped object URLs. Abort stale decode work and revoke URLs on replacement/reset. Quota denial keeps in-memory work with an honest recovery notice; missing photos require repair, not a fake substitute.

10. **Verify final inputs.** Check exact shipped files, manifest and crops against every theme. Decoder/count/hash/metadata tests must exercise real byte failures. RTL-006/020 evaluate live interpretation; no authored output is a public fallback.

## Acceptance criteria — required local outcome

- [ ] Fifteen actual primary clothing photos have accepted source records.
- [ ] Jeans/hoodies/tees and the full requested garment mix are represented.
- [ ] Alternates match the same item and fit the 24-photo selection.
- [ ] Signature/decode/hash/dimension/aggregate limits are enforced.
- [ ] Invalid/animated/duplicate/oversized files have partial recovery.
- [ ] Owner and Tailor reuse a mandatory-photo validation seam.
- [ ] Picking photos and choosing the sample dispatch zero model calls.
- [ ] Object URLs, owned cache and unavailable-photo behavior are correct.

## Focused verification and evidence

| Case | Required observable evidence |
| --- | --- |
| Contact sheet | Review fifteen independent assets and recorded sources |
| Sample bytes | Actual assets fit decoded/encoded/manifest bounds |
| Corrupt or renamed file | Signature/decode rejection preserves other photos |
| Count and byte edges | 24/32 source caps and aggregate bounds enforced before allocation |
| Duplicate/alternate | Correct retained identity and supported relation |
| Picker interaction | Keyboard/phone preview, replace and cancel |
| Cache denial/loss | Usable in-memory work and explicit missing-byte repair |

Run meaningful focused tests during iteration. At the settled implementation snapshot run the applicable root gates established by RTL-001: `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm check:boundaries`, `pnpm test:unit` and `pnpm build`. Record actual commands/results and revision. UI acceptance needs real browser observations where available; DOM simulations or animation declarations alone do not prove appearance/movement. Do not add tests that merely mirror CSS or static labels.

## External evidence and scope limits

Actual source/generation quality and rights must be recorded. Available image-generation tooling may produce the requested offline assets when this packet is executed, under its skill/tool policy. Any separately billed runtime API operation needs the actual authorization/budget; planning makes none.

No runtime arbitrary URL fetch, untested HEIC decoder, virtual try-on or product-photo generation while shopping. Do not add a bucket/provider file library. Logo cache belongs to RTL-015. Assets are produced during execution; ticket planning does not claim they already exist.

## Precision references

- [3. Decisions and scope](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#3-decisions-and-scope)
- [7. Photo selection, preview and handling](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#7-photo-selection-preview-and-handling)
- [8. Catalogue recognition and review](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#8-catalogue-recognition-and-review)
- [12. Synthetic collection and activity](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#12-synthetic-collection-and-activity)
- [16. Guest state, recovery and cleanup](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#16-guest-state-recovery-and-cleanup)
- [23. Resource limits and cost control](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#23-resource-limits-and-cost-control)
- [24. Visual system, motion and accessibility](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#24-visual-system-motion-and-accessibility)
- [25. Verification and evidence](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#25-verification-and-evidence)
- [29. Decisions to settle during implementation](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#29-decisions-to-settle-during-implementation)

## Completion handoff and commit boundary

Keep this outcome under `RTL-003:`; adjacent cohesive commits may be planned when useful. At execution write file allocations under `docs/commit-plans/RTL-003.md` and actual check/review evidence under `docs/validation/RTL-003.md`. These are future records, not fabricated by this planning pass.

Report files, delivered behavior, settled checks, browser/device observations, deviations and every deferred external check with its prerequisite. Update owning documentation and queue status together. All boxes are currently unchecked. Ticket creation does not implement the feature, authorize Git mutations, start services, call paid runtime providers or publish cloud resources. Follow the user’s actual execution authorization when work starts.
