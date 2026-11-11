# RTL-179 — Scroll to the accepted sample photos

11 November 2026. Owner requests a smooth scroll to **Your photos** after clicking **Use the 20-photo sample**. Preserve all 50 existing changed RTL-174–178 paths and the empty index at HEAD `e44423059932d7c6b9584381e529fa36aa92e78e`.

## Acceptance

1. Explicit sample selection smoothly scrolls to the rendered Your photos heading once sample loading completes and usable sample photos are present, including a repeated click on an already selected sample.
2. Do not scroll on initial mount/restore, ordinary uploads, cancelled loading, an empty/failed sample selection, or a different stage. Keep photo validation/loading/capacity and explicit Create product draft behavior unchanged. No AI/provider call for this scroll.
3. Reuse the existing component and smooth-motion pattern with a scoped ref, no global selector/ID, arbitrary sleep, dependency or controller/business-state change. Keep comfortable heading clearance and keyboard controls.
4. Check the actual button/scroll in Codex's in-app browser at desktop and phone sizes; record actual results and required repository gates in `docs/validation/RTL-179.md`. Preserve earlier broad-suite timeout evidence; never claim a failing gate passes. A small presentation change does not need implementation-mirroring tests.

Precision: root/frontend AGENTS.md, existing WorkspaceFlow stage-scroll effect, PhotoPicker Your photos heading, SessionController.sample and validated PhotoController snapshot. Read current Next use-client guidance; preserve RTL-023 photo/lifecycle and source-controlled error boundaries.

Status: implemented and locally validated. Real in-app desktop/phone, repeated sample, keyboard cancellation and restore checks pass; settled read-only review found no actionable findings. All six gates pass,856/856 tests across124 files. [Actual evidence](../validation/RTL-179.md). No staging, commits, publication, credentials or paid call.
