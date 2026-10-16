# RTL-129 — continuous storefront background and simpler bottom

**Final batch update — 16 October 2026:** [RTL-137](../validation/RTL-137.md) records all six passing settled gates (634/634 unit tests), final read-only review and the owner's explicit staging/commit approval. This supersedes the earlier deferred-check/no-commit packaging state below; dated observations and external/physical limitations remain.

16 October 2026. Status: **Implemented; final batch validation pending.** The owner requests the selected store background extending through the full page, including the bottom attribution/control area, and removing the repeated store name at the bottom. Subsequent feedback requests a matching navbar divider and accepts its appearance. [Quick evidence](../validation/RTL-129.md) records actual desktop/phone observations and settled source review. Automated gates remain deferred under the owner's edit-batch instruction.

Acceptance:

1. The actual storefront workspace uses the same effective merchant canvas as its rendered store, including the attribution/control area and minimum viewport height. Follow the selected palette rather than hard-coding the pictured Cobalt blue. Owner follow-up adds a thin horizontal divider above Powered by Retailor matching the top navbar's 1px line and merchant border colour exactly. Keep platform/Tailor identities and other stages unaffected.
2. Remove the redundant bottom merchant name/logo. Avoid an empty branded footer in the actual store; retain the embedded preview's review/owner action and actual store's bottom personalization/reset/owner links, plus Powered by Retailor.
3. Preserve the header merchant name/optional logo, logo failure handling there, store navigation, photos, shopping, design acceptance and shared state/controller authority. Remove only newly unconsumed branding selectors; preserve preview/footer action styles, responsive bounds, focus and motion.
4. Perform quick actual desktop/phone observations with a coloured palette and verify dashboard isolation. Automated gates remain deferred until the owner's end-of-batch pass. Preserve previous work; no staging, commit, delegation, provider/paid/cloud action or publication.

Precision: [allocation](../commit-plans/RTL-129.md), WorkspaceFlow/CollectionCanvas and Storefront shell, merchantStyle palette roles, current full-page/merchant-scope notes in STOREFRONT-LIBRARY, installed Next client/CSS Modules guides and root/frontend instructions. Latest owner request supersedes historical instructions to repeat the merchant footer branding.
