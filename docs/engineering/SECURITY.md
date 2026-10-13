# Retailor combined runtime security

RTL-018 audits the actual catalogue, Tailor, optional-logo, FX and browser-lifecycle implementations. This is an anonymous, temporary clothing simulation. The browser owns its business state; validation protects paid operations and safe rendering, not production inventory authority. No database, login, fingerprinting or durable per-person quota is introduced.

## Trust and dispatch order

| Boundary                       | Actual protection                                                                                                                                                                            |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Browser → fixed frontend route | Exact route/method/origin/media; declared and streaming limits; no caller-selected destination, audience, Authorization or proxy headers                                                     |
| Private bridge                 | Eight owned process slots before identity/fetch; fixed destination/path; redirects rejected; bounded identity/response reads and shared cancellation; safe upstream schemas/errors           |
| Backend HTTP → parser          | Exact mutation origin, fixed method/media, no compressed bodies; four active handlers and at most 64 arrivals/minute/process before body parsing; capped content-free timestamps             |
| Rejected body                  | Discard without retaining content for at most 250 ms / named transport limit plus 64 KiB; incomplete/excess tails close rather than become parser/provider input                             |
| Admission                      | Signed HttpOnly SameSite=Strict safety identity, exact host/action challenge, two-minute one-use boot-bound grant; fixed workspace lifetime, operation/disclosure and parsed manifest digest |
| Catalogue                      | Actual derivative hashes/descriptors, bounded multipart and complete decode/re-encode, then one joint provider inference; no filename/sample response authority                              |
| Tailor                         | Strict graph/economic relationships, actual payload digest/role/revision, bounded context/read tools and grounded final typed reply; proposals remain inert until local native review        |
| Logos                          | Exact confirmed name/palette/type/revision/policy/count binding; one three-image batch; available transparent raster validation; no URL fetch or partial publication                         |
| FX                             | One fixed public-data USD/EUR endpoint, no guest context/cookie/key; validated 8-KiB response, one owned refresh/cache/cooldown                                                              |

All paid routes now forward only the validated `retailor_safety` cookie. Duplicate, oversized or malformed cookie values are dropped. The backend independently verifies it and each grant; neither cookie shape nor browser consent is sufficient admission. Backend proxy trust is explicitly false; forwarding/source headers are not identity. Cloud IAM authentication must still be verified on the actual private hosted service.

## Finite controls and resource ownership

Admission holds at most 256 workspaces, 24 operation statuses each, 1,024 rate keys, bounded rate arrays and two paid leases. A workspace gets one concurrent paid action, at most two catalogue dispatches, twelve combined typed turns and two logo batches. Its two-hour lifetime cannot extend through re-admission. Boot identity rejects old grants after restart. A pre-dispatch failure returns its reservation; dispatched/unknown usage retains it. A new operation requires fresh deliberate admission, with zero SDK automatic retries. These are process controls, not durable identity or cross-revision budgets.

The bridge retains no guest-content registry and releases its slot on success, safe failure or cancellation after owned transport cleanup. Backend ingress uses a maximum 64 timestamp values and four slots; finish/close release exactly once. Its coarse limits protect parsing, while admission and raster gates independently protect expensive work. Eight-second admission, 120-second catalogue, 60-second assistant and 180-second logo route deadlines remain separate from their provider subdeadlines and outer bridge envelopes.

Response readers allocate one named-limit backing store instead of retaining every tiny upstream chunk plus a second concatenation buffer. They reject actual bytes independently of `Content-Length`, cancel the reader and release its lock/listener. The largest bridge limit is 4,404,020 bytes; eight such backing stores alone total about 33.6 MiB. This is not total RSS: JSON strings/objects, SDK/Response copies, Base64, renderer/runtime and decoded rasters need additional headroom. [Image concurrency](IMAGE-CONCURRENCY.md) records actual Windows raster measurements; Linux/hosted combined memory remains RTL-021/022 evidence.

Named contracts still cap 19-MiB catalogue transport, 768-KiB assistant JSON, 64-KiB logo input, 4.2-MiB logo response, 8-KiB FX, 512-KiB graph and bounded text/arrays. Assistant model bodies are capped at 11,000 serialized bytes with input-token accounting capped at 12,000, three requests and four tools. No mid-record truncation or silently discarded ledger history is added.

## Browser and header posture

Frontend headers deny framing, sniffing and browser camera/microphone/geolocation, and suppress referrers. CSP admits same-origin scripts/styles/fonts/assets, owned blob/data images/workers and the explicit Cloudflare challenge origin; objects, external base/form destinations and unrelated frames are denied. Production build headers include HSTS and omit development eval/websocket allowances. HTTP-local header observation is not TLS/hosted proof.

The static/RSC page policy permits inline framework scripts and style attributes because the app uses static landing rendering and finite CSS-variable styles. It is not a nonce-based strict CSP and does not independently make arbitrary inline script injection safe. The actual rendering boundary uses React text/typed components, no raw guest/provider HTML, dynamic code execution or arbitrary styles/URLs. No UI animation or rendering is suppressed. Challenge widget/domain and production CSP behavior require actual hosted verification.

## Handling, errors and logs

Originals stay in bounded browser-owned memory/cache. Inspected derivatives, selected brand context or a deliberate bounded Tailor turn reach the selected provider. `store:false` on Responses does not promise zero provider retention; account controls and Image API handling require their own inspection. Reset cannot recall dispatched input or saved reports. [Lifecycle](LIFECYCLE.md) records owned fixed expiry, inert restore and physical-erasure limits.

There is no application guest-content logger or server upload/result library. SDK logging is off; explicit startup prints only port/mode/paid state and a fixed bind-failure message. Safe request IDs, codes and aggregate usage counters contain no raw IP, filenames, image/prompt/reply bytes, cookie/grant or SDK exceptions. Framework/cloud request/build/audit metadata and retention remain separate operational responsibilities. Do not paste private diagnostics into committed evidence.

Provider auth, account/spend limits and unavailable model/tier configuration map to `OPERATOR_REQUIRED`: fixed owner-attention copy, retry `never`, no account detail. The session retains that known failure for its controller lifetime, blocks new AI methods and removes/disables their retry/Send controls. Reset preserves the attention explanation; reload creates a fresh controller but never replays a request. Late errors from canceled/replaced operations cannot block a new workspace. Temporary rate pressure maps to `BUSY`, incomplete/malformed/transient results to safe upstream failure, and owned timeout to deadline. The bridge rebuilds messages from source-controlled copy and treats invalid/oversized upstream output as provider failure, not excessive visitor input. Local products, styling, wordmark and completed stores remain usable; nothing auto-dispatches or selects fake mode on a live failure.

## Evidence and release prerequisites

[RTL-018 validation](../validation/RTL-018.md) owns actual adversarial results and read-only review. [Provider operations](../operations/PROVIDERS.md) records checked prices, reservations and pending account enforcement. Before public paid enablement, verify exact frontend origins/challenge hostnames, wrong-host/action rejection, IAM-private backend including its managed URL, runtime-only caller identity/audience, secret versions, real budget enforcement/retention and combined Linux/hosted capacity. No external gate is claimed by injected transports or Windows tests.
