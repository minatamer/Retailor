import { CapabilitiesSchema, API_ROUTES } from "@retailor/contracts/api";
import {
  ShopifySessionInputSchema,
  ShopifySessionResultSchema,
  ShopifyControlSchema,
  ShopifyStatusSchema,
  ShopifyConnectSchema,
  ShopifyAuthorizeSchema,
  ShopifySimulationSchema,
  ShopifyCallbackSchema,
  ShopifyBrowseSchema,
  ShopifyProductsResultSchema,
  ShopifyExportInputSchema,
  ShopifyExportControlSchema,
  ShopifyExportResultSchema,
} from "@retailor/contracts/shopify";
import type {
  ShopifySessionInput,
  ShopifyConnect,
  ShopifyExportInput,
} from "@retailor/contracts/shopify";
import { readApiJson } from "../../http/response";
import { ApiRequestError } from "../../http/api-error";

export type ShopifyRequester = ReturnType<typeof shopifyRequester>;
export function shopifyRequester(fetcher: typeof fetch = fetch) {
  type Operation =
    | "session"
    | "status"
    | "connect"
    | "simulate"
    | "products"
    | "export"
    | "update"
    | "check"
    | "remove"
    | "disconnect"
    | "end";
  const json = async (
    operation: Operation | "config",
    signal: AbortSignal,
    body?: object,
    proof?: string,
  ) => {
    const path =
      operation === "config" ? "config" : (`shopify/${operation}` as const);
    const policy = API_ROUTES[path],
      owner = new AbortController(),
      timer = setTimeout(() => owner.abort(), policy.timeoutMs);
    const combined = AbortSignal.any([signal, owner.signal]);
    try {
      const encoded = body ? JSON.stringify(body) : undefined;
      if (
        encoded &&
        new TextEncoder().encode(encoded).byteLength > policy.bodyLimit
      )
        throw new ApiRequestError("TOO_LARGE");
      const response = await fetcher(`/api/retailor/v1/${path}`, {
        method: policy.method,
        credentials: "same-origin",
        cache: "no-store",
        redirect: "error",
        signal: combined,
        ...(encoded
          ? {
              body: encoded,
              headers: {
                "Content-Type": "application/json",
                ...(proof ? { "x-retailor-shopify-tab": proof } : {}),
              },
            }
          : {}),
      });
      return await readApiJson(response, policy.responseLimit, combined, true);
    } catch (error) {
      if (owner.signal.aborted && !signal.aborted)
        throw new ApiRequestError("DEADLINE");
      throw error;
    } finally {
      clearTimeout(timer);
      owner.abort();
    }
  };
  const control = (workspaceId: string) =>
    ShopifyControlSchema.parse({ schemaVersion: 1, workspaceId });
  return {
    async available(signal: AbortSignal) {
      return CapabilitiesSchema.parse(await json("config", signal)).shopify
        .available;
    },
    async session(input: ShopifySessionInput, signal: AbortSignal) {
      return ShopifySessionResultSchema.parse(
        await json("session", signal, ShopifySessionInputSchema.parse(input)),
      );
    },
    async status(workspaceId: string, proof: string, signal: AbortSignal) {
      return ShopifyStatusSchema.parse(
        await json("status", signal, control(workspaceId), proof),
      );
    },
    async connect(input: ShopifyConnect, proof: string, signal: AbortSignal) {
      return ShopifyAuthorizeSchema.parse(
        await json("connect", signal, ShopifyConnectSchema.parse(input), proof),
      );
    },
    async simulate(
      workspaceId: string,
      approved: boolean,
      proof: string,
      signal: AbortSignal,
    ) {
      return ShopifyCallbackSchema.parse(
        await json(
          "simulate",
          signal,
          ShopifySimulationSchema.parse({ ...control(workspaceId), approved }),
          proof,
        ),
      );
    },
    async products(
      workspaceId: string,
      cursor: string | null,
      proof: string,
      signal: AbortSignal,
    ) {
      return ShopifyProductsResultSchema.parse(
        await json(
          "products",
          signal,
          ShopifyBrowseSchema.parse({ ...control(workspaceId), cursor }),
          proof,
        ),
      );
    },
    async write(
      input: ShopifyExportInput,
      update: boolean,
      proof: string,
      signal: AbortSignal,
    ) {
      return ShopifyExportResultSchema.parse(
        await json(
          update ? "update" : "export",
          signal,
          ShopifyExportInputSchema.parse(input),
          proof,
        ),
      );
    },
    async check(
      workspaceId: string,
      exportId: string,
      proof: string,
      signal: AbortSignal,
    ) {
      return ShopifyExportResultSchema.parse(
        await json(
          "check",
          signal,
          ShopifyExportControlSchema.parse({
            ...control(workspaceId),
            exportId,
          }),
          proof,
        ),
      );
    },
    async remove(
      workspaceId: string,
      exportId: string,
      proof: string,
      signal: AbortSignal,
    ) {
      return ShopifyStatusSchema.parse(
        await json(
          "remove",
          signal,
          ShopifyExportControlSchema.parse({
            ...control(workspaceId),
            exportId,
          }),
          proof,
        ),
      );
    },
    async end(
      workspaceId: string,
      disconnect: boolean,
      proof: string,
      signal: AbortSignal,
    ) {
      return ShopifyStatusSchema.parse(
        await json(
          disconnect ? "disconnect" : "end",
          signal,
          control(workspaceId),
          proof,
        ),
      );
    },
  };
}
