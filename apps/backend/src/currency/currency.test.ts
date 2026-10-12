import { afterEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { FxSnapshotSchema, FX_LIMITS } from "@retailor/contracts/currency";
import {
  ecbCurrency,
  ECB_PAIR_URL,
  parseEcbResponse,
  fixtureCurrency,
} from "./provider.js";
import { CurrencyService } from "./service.js";
import { composeRuntime } from "../runtime/compose.js";
import { parseEnvironment } from "../config/environment.js";
import { createApp } from "../http/app.js";
const at = Date.parse("2026-10-12T08:00:00.000Z");
const quote = () =>
  FxSnapshotSchema.parse({
    schemaVersion: 1,
    snapshotId: "fx_test",
    base: "USD",
    quote: "EUR",
    rateDecimal: "0.5",
    rateDate: "2026-10-09",
    fetchedAt: new Date(at).toISOString(),
    sourceId: "frankfurter-ecb-v2",
  });
afterEach(() => vi.useRealTimers());
describe("fixed bounded independent public reference data", () => {
  it("preserves the upstream decimal lexeme and rejects malformed source/pair/date", () => {
    const raw =
      '{"date":"2026-10-09","base":"USD","quote":"EUR","rate":0.123456789012345678}';
    expect(parseEcbResponse(raw, at).rateDecimal).toBe("0.123456789012345678");
    for (const patch of [
      { base: "EUR" },
      { quote: "JPY" },
      { date: "2026-10-13" },
      { rate: 0 },
      { rate: "0.5" },
      { extra: true },
    ])
      expect(() =>
        parseEcbResponse(
          JSON.stringify({
            date: "2026-10-09",
            base: "USD",
            quote: "EUR",
            rate: 0.5,
            ...patch,
          }),
          at,
        ),
      ).toThrow();
  });
  it("uses only the fixed ECB destination and never forwards visitor data or follows redirects", async () => {
    const fetcher = vi.fn<typeof fetch>(
      async () =>
        new Response(
          '{"date":"2026-10-09","base":"USD","quote":"EUR","rate":0.89238}',
          { headers: { "Content-Type": "application/json; charset=utf-8" } },
        ),
    );
    const provider = ecbCurrency(fetcher, () => at);
    expect(fetcher).not.toHaveBeenCalled();
    const result = await provider(new AbortController().signal);
    expect(result.sourceId).toBe("frankfurter-ecb-v2");
    expect(result.rateDate).toBe("2026-10-09");
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0]![0]).toBe(ECB_PAIR_URL);
    expect(fetcher.mock.calls[0]![1]).toEqual({
      method: "GET",
      headers: { Accept: "application/json" },
      redirect: "error",
      signal: expect.any(AbortSignal),
    });
  });
  it("enforces declared and actual byte limits, MIME/status and stopped inputs", async () => {
    for (const response of [
      new Response("{}", {
        status: 302,
        headers: {
          "Content-Type": "application/json",
          Location: "https://foreign.example",
        },
      }),
      new Response("{}", { headers: { "Content-Type": "text/html" } }),
      new Response("{}", {
        headers: {
          "Content-Type": "application/json",
          "Content-Length": "8193",
        },
      }),
      new Response(" ".repeat(8193), {
        headers: { "Content-Type": "application/json" },
      }),
    ]) {
      await expect(
        ecbCurrency(
          async () => response,
          () => at,
        )(new AbortController().signal),
      ).rejects.toThrow();
    }
    const fetcher = vi.fn<typeof fetch>(),
      controller = new AbortController();
    controller.abort();
    await expect(ecbCurrency(fetcher)(controller.signal)).rejects.toThrow();
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("coalesces one refresh, retains a 15-minute validated cache and makes no automatic request", async () => {
    let now = at,
      release = (_value: ReturnType<typeof quote>) => {};
    const deferred = new Promise<ReturnType<typeof quote>>((resolve) => {
      release = resolve;
    });
    const provider = vi.fn(async () => deferred),
      service = new CurrencyService(provider, false, () => now);
    const first = service.quote(),
      second = service.quote();
    await Promise.resolve();
    expect(provider).toHaveBeenCalledTimes(1);
    release(quote());
    expect((await first).snapshotId).toBe((await second).snapshotId);
    now += FX_LIMITS.cacheMs - 1;
    await service.quote();
    expect(provider).toHaveBeenCalledTimes(1);
    now++;
    await service.quote();
    expect(provider).toHaveBeenCalledTimes(2);
  });
  it("bounds timeout and cooldown while retaining a non-cooperating upstream slot until actual settlement", async () => {
    vi.useFakeTimers();
    let now = at,
      release = (_value: ReturnType<typeof quote>) => {};
    const deferred = new Promise<ReturnType<typeof quote>>((resolve) => {
      release = resolve;
    });
    const provider = vi
      .fn()
      .mockImplementationOnce(async () => deferred)
      .mockImplementation(async () => quote());
    const service = new CurrencyService(provider, false, () => now),
      pending = service.quote();
    const failure = expect(pending).rejects.toMatchObject({
      code: "DEADLINE",
      status: 504,
    });
    await vi.advanceTimersByTimeAsync(FX_LIMITS.timeoutMs);
    await failure;
    await expect(service.quote()).rejects.toMatchObject({
      code: "UNAVAILABLE",
    });
    now += FX_LIMITS.timeoutMs + FX_LIMITS.failureMs;
    await expect(service.quote()).rejects.toMatchObject({
      code: "UNAVAILABLE",
    });
    expect(provider).toHaveBeenCalledTimes(1);
    release(quote());
    await vi.advanceTimersByTimeAsync(0);
    await service.quote();
    expect(provider).toHaveBeenCalledTimes(2);
  });
  it("serves unpaid FX without AI keys/admission and rejects pair/proxy overrides", async () => {
    const paidFactory = vi.fn(() => {
      throw new Error("Paid factory must stay inert");
    });
    const provider = vi.fn(async () => quote());
    const runtime = composeRuntime(
      parseEnvironment({ FAKE_MODE: "false", PAID_DEMO_ENABLED: "false" }),
      () => "req_fx",
      paidFactory,
      () => new CurrencyService(provider, false, () => at),
    );
    const app = createApp(runtime);
    expect(runtime.capabilities.vision.available).toBe(false);
    expect(runtime.capabilities.eur.available).toBe(true);
    await request(app).get("/v1/health");
    await request(app).get("/v1/config");
    expect(provider).not.toHaveBeenCalled();
    expect(
      (await request(app).get("/v1/currency/usd-eur?base=JPY")).status,
    ).toBe(400);
    expect(
      (
        await request(app).get(
          "/v1/currency/usd-eur?url=https://foreign.example",
        )
      ).status,
    ).toBe(400);
    const result = await request(app).get("/v1/currency/usd-eur");
    expect(result.status).toBe(200);
    expect(result.body.rateDecimal).toBe("0.5");
    expect(result.headers["cache-control"]).toBe("no-store");
    expect(provider).toHaveBeenCalledTimes(1);
    expect(paidFactory).not.toHaveBeenCalled();
  });
  it("labels development quotes and rejects them as live instead of selecting a fallback", async () => {
    const fixture = fixtureCurrency(() => at),
      service = new CurrencyService(fixture, true, () => at);
    expect((await service.quote()).sourceId).toBe("development-fixture");
    await expect(
      new CurrencyService(fixture, false, () => at).quote(),
    ).rejects.toMatchObject({ code: "UNAVAILABLE" });
  });
});
