# Loading states and placeholders

Standing owner requirement, 11 November 2026. **Loading states and placeholders must always be deliberately designed to the same standard as the finished screen.** This applies to every new or changed feature, including startup, uploads, image loading, processing, assistant replies, integrations, checkout, refresh and button-level work. They are part of feature acceptance, not deferred polish.

## Design requirements

- Fit the surrounding product's palette, typography, spacing, surfaces, hierarchy and motion. Reuse shared components. A compact indicator can suit a small action; an unstyled spinner or bare loading sentence is not a default substitute for a designed experience.
- Show meaningful pending feedback as soon as the action begins. Reserve the expected content space and keep existing useful content during refresh where appropriate. Reveal real content as it becomes available without disruptive layout jumps.
- For the sample flow, start the existing smooth scroll to Your photos immediately while fetching/checking is active. Let visitors see the loading panel and photos arriving; do not wait for completion or trigger a second completion scroll. Preserve interruption and cancellation.
- Show actual counts or determinate progress only when the operation supplies them. Use an indeterminate treatment otherwise. Never invent completion, add artificial waiting time or hold ready content just to display an animation.
- Keep skeletons decorative and bounded. They do not represent real selectable products, stock, recognized photos or completed work. Use appropriate image proportions and a deliberate loading-to-image reveal.
- Give permanent missing-photo, empty, error and repair states their own honest static treatment and useful recovery. Never leave them shimmering indefinitely or weaken photo eligibility to fill a placeholder.
- Keep readable contrast, labelled status/progress, clear keyboard/touch/focus behavior and usable cancellation/retry where the operation supports it. Announce meaningful changes without narrating every animation frame. Preserve existing operation ownership, limits, deadlines, late-result fences and cleanup.
- Compose for narrow/short screens as carefully as desktop: no clipped actions, overflowing labels, stretched photos or disruptive overlays. Preserve designed motion with restrained distances and no flashing; do not add a motion-disable setting.

## Retailor implementation reference

Use `LoadingState`, `LoadingMark`, `PhotoSkeleton`, `SkeletonCards` and `PhotoPlaceholder` in [loading-state.tsx](../../apps/frontend/src/components/ui/loading-state.tsx), and [PhotoImage](../../apps/frontend/src/components/ui/photo-image.tsx) for supplied-photo loading/reveal. Their shared stylesheet owns the navy/lime marks and warm neutral placeholder surfaces. Keep merchant identities scoped and actual photographed backgrounds unchanged.

The [RTL-184 audit](../audits/RTL-184-LOADING-STATES.md) records current surfaces and intentional non-loading states. Extend the existing vocabulary for a real unmet need rather than adding another unrelated loader.

## Required review

Review actual pending, partial arrival, loaded, cancelled/retried and error/empty/repair states relevant to the change. Check desktop and phone, keyboard/touch use, content pressure and the transition between states. For authored scrolling, record intermediate positions as well as the destination. A screenshot of the loaded result, CSS animation declaration or unit test alone does not prove loading quality.

Use local fixtures or controlled development checks when appropriate; do not create paid requests or external mutations just to manufacture a loading state. Record which states were actually observed and which provider/device checks remain unverified. This rule supplies no new provider, deployment or Git authorization.
