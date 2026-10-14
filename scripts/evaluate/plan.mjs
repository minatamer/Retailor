import {
  CATALOGUE_MODEL,
  CATALOGUE_PROMPT_VERSION,
} from "../../apps/backend/src/catalogue/provider.js";
import {
  ASSISTANT_MODEL,
  ASSISTANT_PROMPT_VERSION,
} from "../../apps/backend/src/providers/assistant.js";
import { LOGO_MODEL } from "../../apps/backend/src/providers/logos.js";
import { RECOGNITION_LIMITS } from "@retailor/contracts/recognition";
import { ASSISTANT_LIMITS } from "@retailor/contracts/assistant";
import { LOGO_LIMITS } from "@retailor/contracts/brand";
export const LIVE_CASES = Object.freeze([
  { id: "catalogue_sample", capability: "catalogue", inputCount: 19 },
  { id: "catalogue_upload_subset", capability: "catalogue", inputCount: 3 },
  { id: "shopper_category", capability: "assistant", role: "shopper" },
  { id: "shopper_eur_budget", capability: "assistant", role: "shopper" },
  { id: "shopper_unknown_material", capability: "assistant", role: "shopper" },
  { id: "creator_summary", capability: "assistant", role: "creator" },
  { id: "owner_loss_summary", capability: "assistant", role: "owner" },
  { id: "owner_photo_form", capability: "assistant", role: "owner" },
  { id: "shopper_unsupported_tour", capability: "assistant", role: "shopper" },
  { id: "logos_optional", capability: "logos", optional: true, outputCount: 3 },
]);
export function evaluationPlan(candidate, assets) {
  if (!/^[a-f0-9]{40}$/u.test(candidate))
    throw new Error("Invalid candidate revision");
  const catalogue = LIVE_CASES.filter(
    (c) => c.capability === "catalogue",
  ).length;
  const assistant = LIVE_CASES.filter(
    (c) => c.capability === "assistant",
  ).length;
  const logos = LIVE_CASES.filter((c) => c.capability === "logos").length;
  return {
    schemaVersion: 1,
    candidate,
    paidAuthorized: false,
    liveAcceptance: "pending",
    execution: "canonical-demo-with-real-admission-and-human-review",
    models: {
      catalogue: CATALOGUE_MODEL,
      assistant: ASSISTANT_MODEL,
      logos: LOGO_MODEL,
    },
    policies: {
      catalogue: CATALOGUE_PROMPT_VERSION,
      assistant: ASSISTANT_PROMPT_VERSION,
      retries: 0,
      store: false,
      tier: "default",
      logos: "clothing-brand-v1/transparent-png-v1",
    },
    inventory: LIVE_CASES,
    maximum: {
      catalogueBatches: catalogue,
      assistantTurns: assistant,
      logoBatches: logos,
      providerRequests:
        catalogue + assistant * ASSISTANT_LIMITS.modelRequests + logos,
      catalogueOutputTokens: catalogue * RECOGNITION_LIMITS.outputTokens,
      assistantOutputTokens:
        assistant *
        ASSISTANT_LIMITS.modelRequests *
        ASSISTANT_LIMITS.outputTokens,
      logoImages: logos * LOGO_LIMITS.count,
    },
    limits: {
      catalogue: RECOGNITION_LIMITS,
      assistant: ASSISTANT_LIMITS,
      logos: LOGO_LIMITS,
    },
    cost: {
      measuredMicroUsd: null,
      actualVisionInputTokens: "pending",
      actualLogoOutputEnvelope: "pending",
      optionalLogoApprovable: false,
      basis:
        "docs/operations/PROVIDERS.md — 13 October 2026 official prices; account and usage unverified",
    },
    assets,
    releasePrerequisites: [
      "owner-paid-budget-and-cases",
      "account-model-capability",
      "retention-policy",
      "real-challenge-and-secret-configuration",
      "actual-live-quality-and-usage",
      "Linux-images",
      "hosted-IAM-origin-domain-capacity",
      "owner-device-quality",
    ],
  };
}
