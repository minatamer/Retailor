# Automatic photo linking and colours

14 October 2026, owner-authorized [RTL-051](../tickets/RTL-051-ai-photo-linking-and-colours.md), [file allocation](../commit-plans/RTL-051.md).

## Product decision

Use the existing joint recognition pass to identify supported views and colourways of the same garment. Do not dispatch another agent/call per image. Visible cut, seam/pocket/closure/construction correspondence must support identity; a shared category, filename, brand guess or vaguely similar shape is insufficient. Ambiguity remains reviewable. Grouping is a draft recommendation with editable native controls, never a stock/inventory inference.

[Official Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs) requires strict structure/required fields and permits nullable optional intent. [Official vision limitations](https://developers.openai.com/api/docs/guides/images-vision) documents inaccurate descriptions and lack of original-filename authority. Strict schemas constrain structure, not semantic garment identity. Accordingly retain source validation and explicit pending real-image evaluation; no invented confidence percentage or quality claim.

## Experience

RTL-104 moves grouping entirely into the product draft: sample/personal selection has independent previews and local file checks only. **Create product draft** starts joint recognition with default-on grouping suggestions; opening a suggested product uses the RTL-050 carousel/editor. Same-colour angles share one size/colour option set. Different supported colours become one product with multiple colour options and real mapped photos. Draft review owns Link photos / Separate photo, colour names, size/price/cost/stock and cover/order edits. A deliberate manual link/separation preserves those decisions for future processing through the existing internal preference; no upload toggle remains. This bounded compatibility state prevents silently undoing a separation, without a new pairwise history or provider call.

Colour choices on PDP use actual photographs and labels. Selecting a colour preserves the selected size if that combination exists and shows the matching photos. Size/colour still identifies one exact variant; bag, checkout, order and owner stock use existing domain rules. Unknown colour placeholders stay unknown. No arbitrary hex guess or new shopping authority.

## Data and bounds

Existing model garment source IDs/grouping gain strict nullable colourways: bounded colour name, visual evidence and actual source IDs. Supported colourways require multiple distinct colours, disjoint complete source coverage and a visible relationship explanation. Existing uncertain/non-clothing classifications remain excluded. Application assigns all product/variant identities, sizing defaults, exact money/cost/stock; one size option per colour rather than per photograph. Existing8-view/24-variant/product,20-product/288-variant/draft and24-input limits remain.

Optional product colour-photo mapping supports legacy absence. Canonical product/draft/graph validation rejects foreign/duplicate/overlapping photo references and colours without variants. Existing sole session state owns preference/accepted work; input changes fence stale responses. Opt-out separates supported groups conservatively before applying manual links; excessive separate products stay held for review within the existing envelope. Merges preserve distinct colour options and deduplicate same size/colour options; splits retain only the related colour-photo associations while preserving uncertainty and conservative review.

## Fake and verification

Fake recognition groups only known exact sample byte relationships. Add one real generated black-denim view of F01 as F19, alongside F01/F16 blue angles, to exercise two colour options and independent stock. Existing fifteen garments remain, now nineteen inspected photos. The public sample remains a real live image input; authored fixture observations never become a production fallback or a semantic accuracy claim.

Test complete/missing/foreign/overlapping references, ambiguous and unrelated garments, colour name bounds/collisions, single vs repeated angle inventory, worst bounded matrices, opt-out/manual grouping/restore/stale/reset, editor exact values and colour renames, all three PDP families and exact selected bag/order effects. Mock strict provider wire and maintain one dispatch/deadline/cancellation/paid/privacy guards. Actual live semantic evaluation remains pending and includes same garment/different angle, same garment/different colour, merely similar garments, multi-garment/uncertain images and embedded instruction attempts.

Older stored projections with initialized photo groups and no new preference preserve their organization by restoring automatic linking off; fresh/uninitialized workspaces default on. Existing manual/sample groups remain restorable; newly selected samples are never pre-grouped. Native low-level compatibility APIs remain bounded and revision/cancellation-fenced, while the current UI performs all grouping in draft review.

Status: implemented and reviewed locally. [Actual validation](../validation/RTL-051.md). No live semantic quality or external release acceptance inferred.
