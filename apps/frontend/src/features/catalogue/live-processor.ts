import { CapabilitiesSchema, PublicErrorSchema } from "@retailor/contracts/api";
import {
  AdmissionResultSchema,
  RecognitionResultSchema,
  parseCatalogueAction,
  DISCLOSURE_VERSION,
  RECOGNITION_LIMITS,
} from "@retailor/contracts/recognition";
import { parseDraft } from "@retailor/contracts/catalogue";
import type { CatalogueProcessor } from "../session/controller";
import { CatalogueRequestError } from "./request-error";

async function readJson(
  response: Response,
  limit: number,
  signal: AbortSignal,
): Promise<unknown> {
  const reader = response.body?.getReader();
  if (!reader) throw new CatalogueRequestError("UPSTREAM_FAILED");
  const chunks: Uint8Array[] = [];
  let size = 0;
  const abort = () => {
    void reader.cancel().catch(() => undefined);
  };
  signal.addEventListener("abort", abort, { once: true });
  try {
    signal.throwIfAborted();
    for (;;) {
      const next = await reader.read();
      signal.throwIfAborted();
      if (next.done) break;
      size += next.value.length;
      if (size > limit) {
        await reader.cancel();
        throw new CatalogueRequestError("UPSTREAM_FAILED");
      }
      chunks.push(next.value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    const result: unknown = JSON.parse(new TextDecoder().decode(bytes));
    if (!response.ok) {
      const error = PublicErrorSchema.safeParse(result);
      throw new CatalogueRequestError(
        error.success ? error.data.error.code : "UPSTREAM_FAILED",
      );
    }
    return result;
  } finally {
    signal.removeEventListener("abort", abort);
    reader.releaseLock();
  }
}
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
      return await readJson(response, 8192, combined);
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
        throw new CatalogueRequestError("UNAVAILABLE");
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
        throw new CatalogueRequestError("TOO_LARGE");
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
        throw new CatalogueRequestError("STALE");
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
          throw new CatalogueRequestError("INVALID_INPUT");
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
          await readJson(response, RECOGNITION_LIMITS.response, combined),
        );
        if (
          result.workspaceId !== action.workspaceId ||
          result.operationId !== action.operationId ||
          result.inputRevision !== action.inputRevision
        )
          throw new CatalogueRequestError("STALE");
        return parseDraft(result.draft);
      } finally {
        clearTimeout(timer);
        owned.abort();
      }
    },
  };
}
