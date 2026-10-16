# RTL-119 — product description wording

**Final batch update — 16 October 2026:** [RTL-137](../validation/RTL-137.md) records all six passing settled gates (634/634 unit tests), final read-only review and the owner's explicit staging/commit approval. This supersedes the earlier deferred-check/no-commit packaging state below; dated observations and external/physical limitations remain.

16 October 2026. Status: **Implemented and locally reviewed; owner visual acceptance pending.** The owner asks whether “Product copy” means description and requests “description” throughout the application for this meaning.

Acceptance:

1. Rename the catalogue product editor's description label to “Product description”. Audit app-visible product labels, messages and tours for “copy” used to mean a garment description, and use description consistently wherever that wording appears.
2. Preserve the description field, existing value, limit, label association and save/cancel behavior. Keep unrelated duplicate-photo/size-default language and internal command/schema/provenance identifiers intact. No contract migration, state, provider, style or configuration change is needed.
3. Verify the rendered editor and accessible label at desktop and phone sizes on the real local fake-mode path; preserve earlier pending work. Check existing dashboard/storefront wording in source and real views when reachable without altering a visitor's data.
4. Run the six settled gates and complete-ticket read-only review; record actual evidence and limits. No staging, commit, delegation, paid/provider/cloud action or publication.

Precision: [allocation](../commit-plans/RTL-119.md), catalogue product editor/review/edit-input, owner product form, existing product/tour descriptions, installed Next client-component guidance and the owner's screenshot/request.

[Actual validation](../validation/RTL-119.md): wording audit, four responsive editor checks, keyboard access and cancel preservation, all six passing gates and 632/632 tests. Complete-ticket read-only review found no actionable issues. Prior work remains preserved and uncommitted; external release acceptance remains pending.
