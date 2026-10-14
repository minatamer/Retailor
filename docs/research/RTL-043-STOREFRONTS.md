# Clothing storefront research — RTL-043

14 October 2026. Owner-authorized visual research of current primary clothing stores. Browser captures are local research references under `artifacts/research/RTL-043/`, ignored by the existing `artifacts/` rule. They are not app assets. No third-party photographs, logos, promotional copy or product data are shipped into Retailor.

32 brands were attempted; **22 had usable clothing-storefront views visually inspected**. Several initial captures contain cookie/newsletter overlays or loading media; collection/detail captures supply the usable evidence where noted. Empty or obscured pages are excluded. No CAPTCHA, account, checkout, purchase or terms acceptance was performed. Official pages were read directly and their rendered layouts inspected; this is design research, not evidence of conversion performance.

## Usable primary references

| Store | Local screenshot | Concrete observation |
| --- | --- | --- |
| [COS](https://www.cos.com/en-us) | `01-cos-home.png` | Two large campaign halves; compact navigation and short photo-adjacent shopping prompts. |
| [TOTEME](https://toteme.com/en-se) | `02-toteme-home.png`, `toteme-collection.png`, `33-toteme-product.png` | Cinematic home; restrained four-column catalogue; close-up product with spare choices. Home cookie and product newsletter overlays are recorded. Collection is unobscured. |
| [ASKET](https://www.asket.com/en-ww) | `04-asket-home.png` | Short introductory purpose statement, paired seasonal photographs, quiet navigation. |
| [Everlane](https://www.everlane.com/) | `05-everlane-home.png` | Wide clothing campaign with short copy over photography and a useful category hierarchy. |
| [Buck Mason](https://www.buckmason.com/collections/mens-new-arrivals) | `buck-mason-collection.png` | Large portraits with compact labels, colour witnesses and prices; photography occupies most of the catalogue. Initial home/product media did not load in their captures and are not used as media evidence. |
| [Alex Mill](https://www.alexmill.com/) | `07-alex-mill-home.png`, `alex-mill-collection.png`, `35-alex-mill-product.png` | Wide campaign, generous two-column browsing, large product image and readable option controls. |
| [Kith](https://kith.com/) | `08-kith-home.png` | Full-bleed fashion film with a small editorial caption and a second chapter immediately below. |
| [Reformation](https://www.thereformation.com/) | `10-reformation-home.png` | Distinctive large masthead over campaign photography; copy remains short. |
| [GANNI](https://www.ganni.com/us/home) | `12-ganni-home.png` | Campaign image leads; compact shopping prompt and catalogue start directly below it. |
| [Stüssy](https://www.stussy.com/) | `13-stussy-home.png`, `stussy-collection.png`, `36-stussy-product.png` | Persistent category rail; catalogue mixes clothing and editorial photography; product has a strong central photographic stage and concise purchase controls. |
| [Acne Studios](https://www.acnestudios.com/us/en/home) | `15-acne-home.png` | Centred large brand presence, cinematic fashion imagery and few campaign entrances. |
| [Madewell](https://www.madewell.com/) | `17-madewell-home.png` | Paired campaign photographs, direct shopping prompts and simple search/navigation. |
| [Abercrombie](https://www.abercrombie.com/shop/us) | `19-abercrombie-home.png` | Fabric texture can carry a clothing campaign; follow-on photo modules introduce more categories. |
| [Free People](https://www.freepeople.com/) | `20-free-people-home.png` | Asymmetric mosaic of one large and multiple smaller photographs rather than another equal text/image split. |
| [Rag & Bone](https://www.rag-bone.com/) | `21-rag-bone-home.png` | Photographic campaign and large caption; small cookie panel remains visible. Footwear photography is not reused in this clothing-only app. |
| [Anthropologie](https://www.anthropologie.com/) | `24-anthropologie-home.png` | Fashion triptych with separate category entrances and compact headings. |
| [Folk](https://www.folkclothing.com/) | `26-folk-home.png` | A single visual campaign leads with a restrained navigation layer. |
| [TOAST](https://www.toa.st/) | `28-toast-home.png`, `37-toast-collection.png`, `40-toast-product.png` | Life-worn campaign; centred collection introduction; product shows actual garment and model views together. Detail/collection newsletter overlays are recorded. |
| [Patagonia](https://www.patagonia.com/) | `29-patagonia-home.png` | An outdoor photograph plus a concise colour-backed campaign block; clear category entrances. Cookie notice remains in the reference. |
| [A.P.C.](https://www.apc-us.com/) | `30-apc-home.png`, `38-apc-collection.png`, `39-apc-product.png`, `43-apc-home-mobile.png` | Real denim texture leads the campaign; category catalogue has an editorial introduction; product purchase controls are compact and explicit. Mobile home gives the photograph priority. |
| [The Frankie Shop](https://thefrankieshop.com/) | `31-frankie-shop-home.png` | Minimal overlay navigation and a large fashion portrait with a discreet shopping entrance. |
| [Lemaire](https://www.lemaire.fr/) | `32-lemaire-home.png` | Paired photographic storytelling, little chrome and a clear navigation hierarchy; location/cookie prompts dismissed for the final capture. |

Collection and product URLs are recorded in the ignored `captures.json`. The six deeper collections are TOTEME, Buck Mason, Alex Mill, Stüssy, TOAST and A.P.C. Five product presentations had readable supplied imagery; Buck Mason's blank product media is excluded from that comparison. `42-stussy-product-mobile.png` contains unloaded media and is not a successful mobile photograph check. `41-toast-product-mobile.png` retained desktop capture dimensions during the override and is not represented as mobile evidence. A.P.C.'s actual narrow screenshot is usable. These references are separate from Retailor's required responsive browser checks.

## Excluded attempts

`03-studio-nicholson-home.png` (newsletter obscuration), `09-aritzia-home.png` (loading shell), `11-sezane-home.png` (verification), `14-carhartt-home.png`, `16-uniqlo-home.png`, `23-levis-home.png`, `25-noah-home.png`, `27-finisterre-home.png` (empty/unloaded media), `18-jcrew-home.png` (regional terms gate), `22-allsaints-home.png` (loading modal). These do not count toward 22.

## Decisions for Retailor

The references consistently give clothing imagery more space than a boxed introduction. Retailor's visitors may provide studio photographs instead of lifestyle campaigns, so the compositions use only real available garment photographs, with reserved geometry and deliberate captions. No invented model angle, repeated photograph masquerading as an extra garment, review count, sale, delivery promise or sustainability claim is introduced.

| Family | Home | Collection | Product |
| --- | --- | --- | --- |
| Studio | Small collection metadata, large heading and shopping prompt above a two-image editorial spread. | Category rail beside a balanced catalogue; rail becomes a horizontal scroll row on narrow containers. | Supplied photos form a contact sheet; one shared purchase column. Each photograph opens its own close-up. |
| Pulse | Three-image campaign followed by a navy caption band and lime shopping action. Small phones use a native swipeable photo strip. | Horizontal category entrances and a wide, compact catalogue with concise uppercase product labels. | Full-width product title/price, central photographic stage with thumbnail rail, then a divided purchase dock and details. |
| Gallery | Editorial copy beside an asymmetric one-large/two-small lookbook; mobile puts the short introduction above the mosaic. | Centred introduction and category index, staggered photographs with differing widths; phone alternates full and inset single cards. | Calm purchase sidebar to the left of the image theatre; mobile puts the photograph first. |

These are original compositions informed by multiple references. Stable template/type/theme IDs, the current navy/lime/white palette, session ownership, exact commerce, real linked-photo cards and browsing operations remain shared. A one-garment catalogue expands one photograph honestly; unavailable photography has a repair path. Landing showcases render the actual storefront, and the Tailor/marketing figures reflect the new geometry.
