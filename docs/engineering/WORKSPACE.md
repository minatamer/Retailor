# One temporary clothing workspace

RTL-005 supplies the single `/demo` journey and owns its basic lifecycle. Read [the blueprint](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md), [commerce semantics](COMMERCE.md), and [RTL-005 evidence](../validation/RTL-005.md) together. Final templates, Tailor conversations, scenarios and later resources remain owned by their following tickets.

## Composition and authority

The thin server route resolves the explicit development gate. Only that branch renders `DevelopmentWorkspace`, which injects authored fixture drafts. Public composition never chooses this provider. Its missing live processor leaves photos usable and explains unavailability; it cannot create a ready sample catalogue. The sample action loads the fifteen actual FORME image inputs and decodes them afresh.

`SessionProvider` initializes browser resources after hydration. It owns abort/dispose on unmount and pagehide, and reopens on a persisted pageshow. `SessionController` owns one projection, stage, graph, accepted/preview design, operation generation and photo-resource child. Components subscribe to that authority; URL/query/hash, cards and dialogs do not maintain a second workflow or catalogue. Local form and merge-selection state are transient input only.

| Stage | Behavior and legal continuation |
| --- | --- |
| Choose | Select/reorder/replace real photos; deliberately draft; continue an unchanged saved draft. |
| Process | Actual checking/drafting/validation/preparation signals. Waiting is indeterminate; cancellation preserves accepted photos. |
| Catalogue | Compact photo cards, optional corrections, merge/split/include/exclude and complete source coverage. Back preserves a valid completed draft. |
| Style | Accepted products on a preview canvas; local Tailor introduction and recommended finite look. Return to review or accept into storefront. |
| Storefront | Accepted design and the same products; revisit styling or enter owner perspective. |
| Dashboard | Facts from the same graph; return to storefront or preview design. |

Changing the selected photo identities or order invalidates the draft, increments input revision and requires a deliberate new draft. No ready result is held behind artificial delay. Processing owns an AbortController, generation, workspace identity, input revision and original fixed expiry; results must match all of them plus exact input descriptors and declared mode. Reset or replacement cannot accept a late answer. Restore of an interrupted Process returns to Choose with an unknown-outcome notice and never resubmits.

## Catalogue review and atomic publication

Strict draft shape contains photo descriptors, up to twenty products and 288 total options, one exact disposition per accepted input, and up to forty bounded correction snapshots. Products use the shared clothing contract and individual variant price/cost/opening stock. Titles/copy distinguish generated draft from visitor correction; photo-supported facts retain source IDs and observed/generated/default/user/unknown provenance. Unsupported details remain unknown. Stock, costs and option suggestions are disclosed demo assumptions.

Merge means the visitor confirms selected images show one garment; the first garment's options are retained, source IDs are combined within the eight-photo product limit, and prior corrections remain reviewable. Split keeps original provenance only where its source supports the retained view. The new garment starts excluded and unconfirmed, with a source requiring review. Include explicitly confirms clothing; exclusion explicitly resolves its source. Editing another product cannot silently dismiss an unresolved source. Exact duplicates require matching derivative hashes. No included product may reference a review/rejected/duplicate-only disposition or a missing source.

Publication first constructs a detached empty graph in the existing workspace and fixed lifetime. RTL-004 commands register the exact selected photo descriptors and create every included product using actual available-byte witnesses. Any invalid product/reference/stock/option/limit fails before changing the accepted graph. At least one included garment and no unresolved sources are required. The previous graph and preview remain usable on failure. Rebuilding with order history requires explicit confirmation before replacement.

An injected scenario seam belongs to RTL-011. Until then, only the declared development draft publishes a valid opening-inventory graph without authored sales. Public live drafts cannot publish through an invented second production generator. Design/perspective changes never run publication or reseed business activity. The initial preview is a real photo-backed baseline; RTL-007 replaces it with the complete three-family home/list/detail renderer, RTL-008 supplies the full chat-led styling flow, and RTL-012 expands the six exact baseline owner facts into interactive reporting.

## Recovery allow-list and bounds

One sessionStorage key, `retailor.workspace.v1`, holds version, savedAt, validated commerce graph, stage, input revision, selected photo IDs, bounded photo descriptors, completed draft/correction metadata, accepted/preview finite designs, presentation revision and fixture declaration. Serialization selects these fields explicitly and caps their UTF-8 JSON at 2 MiB. The commerce graph independently retains its 512-KiB cap. No File, Blob, image bytes/Base64, object URL, request controller, SDK client, grant, challenge token or secret is serialized.

Restore rejects unknown keys, bad schema/version, duplicate IDs, missing references, invalid graphs, future timestamps, expired state, development data in public mode, a draft from another input revision/selection, descriptor mismatch, or a presentation stage without an active catalogue. Photo metadata is independently bounded by the 40-MiB source and 24-MiB cached/18-MiB selected derivative envelopes. The original graph creation time fixes expiry at two hours; savedAt and refresh never extend it.

The separate owned IndexedDB cache stores actual original and derivative Blobs. Restore verifies exact descriptor identities, byte hashes and real decoding through the photo child, then recreates object URLs. Missing/corrupt bytes leave saved products and coverage metadata intact; affected publication/purchasing cannot use them. Repair requires the exact original photo identity and does no interpretation. A different photograph cannot silently take its saved ID. Memory-only recovery is explicitly reported when storage or quota is unavailable.

## Duplicate tabs, document lifetime and cleanup

Each runtime has a fresh identity and an atomic IndexedDB ownership/fence. On supported secure origins, it also holds a per-workspace exclusive browser Web Lock with `ifAvailable`, never `steal`. The database records whether its current lease used that lock. An acquired document lock can safely take over a stale lock-backed lease after a document ends, without waiting twenty seconds; it cannot bypass an active owner or a legacy lease. The browser releases the document lock on crash/navigation. This is based on the [Web Locks specification](https://www.w3.org/TR/web-locks/).

Without that API, the bounded IndexedDB heartbeat/lease remains the ownership authority: renew every five seconds, twenty-second lease and persistent fencing after takeover. A brief 150-ms retry accommodates a finishing close. A live ownership conflict starts a fresh independent workspace without clearing or adopting the other tab's bytes. A cache-close transaction is enqueued synchronously when a live database is available; queued operations are rejected after close, and release only updates the matching runtime/fence. The lock is released after close settles. No runtime identity or lock handle enters recovery JSON.

Reset aborts the current generation, removes subscriptions, revokes owned URLs and clears only its owned cache namespace and session key before creating a fresh fixed-lifetime identity. Expiry follows this path once. Unmount releases resources without deleting recovery. If deletion is denied, the UI reports that cached bytes or metadata remain subject to their original expiry; it does not promise successful deletion. RTL-016 integrates subsequent conversations, exchange rates, logos, export and feature resources.

## Responsive behavior and evidence limits

The review presents one/two/three/four columns by available width, with accessible compact details and 44-pixel targets. Its primary actions remain available before the garment list and stay within reach while scrolling. Style previews show the first four accepted garments; the storefront shows the whole catalogue. On small screens the Tailor greeting and CTA precede the preview, so a fifteen-product wall cannot hide the continuation. The full chat and complete templates arrive in their owning tickets.

Scoped transitions, photo hover movement, process orbit and loading indicators remain active. No motion-off setting or OS-based suppression was added. Real Chromium viewport checks cover 320, 375, 768, 1024, 1280, 1440 and 1920 pixels; these are browser viewport observations, not physical-device certification. Actual 200% browser zoom, owner aesthetic approval and later feature combinations remain tracked for RTL-019. No paid or hosted result was tested here.
