# Provider setup and spend policy

Checked 13 October 2026 against official OpenAI documentation. No Retailor key/account was read, no paid request was made and no budget or hosted configuration was approved. Normal app-local secrets remain ignored; `.env.example` contains fake/paid-off defaults and blank credentials.

## Prepared policies and checked prices

Catalogue and Tailor use `gpt-6-luna`, foreground Responses, explicit Standard/default tier, `store:false`, no background/streaming/built-in paid tools and zero SDK retries. The official [pricing](https://developers.openai.com/api/docs/pricing) lists Standard short-context USD 0.10 input / 0.50 output per million tokens; long-context 0.20 / 0.75. Cache discounts are not assumed. Account access, quality and actual usage remain RTL-020 checks.

Optional logos use `gpt-image-2.5-flare-2026-09-08`, exactly three 1024×1024 medium transparent PNGs. The [model page](https://developers.openai.com/api/docs/models/gpt-image-2.5-flare) confirms the snapshot and USD 5 text-input / 30 image-output per million tokens (image input USD 8; this route accepts none). It explicitly says the GPT Image 2 calculator does not estimate 2.5 token consumption. Do not invent a fixed per-image price. Output/transparency/name quality and account capability still need an authorized run.

The [error guide](https://developers.openai.com/api/docs/guides/error-codes) distinguishes temporary throttling from credits/project/organization spend or usage enforcement. Raw provider codes stay private; visitors see stable owner-attention or temporary-failure copy. No automated retry is added.

## Explicit reservation arithmetic

| Operation                | Conservative process reservation | Basis / limitation                                                                                                                                                                              |
| ------------------------ | -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Catalogue attempt        | USD 1                            | Even 1,050,000 input and 12,000 output tokens at checked long-context rates gives USD 0.219; this is a model-context ceiling estimate, not measured usage                                       |
| Typed Tailor turn        | USD 1                            | Three requests × (12,000 input × 0.10 + 1,500 output × 0.50) / 1,000,000 = USD 0.00585 at short-context rates; 11,000-byte serialized model-body bound is separate                              |
| Three-logo batch         | USD 4                            | The accepted aggregate usage-report ceiling of 100,000 output tokens prices at USD 3, plus bounded text-input headroom; this is not an API generation-token limit or a measured worst-case bill |
| Full temporary workspace | USD 22 reserved                  | 2 × USD 1 catalogue + 12 × USD 1 turns + 2 × USD 4 logo batches                                                                                                                                 |

A maximum-length multibyte name across all twelve palette/type combinations produced a maximum **853 UTF-8 prompt bytes** from the real compiled prompt builder. No image input, tool or arbitrary prompt is accepted. That measurement supports bounded input headroom; it does not measure Flare output tokens. The former USD 2 logo allowance did not cover the currently accepted 100,000-token output usage report, so RTL-018 raises it to USD 4.

Dispatched reservations are retained even after reported success; pre-dispatch failures alone refund them. Cancellation, refusal, SDK error or missing/invalid usage may have incurred a charge. A report exceeding accepted usage bounds is not proof the provider stopped billing there. Logo generation cannot presently impose a token ceiling through its prepared Image API parameters. Actual output consumption and account-enforced limits must be verified before `LOGO_POLICY_APPROVED=true`; no new flag is added to conceal that missing evidence.

`PROCESS_BUDGET_MICRO_USD` defaults to zero, maximum USD 100 in the schema. The owner chooses its actual allowance. It restricts reservations for one process boot, not lifetime project spend or a monthly/per-person cap. Multiple identities, process restarts, instance/revision overlap and other account users can defeat a process-wide claim. Official pricing changes, processing tiers, regional uplifts, unknown outcomes and provider enforcement require review before paid enablement.

Keep offline sample generation separate from runtime AI. Hosting, builds, registry retention, secrets, networking/photo delivery, public FX fetches and domain costs are separate; no copied sibling allowance or free-credit assumption is a Retailor budget.

## Concrete operator prerequisites — pending

1. Select Retailor's project/account and privately enter `OPENAI_API_KEY`, `TURNSTILE_SECRET_KEY`, `TURNSTILE_SITE_KEY` and a strong grant secret through the app-local example/secret-manager workflow. Do not copy sibling secrets or use service-account key files for frontend invocation.
2. Inspect actual model/endpoint/tier access, Image API count/transparency support, provider data controls and retention. Record content-free evidence privately; `store:false` does not establish zero retention.
3. Choose and verify actual enforced project/organization spending limits, credits, rate policy and emergency disable procedure. Record scope/reset/overlap behavior and budget alerts separately. No setting was inspected or changed here.
4. Run the small authorized RTL-020 corpus, capturing per-operation aggregate input/output usage, unknown outcomes, latency/schema/grounding and actual logo worst-case consumption. Reconcile reserve policy with measured/published costs before approval.
5. Configure exact public origins/challenge actions/hosts and private Cloud Run service/audience/runtime identities under RTL-021/022. Probe wrong-origin/host/action, IAM denial, limits, production headers and paid-off first.
6. Enable only the independently accepted capabilities. Master paid-off disables all live AI; logo enablement/approval is separate. Fixed FX and local chat cards/design/forms/wordmark remain unpaid. Revoke new dispatch first during an incident; already dispatched work may still settle.

Until those checks pass, `LIVE_POLICY_APPROVED=false`, `LOGO_POLICY_APPROVED=false` and `PAID_DEMO_ENABLED=false` remain the committed defaults. Keys/cloud publication/spending need separate owner authorization. Local injected tests verify rejection and ownership, not any account, hosted or paid result.

RTL-023 makes the approved release decision explicit: public paid AI remains unavailable until actual externally enforced refusal and reset/restart/revision overlap/outstanding-usage evidence is supplied for the exact candidate. `scripts/release/security.example.json` starts unverified/paid-off; preflight cannot report paid readiness from process reserves, budget alerts or an acknowledgement alone. A policy record references private content-free evidence and expires after 72 hours; it is not a provider meter or proof that a control exists. If sufficient external enforcement is unavailable, stay restricted/paid-off rather than adding an unapproved accounting service. No key, provider account or paid refusal check was exercised locally.
