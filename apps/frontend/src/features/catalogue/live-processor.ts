import { CapabilitiesSchema } from "@retailor/contracts/api";
import {
  AdmissionResultSchema,
  RecognitionResultSchema,
  parseCatalogueAction,
  DISCLOSURE_VERSION,
  RECOGNITION_LIMITS,
} from "@retailor/contracts/recognition";
import { parseDraft } from "@retailor/contracts/catalogue";
import type { CatalogueProcessor } from "../session/controller";
import { ApiRequestError } from "../../http/api-error";
import { readApiJson } from "../../http/response";

export function liveProcessor(
  proof: (siteKey: string, signal: AbortSignal) => Promise<string>,
  fetcher: typeof fetch = fetch,
): CatalogueProcessor {
  const json = async (
    route: string,
    signal: AbortSignal,
    body?: unknown,
    timeout = 10_000,
  ) => {
    const owned = new AbortController(),
      timer = setTimeout(() => owned.abort(), timeout);
    const combined = AbortSignal.any([signal, owned.signal]);
    try {
      const response = await fetcher(`/api/retailor/v1/${route}`, {
        method: body ? "POST" : "GET",
        signal: combined,
        credentials: "same-origin",
        cache: "no-store",
        redirect: "error",
        ...(body
          ? {
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body),
            }
          : {}),
      });
      return await readApiJson(response, 8192, combined);
    } finally {
      clearTimeout(timer);
      owned.abort();
    }
  };
  return {
    mode: "live",
    async interpret(input) {
      const config = CapabilitiesSchema.parse(
        await json("config", input.signal),
      );
      if (
        config.mode !== "live" ||
        !config.paidEnabled ||
        !config.vision.available ||
        !config.admissionSiteKey
      )
        throw new ApiRequestError("UNAVAILABLE");
      const action = parseCatalogueAction({
        schemaVersion: 1,
        action: "catalogue",
        mode: "live",
        workspaceId: input.workspaceId,
        operationId: input.operationId,
        inputRevision: input.inputRevision,
        createdAt: input.createdAt,
        expiresAt: input.expiresAt,
        disclosureVersion: DISCLOSURE_VERSION,
        photos: input.photos,
      });
      if (
        new TextEncoder().encode(JSON.stringify(action)).length >
        RECOGNITION_LIMITS.metadata - 4096
      )
        throw new ApiRequestError("TOO_LARGE");
      input.step("Approving this request");
      const challengeProof = await proof(config.admissionSiteKey, input.signal);
      input.signal.throwIfAborted();
      const admission = AdmissionResultSchema.parse(
        await json("admission", input.signal, { action, challengeProof }),
      );
      if (
        admission.operationId !== action.operationId ||
        Date.parse(admission.expiresAt) <= Date.now()
      )
        throw new ApiRequestError("STALE");
      const form = new FormData();
      form.append(
        "manifest",
        JSON.stringify({ action, grant: admission.grant }),
      );
      for (const photo of action.photos) {
        const blob = input.derivatives.get(photo.id);
        if (
          !blob ||
          blob.size !== photo.derivative.bytes ||
          blob.type !== photo.derivative.mime
        )
          throw new ApiRequestError("INVALID_INPUT");
        form.append(photo.id, blob, "preview");
      }
      input.step("Drafting products");
      const owned = new AbortController(),
        timer = setTimeout(() => owned.abort(), 135_000);
      const combined = AbortSignal.any([input.signal, owned.signal]);
      try {
        const response = await fetcher("/api/retailor/v1/catalogue/interpret", {
          method: "POST",
          body: form,
          signal: combined,
          credentials: "same-origin",
          redirect: "error",
          cache: "no-store",
        });
        input.step("Validating catalogue");
        const result = RecognitionResultSchema.parse(
          await readApiJson(response, RECOGNITION_LIMITS.response, combined),
        );
        if (
          result.workspaceId !== action.workspaceId ||
          result.operationId !== action.operationId ||
          result.inputRevision !== action.inputRevision
        )
          throw new ApiRequestError("STALE");
        return parseDraft(result.draft);
      } finally {
        clearTimeout(timer);
        owned.abort();
      }
    },
  };
}
