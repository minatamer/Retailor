# Provider setup and spend policy

**RTL-102 update,15 October2026:** runtime logos now use only the local bundled font/mark generator in every app mode. No logo image model, Image API call, provider moderation or paid-logo approval/cost case remains. The image pricing/account paragraphs below are historical13October preparation, superseded for this removed branch. Only catalogue/Tailor remain paid AI; production native logos retain existing Turnstile/signing prerequisites and signed/rate/count/concurrency protections independently of paid enablement/OpenAI credentials. Native usage is zero model tokens. See [current logo policy](../engineering/LOGOS.md).

Checked 13 October 2026 against official OpenAI documentation. No Retailor key/account was read, no paid request was made and no budget or hosted configuration was approved. Normal app-local secrets remain ignored; `.env.example` contains fake/paid-off defaults and blank credentials.

## Prepared policies and checked prices

Catalogue and Tailor use `gpt-6-luna`, foreground Responses, explicit Standard/default tier, `store:false`, no background/streaming/built-in paid tools and zero SDK retries. The official [pricing](https://developers.openai.com/api/docs/pricing) lists Standard short-context USD 0.10 input / 0.50 output per million tokens; long-context 0.20 / 0.75. Cache discounts are not assumed. Account access, quality and actual usage remain RTL-020 checks.

Optional logos use `gpt-image-2.5-flare-2026-09-08`, exactly three 1024×1024 medium transparent PNGs. The [model page](https://developers.openai.com/api/docs/models/gpt-image-2.5-flare) confirms the snapshot and USD 5 text-input / 30 image-output per million tokens (image input USD 8; this route accepts none). It explicitly says the GPT Image 2 calculator does not estimate 2.5 token consumption. Do not invent a fixed per-image price. Output/transparency/name quality and account capability still need an authorized run.

The [error guide](https://developers.openai.com/api/docs/guides/error-codes) distinguishes temporary throttling from credits/project/organization spend or usage enforcement. Raw provider codes stay private; visitors see stable owner-attention or temporary-failure copy. No automated retry is added.

## Current runtime enablement and usage

RTL-024 follows the owner’s 13 October simplification: `FAKE_MODE=true` and `PAID_DEMO_ENABLED=false` remain local defaults. Set live mode and the paid master deliberately, with all required OpenAI/challenge/signing credentials, to make recognition, Tailor and optional logos available together. There are no live/logo policy flags, separate logo switch, process dollar allowance or hidden monetary reserve. Availability never generates a logo automatically: confirmed theme/type and explicit batch approval remain required.

Actual logo requests retain `moderation: auto`, a bounded original clothing-brand prompt, literal name data, explicit non-hateful design instructions and generic refusal handling. A prompt and local injected test do not prove actual provider moderation effectiveness; authorized live acceptance remains pending.

Admission retains two shared operations/one per workspace, exact one-use grants, rate/count/lifetime limits and content-free aggregate input/output/unknown-dispatch accounting. No application-side dollar cap exists. Master paid-off prevents construction/dispatch of live AI; stopping or disabling new requests cannot reverse already dispatched charges. Actual account limits and incident controls remain separate owner/provider decisions. Historical RTL-018–023 reservation measurements are superseded behavior, not the current setup.

Keep offline sample generation separate from runtime AI. Hosting, builds, registry retention, secrets, networking/photo delivery, public FX fetches and domain costs are separate; no copied sibling allowance or free-credit assumption is a Retailor budget.

## Concrete operator prerequisites — pending

1. Select Retailor's project/account and privately enter `OPENAI_API_KEY`, `TURNSTILE_SECRET_KEY`, `TURNSTILE_SITE_KEY` and a strong grant secret through the app-local example/secret-manager workflow. Do not copy sibling secrets or use service-account key files for frontend invocation.
2. Inspect actual model/endpoint/tier access, Image API count/transparency support, provider data controls and retention. Record content-free evidence privately; `store:false` does not establish zero retention.
3. Choose and verify actual enforced project/organization spending limits, credits, rate policy and emergency disable procedure. Record scope/reset/overlap behavior and budget alerts separately. No setting was inspected or changed here.
4. Run the small authorized RTL-020 corpus, capturing per-operation aggregate input/output usage, unknown outcomes, latency/schema/grounding and actual logo worst-case consumption. Review measured usage and published costs before any paid acceptance.
5. Configure exact public origins/challenge actions/hosts and private Cloud Run service/audience/runtime identities under RTL-021/022. Probe wrong-origin/host/action, IAM denial, limits, production headers and paid-off first.
6. Enable live AI only under actual owner authorization. Master paid-off disables all live AI; logos share its enablement and still need deliberate user batch approval. Fixed FX and local chat cards/design/forms/wordmark remain unpaid. Revoke new dispatch first during an incident; already dispatched work may still settle.

Until those external checks pass, `PAID_DEMO_ENABLED=false` remains the committed default. Keys/cloud publication/spending need separate owner authorization. Local injected tests verify rejection and ownership, not any account, hosted or paid result.

RTL-023 makes the approved release decision explicit: public paid AI remains unavailable until actual externally enforced refusal and reset/restart/revision overlap/outstanding-usage evidence is supplied for the exact candidate. `scripts/release/security.example.json` starts unverified/paid-off; preflight cannot report paid readiness from process reserves, budget alerts or an acknowledgement alone. A policy record references private content-free evidence and expires after 72 hours; it is not a provider meter or proof that a control exists. If sufficient external enforcement is unavailable, stay restricted/paid-off rather than adding an unapproved accounting service. No key, provider account or paid refusal check was exercised locally.
