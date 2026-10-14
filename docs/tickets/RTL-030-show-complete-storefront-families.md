# RTL-030 — show complete storefront families on the landing

Owner feedback, 14 October 2026: the three small landing examples do not communicate the three points of view well. Investigate them against the actual layouts and fix the presentation. The screenshot also shows the illustrative FORME wordmark broken across lines.

## Required outcome

- Present Studio, Pulse and Gallery clearly at a useful scale, using the actual storefront renderer and existing finite designs/accepted clothing images. Show each family's real structure rather than a heavily reduced facsimile or a palette-only change.
- Let visitors compare the three families and preview their home, collection and product pages. Keep controls clearly labelled, keyboard/touch accessible, selection apparent, and the same illustrative products across designs/pages.
- Keep full previews readable/responsive on phones, tablets and desktops, without clipped wordmarks, hidden essential composition or horizontal page overflow. Provide a bounded, labelled, keyboard-scrollable preview when its full page is longer than the stage.
- Retain the animated hero's existing compact illustration, motion, offscreen/timer cleanup, photo-failure handling and controls. Preserve normal real-store browsing/purchasing behavior and existing workspace ownership/boundaries.
- Keep authored marketing data clearly illustrative. The landing must create no workspace, use no visitor storage, call no providers and mutate no commerce. Preserve all RTL-026–029 work. No new dependencies, delegation, staging, commits, paid/cloud actions or publication.

## Precision references

- Owner screenshot/request and current landing `landing.tsx`, `runway.tsx`, `illustration.ts`, `choreography.ts` and CSS.
- Actual `features/storefront/storefront.tsx`/CSS and [storefront library](../design/STOREFRONT-LIBRARY.md), family home/collection/detail distinctions. Existing `features/store-design/presets.ts` remains the design authority.
- [Landing design](../design/LANDING.md), illustration versus public recognition boundary and motion requirements. This owner feedback supersedes the small three-card family comparison presentation.
- [Blueprint](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md) sections 4.3–4.4, 9.1–9.4, 24.4–24.6. Root/frontend `AGENTS.md` and installed Next client-component/CSS Modules guides.

## Verification

Actual browser comparison of all three families × home/collection/product at desktop and phone sizes, plus responsive fits at 320, 375, 768, 1024, 1280, 1440, 1920, an intermediate width and short laptop height. Check keyboard family/page selection, preview scrolling/focus escape, image/title/price identity, intact wordmarks, hero controls/motion and retained merged FAQ/Tailor sections. Do not add tests that merely assert static UI shape; run meaningful existing renderer/preset/choreography tests, all six root gates and settled read-only review. Native devices/zoom, fresh Linux/scanner proof, live/hosted checks remain explicitly unverified.

Status: complete local family showcase implemented; 18 comparison states, 81 responsive states, actual representative visuals, keyboard/scroll and hero-continuation checks pass. Existing focused tests: 13/13. Format, lint, types, boundaries and build pass; 388/389 full units pass with only the known current-source Linux-proof mismatch. [File allocation](../commit-plans/RTL-030.md); [actual results and limits](../validation/RTL-030.md). No staging/commit or release acceptance.
