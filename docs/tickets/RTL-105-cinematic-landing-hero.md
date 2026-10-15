# RTL-105 — cinematic landing hero

Status: **Locally implemented and validated.** Full video hero and adaptive navigation pass actual desktop/phone/landscape, native playback/loop, anchor/reload and CTA checks. [Evidence](../validation/RTL-105.md):6/6 focused tests, five passing code/build gates and624/625 units with only the existing strict Linux source-proof mismatch. Latest owner feedback removes the eyebrow/dot and playback button. Fresh Linux/image/scanner/hosted/physical/owner acceptance remains pending. Nothing staged/committed or externally published.

Acceptance:

1. A real self-hosted full-viewport background video with a dark overlay replaces the two-column landing hero. Existing heading, supporting text and lime demo CTA are centered, readable and aesthetically spaced.
   Owner follow-up: remove the “For the clothes you believe in” eyebrow and its dot, keeping the remaining composition centered.
2. Landing navigation is transparent with a white logo/links over the hero, then white with navy content after the hero. Keep the lime CTA and smooth focus-aware section navigation; logo returns to the complete hero. Other page branding is unchanged.
3. Original subtle looping motion uses owned clothing assets, has no audio/flashes/third-party dependency and a matching still fallback. Latest owner follow-up removes the play/pause button; keep muted inline autoplay/loop with no visible playback controls. Preserve designed motion without OS-based suppression. Desktop, phone and short landscape fit without horizontal overflow or obscured text/links.
4. Shipped video/poster are explicitly included in release packaging and exact-byte fingerprints; generated binaries are excluded from text conversion. No secrets/visitor assets or encoder binaries enter the build context.
5. Complete settled read-only review, focused meaningful checks, six required gates and actual native browser evidence. Preserve unrelated unstaged work and report existing stale Linux proof honestly; no simulated browser/provider/hosted acceptance.
6. Latest owner follow-up: mobile/tablet replace the plain hero arrow with a subtle animated touch-hand gesture and “Swipe up to see details”. No mouse icon or mouse-shaped capsule. Keep it centered, readable and tappable with the existing real section destination/focus-aware scrolling; preserve native swiping and the desktop arrow.

Precision: [allocation](../commit-plans/RTL-105.md), [RTL-023 quality](../audits/RTL-023-CODE-QUALITY.md), [approved security](../audits/RTL-023-SECURITY.md), [landing packet](RTL-017-build-vibrant-storefront-runway-landing.md), installed Next video/CSS/client guidance. Owner's latest centered video/header instruction supersedes historical runway layout details only.
