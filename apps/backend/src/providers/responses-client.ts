import OpenAI from "openai";
import { boundedBytes } from "../security/bounded.js";
import { deny } from "../security/errors.js";
/** Fixed foreground Responses transport with explicit credentials and bounded untrusted response bytes. */
export function responsesClient(
  apiKey: string,
  responseBytes: number,
  timeoutMs: number,
  fetcher: typeof fetch = fetch,
) {
  return new OpenAI({
    apiKey,
    baseURL: "https://api.openai.com/v1",
    organization: null,
    project: null,
    maxRetries: 0,
    timeout: timeoutMs,
    logLevel: "off",
    fetchOptions: { redirect: "error" },
    fetch: async (url, init) => {
      if (String(url) !== "https://api.openai.com/v1/responses")
        return deny("UPSTREAM_FAILED", 502);
      const response = await fetcher(url, { ...init, redirect: "error" });
      const bytes = await boundedBytes(
        response,
        responseBytes,
        init?.signal ?? AbortSignal.abort(),
      );
      return new Response(bytes, {
        status: response.status,
        headers: { "Content-Type": "application/json" },
      });
    },
  });
}
