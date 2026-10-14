# RTL-040 — fix the Retailor typography switch on refresh

Owner screenshot14 October2026 identifies the approved cart beside the name, whose typography changes on refresh. Find the cause, remove it completely wherever the logo appears and ensure other behavior is unaffected.

## Acceptance

- Eliminate the logo's runtime font dependency on every Brand consumer. Preserve approved navy/white design, Inter800 shape, cart/R and accessible name/home links; no alternate styling or additional approval needed.
- Preserve stable intrinsic/responsive logo geometry through repeated refreshes and route transitions, including the footer and recovery consumer. A font failure must not substitute a different logo font.
- Audit shared local font loading and deliver early same-origin preload hints for existing interface/editorial/merchant fonts, including global recovery. Preserve current chosen fonts, weights/styles, content fallback readability, all presets, live/fixture boundaries, state/restore/reset and motion. No app visibility gate, remote font or new application dependency.
- Include the new shipped asset in strict Docker/source inventories; preserve unknown-file rejection and exact-byte proof. Inspect actual browser reloads/responsive routes, SVG no-font invariant, production resource hints/assets and original favicon identity. Run applicable settled gates and record unperformed cold/network/hosted/physical checks honestly.

References: exact owner screenshot/request in this chat, [allocation](../commit-plans/RTL-040.md), [brand identity](../design/BRAND.md), original Inter licence/provenance, installed Next16 fonts/resource-hint guides and root/frontend AGENTS.

Status: locally fixed and verified. Font-substitution/missing-font comparison gives identical logo pixels; responsive reloads and all three merchant type choices pass. Five settled root gates pass;388/389 units pass, retaining the known historical Linux-source-proof mismatch. [Actual evidence/limits](../validation/RTL-040.md). No staging/commit or external action.
