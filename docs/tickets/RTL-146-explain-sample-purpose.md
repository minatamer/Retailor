# RTL-146 — explain the sample collection's purpose

17 October 2026. Status: implemented; scoped read-only review has no actionable findings and the paid-mode local frontend is refreshed. Tests remain deferred by the owner. The owner requests replacing the sample card's FORME/generated-photo/grouping footnote with one short sentence explaining that the sample lets visitors try the demo right away.

Acceptance:

1. Replace only the selected sample footnote with “Use these sample photos to try the demo right away.” Preserve its existing styling and placement.
2. Preserve sample counts, photos/provenance assets, selection/loading/cancel controls, required deliberate draft processing and the existing reset/hero revisions.
3. Honor the owner's current test deferral unless an error is found. Complete scoped read-only review and refresh the existing local frontend if required, preserving paid-mode configuration and backend ownership. No paid API call, deployment, staging, commit or delegation.

Precision: [allocation](../commit-plans/RTL-146.md), [validation](../validation/RTL-146.md), the latest owner screenshot/request and test-deferral instruction, `apps/frontend/src/features/demo/workspace.tsx` sample card, root/frontend instructions and installed Next client-component guidance.
