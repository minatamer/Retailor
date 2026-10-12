import OpenAI from "openai";
import { boundedBytes } from "../security/bounded.js";
import { deny } from "../security/errors.js";
import { LOGO_LIMITS } from "@retailor/contracts/brand";
/** Explicit Image API transport. No default/environment credential lookup, redirects or SDK retries. */
export function imagesClient(apiKey: string, fetcher: typeof fetch = fetch) {
  return new OpenAI({
    apiKey,
    baseURL: "https://api.openai.com/v1",
    organization: null,
    project: null,
    maxRetries: 0,
    timeout: LOGO_LIMITS.providerMs,
    logLevel: "off",
    fetchOptions: { redirect: "error" },
    fetch: async (url, init) => {
      if (String(url) !== "https://api.openai.com/v1/images/generations")
        return deny("UPSTREAM_FAILED", 502);
      const response = await fetcher(url, { ...init, redirect: "error" });
      const bytes = await boundedBytes(
        response,
        LOGO_LIMITS.responseBytes,
        init?.signal ?? AbortSignal.abort(),
      );
      return new Response(bytes, {
        status: response.status,
        headers: { "Content-Type": "application/json" },
      });
    },
  });
}
