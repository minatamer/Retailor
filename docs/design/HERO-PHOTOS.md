# Hero photos follow the Home layout

15 October 2026, RTL-074. The owner requests a chooser for every image composed by the Home template, replacing one selected image followed by uncontrollable automatic images.

| Home family | Positions                                       |
| ----------- | ----------------------------------------------- |
| Studio      | 01 Left, 02 Right                               |
| Pulse       | 01 Left, 02 Centre, 03 Right                    |
| Gallery     | 01 Featured, 02 Upper support, 03 Lower support |

Use the resolved **Home** assignment, even when Collection and Product use other families. Creator Brand and owner Brand & hero mount the same controls. Each position has its actual-photo thumbnail, automatic/selected caption, labelled native chooser and optional upload. Linked garment views have distinct photo numbers. Uploaded brand photos retain their filename locally. Renderer and thumbnails use the same selection function, keeping photo identities/order consistent.

Explicit choices reserve their positions before automatic selection. Automatic positions prefer distinct available garments/categories and do not repeat an explicitly selected garment. Explicitly choosing different supplied views of one garment is allowed. Picking an already pinned photo moves it from its other position, which returns to automatic. Never render the same photo ID twice. Unavailable photos fall back honestly; scarce collections show only real photographs and retain logical slot numbers. Empty positions offer selection/upload without inventing images.

Changing to Studio keeps the third choice for later three-photo layouts while displaying two positions. Legacy `heroPhotoId` remains the only first-slot authority; an optional fixed pair of nullable IDs supplies positions two/three. Old singular-photo sessions/drafts default additional positions to automatic. Human choices remain protected from suggestions; creator confirmation, owner Apply/Cancel, refresh and reset retain existing session ownership.

Accepted/preview references are protected in the original owned cache. Upload one inspected image at a time through the existing bounded pipeline into its position; it does not add recognition inputs or change products/commerce/history. Current generation/stage/design revision fences reject late completion after a newer choice. Original byte/pixel/cache/count/work/deadline/concurrency limits and no-paid-on-entry behavior remain. Known metadata with missing bytes remains recoverable; forged saved IDs without metadata fail the identity check.

Every position participates in design-sensitive assistant fencing. The report retains legacy first-photo metadata plus a bounded list of at most three accepted hero metadata records: no image bytes, URLs or pending state, within its original 2-MiB cap. Live/public release and future landing hero-video production remain separate scopes.

[Allocation](../commit-plans/RTL-074.md), [actual checks and limits](../validation/RTL-074.md).
