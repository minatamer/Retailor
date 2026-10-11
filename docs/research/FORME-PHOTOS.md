# FORME: accepted photo inputs and local handling

RTL-003 execution record, 11 October 2026. Fifteen independent original garment photographs are shipped. They are photo inputs; the public bundle contains no product names, prices, categories, descriptions or ready recognition result. Fresh public processing still requires the live catalogue adapter in RTL-006. No Retailor runtime provider call was made to prepare or inspect these assets.

## Actual asset review

Each original image was viewed before acceptance. All contain one complete garment with margins, neutral warm-grey studio backgrounds, soft lighting and plausible seams/geometry. No people, mannequin, accessories, collage, visible merchant branding, price, promotional text or watermark is presented. Final WebP files retain the complete silhouettes. Every shipped image is **1122 × 1402 pixels**, static, metadata-stripped and below the 768-KiB derivative limit.

| Input | Accepted appearance, not a merchant claim | Shipped bytes |
| --- | --- | ---: |
| F01 | Indigo straight-leg jeans, visible waist and both hems | 175264 |
| F02 | Black wide-leg jeans | 85032 |
| F03 | Charcoal pullover hoodie | 70614 |
| F04 | Oatmeal zip-front hoodie | 120532 |
| F05 | White crew-neck tee | 26440 |
| F06 | Muted cobalt boxy tee | 86174 |
| F07 | Cream short-sleeve button-front camp shirt | 69360 |
| F08 | Olive button-front overshirt with two chest pockets | 123974 |
| F09 | Charcoal tailored trousers with visible crease | 59234 |
| F10 | Sand two-button blazer | 92798 |
| F11 | Warm brown V-neck button-front cardigan | 251246 |
| F12 | Oxblood sleeveless midi dress with round neck and defined waist | 33314 |
| F13 | Black A-line skirt | 32898 |
| F14 | Beige button-front resort shorts, belt loops without a belt | 123148 |
| F15 | Pine elastic-waist drawstring swim shorts | 55984 |

Three accepted original RTL-002 images supply F01/F03/F07; twelve further originals were generated independently through the built-in image-generation tool. F07 is the accepted camp-shirt interpretation of the shirt brief. This is an art-direction refinement, not evidence of a live catalogue result. The full mix covers casual, formal, semi-formal and beach clothing. No alternate views ship: matching alternate geometry has not been established, and no invented alternate relation is published. Fifteen primary inputs leave nine of the 24 recognition slots available.

Original sources total **31,226,370 bytes**; the fifteen shipped files total **1,406,012 bytes** (about 1.34 MiB). The largest is F11 at **251,246 bytes**. Source/output SHA-256 hashes, source dimensions and byte sizes, exact prompts, dated visual review, source record names and encoding are in [FORME-GENERATION.json](FORME-GENERATION.json). Asset IDs identify inputs, never live product IDs. The public [byte manifest](../../apps/frontend/public/sample/forme/manifest.json) exposes only identity/path, hash/format/dimensions/bytes and generated-demo origin.

## Source and usage basis

The images are original generated assets requested for this fictional demo, produced offline with Codex's built-in generator. No third-party merchant photograph was copied. The provenance record identifies this usage basis; it does not claim exclusivity, trademark clearance, real apparel ownership, fibre composition, fit, measurements, certification, sustainability or physical merchandise. Original PNGs remain in the local generated-image output directory; reviewed input records are ignored local artifacts. The public repository keeps the optimized files and content hashes so shipped bytes can always be verified even without those local originals.

The stock alternative and licence distinctions remain researched in [blueprint Appendix G](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#appendix-g--sample-photo-sourcing-and-production). Pexels and ordinary Unsplash would require accepted individual photo and licence records; search thumbnails and Unsplash Plus terms cannot be substituted. The generated route produced the coherent unbranded set, so no stock asset or stock-licence claim is part of this delivery.

## Reproducible preparation and verification

With the reviewed originals still available, run from the repository root:

```powershell
pnpm build:shared
node scripts/prepare-forme.mjs artifacts/photos-rtl003/generation-records.json
pnpm exec vitest run apps/backend/src/catalogue/validate-images.test.ts
```

The offline script requires exactly F01–F15 with prompt/review records. It inspects source signatures and dimensions, uses pinned Sharp 0.35.5 to auto-orient and fit inside 1600 pixels without enlargement, strips metadata by re-encoding and produces WebP quality 86/effort 5. It makes no generator, app provider or network call. The actual-byte backend tests verify every shipped asset against its public manifest and force compressed pixel decode; header inspection alone is insufficient. The initial 0.34.5 pin was upgraded before committing after the production audit identified upstream advisories ([libvips](https://github.com/advisories/GHSA-f88m-g3jw-g9cj), [libheif](https://github.com/advisories/GHSA-rgj7-g3m4-5g8c), [librsvg](https://github.com/advisories/GHSA-wq5f-xc86-pv6w)).

The decoder follows the actual installed APIs documented by [Sharp's constructor](https://sharp.pixelplumbing.com/api-constructor/), [metadata/input API](https://sharp.pixelplumbing.com/api-input/) and [output API](https://sharp.pixelplumbing.com/api-output/). Browser processing uses [worker createImageBitmap](https://developer.mozilla.org/en-US/docs/Web/API/WorkerGlobalScope/createImageBitmap) and [OffscreenCanvas.convertToBlob](https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas/convertToBlob). Technical conclusions are additionally verified against actual encoded files and the running browser.

## Browser resource ownership and integration contract

`PhotoController` owns photo resources only. RTL-005's one session controller must own that instance and persist the exact inspected descriptors. It must call `recover(selectedIds, expectedPhotos)` with those descriptors: the same photo ID with older hashes cannot silently restore a replaced garment. Available-photo IDs are checked immediately against the fixed two-hour lifetime; missing/corrupt/stale bytes require repair and never receive a fake image. Product commands must independently enforce the mandatory-photo invariant.

Selections and samples share the same worker pipeline. Static JPEG/PNG/WebP signatures, chunk/segment bounds, animation, side/pixel limits and original bytes are checked before pixel decode. Each owned worker has a 10-second deadline and is terminated on abort, reset or stale operation. Orientation is applied, bitmap resources close, previews are re-encoded without metadata, and source and derivative hashes are retained. Object URLs are local and revoked on replacement, removal, reset and disposal; they are not persisted.

Bounds are 24 selected recognition photos; 32 cached garment/hero sources; 4 MiB per source; 40 MiB original aggregate; 24 MP/10,000 pixels per side; 1600-pixel/768-KiB derivatives; 18 MiB selected and 24 MiB cached derivatives. Owner/Tailor form uploads can use the remaining cached-source lane without changing the recognition selection. Exact source or derivative duplicates retain one existing identity. Per-file errors preserve the other accepted photos.

Native IndexedDB holds temporary Blob bytes under the Retailor namespace, not application business records. A serial transactional lease with owner, fixed expiry and fencing prevents concurrent tabs from overwriting a live owner's photos. Stored row shape/Blob sizes and actual totals are validated before writes/removal; partial read corruption preserves usable rows. Cache denial leaves accepted photos usable in memory with an explicit refresh-loss notice. Failed clearing is reported honestly. The 80-MiB origin photo-cache cap includes other Retailor workspaces; RTL-015 must coordinate logo bytes and headroom with this shared envelope rather than create an independent 80-MiB allowance. This is browser coordination, not account authentication or a server security boundary.

The native picker and mandatory product-photo field expose labelled controls, previews, replace/remove and keyboard ordering. The mandatory field disables removal of the last photo. The local development reference is `/design/photos`; the Tailor specimen at `/design` uses the same actual validated field. Product saving and public recognition connect in their owning later tickets. No picker, sample-loading, theme-inspection or recovery action calls a model. Production startup must keep development references unavailable.

## Actual browser evidence and remaining acceptance

The running in-app browser accepted all fifteen sample files through the worker and temporary cache. Keyboard Enter moved F01 after F02, and saved-byte rechecking restored the same order without resubmitting processing. A native picker preserved one valid JPEG while rejecting corrupt JPEG and renamed SVG bytes. An independently verified EXIF-orientation-6 fixture produced a **1402 × 1122** preview from **1122 × 1402** source dimensions. That deliberately rotated fixture proves orientation handling, not photo art direction.

The shared product field accepted that native upload, showed the validated thumbnail and disabled last-photo removal. Actual checked viewports: **320×640, 375×812, 768×1024, 1024×768, 1280×720, 1440×900 and 1920×1080**. All had no horizontal overflow and no main button, summary or native file-picker target below 44 pixels in either dimension after correcting the ordering-arrow widths. These observations do not prove real device OS behavior, actual 200% browser zoom or the later integrated product journey.

All fifteen complete crops were reviewed against each settled theme. Captures: [Ink](evidence/RTL-003-contact-ink.jpg), [Cobalt](evidence/RTL-003-contact-cobalt.jpg), [Oxblood](evidence/RTL-003-contact-oxblood.jpg), [Pine](evidence/RTL-003-contact-pine.jpg), and the [mobile mandatory field](evidence/RTL-003-mobile-photo-field.jpg). The neutral backgrounds remain coherent across the palettes. The initial compressed controls and a sample-cancel path that failed to abort active decoding were corrected during execution; the final resource regression checks and read-only verdict are in [RTL-003 validation](../validation/RTL-003.md).

Owner art feedback and actual zoom remain pending for RTL-019. Fresh live recognition and paid-provider quality remain pending for RTL-006/020 until keys and explicit paid-run authorization are available. Offline photo production is complete; it is not live-recognition acceptance.
