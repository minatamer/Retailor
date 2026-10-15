# RTL-113 — commit the accumulated demo revisions

16 October 2026. Owner asks for a file-level commit plan and explicitly approves staging and committing all outstanding work for tomorrow's review. This supersedes historical no-staging/no-commit observations in RTL-090–112. No push, deployment, new cloud/paid/provider action or delegation is authorized.

Acceptance:

- Freeze all source-owned changes after `c57211a79b0df5f8832eeb13d9a796acc7622c20`; assign each path once in dependency-ordered, ticket-prefixed whole-file groups before staging. Preserve shared final files without inventing per-ticket intermediate history.
- Keep ignored app-local secrets/ADC, dependencies, build/cache/log/scanner output and raw screenshots/media local. Verify canonical LF text, intended shipped font/video provenance and licenses, obvious credential patterns and unchanged settled RTL-112 application bytes. Keep the existing strict source-proof failure explicit; do not weaken a test or change app behavior for packaging.
- Complete read-only packaging/content/allocation review. Stage explicit frozen paths only; inspect staged patches/stat/whitespace and exact paths/blobs/modes. Commit with existing identity and normal hooks, verify each resulting commit and an empty index. No blanket staging, force/reset/rebase, hook bypass, Git configuration change or push.
- Record actual commit IDs, scope and validation. Reuse only the gates for identical current application bytes and preserve the provenance/limits of per-ticket actual browser and authorized sandbox/storage evidence. External Linux/image/scanner/hosted/physical/public-paid acceptance remains pending.
- Verify every allocated path/blob against final HEAD, no unexpected committed paths, unchanged raw-byte application fingerprint and clean tracked/untracked/index state. Preserve normal ignored local files.

Precision references: [exhaustive allocation](../commit-plans/RTL-113.md), [actual packaging evidence](../validation/RTL-113.md), [settled RTL-112 gates](../validation/RTL-112.md#commands-and-exact-bytes), complete RTL-090–112 tickets/plans/validation and current checkout/logo/upload/landing guidance. Root repository instructions and latest owner authorization apply. This ticket changes documentation and Git packaging only.

Status: approved220-path allocation and settled read-only packaging review complete, including verified current handoff corrections and documentation formatting. Five implementation groups commit130 exact paths with recorded IDs and empty-index checks; the sixth90-path documentation group completes this handoff, with its own ID and immediate final checks recorded by Git/local ledger after creation. Application bytes remain the settled RTL-112 fingerprint and retain the stated strict source-proof failure. No push or new app/external-release acceptance is implied.
