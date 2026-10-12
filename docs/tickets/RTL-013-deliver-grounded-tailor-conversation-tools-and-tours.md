# RTL-013 — Deliver grounded Tailor conversation, tools and tours

Status: **Locally implemented — clean validation; live/account and final native quality evidence pending RTL-020/019**\
Planning date: **11 October 2026**\
Milestone: **Copilot breadth**\
Depends on: [RTL-006](RTL-006-deliver-live-catalogue-recognition-and-admission.md), [RTL-008](RTL-008-deliver-tailor-chat-led-styling-and-owner-overrides.md), [RTL-010](RTL-010-connect-shopping-bag-and-simulated-orders.md), [RTL-012](RTL-012-build-animated-dashboard-and-record-drilldown.md)\
Blocks directly: [RTL-014](RTL-014-deliver-tailor-inline-photo-crud-and-confirmation.md), [RTL-015](RTL-015-deliver-optional-three-logo-generation.md), [RTL-018](RTL-018-harden-privacy-abuse-spend-and-runtime-boundaries.md), [RTL-020](RTL-020-evaluate-live-ai-and-audit-release-acceptance.md)\
Suggested commit: `RTL-013: deliver grounded Tailor conversation, tools and tours`\
Parent authority: [Retailor blueprint](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md)\
Queue and execution rules: [Ticket index](README.md)

## Outcome and standalone context

Extend the existing Tailor surface into a useful grounded copilot across creator, shopper and owner contexts. Tailor greets, tours, explains choices, finds clothes, summarizes business activity and traces a loss to exact records. It is not just an interview bot. A shopper can say “show me the jeans under €80” and immediately see real currency-aware filters without manually finding category controls.

RTL-008 already owns chat-led setup/cards; do not replace that shell or make styling require a typed model request. Authored welcomes, finite shortcuts, tours and deterministic explanations remain local. Deliberately submitted natural language uses a bounded live text/tool path, with current graph evidence and role-scoped capabilities. Models prepare navigation or inert operations, never economic authority.

## Dependency evidence and entry conditions

RTL-006 supplies protected live transport/admission, RTL-008 the shared chat surface, RTL-010 shopping/currency context and RTL-012 dashboard facts/evidence targets. Confirm each actual local seam. Inspect Retrosum shortcuts/guidance/reply/source patterns. Use verified injected contracts before actual live acceptance in RTL-020; no separate chatbot dataset or automatic provider call on mounting.

Dependency completion means required local behavior, owning contracts and checks actually exist. A planned checkbox or ticket-named commit alone is insufficient. Verified local dependencies may support local follow-on work while separately recorded live, owner-visual or hosted evidence remains pending. Never turn a fake pass into live acceptance.

## Files and responsibility boundaries

| Area | Responsibility owned here |
| --- | --- |
| `apps/frontend/src/features/assistants` | Role histories, reply rendering, contextual CTA/actions and tours |
| `apps/backend/src/assistants` | Context projection, finite tool loop and grounding validation |
| `apps/backend/src/providers` | OpenAI text Responses adapter behind the existing port |
| `packages/contracts/src` | Role/action/tool/target/reference/reply shapes |
| `docs/engineering/TAILOR.md` | Capabilities, source policy, concurrency and failure behavior |

Paths describe future ownership. Create modules/directories only with real behavior; reuse contracts, commands, assets and session state rather than a parallel authority.

## Implementation plan

1. **Define role scope and finite capabilities.** Creator reads allowed presets and previews; shopper searches known products/variants/policies and prepares bag changes; owner inspects computed facts/records and prepares supported operations. The guest perspective is a UI capability context, not authenticated merchant authority.

2. **Build friendly local entry points.** Welcome, useful example prompts, summaries, Show sources and replay tours use authored current context. Quick cards/buttons are native and available without typing. Only a deliberate live Send/follow-up consumes a turn; card visibility cannot silently trigger inference.

3. **Project current evidence.** Validate submitted graph, recompute facts server-side with commerce and supply relevant bounded products/records/scope. Do not send all photos or raw full history to a text model. Use at most twelve recent messages and 12,000 input tokens within a 768 KiB request.

4. **Implement a bounded investigation loop.** At most three model requests/four aggregate tools per turn, sixty-second backend total, 1,500 output tokens/request and 4,000-character final text. Twelve combined live turns/workspace, zero SDK automatic retries and one paid operation/workspace. Backend enforces caps, not client labels.

5. **Ground claims and references.** Validate product/fact/record IDs, current revision, currency/date basis and supported attributes. Monetary cards/chips render exact values from typed facts. Narrative cannot introduce authoritative unsupported amounts, fit/material claims, sales causation or generic off-domain execution.

6. **Apply benign shopping/navigation immediately.** Resolve known jeans/category/price filters to real collection state and show reversible chips. No pointless confirmation to browse. Unknown material cannot satisfy a confirmed exclusion; no matching item gets a useful empty-state reply. Reviewed bag additions retain price/quantity/stock confirmation.

7. **Prepare consequential actions inertly.** Typed owner changes select exact supported records/forms and may request missing core fields together. Ambiguity gets finite choices, never first-match deletion. RTL-014 integrates inline editable operation forms; provider output is never an executable callback or command.

8. **Build tours using actual targets.** Register home/list/detail, chat choices, bag, owner scope/chart/record targets per mounted layout. Next/Back/Finish/Escape works, absent optional steps skip and resize/scroll reanchors. No arbitrary selector, forced focus during typing or tour command execution.

9. **Fence histories and asynchronous scope.** Keep bounded role histories and operation IDs. Data revision stales consequential proposals; design/filter/currency scope stales relevant explanations. Reset/scenario change cancels owned work. Restored replies are finalized inert content; pending requests never replay.

10. **Preserve useful outage behavior.** Local choices, tours, manual forms, existing messages and deterministic summaries remain usable on exhausted/unavailable AI. Typed live failure never invokes the fake adapter. Development generic examples read current facts and clearly state their bounded simulation scope.

## Packet-specific contracts and cases

Role route mapping is fixed: `/v1/assistant/creator`, `/v1/assistant/shopper`, `/v1/assistant/owner`. Grants bind role and exact context/prompt digest. API responses contain finalized text, valid typed references and optional inert proposals, never HTML/callbacks.

The local choice/tour dispatcher is distinct from the model tool loop. A generated recommendation can refer to allowed IDs, but selecting its native CTA still invokes application-owned validation. Logo intent prepares a separate user-approved batch; it cannot spend from the text-model tool callback.

## Acceptance criteria — required local outcome

- [x] One Tailor surface supports creator/shopper/owner capability contexts.
- [x] Introductions, summaries, tours, shortcuts and grounded explanations work.
- [x] Known shopping filters/navigation apply immediately and reversibly.
- [x] Currency budgets and unknown/stock constraints use actual current evidence.
- [x] Consequence-producing output is inert and reviewed through authored forms.
- [x] Tool/turn/body/token/deadline limits and paid-off behavior are server enforced.
- [x] References and monetary facts bind valid scope/revision/source basis.
- [x] Tours use registered mounted targets with clean focus/scroll behavior.
- [x] Stale/restored replies cannot execute or masquerade as current facts.
- [x] Outage leaves local controls useful without fake live fallback.

## Focused verification and evidence

| Case | Required observable evidence |
| --- | --- |
| Jeans under €80 | Actual collection filters and rounded displayed price bounds |
| Summary after expense/order | Exact new result, scope and contributing references |
| Explain negative chart point | Actual drawer/record target, no invented causation |
| No-match/material uncertainty | Honest limitation and useful contextual options |
| Injection/unsupported tool | No arbitrary selector/URL/code/economic mutation |
| Turn/tool/token caps | Exact bounded counts and safe no-auto-retry failure |
| Tour/mobile keyboard interruption | Correct reanchor/cleanup and no stolen input focus |
| Scenario/currency/reset during reply | Stale result rejected and old chat inert |

Run meaningful focused tests during iteration. At the settled implementation snapshot run the applicable root gates established by RTL-001: `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm check:boundaries`, `pnpm test:unit` and `pnpm build`. Record actual commands/results and revision. UI acceptance needs real browser observations where available; DOM simulations or animation declarations alone do not prove appearance/movement. Do not add tests that merely mirror CSS or static labels.

## External evidence and scope limits

Live intent/grounding quality, retention/account configuration and usage/latency require separately authorized measured RTL-020 evidence. Deterministic fake/injected tools prove contracts and choreography only, not arbitrary language accuracy.

No browsing agent, general-purpose assistant, voice stack, vector store, background conversation or model-calculated money. Scope guards should be helpful and concise rather than add repeated consent dialogs or rigid irrelevant Yes/No pairs. Manual shopping/owner controls remain available after setup.

## Precision references

- [9. Storefront and product experience](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#9-storefront-and-product-experience)
- [11. Owner workspace](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#11-owner-workspace)
- [13. Commerce domain and exact calculations](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#13-commerce-domain-and-exact-calculations)
- [14. Commands, revision control and proposals](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#14-commands-revision-control-and-proposals)
- [15. AI capabilities and assistant behavior](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#15-ai-capabilities-and-assistant-behavior)
- [19. Data contracts and API](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#19-data-contracts-and-api)
- [20. Provider integration and evaluation](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#20-provider-integration-and-evaluation)
- [22. Security, admission and privacy](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#22-security-admission-and-privacy)
- [23. Resource limits and cost control](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#23-resource-limits-and-cost-control)
- [24. Visual system, motion and accessibility](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#24-visual-system-motion-and-accessibility)
- [25. Verification and evidence](../RETAILOR_DEMO_SOURCE_OF_TRUTH.md#25-verification-and-evidence)

## Completion handoff and commit boundary

Keep this outcome under `RTL-013:`; adjacent cohesive commits may be planned when useful. At execution write file allocations under `docs/commit-plans/RTL-013.md` and actual check/review evidence under `docs/validation/RTL-013.md`. These are future records, not fabricated by this planning pass.

Local implementation and all required gates are recorded in [RTL-013 validation](../validation/RTL-013.md), with [file allocation](../commit-plans/RTL-013.md) and [Tailor engineering](../engineering/TAILOR.md). Final settled gates: 259 tests/44 files, 127 boundary modules, both builds; clean read-only pass 4. Native fake-mode evidence covers EUR filtering, unknown/no-match recovery, exact negative-day/source/expense summaries, inert photo-required proposals and seven viewport sizes. Inline chat operations remain RTL-014. Live semantic/account/usage/retention evidence requires keys/budget/policy in RTL-020; physical/zoom/owner quality remains RTL-019. No paid or hosted acceptance is claimed. Owner authorization covers the planned ticket-prefixed local commits; no push or publication.
