# Tailor conversation, evidence and tours

RTL-013 extends the existing Tailor panel across creator, shopper and owner views. Local visual styling remains the main creation flow. Natural language is a deliberate, bounded foreground turn; mounting or showing a card never calls a provider. Live acceptance remains owned by RTL-020.

## Sending and simulated chat

RTL-081, 15 October 2026: Ask Tailor has one visible **Send** button in fake and live mode. The old Try development example label was the submit action; it is removed. Enter submits the existing form/controller once; Shift+Enter inserts a newline. IME composition/key229 and held-key repeat do not send. Empty input, pending assistant/logo work and operator-required state disable Send; the controller retains independent guards. The prompt stays editable during a pending turn, preserving a next draft. Sending and Cancel request retain existing lifecycle behavior. A described hint explains the keyboard controls; fake mode says Demo chat · Simulated replies. Live disclosure remains before deliberate dispatch.

The existing explicit fake backend provider answers exact greetings with role-specific guidance and supports its bounded current-evidence grammar. A greeting plus a request still follows the real filter/tool path. Unsupported shopper input explains simulation scope without inventing actions. No local parallel chatbot, extra graph, hidden retry, new endpoint or paid call is introduced. Live unavailability still cannot select fake mode. Existing role/fence, photo, proposal-review, cancellation, history, time/turn/body and financial grounding rules remain. [Actual validation and limits](../validation/RTL-081.md).

## Welcome text arrival

RTL-072, 15 October 2026: the owner requests a chat-like text entrance on opening personalization so the Tailor panel draws attention. Authored setup/welcome headings reveal word by word after a short lead; their paragraph follows, completing in roughly two seconds. Creator steps and shopper/owner welcome entries share one local presentation helper. Existing step keys and a companion-role key replay the new message on entry or reopening, while palette/layout/composer/viewport updates retain the same mounted words.

Finite CSS opacity animations retain the full text's layout space. Controls remain usable immediately; there is no completion gate, artificial provider wait or scroll per word. A single complete accessible copy preserves heading/text semantics, with the visual word spans hidden from assistive technology and no per-word live announcements. Native unmount removes the animated spans; there are no new timers, listeners, persistence fields, inference calls or dependencies. Existing panel/message/tour motion and focus behavior remain. Conversation history and finalized provider replies keep their existing rendering and authority. [Actual local validation](../validation/RTL-072.md) records observed frames, stable geometry, native progression/rerenders/reopen/role/restore/reset and responsive checks; physical assistive-technology/owner/live acceptance remains pending.

## Capabilities and entry points

| Role    | Local actions                                                        | Deliberate conversation capabilities                                                                                                                     |
| ------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Creator | Existing visual styling, explanations, source guidance, tour         | Read accepted presets/products; suggest inert design previews or the optional logo path                                                                  |
| Shopper | Collection summary, source cards, help, tour, manual bag controls    | Find known clothes using displayed-price bounds; inspect reviewed details/policies; prepare an exact bag option for native review                        |
| Owner   | Business summary, sources, help, tour, charts/registers/manual forms | Inspect computed scoped facts/records; explain a selected chart day; navigate finite views; prepare editable operations or reviewed scenario replacement |

These roles are anonymous UI capabilities in a temporary simulation, not authenticated merchant identities. Shopper tools cannot inspect owner costs or prepare product/expense mutations. Model output has finite IDs and inert intents, with no command, callback, HTML, selector, remote URL or arbitrary HTTP operation.

The development provider supports a small declared grammar: role-aware greetings, categories/displayed-price budgets, unknown material/fit questions, owner summaries/negative-day explanations, product creation intents, creator guidance and tours. The composer identifies simulated replies; some existing finite tool replies retain their Development example prefix. It reads the current graph with no parallel product database. Examples prove choreography/contracts, not arbitrary language quality. Live failure never selects this provider.

## Ownership and evidence

`SessionController` owns prompts, pending work, bounded role histories, tour steps and native dispatch. The context helper uses the already validated session without copying the graph on every message render. The conversation panel computes one memoized dashboard model for its exact cards; historical replies do not each rebuild the daily series.

The fixed browser bridge validates bounded finalized replies. Backend context preparation validates commerce invariants, current time/lifetime, registered period, photo identities and dated currency scope, then recomputes facts. Browser-submitted KPI values have no authority. Only the backend receives the full bounded graph. The text provider gets up to three relevant products/two options each, confirmed attributes or unknown values, stock, scope, headline facts and whole recent messages; finite tools read more evidence. No photo bytes, original files or full raw business history reach the text model.

Owner chart-day facts use the intersection of the selected UTC day and period. Exact cards resolve to existing facts, numerator/denominator, availability and date basis, then navigate into the evidence drawer and registered records. A refund-only day can have negative sales and unavailable AOV without inventing an order. Owner money stays USD even when shopper display is EUR.

Strict schemas own role/context/action/tool/reference/claim/navigation/proposal/finalized-result boundaries. IDs must resolve to current records. Attribute claims require exact confirmed values with supported provenance. Financial observations must match recomputed scoped facts; product contribution requires an actual grouping. Narrative cannot calculate money. Connective prose plus exact application-rendered chips and conservative unsupported-claim checks govern local acceptance; live semantic accuracy requires independent evaluation.

## Navigation and inert preparation

Known category/query/price/stock filters apply immediately through existing browse controls and remain removable. Rounded EUR display prices determine EUR bounds using the selected valid snapshot. Unknown material cannot establish a confirmed exclusion. No match gets honest empty-state recovery, without substitution.

Owner proposals open authored editable forms. Dirty fields protect the current draft; suggestions use existing field/form identity guards. A product stays uncreated until a validated available photo, required values, exact-effect review and explicit native confirmation are complete. RTL-014 owns inline chat forms. Bag proposals select the exact product option for native price/quantity/stock review; they never place orders. Design proposals preview accepted presets. Scenario proposals open replacement review. Logo intent prepares a separate optional action; text-tool callbacks cannot spend on logos. RTL-015 owns that batch.

## Finite limits and admission

| Boundary             | Enforced policy                                                                              |
| -------------------- | -------------------------------------------------------------------------------------------- |
| Prompt/final text    | 2,000 / 4,000 characters                                                                     |
| Conversation         | 40 messages combined; at most 12 recent current-role/scenario messages submitted             |
| JSON/result          | 768 KiB / 64 KiB                                                                             |
| Investigation        | At most 3 model requests, 4 aggregate tools, 60-second total backend turn                    |
| Output/request       | 1,500 model output tokens                                                                    |
| Input/request        | 12,000 tokens: conservative 11,000 serialized UTF-8 bytes plus 1,000-token framing reserve   |
| Tool result          | 4,000 serialized bytes                                                                       |
| Live turns           | 12 combined creator/shopper/owner dispatches per fixed workspace                             |
| Challenge rate       | 6 text proofs/safety identity/minute; 12 proofs/process/minute; separate catalogue allowance |
| Shared paid capacity | One operation/workspace, two/process, existing shared capacity owner                         |
| Grant/workspace      | Up to 2 minutes / fixed 2 hours                                                              |

Older history messages are dropped whole when needed. Current prompt/evidence/function-call chain remain intact. An envelope that still cannot fit fails before its next dispatch. Strict tool investigation and final-reply schemas are sent separately to fit static framing. Live final prose contains references/claims and `usePreparedActions`; any navigation/proposal comes from actual validated tool outputs when acknowledged, then passes the normal grounding check. The final text schema cannot invent action payloads. Financial tools retain exact values, units, formula and total contribution/exclusion counts with one shared scope and two preview references per fact; the native drawer resolves every record. Provider schemas retain strict structure/enums; owning parsers independently enforce value bounds.

Assistant admission binds role, workspace/scenario/revision, fixed lifetime, disclosure version and SHA-256 of the strict canonical payload. The existing HMAC grant adds boot/safety identity and one-use nonce. Execution compares actual payload digest/identity before consuming it. Changing prompt, role or context cannot reuse approval. Catalogue/text operations share a ledger. Its provisional reserve is an allowance, not verified pricing; unknown/partial outcomes retain it. Usage aggregates only when every dispatched request supplied bounded usage.

The pinned OpenAI 7.32.0 adapter uses explicit injected credentials, fixed foreground Responses transport, `store: false`, `background: false`, non-streaming replies, redirect rejection, zero SDK retries and no durable conversation. Stateless replay preserves opaque reasoning and exact `call_id` results, following [official Responses migration guidance](https://developers.openai.com/api/docs/guides/migrate-to-responses) and [function-calling guidance](https://developers.openai.com/api/docs/guides/function-calling). This does not establish zero provider retention. Provisional `gpt-6-luna` model/account/price/quality/latency/retention acceptance remains RTL-020. No paid request was dispatched locally.

## Lifecycle and outage

Finalized replies witness workspace/scenario/data revision, available photo identities, currency/quote, period/day/fact, finite design and filters/product selection. Source/data identity always fences actions; additional presentation comparisons follow relevant sensitivity. Unrelated palette changes do not invalidate product/owner evidence merely because the panel re-rendered.

Reset, scenario/data replacement and role changes cancel pending work. Relevant presentation changes reject late results. Accepted benign navigation rebinds the finalized reply to the application-owned resulting view, without authorizing a mutation.

Bounded old text remains labelled earlier scenario/view; stale references/proposals disappear. Restoration marks every saved message inert, even if IDs match. Pending requests/drafts are excluded from persistence and never replay. A fresh local summary needs no inference.

Unavailable, cancelled, exhausted, refused, malformed and timed-out results preserve chat, accepted stores, visual choices, tours and manual forms. Safe error copy invites a deliberate next Send; no automatic retry/fake live fallback occurs. Content and raw provider errors are not logged. Health/configuration dispatch no model request. Fake mode reports a declared Tailor fixture with paid mode off; live missing prerequisites report unavailable.

## Tours and focus

Finite mounted `data-tailor-target` IDs cover home/collection/product, bag, choices and owner scope/headlines/trend/registers. Optional absent steps skip; provider text never becomes a selector. Native Next/Back/Finish/Done/Escape controls use owned frames, resize/mutation observers and scroll/visual-viewport listeners with cleanup.

Tour initiation can focus controls when the user is not editing, without taking focus during typing. Chat/navigation preserve editing focus; viewport resizing keeps the composer within its scroll pane. Designed motion stays enabled, with no animation/render-off or OS suppression setting.

Physical keyboards/touch/tablets, zoom/assistive technology and owner visual approval remain RTL-019 evidence. Viewport observations do not establish physical-device behavior.

See [RTL-013 validation](../validation/RTL-013.md), [dashboard facts](DASHBOARD.md), [owner operations](OWNER-OPERATIONS.md) and [the blueprint](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md). RTL-014/015/018/019/020 retain their inline forms, logos, hardening, native matrix and live acceptance scope.
