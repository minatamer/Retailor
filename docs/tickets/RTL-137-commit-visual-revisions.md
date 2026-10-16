# RTL-137 — validate and commit approved visual revisions

16 October 2026. Status: **Locally validated; approved commit batch.** The owner accepts the RTL-136 appearance, requests a file-level commit plan and explicitly approves staging and committing the accumulated RTL-115–136 work. This supersedes those tickets' historical no-staging/no-commit observations. All six settled gates now pass, including634/634 unit tests, with no actionable final review findings. The validation record and Git history identify the approved commits. Current external release acceptance remains pending.

Acceptance:

1. Allocate every current tracked/untracked source-owned path exactly once in [the exhaustive plan](../commit-plans/RTL-137.md), using cohesive final-file commits. Preserve the completed behavior and the actual per-ticket visual evidence; shared files may span several sequential tickets. Do not fabricate independently accepted intermediate snapshots.
2. Run `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm check:boundaries`, `pnpm test:unit` and `pnpm build`. Independently verify any finding, fix relevant errors and revalidate the settled change. Record commands, environment, actual outcomes and a complete read-only final review in [validation](../validation/RTL-137.md).
3. Before staging, verify the exact allocation, UTF-8/LF text, absence of unintended credentials and generated files, and unchanged settled application bytes. Stage explicit paths only, inspect the staged changes, use normal Git identity/hooks and ticket-prefixed cohesive commits. Verify each committed path/blob and the final clean index/worktree. Keep a local frozen inventory and commit ledger.
4. Keep ignored app-local secrets, artifacts, screenshots, raw logs/scanner output, dependencies and build caches local. Preserve all photo/session/provider/security/exact financial/motion behavior. No push, deployment, paid/live provider call, cloud mutation, delegation or new chat. Current Linux/image/scanner/hosted/public/paid acceptance remains pending; local gates and commits do not establish that acceptance.

Precision: root/frontend instructions, RTL-115–136 tickets and their plans/validation, changed design documents, [prior packaging workflow](../commit-plans/RTL-089.md). This ticket packages the approved final files; it does not reopen settled product choices.
