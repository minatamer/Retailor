import { describe, it, expect, vi } from "vitest";
import { forward, parseBridgeConfig } from "./bridge";
const config = parseBridgeConfig({ APP_ENV: "test" });
function ports() {
  return {
    fetch: vi.fn<typeof fetch>(async () =>
      Response.json({ schemaVersion: 1, ready: true, mode: "fake" }),
    ),
    authorization: vi.fn(
      async (_audience: string, _signal: AbortSignal) => "Bearer identity",
    ),
    requestId: () => "req_test",
  };
}
describe("fixed bounded private bridge", () => {
  it("validates the fixed public quote and rejects currency query overrides without fetching", async () => {
    const io = ports();
    io.fetch.mockResolvedValue(
      Response.json({
        schemaVersion: 1,
        snapshotId: "fx_test",
        base: "USD",
        quote: "EUR",
        rateDecimal: "0.5",
        rateDate: "2026-10-09",
        fetchedAt: "2026-10-12T08:00:00.000Z",
        sourceId: "frankfurter-ecb-v2",
      }),
    );
    const good = await forward(
      new Request("http://x/api/retailor/v1/currency/usd-eur"),
      "currency/usd-eur",
      config,
      io,
    );
    expect(good.status).toBe(200);
    expect((await good.json()).quote).toBe("EUR");
    expect(io.fetch.mock.calls[0]![0]).toBe(
      "http://127.0.0.1:4311/v1/currency/usd-eur",
    );
    const overridden = await forward(
      new Request(
        "http://x/api/retailor/v1/currency/usd-eur?url=https://foreign.example",
      ),
      "currency/usd-eur",
      config,
      io,
    );
    expect(overridden.status).toBe(400);
    expect(io.fetch).toHaveBeenCalledTimes(1);
    io.fetch.mockResolvedValue(Response.json({ unexpected: true }));
    expect(
      (
        await forward(
          new Request("http://x/api/retailor/v1/currency/usd-eur"),
          "currency/usd-eur",
          config,
          io,
        )
      ).status,
    ).toBe(502);
  });
  it("forwards only a bounded safety cookie on admitted writes and reissues fixed attributes", async () => {
    const io = ports(),
      cookie = `retailor_safety=abc.${"a".repeat(64)}`;
    io.fetch.mockResolvedValue(
      Response.json(
        {
          schemaVersion: 1,
          operationId: "operation",
          grant: "grant",
          expiresAt: "2026-10-11T22:00:00.000Z",
        },
        { headers: { "Set-Cookie": `${cookie}; Path=/; Domain=evil.example` } },
      ),
    );
    const result = await forward(
      new Request("http://x", {
        method: "POST",
        headers: {
          Origin: config.FRONTEND_ORIGIN,
          "Content-Type": "application/json",
          Cookie: `other=private; ${cookie}`,
          Authorization: "Bearer client-secret",
        },
        body: "{}",
      }),
      "admission",
      config,
      io,
    );
    expect(result.status).toBe(200);
    const sent = new Headers(io.fetch.mock.calls[0]![1]!.headers);
    expect(sent.get("cookie")).toBe(cookie);
    expect(sent.has("authorization")).toBe(false);
    expect(result.headers.get("set-cookie")).toBe(
      `${cookie}; Path=/api/retailor/v1; HttpOnly; SameSite=Strict; Max-Age=7200`,
    );
  });
  it("rejects malformed recognition results and arbitrary upstream cookies", async () => {
    for (const path of ["admission", "catalogue/interpret"] as const) {
      const io = ports();
      io.fetch.mockResolvedValue(
        Response.json(
          { arbitrary: "unsafe" },
          { headers: { "Set-Cookie": "other=secret" } },
        ),
      );
      const result = await forward(
        new Request("http://x", {
          method: "POST",
          headers: {
            Origin: config.FRONTEND_ORIGIN,
            "Content-Type":
              path === "admission"
                ? "application/json"
                : "multipart/form-data; boundary=x",
          },
          body: "{}",
        }),
        path,
        config,
        io,
      );
      expect(result.status).toBe(502);
      expect(result.headers.has("set-cookie")).toBe(false);
    }
  });
  it("forwards only the configured target and strips client secrets", async () => {
    const io = ports();
    const result = await forward(
      new Request("http://127.0.0.1:4310/api/retailor/v1/ready", {
        headers: { Authorization: "Bearer hostile", Cookie: "secret" },
      }),
      "ready",
      config,
      io,
    );
    expect(result.status).toBe(200);
    expect(io.fetch.mock.calls[0]?.[0]).toBe("http://127.0.0.1:4311/v1/ready");
    const init = io.fetch.mock.calls[0]?.[1];
    expect(new Headers(init?.headers).has("authorization")).toBe(false);
    expect(new Headers(init?.headers).has("cookie")).toBe(false);
    expect(io.authorization).not.toHaveBeenCalled();
  });
  it("rejects arbitrary paths, method and cross-origin writes before fetch", async () => {
    const io = ports();
    expect(
      (
        await forward(
          new Request("http://x"),
          "https://foreign.example",
          config,
          io,
        )
      ).status,
    ).toBe(404);
    expect(
      (
        await forward(
          new Request("http://x", { method: "POST" }),
          "health",
          config,
          io,
        )
      ).status,
    ).toBe(405);
    expect(
      (
        await forward(
          new Request("http://x", {
            method: "POST",
            headers: {
              origin: "https://foreign.example",
              "content-type": "application/json",
            },
            body: "{}",
          }),
          "admission",
          config,
          io,
        )
      ).status,
    ).toBe(403);
    expect(io.fetch).not.toHaveBeenCalled();
  });
  it("bounds actual upstream bytes and hides failures", async () => {
    const io = ports();
    io.fetch.mockImplementation(
      async () =>
        new Response("x".repeat(9000), {
          headers: { "content-type": "application/json" },
        }),
    );
    expect(
      (await forward(new Request("http://x"), "health", config, io)).status,
    ).toBe(502);
    io.fetch.mockResolvedValue(
      new Response("malformed JSON", {
        headers: { "content-type": "application/json" },
      }),
    );
    expect(
      (await forward(new Request("http://x"), "health", config, io)).status,
    ).toBe(502);
    io.fetch.mockRejectedValue(new Error("private_key_sentinel"));
    const result = await forward(new Request("http://x"), "health", config, io);
    expect(result.status).toBe(503);
    expect(await result.text()).not.toContain("private_key_sentinel");
  });
  it("rejects invalid private production destination", () => {
    expect(() =>
      parseBridgeConfig({
        APP_ENV: "production",
        BACKEND_ORIGIN: "http://127.0.0.1:4311",
      }),
    ).toThrow();
  });
});

it("rejects private fields in public capability output", async () => {
  const io = ports();
  io.fetch.mockImplementation(async () =>
    Response.json({
      schemaVersion: 1,
      mode: "fake",
      paidEnabled: false,
      OPENAI_API_KEY: "private_key_sentinel",
    }),
  );
  const result = await forward(new Request("http://x"), "config", config, io);
  expect(result.status).toBe(502);
  expect(await result.text()).not.toContain("private_key_sentinel");
});
it("authenticates hosted forwarding using the owned abort signal", async () => {
  const io = ports();
  const hosted = parseBridgeConfig({
    APP_ENV: "production",
    FRONTEND_ORIGIN: "https://store.example",
    BACKEND_ORIGIN: "https://backend.example",
    BACKEND_AUDIENCE: "https://backend.example",
  });
  expect(
    (await forward(new Request("https://store.example"), "ready", hosted, io))
      .status,
  ).toBe(200);
  expect(io.authorization.mock.calls[0]?.[0]).toBe(hosted.BACKEND_AUDIENCE);
  expect(io.authorization.mock.calls[0]?.[1]).toBeInstanceOf(AbortSignal);
  expect(
    new Headers(io.fetch.mock.calls[0]?.[1]?.headers).get("authorization"),
  ).toBe("Bearer identity");
});

it("rebuilds upstream public errors from fixed visitor copy", async () => {
  const io = ports();
  io.fetch.mockImplementation(async () =>
    Response.json(
      {
        schemaVersion: 1,
        error: {
          code: "UNAVAILABLE",
          message: "private_key_sentinel",
          requestId: "req_test",
          retry: "deliberate",
        },
      },
      { status: 503 },
    ),
  );
  const result = await forward(new Request("http://x"), "config", config, io);
  expect(result.status).toBe(503);
  expect(await result.text()).not.toContain("private_key_sentinel");
});

it("rejects actual chunked request bytes when the upstream wraps stream errors", async () => {
  const io = ports();
  io.fetch.mockImplementation(async (_url, init) => {
    try {
      await new Response(init?.body).arrayBuffer();
    } catch (error) {
      throw new TypeError("Transport failed", { cause: error });
    }
    return Response.json({});
  });
  const input = new Request("http://x", {
    method: "POST",
    headers: {
      origin: config.FRONTEND_ORIGIN,
      "content-type": "application/json",
    },
    body: "x".repeat(70000),
  });
  const result = await forward(input, "admission", config, io);
  expect(result.status).toBe(413);
  expect((await result.json()).error.code).toBe("TOO_LARGE");
});

it("preserves the response limit category even when upstream cancellation rejects", async () => {
  const io = ports();
  io.fetch.mockImplementation(
    async () =>
      new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(new Uint8Array(9000));
          },
          cancel() {
            throw new Error("Closed upstream");
          },
        }),
        { headers: { "content-type": "application/json" } },
      ),
  );
  expect(
    (await forward(new Request("http://x"), "health", config, io)).status,
  ).toBe(502);
});

it("preserves only the safety identity on every fixed paid operation", async () => {
  const cookie = `retailor_safety=abc.${"a".repeat(64)}`;
  for (const path of [
    "assistant/creator",
    "assistant/shopper",
    "assistant/owner",
    "brand/logos",
  ] as const) {
    const io = ports();
    io.fetch.mockResolvedValue(
      Response.json(
        {
          schemaVersion: 1,
          error: {
            code: "FORBIDDEN",
            message: "untrusted",
            requestId: "req_test",
            retry: "never",
          },
        },
        { status: 403 },
      ),
    );
    const result = await forward(
      new Request("http://x", {
        method: "POST",
        headers: {
          origin: config.FRONTEND_ORIGIN,
          "content-type": "application/json",
          cookie: `other=private; ${cookie}`,
          authorization: "Bearer untrusted",
          "x-forwarded-for": "private",
        },
        body: "{}",
      }),
      path,
      config,
      io,
    );
    expect(result.status).toBe(403);
    const sent = new Headers(io.fetch.mock.calls[0]![1]!.headers);
    expect(sent.get("cookie")).toBe(cookie);
    expect(sent.has("authorization")).toBe(false);
    expect(sent.has("x-forwarded-for")).toBe(false);
    io.fetch.mockClear();
    await forward(
      new Request("http://x", {
        method: "POST",
        headers: {
          origin: config.FRONTEND_ORIGIN,
          "content-type": "application/json",
          cookie: `${cookie}; ${cookie}`,
        },
        body: "{}",
      }),
      path,
      config,
      io,
    );
    expect(new Headers(io.fetch.mock.calls[0]![1]!.headers).has("cookie")).toBe(
      false,
    );
  }
});

it("limits transport before identity/fetch and releases stalled response slots on cancellation", async () => {
  const io = ports();
  io.fetch.mockImplementation(
    async () =>
      new Response(new ReadableStream<Uint8Array>(), {
        headers: { "content-type": "application/json" },
      }),
  );
  const owners = Array.from({ length: 8 }, () => new AbortController());
  const running = owners.map((owner) =>
    forward(
      new Request("http://x", { signal: owner.signal }),
      "ready",
      config,
      io,
    ),
  );
  try {
    await vi.waitFor(() => expect(io.fetch).toHaveBeenCalledTimes(8));
    expect(
      (await forward(new Request("http://x"), "ready", config, io)).status,
    ).toBe(429);
    expect(io.fetch).toHaveBeenCalledTimes(8);
    owners[0]!.abort();
    expect((await running[0]!).status).toBe(504);
    io.fetch.mockResolvedValue(
      Response.json({ schemaVersion: 1, ready: true, mode: "fake" }),
    );
    expect(
      (await forward(new Request("http://x"), "ready", config, io)).status,
    ).toBe(200);
  } finally {
    owners.forEach((owner) => owner.abort());
    await Promise.all(running);
  }
});
