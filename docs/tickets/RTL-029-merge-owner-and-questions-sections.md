# RTL-029 — merge owner overview and questions

Owner visual feedback, 14 October 2026: merge the two supplied landing-page sections using the left column of the connected owner overview and the right column of the questions section.

## Required behavior and scope

- Keep the existing “Beautiful in front. Connected behind.” eyebrow, “The clothes. The whole picture.” heading, supporting paragraph and three feature bullets as the merged section's left column.
- Use the existing six expandable questions/answers as its right column. Remove the illustrative order card and the later standalone FAQ heading/section; show the questions once.
- Keep both existing navigation destinations working: `#owner-view` reaches the merged section and `#questions` reaches its questions. Keep native details/summary keyboard/touch behavior, indicators, content and motion.
- On narrow screens, overview precedes the questions in normal page flow, without clipping/overlap/horizontal overflow. Preserve the new two-card Tailor section and all prior RTL-026/027/028 edits.
- No provider/state/security changes, dependencies, delegation, staging, commits or paid/cloud actions.

## Precision references

- Owner's two screenshots and column-selection request in this chat.
- `apps/frontend/src/features/landing/landing.tsx` connected overview, FAQ entries, anchors and Tailor section; `landing.module.css` scoped responsive styling.
- [Landing source of truth](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md): sections 4.3–4.4, 24.4–24.6. The latest owner request supersedes the historical separation of these two sections and the worked illustrative order card.
- Root/frontend `AGENTS.md` and installed Next CSS Modules/accessibility guides. Preserve existing semantic native disclosures; do not add custom state.

## Verification and status

Verify actual current-source desktop/tablet/phone layout, all six disclosures, keyboard opening/closing and both anchors. Check the same responsive matrix as RTL-028 and retain its Tailor cards. Run the required six root gates, record results and perform settled read-only review. Existing current-source Linux/scanner evidence remains pending; never weaken strict preflight checks.

Status: requested local merge implemented. Actual responsive, six-question keyboard/pointer and both-anchor checks pass. Format, lint, typecheck, boundaries and build pass. Full units: 388/389 pass, retaining the prior strict current-source Linux-proof mismatch. [File allocation](../commit-plans/RTL-029.md); [actual results and limits](../validation/RTL-029.md). Nothing staged or committed.
