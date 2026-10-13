import { PublicErrorSchema } from "@retailor/contracts/api";
import { ApiRequestError } from "./api-error";

/** The feature owns fetch, its deadline and schema. This owns only bounded response consumption. */
export async function readApiJson(
  response: Response,
  limit: number,
  signal: AbortSignal,
  strictUtf8 = false,
): Promise<unknown> {
  const reader = response.body?.getReader();
  if (!reader) throw new ApiRequestError("UPSTREAM_FAILED");
  const abort = () => {
    void reader.cancel().catch(() => undefined);
  };
  signal.addEventListener("abort", abort, { once: true });
  try {
    signal.throwIfAborted();
    const bytes = new Uint8Array(limit);
    let size = 0,
      chunks = 0;
    for (;;) {
      const next = await reader.read();
      signal.throwIfAborted();
      if (next.done) break;
      chunks += 1;
      if (chunks > 2 * limit + 1 || next.value.byteLength > limit - size) {
        abort();
        throw new ApiRequestError("UPSTREAM_FAILED");
      }
      bytes.set(next.value, size);
      size += next.value.byteLength;
    }
    const parsed: unknown = JSON.parse(
      new TextDecoder("utf-8", { fatal: strictUtf8 }).decode(
        bytes.subarray(0, size),
      ),
    );
    if (!response.ok) {
      const error = PublicErrorSchema.safeParse(parsed);
      throw new ApiRequestError(
        error.success ? error.data.error.code : "UPSTREAM_FAILED",
      );
    }
    return parsed;
  } catch (error) {
    abort();
    signal.throwIfAborted();
    if (error instanceof ApiRequestError) throw error;
    throw new ApiRequestError("UPSTREAM_FAILED");
  } finally {
    signal.removeEventListener("abort", abort);
    reader.releaseLock();
  }
}
