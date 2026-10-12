import { FxSnapshotSchema, FX_LIMITS } from "@retailor/contracts/currency";
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
  const reader = response.body.getReader(),
    chunks: Uint8Array[] = [];
  let size = 0;
  const abort = () => {
    void reader.cancel().catch(() => undefined);
  };
  signal.addEventListener("abort", abort, { once: true });
  try {
    for (;;) {
      signal.throwIfAborted();
      const next = await reader.read();
      signal.throwIfAborted();
      if (next.done) break;
      size += next.value.byteLength;
      if (size > FX_LIMITS.responseBytes) {
        await reader.cancel();
        throw new Error("Euro pricing unavailable");
      }
      chunks.push(next.value);
    }
  } finally {
    signal.removeEventListener("abort", abort);
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return FxSnapshotSchema.parse(
    JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)),
  );
}
