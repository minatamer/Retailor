> Historical draft02, before the owner removed green and requested three more ideas. Active asset paths have since been regenerated in navy/white; this prose and its old hashes are historical, not current artwork/evidence. See the current RTL-037 review/validation.

# RTL-037 validation — four object-logo concepts

14 October 2026. Windows local, Node 24.19.0. Read the complete owner request, rejected RTL-032 review and allocation, current font/tokens/OFL provenance and root instructions. RTL-036 independent local implementation/checks were completed before this review-only ticket. No logo selection or installation authorised.

## Actual delivered review

Four original SVG object silhouettes: cart, wallet, credit card and barcode. Each combines an R with the actual Retailor Inter 800 face; lowercase wordmark lockups use the same face. Navy `#242b60`, lime `#d6f578` and white match the current application. No Shopify bag, S, downloaded mark or copied path. The reference informed only the owner's general object-plus-letter brief.

Each direction has a standalone 128×128 SVG and 400×100 wordmark lockup. The 1280×1150 board shows all four with descriptions/tradeoffs and native 16/32/48px studies. Twelve separate transparent PNG studies have exact requested dimensions and alpha. Fonts remain editable text: SVG masters embed the existing unmodified WOFF2; these are not claimed as outlined production masters. Provenance records its exact SHA-256 and OFL source; a copy of the original licence accompanies the review assets. Nothing under application/public or metadata is changed.

Local browser file-URL preview was rejected by the browser protocol policy. No alternate URL, listener, browser surface or network workaround was attempted. Used the materially safer offline Sharp/Pango rasteriser instead: it registers the same local Inter file for the process and uses its real family name for librsvg, which does not load browser @font-face. No egress, package installation or provider/image generation. A local rendering probe confirmed distinct Inter/Arial dimensions with the local font file registered.

## Commands and inspection

- `node docs/design/logo-review/RTL-037/generate.mjs`: pass; four marks/lockups, self-contained SVG/HTML board and provenance.
- `node docs/design/logo-review/RTL-037/render.mjs C:/Users/minat/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules`: pass; existing bundled Sharp, comparison and twelve native-size PNGs.
- Repeated rasterisation: identical comparison PNG SHA-256 `be9dc2239e086333f8932e775b5816cff9d720e3605da851178c4713f984ba22`.
- Sharp metadata assertions: comparison exactly 1280×1150; all twelve icons exactly 16/32/48 square with transparency.
- `node --check` for both scripts and explicit Prettier check: pass.
- `git diff --check`: pass. Index empty, nothing staged or committed.
- Raw-byte source snapshot remains **`3eefc5e20db682db578c77d98926ead3e46053a56f8ed84f14089db0dbb18fe4`**, **235 application inputs**, identical to completed RTL-036. Docs/review assets are outside that positive inventory. No repeat of unchanged app gates is needed; RTL-036's five passing gates and sole strict historical Linux-source-proof mismatch remain the latest app evidence.

Visually inspected the rendered full board: all four objects/R/name combinations, small-size strips, labels, margins and colour roles. No clipping, missing glyph, accidental bag or overflow seen. Cart/wallet/card retain recognisable silhouettes at small sizes; the barcode is visibly busier at 16px and explicitly records the need for optical simplification if chosen. The pattern is a brand study, not a valid/scannable barcode. No browser tab, actual Google result, production favicon, physical-device or trademark-clearance acceptance is claimed.

## Settled read-only review

Reviewed the settled complete SVG generator/rasteriser, font provenance/licence, generated board, actual dimensions, stated tradeoffs and unchanged app fingerprint without editing during the review. All four requested ideas and the exact current type/palette are present, editable and reviewable. No remaining actionable local review-delivery findings. **Owner choice/refinement/approval remains pending** before any website/favicon integration. Film production remains deferred; current-source Linux/scanner/hosted/paid release acceptance remains pending under RTL-036. No new dependencies, delegation, secrets, paid calls, cloud actions, stage/commit or publication.
