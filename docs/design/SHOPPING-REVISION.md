# Shopping revision plan

14 October2026. The owner authorizes research, a plan and execution today in local fake mode, with screenshots, bug/layout/copy fixes and useful motion. [RTL-047 research](../research/RTL-047-SHOPPING-INTERACTIONS.md) supplies actual primary references. Existing [SHOPPING authority](../engineering/SHOPPING.md) and exact commerce/session fences remain binding. The marketing hero film stays deferred.

## Actual baseline findings

An owned hidden local tab ran sample intake, expanded linked-photo editing, catalogue review, chat-led style/wordmark, collection/filter/product, bag/review/receipt, owner order and reset/fresh-sample flow. Screenshots/DOM/geometry are in ignored `artifacts/local/RTL-047/`.

- The real bag/review/receipt authority already exists. Two $68 units, $5 demo merchandise discount and $6 delivery correctly produce $137; stock stays19 during review and becomes17 once after placement. The exact order is selected in owner Orders with the same $137 total/$131 net merchandise. Reuse these commands; no second cart/order store.
- Phone bag and review use the same large centered modal with repeated paragraphs, stock/price/currency explanations and bulky discount copy. Summary/actions need a cleaner stable hierarchy. There is no clearly separate checkout composition.
- Current filters hide most choices in select menus, mix alpha and waist/inseam labels, show an empty colour selector when all colours are unconfirmed, and give no live match count before applying.
- Fresh fake product descriptions contain a development placeholder. Omit it from future authored fixtures; preserve owner-edited and saved descriptions. Keep unknown garment facts/measurement limitations concise and truthful.
- Product options/real linked views and the new progress-preview alignment work. Preserve their state/keyboard/zoom behavior. Read-only baselines found no horizontal page overflow in the captured desktop/phone states.
- Reset/fresh-sample correctly clears the prior order and discount selection, returns one $68 item with $0 discount/$74 total, and retains default linked groups. A suspected local discount leak was disproved in the actual flow; do not add an unnecessary reset workaround.

## Cart and checkout composition

The existing native BagDialog remains the modal/focus owner. Bag mode becomes a right drawer with actual photo/title/size, known colour only, one-to-five-unit steppers, Remove, an unobtrusive demo-discount choice, exact subtotal/adjustments/total and a strong Checkout action. Empty bag gets a useful collection action. Missing/archived/sold-out/changed-price rows keep their specific recovery.

Checkout is a distinct wider panel on desktop, with two columns: structured customer/delivery/payment on the left and item/total summary on the right. Phones use one column and scroll naturally inside the bounded modal. Demo shopper is the existing seeded fictional identity; delivery is the existing $6 assumption, tax zero; payment is explicitly simulated. No real address, email, phone or card fields, new provider/API, shipping choice or tax authority. Checkout uses the existing reviewed witness/scope/expiry/revision and Place demo order exactly once.

Receipt uses a short success/check animation, actual immutable order/options/total and a direct link to that exact owner order. Keep recorded currency/rate context available; later currency changes cannot rewrite it. Explicit simulation remains visible in one concise location instead of repeated across paragraphs. Edit/back/close/refresh and stale-review recovery preserve current behavior. Proceed/submit actions sit to the right or fill their bounded narrow panel.

## Filters and product clarity

Use the existing committed FiltersSchema and browse/session owner. Category and size become visible labelled single-selection chips; size choices are grouped by their actual sizing labels. Known colour appears only when real known options exist. Counts derive from the same collection selector with other filters respected and same-variant size/colour/price/stock matching intact. Price retains exact two-decimal minor-unit parsing and selected currency scope. In-stock remains the existing real availability condition. Draft choices preview a match count, then Apply deliberately commits; Cancel leaves accepted filters untouched and Clear gives immediate recovery.

Keep search, sort, applied chips and clear/no-match behavior. No material, fit, gender, sustainability, rating, sale/newness, fake colour swatch, invented size guide or photo-count filter is added without actual useful supporting data. More photos stay visible as linked card/gallery controls. Optional future quick-shop should first open real option selection, never silently add a default size.

Fresh fake descriptions can be empty rather than display an authoring instruction. Saved/owner text remains untouched. Shopping copy should use normal phrases such as In stock, Choose your size, Subtotal, Demo checkout and Place demo order. Scope/rate/error/unknown statements that materially explain an action remain accessible and concise.

## Useful motion

| Trigger                     | Feedback                                                                   | Bound/preservation                                                                     |
| --------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Add/open bag                | Drawer enters from its edge; selected line and truthful notice appear      | About240–300ms, immediate actual content; no duplicate add/delayed price.              |
| Bag→checkout→receipt        | Short step fade/translation; width/layout transition and heading focus     | Existing modal owner and native containment; back/Escape/opener remain usable.         |
| Quantity/discount           | Selected control responds; exact summary update fades briefly              | Money changes immediately; no animated numeric interpolation.                          |
| Filter open/selection/apply | Drawer entrance, selection fill/border, match-count update/result feedback | Short bounded transitions, stable controls; no automatic committed mutation on Cancel. |
| Product option/photo        | Clear pressed/selected state plus restrained press/transition              | Preserve actual variant/photo key and zoom focus/keyboard, stock guards.               |
| Order success               | Check stroke/scale settles once                                            | No confetti, blinking or endless decorative loop.                                      |

Use current CSS/React/WAAPI patterns and pinned dependencies; preserve designed motion without adding a suppression preference. Prefer useful state explanation to decoration.

## Execution and verification

Follow-on RTL-048 owns the connected shopping/cart/checkout/filter/copy/motion implementation with a file-level allocation before app edits. Keep one ticket active, preserve previous unstaged work and avoid cosmetic rewrites. Root/frontend and RTL-023 dispositions are loaded. New tests must exercise real facet/currency/boundary behavior and existing order/reset/review fences, not CSS or static-label assertions.

Actual responsive checks: three template families; Home/Collection/Product/filter/cart/checkout/receipt; large/small laptop, tablet,375/320px phones and short320×430px modal. Native keyboard/escape/opener, quantity bounds, no-match/reset, USD/EUR, stale review/duplicate place/refresh, exact owner order/stock, reset/new sample, missing/archived/empty cases where locally possible. Inspect screenshots, not only DOM dimensions. Run all six settled gates once the app diff settles; keep the known historical Linux-source-proof mismatch explicit. Current-source Linux/scanner/live/hosted/physical acceptance remains separately pending.

Execution is completed locally under [RTL-048](../tickets/RTL-048-polish-shopping-and-demo-checkout.md): animated bag drawer, structured simulated checkout, exact receipt/owner link, visual data-backed facets and concise fresh-fixture copy. [Actual validation](../validation/RTL-048.md) records focused tests, screenshots and gates. Work continues directly in this chat; no hourly schedule is needed. No subagents/other chats, stage/commit/push, paid/live providers, cloud or publication action is authorized.
