import { deny } from "./errors.js";

export async function boundedBytes(
  response: Response,
  limit: number,
  signal: AbortSignal,
) {
  if (!response.body) return new Uint8Array();
  const reader = response.body.getReader();
  const abort = () => {
    void reader.cancel().catch(() => undefined);
  };
  signal.addEventListener("abort", abort, { once: true });
  const bytes = new Uint8Array(limit);
  let size = 0;
  try {
    signal.throwIfAborted();
    for (;;) {
      const part = await reader.read();
      signal.throwIfAborted();
      if (part.done) break;
      size += part.value.byteLength;
      if (size > limit) {
        await reader.cancel().catch(() => undefined);
        return deny("UPSTREAM_FAILED", 502);
      }
      bytes.set(part.value, size - part.value.byteLength);
    }
    return bytes.subarray(0, size);
  } finally {
    signal.removeEventListener("abort", abort);
    reader.releaseLock();
  }
}
