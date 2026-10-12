# Tailor setup and owner design

RTL-008 adds the local creative flow to the actual storefront renderer. Tailor stays mounted outside the keyed workflow stage and changes its authored actions for creator, shopper and owner contexts. RTL-013 adds grounded text conversation and tours to this shell; RTL-015 connects the separate logo intent. Finite styling never needs a text prompt, model response or provider dispatch.

## One owner, two looks

`SessionController` owns `acceptedDesign`, `previewDesign`, `setup`, `designEditing` and the presentation revision. The existing commerce graph and browse state remain the same objects when presentation changes. The renderer receives actual products, available photo views and the same selected product/variant/filters. There is no copied preview catalogue, independent money state or reseeding side effect.

Design permits exactly Studio / Pulse / Gallery, Ink / Cobalt / Oxblood / Pine, and Inter / Editorial / Expressive type. The existing registry supplies every option, font specimen and complete page bundle. Plain-text name is limited to 40 characters, headline to 100. React renders text; neither field is HTML or CSS. `heroPhotoId` is an optional available owned photo reference. Missing hero bytes fall back to an available catalogue image; mandatory product photos still follow their existing availability rules.

## Creator conversation

1. **Welcome:** brief local introduction with Let’s style it. Comparison is never blurred.
2. **Layout:** three visual cards describe home/list/detail bundles. Clicking previews; Use this template confirms that exact ID.
3. **Colour:** four named multi-swatch cards. Use this colour theme confirms the selected ID.
4. **Type:** three actual heading/body/price specimens, using a current product’s USD price. Use this typography confirms the selected ID.
5. **Brand:** optional controlled name/headline and hero fields. Use these details confirms edits; Keep suggested details retains the valid visible values without typing.
6. **Mark:** Keep my wordmark or the optional Generate 3 logos intent. Colour and type confirmation must both match the current look; defaults and type-only approval do not qualify.
7. **Summary:** chosen complete design, supplied/default hero and wordmark; Enter my store accepts the preview.

Use this look explicitly approves the current full preset and valid visible brand details, then visits the optional mark choice and final acceptance. No typing is needed. One main task expands; confirmed choices become compact recap rows with Change. A preview selection is not a confirmation. Changing a confirmed ID invalidates its confirmation. Recovery reconciles a stale logo/summary step to the first missing confirmation rather than leaving an unusable offer.

## Brand and photo ownership

Brand drafts and per-field dirty flags live in the session projection. Collapse, choice changes, owner field switches and eligible same-tab refresh retain them. Suggestions can fill pristine fields but cannot replace a human-edited name, headline or hero. An unchanged suggestion preserves confirmation, presentation revision and pending intent; touching an unchanged field still protects it from later suggestions. An empty typed name remains visible for correction; the preview keeps its last valid name and cannot confirm/apply the blank value.

Hero upload uses the existing bounded decoded-photo pipeline and cache with `select=false`. It therefore does not change the recognition selection, input revision, completed draft or products. The uploaded hero is separate from a product photograph; the hero CTA opens the collection and its alt text identifies a supplied brand image. Accepted and preview hero references are protected alongside product image IDs. Feedback reports rejected inputs without replacing the current look.

Async upload completion checks the owner, generation, stage and preview revision. A late result cannot apply after another look, reset, navigation or cancel. Apply/accept cancels a pending upload. Retained but unreferenced inspected images remain within the existing 32-photo/cache limits; RTL-016 completes broader lifecycle cleanup.

## Owner override

The dashboard’s Design panel uses the same choice cards, fields, registry and controller methods. One field group is open at a time. Wide screens show controls beside the actual renderer; narrower screens place the renderer below with See design preview / Back to design controls. Low-height controls remain in normal flow.

Apply look updates the accepted design; Cancel restores it and resets the brand draft to accepted values. Opening an already open editor is idempotent. Closed owner controls reject late brand/presentation writes. Meaningful changed previews or dirty fields require Keep editing / Discard preview and leave before navigation. This uses the existing single native workspace dialog and never changes commerce records. Opening focuses the Design heading; Apply/Cancel return to Edit store design, with a concise accepted-look recap. The owner editor’s open state and draft restore as editable local state, not an automatically executing action.

## Responsive surface, focus and motion

Tailor sits at the lower right. Desktop setup reserves room for the preview; a phone/tablet uses a compact sheet bounded to 58dvh with its own scroll area and a persistent See full preview control. The launcher preserves the current step. Width uses the available containing viewport, including scrollbar space. Safe-area insets are respected.

Collapse returns focus to the launcher. Expansion and a changed microstep focus its heading without moving the page, then smoothly reveal that heading within the owned conversation scroller. Selecting a card keeps focus on that card. Inputs use native semantics, bounded values and 16px text. A single owned `visualViewport` resize/scroll subscription accounts for a keyboard shrinking the available area and removes both listeners on cleanup. Physical virtual-keyboard acceptance remains separate from desktop viewport emulation.

CSS entrance, hover/focus and native smooth scrolling provide motion. No timers accumulate per selection, and there is no animation suppression setting or OS-based suppression. Native dialogs supply modal focus containment; Tailor is a non-modal region so the real store remains usable.

## Recovery and logo intent

Only allow-listed bounded setup/design fields serialize. An eligible projection preserves confirmed exact IDs, dirty fields, accepted/preview separation and browse context. Obsolete finite design IDs are repaired to their accepted default with an explicit recovery notice, while valid commerce/photo metadata remains intact. Other malformed/unknown projection data stays rejected. A repaired style is not silently confirmed.

The three-logo intent contains only current design revision, name, confirmed colour/type and candidate count 3. It is ephemeral, clears on design/navigation/reset and never serializes or dispatches. The current UI truthfully explains that generation is not connected yet. Selecting a preset, hovering, revealing or confirming the offer causes no paid call.

## Verification

Focused session tests cover explicit gate/default approval, latest selections, selected-product preservation, dirty/suggestion precedence, recovery, owner Apply/Cancel/idempotent opening, navigation guard, separate hero upload, stale completion and obsolete-preset fallback. Actual local browser and settled root-gate evidence lives in [RTL-008 validation](../validation/RTL-008.md), with viewport captures under [design evidence](../design/evidence/RTL-008). The full 36-look/108-composition and physical-device/zoom/owner visual acceptance remain in RTL-019; live logo execution belongs to RTL-015/020.
