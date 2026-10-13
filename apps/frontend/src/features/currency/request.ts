import { FxSnapshotSchema, FX_LIMITS } from "@retailor/contracts/currency";
import { readApiJson } from "../../http/response";
/** No caller URL, currency pair, prompt, catalogue, cookie header or admission token. */
export async function requestCurrencyQuote(signal: AbortSignal) {
  const response = await fetch("/api/retailor/v1/currency/usd-eur", {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
    signal,
  });
  if (
    !response.ok ||
    !/^application\/json(?:\s*;|$)/iu.test(
      response.headers.get("content-type") ?? "",
    ) ||
    !response.body
  ) {
    await response.body?.cancel();
    throw new Error("Euro pricing unavailable");
  }
  return FxSnapshotSchema.parse(
    await readApiJson(response, FX_LIMITS.responseBytes, signal, true),
  );
}
