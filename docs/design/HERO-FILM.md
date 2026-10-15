# Retailor hero film — discussion draft 01

**Current status, 16 October 2026:** [RTL-105](../tickets/RTL-105-cinematic-landing-hero.md) subsequently shipped an original16-second local clothing-photo motion loop, dark full-viewport hero, centered copy/lime CTA and transparent-to-white navbar. [Actual evidence and limitations](../validation/RTL-105.md) distinguish playback/responsive checks from pending owner/hosted acceptance. The larger campaign narrative below remains a historical proposal; its sequence and proposed production are not claimed complete by that smaller asset.

14 October 2026. **Planning only. Production deferred by the owner while frontend visual feedback continues.**

Confirmed direction: **fashion campaign with punchy product reveals**. Script, duration, detailed framing and transitions below remain proposals. This document replaces no current hero code, creates no video/composition and freezes no frontend imagery.

**Latest owner reminder, 15 October 2026:** attempt a full-width, full-height dynamic background video across the hero directly **beneath the navbar**, with the headline, supporting text and CTA layered above it. The video should fill that hero area. Motion-graphics production and hero integration remain deferred; this request records the future direction only.

## The idea

Working concept: **Your next chapter, sooner.**

Sell the feeling that good clothes can become a convincing brand without a long setup project. The viewer should think, “I could bring my collection and quickly see what it could become.” Clothing photography, confident sentences and decisive transformations carry the campaign. The website provides visual proof.

The owner's requested sequence anchors it: clothes drop in → a storefront appears → two quick Tailor-led layout changes → “Perfect!” The film leaves out the detailed upload/review/setup/dashboard tour. V1 concentrates on clothes, the store and making its look yours. No dashboard shot is proposed yet; its ongoing visual review remains relevant if a later script adds one.

The hero area beneath the navbar becomes the film's full canvas. The Retailor headline, supporting text and CTA remain real HTML in front, available from first paint and throughout the loop. The film can pass behind them; its composition accounts for those foreground areas rather than expecting every object to remain unobstructed.

## Script and motion proposal

**24 seconds, silent looping hero; candidate production timing 30 fps.** The film must communicate without audio. Music/voiceover for a separate marketing cut can be discussed later.

| Time        | Campaign words                                        | Motion and product moment                                                                                                                                                                                                                                                                                               |
| ----------- | ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0–3 s       | **Your clothes shouldn’t wait.**                      | Six to eight approved clothing-photo cards sweep in from the edges and settle into a loose fan. Small variations in depth, restrained rotation and soft shadows make them feel physical. The whole canvas participates; the foreground headline stays fixed.                                                            |
| 3–5.5 s     | **Skip the long setup.**                              | The cards collect into one stack and follow a confident drop gesture toward a glimpse of Retailor's photo intake. Their photo rectangles become the image positions in a storefront. One connected transformation gives this beat its energy.                                                                           |
| 5.5–10 s    | **From collection to storefront.**                    | A clean Studio-style store resolves with those same clothes. The camera settles briefly so the result can be appreciated. Use the final real frontend's proportions and branding, with an editorial jump cut between intake and result. No stopwatch, fabricated progress percentage or measured processing-time claim. |
| 10–14.5 s   | **A few words. A whole new look.**                    | A recognisable Tailor exchange appears: visitor **“Make it bolder.”** The approved real style-choice interaction resolves to Pulse. Product images keep their identities while columns, colour, scale and type move into the campaign composition. Hold the new layout long enough to see the change.                   |
| 14.5–18.5 s | Same campaign line continues; no extra slogan needed. | Visitor **“More room to breathe.”** Tailor's approved interaction resolves to Gallery. The composition opens up into its image pairing and quieter rhythm. This is the second layout change, with the same clothing.                                                                                                    |
| 18.5–21.5 s | **Less setup. More momentum.**                        | A visitor bubble says **“Perfect!”** The final store gets a confident hold and a small Tailor sparkle. Celebrate ownership with good typography and photography; avoid a noisy confetti ending.                                                                                                                         |
| 21.5–24 s   | The closing line fades.                               | Image rectangles gently separate from the storefront into the opening photo fan, or the camera pulls through a matching photo edge. End positions, colour and motion must join the opening cleanly. The hero headline/button never disappear or wait for the loop to finish.                                            |

This is a campaign edit, not a recording of provider latency. Its words sell setup simplicity and the storefront vision. Retailor currently offers a temporary demo, so the script does not add claims that a production shop has been published, payments are live, sales have begun or a guaranteed launch time has been measured.

The two chat prompts and the initial/final layout choices are provisional. Final shots must use the actual agreed Tailor interaction: if it presents choices for a visitor to accept, show that acceptance in the gesture rather than invent an autonomous mutation. “Perfect!” is the illustrated visitor's reaction.

## How it should move

- **Products lead.** Use approved original garment photos, not generic upload icons or placeholder stock clothing. The same recognisable jeans/shirt/dress survive the reveal and both style changes.
- **Connected transitions.** Match photo corners and product positions between scenes. A photo becoming a storefront image is more persuasive than unrelated screens sliding past one another.
- **Short moves, clear holds.** Candidate major transitions take about 0.5–0.8 seconds; the remainder of each beat lets the clothes/layout breathe. Use a brisk rhythm with controlled stops, slight depth and clean easing. Keep small text still while it is meant to be read.
- **Show layout changes.** Studio's editorial balance, Pulse's strong campaign block and Gallery's spacious pairing should visibly reorganise. Colour and type support the change; they do not substitute for it.
- **Campaign typography.** One marketing sentence at a time, set large enough for its composition. Tailor bubbles are short and recognisable. Avoid a second dense paragraph competing with the permanent hero text.
- **Retailor's character.** Warm paper, cobalt accents, crisp dark type and restrained sparkle. The storefront can supply its selected palette. Keep the foreground's contrast stable across those changes.
- **A continuous canvas.** Photographs and colour fields can extend to the screen edges and behind the headline. The film should feel like the hero background, with the storefront as a moving subject inside it, rather than another small demo window beside the copy.

No rapid flashing, full-screen strobing or repeated hard zooms. Preserve visible designed motion; no motion-off/render-off preference or OS-based suppression is proposed. The looping seam needs an actual rendered check before calling it seamless.

## Foreground content

Keep the owner's requested hierarchy in front of the film:

> Bring your products.<br />
> _See your store._

> Your clothing. A beautiful storefront. Make it yours with Tailor beside you.

CTA draft: **Build your demo store**, matching the owner's latest wording. The current implemented button says “Build my demo store”; this document changes no UI and that wording remains a discussion choice. Retain the existing short “No signup. No real payments.” line unless the owner changes it later.

The headline, supporting text, header navigation and CTA are outside the video. They remain selectable/accessibly named and clickable, with fixed geometry while the film plays. The film receives no clicks and does not create a workspace or dispatch processing. It is illustrative marketing footage.

The permanent copy supplies the core meaning without watching the whole loop. Marketing sentences in the film are accents. Do not announce each scene repeatedly to screen readers; agree a concise static description if the final film adds meaningful information beyond the foreground copy.

## Device compositions

Propose **one shared timeline with three separately composed versions**, using the same final frontend/product assets. Reference aspect ratios are starting points, not an instruction to crop the laptop recording into every device.

| Version         | Reference frame | Staging around foreground copy                                                                                                                                                                                                                                                         |
| --------------- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Wide            | 16:9            | Laptop/landscape tablet. Copy generally left; store and Tailor action mainly centre/right. Photo entries and colour extend across the whole canvas, including behind the headline. Marketing phrases use clear areas above/below the main store subject. Protect the header and CTA.   |
| Tablet portrait | 4:5             | Foreground toward the upper portion; the main store occupies the lower/central area. Reflow photo entrances and Tailor bubbles vertically. Keep interface snippets readable rather than miniaturising a laptop screen.                                                                 |
| Phone portrait  | 9:16            | A close, vertical composition. Bring the photo stack, storefront crop and short Tailor prompt through the middle/lower canvas. The foreground can overlap part of the store; keep the important transition and chat phrase in a clear area. Use captures of the actual phone frontend. |

Landscape phones and short laptops use the wide staging with tighter vertical bounds. Intermediate ratios get individually checked framing and object positioning. The final implementation must select/reframe based on the hero container's aspect ratio and dimensions, then fill the canvas edge to edge. Test the motion focal points after the cover crop; filling a rectangle alone is not proof that the story fits.

Latest owner placement, 15 October 2026: the film fills the hero's width and height directly beneath the navbar, with the foreground text and CTA layered above it. This supersedes the earlier proposal to extend the video behind the header. Foreground content respects device safe areas. A scene-aware scrim/gradient can protect text contrast while the moving imagery remains visible across the background. Detailed text placement and scrim strength remain proposals to review on stills with the actual foreground text laid over them.

Safe areas come from measuring the real HTML headline, supporting text, CTA and navigation at each test size. They are not a single fixed empty box in a master video. In very short or zoomed views, allow accessible content to flow rather than clipping text/buttons to force a one-screen fit.

Future fit matrix includes at least 320×568, 375×812, 390×844, 430×932, 768×1024, 1024×768, 1280×600, 1366×768, 1440×900 and 1920×1080; portrait/landscape transitions, intermediate resizing and actual 200% zoom. Check all major beats, not only the opening poster. These are planned checks, not passes.

## Keeping it faithful to the changing frontend

**Do not produce final UI footage now.** The owner is still giving dashboard/storefront feedback and may defer this concept indefinitely.

Each shot keeps an editable asset slot instead of embedding today's UI as a permanent creative decision:

| Asset slot                | What must be settled before final capture                                                                                           |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Clothing-photo fan        | Approved reusable original images and their provenance; never private visitor uploads.                                              |
| Intake glimpse            | Final upload/drop presentation and the gesture the film depicts.                                                                    |
| Store A                   | Final initial storefront family, theme/type, hero arrangement and same illustrated collection. Studio is only the current proposal. |
| Store B                   | Final contrasting campaign layout. Pulse is only the current proposal.                                                              |
| Store C                   | Final spacious layout and image pairing. Gallery is only the current proposal.                                                      |
| Tailor exchange           | Final panel/bubble/icon/choice appearance and truthful prompt-to-preview/acceptance behavior.                                       |
| Hero overlay              | Agreed headline/lead/button/nav placements for each device composition.                                                             |
| Dashboard, if later added | Separate final dashboard visuals and a revised script/timing agreement.                                                             |

When production is separately requested, capture the agreed final frontend at the actual target viewports with an approved illustrative dataset and paid-off local configuration. Maintain a small non-secret shot manifest with source revision/fingerprint, viewport, family/page/theme/type, photo identities and file hashes. Composition uses those refreshable captures/layers. A later UI edit triggers recapture of its affected shots and a new overlay/loop check.

Remotion is a candidate for deterministic, editable scene production after that authorization. Scope the production location and dependencies then. Use captured approved frontend layers/assets or an approved same-app capture path; do not fork the storefront renderer or introduce app-to-app source imports. Each beat and aspect-ratio arrangement remains separately editable. No setup, dependency install, composition registration, Studio launch or export is part of this draft.

## Discussion and production sequence

1. **Now:** discuss the message, opening/closing words, style-change prompts, pacing and motion. Review this proposed 24-second script and static composition descriptions; revise as needed.
2. **Before any motion work:** the owner explicitly requests the agreed next phase. A small rough animatic can be authorised separately if desired while the frontend evolves; it must stay labelled as a draft and does not approve final UI footage/integration.
3. **Before final footage:** identify the filmed frontend surfaces ready for capture, resolve the asset slots and agree the wide/tablet/phone foreground compositions. Owner permission to start remains necessary even if a script version was liked earlier.
4. **During authorised production:** inspect motion in preview, review every major beat with the actual HTML overlay at the device matrix, revise and then explicitly authorise final exports when desired. Verify loop seam, text contrast, crop, source fidelity and readability.
5. **Before hero replacement:** approve the concrete final video/foreground integration. Set measured asset/decode/load budgets; prepare an approved poster and honest unavailable-playback/asset-failure behavior. Future background playback is intended to be muted, inline and looping, with ordinary browser restrictions respected. Test actual devices/autoplay/slow loading, stable CTA, safe areas and cleanup; no guaranteed fit/performance claim from this document.

A later owner instruction can authorise several milestones together. Follow that actual scope and do not ask again for actions already authorised. Liking a script during the current discussion does not override the explicit hold on execution.

No push, deployment, paid provider, cloud job, purchase, new chat or delegation is included in these local creative decisions. No recurring task or automatic wake-up is requested.

## First discussion choices

- Opening proposed: **“Your clothes shouldn’t wait.”** Softer fashion alternative: **“Good clothes. Big plans.”** More direct alternative: **“From collection to storefront.”**
- Closing proposed: **“Less setup. More momentum.”** Alternative: **“Make your next move.”**
- Should the film's marketing words feel like full sentences, or shorter poster-like statements?
- Should the final “Perfect!” moment hold longer than the two transformations? If so, retime the current 24-second proposal together.

The overall fashion-campaign/punchy-reveal tone and the full-hero background-video placement beneath the navbar with foreground text are confirmed directions. Script, timing and detailed compositions remain open; production remains deferred. [RTL-031](../tickets/RTL-031-plan-marketing-film-hero.md) owns this planning packet; the currently implemented hero remains described in [LANDING.md](LANDING.md).
