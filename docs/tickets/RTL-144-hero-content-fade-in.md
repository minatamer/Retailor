# RTL-144 — landing hero content fade-in

17 October 2026. Status: locally implemented and validated; actual browser checks and all six gate outcomes pass, with no actionable findings in settled read-only review. The owner requests a small fade-in on page load for the landing hero content, including its CTA. No staging/commit or external action is included.

Acceptance:

1. On landing page entry/reload, fade the existing hero heading, supporting text and Build my demo store CTA in together. Use a subtle, single opacity transition with no movement, stagger, repeating animation or artificial loading delay.
2. Preserve the existing composition, responsive dimensions, copy, native CTA/navigation, focus visibility, background video/poster, header behavior and touch/desktop scroll cues. Keep content in ordinary HTML with a visible base state; no JavaScript hydration, video-load or provider dependency for the reveal. Preserve designed motion without an OS-based suppression setting.
3. Check the changed landing path in an actual browser, including the reveal/reload, desktop and narrow layouts, CTA entry and keyboard focus. Run applicable repository quality gates and record actual evidence plus a settled read-only review against this complete ticket. No paid/provider request, deployment, staging, commit, new dependency or delegation is authorized by this request.

Precision: [file allocation](../commit-plans/RTL-144.md), [validation](../validation/RTL-144.md), the latest owner request/screenshot, current `apps/frontend/src/features/landing/landing.tsx` and `landing.module.css`, [existing hero acceptance](RTL-105-cinematic-landing-hero.md), root/frontend instructions and installed Next App Router CSS Modules guidance. This request supersedes historical first-paint visibility wording only for the brief initial opacity reveal; the hero remains independent of the video timeline.
