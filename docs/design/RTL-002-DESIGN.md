# RTL-002 design baseline

11 October 2026. **Provisional running baseline; owner art feedback has not been received.** Open `http://127.0.0.1:4310/design` under the normal dev launcher. The reference route fails closed outside development. It uses normal frontend components and finite public IDs, not another app/session/domain engine. It contains labelled design specimens; catalogue drafting, real shopping and operational facts connect in their owning tickets.

## Decisions and primary research

Retailor uses warm paper, deep ink, confident cobalt and a small lime signature. Merchant identities are scoped independently. Platform controls use Inter; editorial accents use DM Serif Display. Spacing follows 4/8/12/16/24/32/48, moderate platform radii and largely square fashion photography. One original stroke icon vocabulary keeps action meanings consistent. Product photography is the central object, not decoration around a chatbot.

| Direction | Three-page relationship | Reason |
| --- | --- | --- |
| Studio | Split editorial opening, balanced collection, gallery beside purchase information | A clear contemporary clothing baseline. |
| Pulse | Action-colour campaign, tighter grid, boxed purchase panel | Stronger streetwear energy without hiding price or options. |
| Gallery | Spacious image-led home, staggered collection rhythm, generous gallery and calm detail | More considered premium presentation. |

These are original compositions. [COS's current collection](https://www.cos.com/en-us/women/new-arrivals), inspected on 11 October 2026, supports the value of large garment imagery, visible pricing and simple category navigation; no COS assets, identities or copy were reused. [Shopify's Horizon source](https://github.com/Shopify/horizon) is a current ecommerce reference, not a copied framework. [Shopify's colour guidance](https://www.shopify.com/blog/color-psychology) supports choosing colour in brand context; these palettes are not conversion guarantees or global popularity rankings. Three accepted type choices do not claim statistical dominance in 2026.

Retrosum's real `workspace-request.tsx` and `widget-chart.tsx` informed concise inline actions, native editable forms and evidence behind numbers. Retailor retains its own clothing identity and code. The earlier ScreenPilot hero cards, ClipBuilder motion graphics and Retrosum office hero remain historical inspiration. The proposed storefront runway stays first; lookbook reveal and before/after remain documented alternatives for later owner feedback in RTL-017.

## Typography and provenance

Five actual Latin WOFF2 files total approximately 160 KiB: variable Inter, DM Sans, Manrope; DM Serif Display regular and italic. Only normal sans styles and needed serif styles are bundled. Presets own heading/body family, weight and tracking; prices use tabular numerals. Font-display swap and Arial/Georgia fallbacks preserve readable content without third-party font requests. Actual browser observations show distinct serif, Inter and Manrope buying hierarchy and legible euro/size specimens; fallback metric equality is not claimed.

All files come from integrity-checked official npm Fontsource 5.3.0 archives. Full OFL copyright/licence texts ship alongside each family. [Inter's first-party site](https://rsms.me/inter/) explains screen-oriented design; [DM's first-party repository](https://github.com/googlefonts/dm-fonts) documents the families and OFL licence. The exact source, registry integrity, file SHA-256 and size are in [font provenance](../../apps/frontend/public/fonts/provenance.json). The font software is redistributed under OFL, not sold alone or renamed into a proprietary font.

The three temporary original shirt/hoodie/jeans photographs were generated with Codex's built-in image_gen, without a Retailor runtime API key. Each is a single complete garment on a neutral background; outputs were visually inspected for logos/text, shape and crop. [Image provenance](../../apps/frontend/public/design/provenance.json) retains exact prompts, hashes and saved files. They are temporary reference assets, not evidence that the fifteen-photo sample or live recognition is complete. RTL-003 owns the final collection and asset acceptance.

## Tokens and contrast

`styles/tokens.css` owns platform/feedback roles; `features/store-design/presets.ts` owns four full merchant palettes and three finite type presets. Rendering derives scoped CSS variables directly from the registry. Canvas, surface, text, muted, action text, hover, selection, decorative border, control border, focus and image grounding have explicit roles. Feedback retains named text/icon meanings independently of an oxblood action. Pale and dark photographs remain distinct against all four canvases.

Measured using the [W3C relative-luminance contrast method](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html): body/muted/action/hover text must be at least 4.5:1; focus and control outlines at least 3:1. Actual registry and stylesheet values are checked, including selected backgrounds. Decorative separators are not claimed to be input outlines. The test caught Pine's initially weak muted-on-selected pairing; its revised muted colour is `#566658`. This is contrast evidence, not full WCAG certification.

## Actual browser observations

The running Next app was inspected with the in-app browser. Requested sizes: 320×568, 375×812, 768×1024, 1024×768, 1280×600, 1440×900 and 1920×1080. The browser's visible page width excludes its 15px scrollbar. At all seven tested sizes, document scroll width equals client width. Long product title and 39-character store name wrap rather than causing page overflow. Cards keep reserved photo geometry; detail sizes wrap; unavailable stock uses explicit text.

Tailor opens at the lower right. Desktop reserves preview space; narrower devices retain a visible preview above a bounded, scrollable panel. The mobile `100vw` sizing defect was corrected to percentage sizing so the scrollbar cannot push the panel outside the page. At 375×812, settled panel bounds are left 12, right 348 within the 360px page. Short-height controls and wordmark remain reachable through the panel's native scroll. The native required-photo input accepted the actual reference-shirt file and displayed its filename; product creation intentionally stays disabled in this form specimen.

Layout, palette and type updates are local. Rapid Ink → Oxblood → Pine selections settled to Pine with one selected marker and matching scoped tokens. The three page buttons and merchant navigation keep the selected complete family. Native Tab/Shift+Tab/Enter moved chart focus and updated exact evidence: 11 June is $108 from EX-02/EX-03 at $54 each; 12 June is $54 from EX-04. The six-day synthetic illustration reconciles $572 / eight orders / $71.50 AOV; $286 costs and $86 expenses yield its displayed $200 result. It is not workspace seed activity.

Motion includes short page/step entrances, image transforms, control feedback, Tailor entrance and a chart stroke reveal when the plot enters view. The owned observer disconnects after entry and on unmount. Actual transitions and focus feedback were observed; no animation-off/render-off control or OS suppression exists. Values and controls are available immediately.

Browser zoom shortcuts did not change the tool-controlled layout, so **actual 200% browser zoom remains unverified** and is retained for RTL-019/manual browser acceptance. Small CSS-width pressure is actual evidence, not a substitute labelled as a zoom pass. Full 36-look / 108-page visual review, virtual keyboards and final photography belong to RTL-007/019. Owner art approval remains unreceived; work continues under the explicit provisional-baseline rule.

## Saved evidence

- [Final Studio and Tailor reference](evidence/rtl002-final-studio-tailor.jpg)
- [Phone Tailor bounds](evidence/rtl002-phone-tailor.jpg)
- [Small-phone long-name collection](evidence/rtl002-studio-collection-phone.jpg)
- [Tablet native photo-form specimen](evidence/rtl002-tablet-photo-form.jpg)
- [Keyboard chart and exact records](evidence/rtl002-dashboard-keyboard-evidence.jpg)

Additional product viewport captures are retained in the evidence folder. Captures show the actual scroll position inspected; their filenames identify the pressure test, not a claim that every full page is visible in one image. Some intermediate captures predate the final type-size/control refinements; final evidence and gate results are identified in the validation record.
