# RTL-072 — Tailor welcome arrives like chat

15 October 2026 owner screenshot/request: on entering the personalization page, animate Tailor's text appearing like chat so people notice the panel instead of seeing an already loaded block.

Acceptance:

- Welcome/setup heading and paragraph reveal progressively in readable word order when their page/message opens. A short heading lead flows into the paragraph and finishes promptly. Creator, shopper and owner local welcome text use the same presentation. Opening a collapsed panel and changing the creator step can replay the new entry; ordinary selection/typing/preview rerenders do not restart it.
- Preserve exact message text, heading semantics and a single complete accessible copy without per-word live announcements. Reserve layout space so buttons and content do not jump, and keep all actions/inputs available throughout the entrance.
- Finite animation stops with unmount; fast next/back/collapse/role/reset/refresh remain safe. No provider call, simulated provider progress, delayed authority, extra dependency or motion-suppression setting.
- Check actual early/mid/complete animation frames, stable geometry, native keyboard/step/selection/reopen/restore, creator and companion entries, desktop/tablet/phone layout and browser errors. Run meaningful existing Tailor/setup/session regressions and six settled gates; review complete settled diff read-only. Preserve prior pending edits and current external/source-proof limitations. No Git or external action.

References: exact request/screenshot, [allocation](../commit-plans/RTL-072.md), [Tailor engineering](../engineering/TAILOR.md), RTL-067 personalization copy, current Tailor setup/motion/accessibility/source-of-truth rules and root/frontend instructions. Status: implemented and locally reviewed. [Actual validation](../validation/RTL-072.md): native progressive frames, stable layout/controls, keyboard progression, preview/typing/reopen/role/restore/reset and four responsive widths verified; focused 19/19 and five root code/build gates pass. Full units retain only the existing historical source-proof failure, 496/497. Current live/physical/assistive-technology/owner/external acceptance remains pending. Nothing staged or committed.
