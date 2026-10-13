import {
  ASSISTANT_LIMITS,
  ASSISTANT_DISCLOSURE_VERSION,
  AssistantPayloadSchema,
  AssistantResultSchema,
  AssistantRequestSchema,
  parseAssistantAction,
} from "@retailor/contracts/assistant";
import type {
  AssistantPayload,
  AssistantResult,
} from "@retailor/contracts/assistant";
import { CapabilitiesSchema } from "@retailor/contracts/api";
import { AdmissionResultSchema } from "@retailor/contracts/recognition";
import { ApiRequestError } from "../../http/api-error";
import { readApiJson } from "../../http/response";
export type AssistantRequester = (
  payload: AssistantPayload,
  signal: AbortSignal,
) => Promise<AssistantResult>;
export function assistantRequester(
  proof?: (siteKey: string, signal: AbortSignal) => Promise<string>,
  fetcher: typeof fetch = fetch,
): AssistantRequester {
  return async (input, signal) => {
    const owner = new AbortController(),
      timer = setTimeout(() => owner.abort(), 75000),
      owned = AbortSignal.any([signal, owner.signal]);
    const json = async (route: string, body?: unknown, limit = 8192) => {
      owned.throwIfAborted();
      const response = await fetcher(`/api/retailor/v1/${route}`, {
        method: body ? "POST" : "GET",
        credentials: "same-origin",
        cache: "no-store",
        redirect: "error",
        signal: owned,
        ...(body
          ? {
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body),
            }
          : {}),
      });
      return readApiJson(response, limit, owned);
    };
    try {
      const payload = AssistantPayloadSchema.parse(input),
        config = CapabilitiesSchema.parse(await json("config"));
      if (config.mode !== payload.mode || !config.tailor.available)
        throw new ApiRequestError("UNAVAILABLE");
      let action = null,
        grant = null;
      if (payload.mode === "live") {
        if (!config.paidEnabled || !config.admissionSiteKey || !proof)
          throw new ApiRequestError("UNAVAILABLE");
        const hash = await crypto.subtle.digest(
            "SHA-256",
            new TextEncoder().encode(JSON.stringify(payload)),
          ),
          digest = Array.from(new Uint8Array(hash), (b) =>
            b.toString(16).padStart(2, "0"),
          ).join("");
        const g = payload.context.graph;
        action = parseAssistantAction({
          schemaVersion: 1,
          action: "assistant",
          mode: "live",
          role: payload.context.role,
          workspaceId: g.workspaceId,
          operationId: payload.operationId,
          scenarioId: g.scenarioId,
          dataRevision: g.revision,
          createdAt: g.createdAt,
          expiresAt: g.expiresAt,
          disclosureVersion: ASSISTANT_DISCLOSURE_VERSION,
          digest,
        });
        const challengeProof = await proof(config.admissionSiteKey, owned),
          admission = AdmissionResultSchema.parse(
            await json("admission", { action, challengeProof }),
          );
        if (
          admission.operationId !== payload.operationId ||
          Date.parse(admission.expiresAt) <= Date.now()
        )
          throw new ApiRequestError("FORBIDDEN");
        grant = admission.grant;
      }
      const body = AssistantRequestSchema.parse({ payload, action, grant });
      if (
        new TextEncoder().encode(JSON.stringify(body)).length >
        ASSISTANT_LIMITS.bodyBytes
      )
        throw new ApiRequestError("TOO_LARGE");
      const result = AssistantResultSchema.parse(
        await json(
          `assistant/${payload.context.role}`,
          body,
          ASSISTANT_LIMITS.responseBytes,
        ),
      );
      if (
        result.operationId !== payload.operationId ||
        result.mode !== payload.mode ||
        result.role !== payload.context.role
      )
        throw new ApiRequestError("UPSTREAM_FAILED");
      return result;
    } finally {
      clearTimeout(timer);
      owner.abort();
    }
  };
}
