import {
  LOGO_LIMITS,
  LogoRequestSchema,
  LogoResultSchema,
  parseLogoAction,
  type LogoContext,
  type LogoResult,
} from "@retailor/contracts/brand";
import { CapabilitiesSchema } from "@retailor/contracts/api";
import { AdmissionResultSchema } from "@retailor/contracts/recognition";
import { ApiRequestError } from "../../http/api-error";
import { readApiJson } from "../../http/response";
export interface LogoInput {
  mode: "fake" | "live";
  workspaceId: string;
  operationId: string;
  createdAt: string;
  expiresAt: string;
  context: LogoContext;
}
export type LogoRequester = (
  input: LogoInput,
  signal: AbortSignal,
  dispatched: () => void,
) => Promise<LogoResult>;
export function logoRequester(
  proof?: (siteKey: string, signal: AbortSignal) => Promise<string>,
  fetcher: typeof fetch = fetch,
): LogoRequester {
  return async (input, signal, dispatched) => {
    const owner = new AbortController(),
      timer = setTimeout(() => owner.abort(), LOGO_LIMITS.browserMs),
      owned = AbortSignal.any([signal, owner.signal]);
    const json = async (route: string, body?: unknown, limit = 8192) => {
      owned.throwIfAborted();
      if (route === "brand/logos") dispatched();
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
      const config = CapabilitiesSchema.parse(await json("config"));
      if (config.mode !== input.mode || !config.logos.available)
        throw new ApiRequestError("UNAVAILABLE");
      let action = null,
        grant = null;
      if (input.mode === "live") {
        if (!config.paidEnabled || !config.admissionSiteKey || !proof)
          throw new ApiRequestError("UNAVAILABLE");
        const hash = await crypto.subtle.digest(
          "SHA-256",
          new TextEncoder().encode(input.context.name),
        );
        action = parseLogoAction({
          schemaVersion: 1,
          action: "logos",
          mode: "live",
          workspaceId: input.workspaceId,
          operationId: input.operationId,
          createdAt: input.createdAt,
          expiresAt: input.expiresAt,
          nameDigest: Array.from(new Uint8Array(hash), (b) =>
            b.toString(16).padStart(2, "0"),
          ).join(""),
          theme: input.context.theme,
          typography: input.context.typography,
          designRevision: input.context.designRevision,
          count: 3,
          promptPolicy: "clothing-brand-v1",
          outputPolicy: "transparent-png-v1",
          disclosureVersion: "brand-context-v1",
        });
        const challengeProof = await proof(config.admissionSiteKey, owned),
          admission = AdmissionResultSchema.parse(
            await json("admission", { action, challengeProof }),
          );
        if (
          admission.operationId !== input.operationId ||
          Date.parse(admission.expiresAt) <= Date.now()
        )
          throw new ApiRequestError("FORBIDDEN");
        grant = admission.grant;
      }
      const body = LogoRequestSchema.parse({
        schemaVersion: 1,
        ...input,
        action,
        grant,
      });
      if (
        new TextEncoder().encode(JSON.stringify(body)).length >
        LOGO_LIMITS.bodyBytes
      )
        throw new ApiRequestError("TOO_LARGE");
      const result = LogoResultSchema.parse(
        await json("brand/logos", body, LOGO_LIMITS.responseBytes),
      );
      if (
        result.operationId !== input.operationId ||
        result.workspaceId !== input.workspaceId ||
        result.mode !== input.mode ||
        JSON.stringify(result.context) !== JSON.stringify(body.context)
      )
        throw new ApiRequestError("UPSTREAM_FAILED");
      return result;
    } finally {
      clearTimeout(timer);
      owner.abort();
    }
  };
}
