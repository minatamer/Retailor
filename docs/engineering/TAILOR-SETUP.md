# Tailor setup and owner design

**Current template-specific hero controls — RTL-074, 15 October 2026:** Creator Brand and owner Brand & hero expose two ordered choices for Studio Home and three for Pulse/Gallery Home, resolving independent page assignments. Actual thumbnails, automatic choices and per-position uploads use the renderer's selection function. Choices persist through layout switches, confirmation, Apply/Cancel and refresh; Studio retains its hidden third choice. Every hero reference retains photo ownership, finite cache/upload/lifecycle and design-fence authority. Long owner hero forms use normal page flow so Apply/Cancel stay reachable. This supersedes the historical single-photo UI below. [Behavior](../design/HERO-PHOTOS.md), [actual validation](../validation/RTL-074.md).

**Current dashboard intro correction — RTL-057, 15 October 2026:** The owner screenshot's introductory eyebrow, “The clothes. The whole picture.” title and USD/demo paragraph are removed. Create a garment remains in a compact right-aligned action row above the scenario controls on all checked sizes. Reset/View storefront stay in the top Retailor header; scenario/view/record controls and their contextual disclosures remain. [Actual local verification](../validation/RTL-057.md).

**Current owner navigation placement — RTL-056, 15 October 2026:** View storefront now sits beside Reset demo in Retailor’s top workspace header throughout the owner stage. Create a garment remains in the owner heading. Existing secondary styling, controller navigation, restore/reset and unsaved-design leave confirmation remain intact. Phone controls wrap together below the brand with 44px targets; tablet/laptop retain one header row. [Actual local verification](../validation/RTL-056.md).

**Current storefront navigation placement — RTL-055,15 October2026:** Revisit the look and Owner dashboard now sit beside Reset demo in the top Retailor workspace header when shopping, replacing the lower storefront action bar. Existing stage/navigation/preview/record authority remains unchanged. Phone layout keeps brand/Reset on the first row and the two equal-width store actions directly below with readable wrapped labels and matching heights. [Actual local verification](../validation/RTL-055.md).

**Current merchant palette revision — RTL-053,14 October2026:** Retailor’s navy/lime/white platform is independent of the store’s colour mood. Five finite themes appear in creator and owner controls: Navy/Lime (marked fresh/reset default), original Ink/Paper, Cobalt/Cloud, Oxblood/Blush and Pine/Sand. Valid saved IDs keep their identity; unknown/obsolete recovery uses the current default without silently confirming it. Native choices preview the real three-page store immediately, preserve product/options/filters/commerce and use existing confirm/Apply/Cancel fences. Fake creator/owner requests recognize explicit unambiguous theme names and return inert previews; live preset discovery exposes IDs, default and a compact character dictionary within the unchanged request-byte envelope. Shopper styling authority remains forbidden. Theme selection never generates logos. [Actual local verification](../validation/RTL-053.md).

**Current naming revision — RTL-052,14 October2026:** The logo microstep now exposes a bounded editable store name beside its live selected-type wordmark, palette/type recap and optional three-logo action. Existing brand draft/dirty fields own it; typing stays in that step, refresh is inert, blank/unsupported actual names block generation/proceed, and explicit keep/generate confirms the name. Renaming clears an old-name raster from the working preview while owner Cancel retains accepted identity. Fake uses one explicit click; live retains prepared-context batch approval. Owner BrandFields supplies the name without a duplicate adjacent field. [Experience plan](../design/STORE-NAME-AND-LOGOS.md), [actual local validation](../validation/RTL-052.md). Earlier description remains historical where superseded.

RTL-008 adds the local creative flow to the actual storefront renderer. Tailor stays mounted outside the keyed workflow stage and changes its authored actions for creator, shopper and owner contexts. RTL-013 adds grounded text conversation and tours to this shell; RTL-015 connects the separate logo intent. Finite styling never needs a text prompt, model response or provider dispatch.

## One owner, two looks

`SessionController` owns `acceptedDesign`, `previewDesign`, `setup`, `designEditing` and the presentation revision. The existing commerce graph and browse state remain the same objects when presentation changes. The renderer receives actual products, available photo views and the same selected product/variant/filters. There is no copied preview catalogue, independent money state or reseeding side effect.

Design permits exactly Studio / Pulse / Gallery, Navy / Ink / Cobalt / Oxblood / Pine, and Inter / Editorial / Expressive type. The existing registry supplies every option, font specimen and complete page bundle. RTL-049 adds an optional strict `pageTemplates` map for exactly Home / Collection / Product. Missing mapping means the base family everywhere; identical assignments normalize to one family. Colours, typography and brand remain shared. Plain-text name is limited to 40 characters, headline to 100. React renders text; neither field is HTML or CSS. `heroPhotoId` is an optional available owned photo reference. Missing hero bytes fall back to an available catalogue image; mandatory product photos still follow their existing availability rules.

## Creator conversation

1. **Welcome:** brief local introduction with Let’s style it. Comparison is never blurred.
2. **Layout:** three visual cards describe home/list/detail bundles and apply one family everywhere. Optional Mix layouts by page reveals three finite choice rows and targeted Preview controls. Clicking previews; Use this template confirms the exact base and resolved three-page assignment. Product Preview targets an actual active garment; explicit creator Preview uncovers the store on narrow screens.
3. **Colour:** five named multi-swatch cards, with Navy / Lime visibly marked Default. Use this colour theme confirms the selected ID.
4. **Type:** three actual heading/body/price specimens, using a current product’s USD price. Use this typography confirms the selected ID.
5. **Brand:** optional controlled name/headline and hero fields. Use these details confirms edits; Keep suggested details retains the valid visible values without typing.
6. **Mark:** Keep my wordmark or the optional Generate 3 logos intent. Colour and type confirmation must both match the current look; defaults and type-only approval do not qualify.
7. **Summary:** chosen complete design, supplied/default hero and wordmark; Enter my store accepts the preview.

Use this look explicitly approves the current full preset and valid visible brand details, then visits the optional mark choice and final acceptance. No typing is needed. One main task expands; confirmed choices become compact recap rows with Change. A preview selection is not a confirmation. Changing a confirmed ID invalidates its confirmation. Recovery reconciles a stale logo/summary step to the first missing confirmation rather than leaving an unusable offer.

RTL-049 native layout controls dispatch no provider request. Fake Tailor accepts finite explicit examples such as “Studio home, Pulse collection, Gallery product” or “Use Pulse for the product page”; ambiguous/conflicting/negative examples produce no layout proposal. The existing live tool/prompt/context carries the same strict full mapping for creator/owner, with shopper use forbidden. Responses remain inert until Preview. Whole-family proposals clear overrides; colour/type-only proposals preserve them. A page-only change participates in the existing design fence and invalidates stale actions. Live transport is mocked locally, not claimed as paid-provider quality evidence.

## Brand and photo ownership

Brand drafts and per-field dirty flags live in the session projection. Collapse, choice changes, owner field switches and eligible same-tab refresh retain them. Suggestions can fill pristine fields but cannot replace a human-edited name, headline or hero. An unchanged suggestion preserves confirmation, presentation revision and pending intent; touching an unchanged field still protects it from later suggestions. An empty typed name remains visible for correction; the preview keeps its last valid name and cannot confirm/apply the blank value.

Hero upload uses the existing bounded decoded-photo pipeline and cache with `select=false`. It therefore does not change the recognition selection, input revision, completed draft or products. The uploaded hero is separate from a product photograph; the hero CTA opens the collection and its alt text identifies a supplied brand image. Accepted and preview hero references are protected alongside product image IDs. Feedback reports rejected inputs without replacing the current look.

Async upload completion checks the owner, generation, stage and preview revision. A late result cannot apply after another look, reset, navigation or cancel. Apply/accept cancels a pending upload. Retained but unreferenced inspected images remain within the existing 32-photo/cache limits; RTL-016 completes broader lifecycle cleanup.

## Owner override

The dashboard’s Design panel uses the same choice cards, fields, registry and controller methods. One field group is open at a time. Wide screens show controls beside the actual renderer; narrower screens place the renderer below with See design preview / Back to design controls. Low-height controls remain in normal flow.

Apply look updates the accepted design; Cancel restores it and resets the brand draft to accepted values. Opening an already open editor is idempotent. Closed owner controls reject late brand/presentation writes. Meaningful changed previews or dirty fields require Keep editing / Discard preview and leave before navigation. This uses the existing single native workspace dialog and never changes commerce records. Opening focuses the Design heading; Apply/Cancel return to Edit store design, with a concise accepted-look recap. The owner editor’s open state and draft restore as editable local state, not an automatically executing action.

Mixed assignments use these same Apply/Cancel paths. Cancel restores exact accepted page confirmation as well as appearance. Expanded layout disclosures release the pinned control column into normal flow so final actions can be reached. Current mixed labels explicitly name Home, Collection and Product rather than claiming the base family applies everywhere. [RTL-049 plan](../design/PAGE-LAYOUTS.md), [actual verification](../validation/RTL-049.md).

## Responsive surface, focus and motion

Tailor sits at the lower right. Desktop setup reserves room for the preview; a phone/tablet uses a compact sheet bounded to 58dvh with its own scroll area and a persistent See full preview control. The launcher preserves the current step. Width uses the available containing viewport, including scrollbar space. Safe-area insets are respected.

Collapse returns focus to the launcher. Expansion and a changed microstep focus its heading without moving the page, then smoothly reveal that heading within the owned conversation scroller. Selecting a card keeps focus on that card. Inputs use native semantics, bounded values and 16px text. A single owned `visualViewport` resize/scroll subscription accounts for a keyboard shrinking the available area and removes both listeners on cleanup. Physical virtual-keyboard acceptance remains separate from desktop viewport emulation.

CSS entrance, hover/focus and native smooth scrolling provide motion. No timers accumulate per selection, and there is no animation suppression setting or OS-based suppression. Native dialogs supply modal focus containment; Tailor is a non-modal region so the real store remains usable.

## Recovery and logo intent

Only allow-listed bounded setup/design fields serialize. An eligible projection preserves confirmed exact IDs, dirty fields, accepted/preview separation and browse context. Obsolete finite design IDs are repaired to their accepted default with an explicit recovery notice, while valid commerce/photo metadata remains intact. Other malformed/unknown projection data stays rejected. A repaired style is not silently confirmed.

The three-logo preparation contains only current design revision, name, confirmed colour/type and candidate count 3. It is ephemeral, clears on design/navigation/reset and never serializes or dispatches by itself. RTL-015 connects the separately approved bounded batch, reviewed candidate previews in actual headers, separate temporary logo bytes and wordmark fallback; see [logo policy](LOGOS.md) and [actual validation](../validation/RTL-015.md). Selecting a preset, hovering or revealing/preparing the offer causes no generation call. Explicit batch approval is the only generation action.

## Verification

Focused session tests cover explicit gate/default approval, latest selections, selected-product preservation, dirty/suggestion precedence, recovery, owner Apply/Cancel/idempotent opening, navigation guard, separate hero upload, stale completion and obsolete-preset fallback. Actual local browser and settled root-gate evidence lives in [RTL-008 validation](../validation/RTL-008.md), with viewport captures under [design evidence](../design/evidence/RTL-008). The full 36-look/108-composition and physical-device/zoom/owner visual acceptance remain in RTL-019; live logo execution belongs to RTL-015/020.
