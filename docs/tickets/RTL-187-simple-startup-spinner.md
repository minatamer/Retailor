# RTL-187 — Restore the simple startup spinner

11 November 2026. The owner's latest screenshot requests restoring the simple spinner beneath the Retailor logo while the demo session opens, without the loading card. This supersedes RTL-184's startup treatment only. Preserve other designed loading states and all prior work in progress.

## Acceptance

1. Keep the centered Retailor logo and restore the small branded spinning ring below it. Remove the startup card, its visible copy, mark and progress track. Retain an accessible loading status and restrained motion without flashing.
2. Preserve session initialization, restore, expiry, disposal and ready-state behavior. No delays, settings, providers, new dependencies or services.
3. Check actual pending-to-ready startup on desktop and phone in Codex's in-app browser. Run applicable local gates and a settled read-only review; record actual results and limitations. No stage, commit, push or publication.

Precision: root/frontend AGENTS.md, installed Next use-client guide, existing session context and loading design standard. The owner's explicit local design correction takes precedence over the historical full loading audit's startup-card choice.

Status: locally implemented and reviewed. Actual desktop/phone startup and ready-state restore checked in Codex's in-app browser; 25 existing session tests and five code/build gates pass. No session behavior changed. [Actual evidence and verification scope](../validation/RTL-187.md). Nothing staged or committed.
