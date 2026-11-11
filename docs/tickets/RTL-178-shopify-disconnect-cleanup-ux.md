# RTL-178 — Immediate cleanup wake and clear Shopify disconnect state

## Authority and status

11 November 2026. Owner reports the Disconnect card still offers Refresh connection and Disconnect, while products remain briefly in Shopify. Investigate actual saved state, improve the disconnected/removal UI, and start local cleanup promptly. Preserve all 42 existing RTL-174–177 paths at HEAD `e44423059932d7c6b9584381e529fa36aa92e78e`; index empty. No staging/commits, distribution changes, deployment or paid calls.

## Precision references

- [RTL-164](RTL-164-shopify-cleanup-and-session-lifecycle.md): durable requests, exact ownership, removal verification before uninstall, explicit worker lifecycle, independent browser closure, finite budgets/backoff and retention.
- `shopify/cleanup.ts`, `runner.ts`, `service.ts`; frontend bounded Shopify child controller and Connections card; additive browser-safe status schema.
- Root/frontend AGENTS.md; RTL-023 quality/security preservation of private diagnostics, bounded work, cancellation, source-controlled visitor copy and one session state owner.
- Actual private ledger inspection on this date: one installation, nine products `removed`, each first cleanup attempt; collection removed, installation cleaned, credentials erased. First attempt began approximately 41 seconds after the recorded Disconnect. No token or secret was printed/extracted and no extra Shopify mutation was needed for this check. A verified backend-only restart enabled safe exclusive-ledger inspection.

## Acceptance

1. Disconnect durably fences further operations, then wakes the existing explicitly started local worker immediately. Never wait for remote deletion in the HTTP acknowledgement or browser reset. Keep the minute timer as a browser-independent backstop; preserve all sweep/call/attempt/lease/deadline/backoff/retention limits. A request arriving during an active sweep must not be lost; at most one wake is coalesced. Stop unregisters the wake and aborts/settles owned work. Imports/factories remain inert. Hosted scheduled execution remains separately required.
2. Expose whether the installation has ended through narrow additive status metadata, including ended needs-attention states. Pending removal is disconnected from Retailor; never claim Shopify app access is revoked or products deleted until confirmed.
3. The ended card shows Disconnected with concise product-removal progress or confirmed completion, without Connect, Refresh connection, or repeated Disconnect. Keep the store identity, About disclosure and exact manual recovery links if removal fails. Preserve onboarding Skip and local storefront behavior. Do not show stale "Cleanup requested" copy after progress settles.
4. While the ended card is visible, check status promptly during initial cleanup, retaining the twelve-poll cap, Retry-After, cancellation/navigation/expiry fences and later bounded cadence. Stop automatic checks after verified cleaned. Failed disconnect acknowledgment must not falsely claim confirmed disconnection.
5. Meaningful tests cover request/wake ordering, coalescing/shutdown, expired/foreign/invalid requests, status compatibility, controller polling/completion/failure. Use actual in-app responsive UI checks for pending/cleaned/recovery states. All six gates, settled read-only review and actual evidence in `docs/validation/RTL-178.md`.

## Progress

Implemented locally: immediate worker wake, additive ended metadata and clear disconnected/removal UI, including zero-export and app-closure failure states. Focused regressions and controlled Codex in-app desktop/tablet/phone checks pass. Actual retained provider outcomes confirm the owner's nine original exports and collection were removed and app access closed. Earlier broad-unit timing failures are retained in [validation](../validation/RTL-178.md); the later [RTL-179 full combined-worktree run](../validation/RTL-179.md) passes all six gates and856/856 tests with normal limits, clearing that local gate on current source without any Shopify/commerce fix or relaxed test. No actionable RTL-178 code findings remain. Native timing of the new wake remains unverified until a fresh connection/export/disconnect session. Nothing staged or committed.
