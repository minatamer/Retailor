import { createHash } from "node:crypto";
import { z } from "zod";
import { FxSnapshotSchema, FX_LIMITS } from "@retailor/contracts/currency";
import type { FxSnapshot } from "@retailor/contracts/currency";
import { parseRate, validateSnapshot } from "@retailor/commerce/currency";
export const ECB_PAIR_URL =
  "https://api.frankfurter.dev/v2/providers/ecb/rate/usd/eur";
export type CurrencyProvider = (signal: AbortSignal) => Promise<FxSnapshot>;
const PairSchema = z.strictObject({
  date: z.iso.date(),
  base: z.literal("USD"),
  quote: z.literal("EUR"),
  rate: z.number(),
});
function snapshot(
  rateDecimal: string,
  rateDate: string,
  now: number,
  sourceId: FxSnapshot["sourceId"],
) {
  const decimal = parseRate(rateDecimal).decimal;
  const snapshotId = `fx_${createHash("sha256").update(`${sourceId}:${rateDate}:${decimal}`).digest("hex").slice(0, 40)}`;
  return validateSnapshot(
    FxSnapshotSchema.parse({
      schemaVersion: 1,
      snapshotId,
      base: "USD",
      quote: "EUR",
      rateDecimal: decimal,
      rateDate,
      fetchedAt: new Date(now).toISOString(),
      sourceId,
    }),
    now,
    sourceId === "development-fixture",
  );
}
/** Node 24's reviver context retains the JSON number lexeme, even when its Number would round. */
export function parseEcbResponse(text: string, now: number) {
  if (Buffer.byteLength(text, "utf8") > FX_LIMITS.responseBytes)
    throw new RangeError("Reference response exceeds limit");
  let decimal: string | undefined;
  const parsed: unknown = JSON.parse(
    text,
    (key, value: unknown, ...extra: unknown[]) => {
      const context = extra[0];
      if (
        key === "rate" &&
        typeof value === "number" &&
        context &&
        typeof context === "object" &&
        "source" in context &&
        typeof context.source === "string"
      )
        decimal = context.source;
      return value;
    },
  );
  const pair = PairSchema.parse(parsed);
  if (!decimal) throw new RangeError("Exact reference decimal unavailable");
  return snapshot(decimal, pair.date, now, "frankfurter-ecb-v2");
}
export function ecbCurrency(
  fetcher: typeof fetch = fetch,
  clock = Date.now,
): CurrencyProvider {
  return async (signal) => {
    signal.throwIfAborted();
    const response = await fetcher(ECB_PAIR_URL, {
      method: "GET",
      headers: { Accept: "application/json" },
      redirect: "error",
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
      throw new Error("Reference unavailable");
    }
    const length = response.headers.get("content-length");
    if (
      length &&
      (!/^\d+$/u.test(length) || Number(length) > FX_LIMITS.responseBytes)
    ) {
      await response.body.cancel();
      throw new RangeError("Reference response exceeds limit");
    }
    const reader = response.body.getReader(),
      bytes = new Uint8Array(FX_LIMITS.responseBytes);
    let size = 0,
      reads = 0;
    const abort = () => {
      void reader.cancel().catch(() => undefined);
    };
    signal.addEventListener("abort", abort, { once: true });
    try {
      for (;;) {
        signal.throwIfAborted();
        // A byte limit alone cannot bound retained empty chunks or a hot empty stream.
        if (++reads > FX_LIMITS.responseBytes * 2 + 1) {
          await reader.cancel();
          throw new RangeError("Reference response exceeds chunk limit");
        }
        const next = await reader.read();
        signal.throwIfAborted();
        if (next.done) break;
        if (size + next.value.byteLength > FX_LIMITS.responseBytes) {
          await reader.cancel();
          throw new RangeError("Reference response exceeds limit");
        }
        bytes.set(next.value, size);
        size += next.value.byteLength;
      }
    } finally {
      signal.removeEventListener("abort", abort);
      reader.releaseLock();
    }
    return parseEcbResponse(
      new TextDecoder("utf-8", { fatal: true }).decode(bytes.subarray(0, size)),
      clock(),
    );
  };
}
export function fixtureCurrency(clock = Date.now): CurrencyProvider {
  return async (signal) => {
    signal.throwIfAborted();
    const now = clock();
    return snapshot(
      "0.9",
      new Date(now).toISOString().slice(0, 10),
      now,
      "development-fixture",
    );
  };
}
