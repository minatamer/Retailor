# Retailor identity

14 October 2026. The owner approved **option A, the shopping cart**, from RTL-037 draft03 and authorized use across the website, browser tab and Google Search favicon.

The original cart uses navy `#242b60` and a white Inter800 R. The wordmark uses the site's local Retailor Inter at800. No green belongs in the logo. **RTL-040 outlines the entire cart/name lockup**, including the lowercase name with its existing shaping/tracking, so no part of the logo depends on a browser font. Cart coordinates, foreground R position and48px R size remain the approved study.

| Surface                  | Implementation                                                                                                                                                                  |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Platform headers/footers | Shared `Brand` component with the complete `/brand/retailor-lockup.svg`, intrinsic sizing and eager loading. Accessible image name Retailor; existing home-link names retained. |
| Reference pages/recovery | Same shared component. Tailor's sparkle and the user's customizable store identity keep their separate functions.                                                               |
| Browser tab              | Stable `/favicon.ico`, containing actual16/32/48px PNG images in a valid ICO directory.                                                                                         |
| Google Search favicon    | Stable `/favicon-96.png`, square96px, declared with `rel=icon` in root metadata on the home page and inherited routes.                                                          |
| Apple touch/home screen  | `/apple-touch-icon.png`, square180px, declared with `rel=apple-touch-icon`.                                                                                                     |

Favicon/touch exports place the navy mark on a white rounded tile for contrast in dark browser chrome. The website SVG is transparent for the white platform surfaces. The logo is not substituted into merchant-store logos, sample FORME wordmarks or Tailor's assistant controls.

The named cart/lockup/icon public files are explicitly admitted by Docker's positive context and the raw-byte source inventory. Unknown brand uploads, visitor files and secrets remain excluded. Existing proxy origin protection covers these static assets too; there is no new route exemption or server operation.

Google requires a stable, square, brand-representative image and crawl access to the home page and favicon. Once a public version is deployed, Google must recrawl/process it; display is not guaranteed and can take days or weeks. Local installation does not change a current Google result. [Google Search Central requirements, checked14 October2026](https://developers.google.com/search/docs/appearance/favicon-in-search).

[Production provenance/hashes](logo-production/RTL-039/provenance.json), [font licence](logo-production/RTL-039/FONT-LICENSE.txt), [native-size light/dark review](logo-production/RTL-039/production-preview.png), [actual local checks](../validation/RTL-039.md). To reproduce, run `outline.py` with a temporary fontTools4.60.1 directory, then `export.mjs` with an existing Sharp package directory. The original licensed font is already in frontend public/fonts. No application package, system font or provider configuration changes are needed.

[Complete fixed-vector lockup](logo-production/RTL-040/provenance.json), [exporter](logo-production/RTL-040/export.py), [refresh/font-independence evidence](../validation/RTL-040.md). Original favicon/touch/cart hashes remain unchanged. Root and independent recovery shells share local font preload calls; normal pages emit these early in HTTP Link headers. Content font choices/fallbacks remain readable and keep their original families; no app-hidden or font-ready gate is used. The complete logo stays the same even when fonts fail.
