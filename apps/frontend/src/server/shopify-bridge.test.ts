import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { forward, parseBridgeConfig } from "./bridge";
import { backendRequest } from "./backend.server";
const config = parseBridgeConfig({ APP_ENV: "test" });
function ports() {
  return {
    fetch: vi.fn<typeof fetch>(),
    authorization: vi.fn(async () => "Bearer private-runtime"),
    requestId: () => "req_shopify",
  };
}
describe("fixed Shopify private bridge", () => {
  it("forwards only the fixed signed webhook protocol through private IAM without browser cookies", async () => {
    const io = ports();
    const body = '{"shop_id":1,"shop_domain":"test.myshopify.com"}';
    let forwarded = "";
    io.fetch.mockImplementation(async (_url, init) => {
      forwarded = await new Response(init?.body).text();
      return Response.json({ schemaVersion: 1, accepted: true });
    });
    const result = await forward(
      new Request("https://public.example/api/retailor/v1/shopify/webhook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-shopify-topic": "shop/redact",
          "x-shopify-hmac-sha256": "a".repeat(43) + "=",
          "x-shopify-webhook-id": "delivery-1",
          Cookie: `retailor_shopify=${"a".repeat(64)}`,
          "x-retailor-shopify-tab": "b".repeat(64),
        },
        body,
      }),
      "shopify/webhook",
      { ...config, APP_ENV: "production" },
      io,
    );
    expect(result.status).toBe(200);
    expect(forwarded).toBe(body);
    const headers = new Headers(io.fetch.mock.calls[0]![1]?.headers);
    expect(headers.get("Origin")).toBe(config.FRONTEND_ORIGIN);
    expect(headers.get("Authorization")).toBe("Bearer private-runtime");
    expect(headers.has("Cookie")).toBe(false);
    expect(headers.has("x-retailor-shopify-tab")).toBe(false);
    expect(headers.get("x-shopify-topic")).toBe("shop/redact");
    expect(
      (
        await forward(
          new Request("http://x", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: "{}",
          }),
          "shopify/disconnect",
          config,
          io,
        )
      ).status,
    ).toBe(403);
  });
  it("cleans failed callback URLs, retains origin denial and emits only content-free private diagnostics", async () => {
    vi.stubEnv("APP_ENV", "test");
    vi.stubEnv("FRONTEND_ORIGIN", config.FRONTEND_ORIGIN);
    vi.stubEnv("BACKEND_ORIGIN", config.BACKEND_ORIGIN);
    vi.stubEnv("RETAILOR_ORIGIN_GUARD", "disabled");
    const log = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true);
    const network = vi.mocked(fetch);
    network.mockRejectedValue(new Error("private_provider_marker"));
    try {
      const result = await backendRequest(
        new Request(
          "http://x/api/retailor/v1/shopify/callback?code=private_code_marker&state=private_state_marker",
        ),
        "shopify/callback",
      );
      expect(result.status).toBe(303);
      expect(result.headers.get("location")).toContain(
        "shopify=needs_attention",
      );
      expect(result.headers.get("location")).not.toContain("private_");
      vi.stubEnv("RETAILOR_ORIGIN_GUARD", "cloudflare");
      vi.stubEnv("RETAILOR_ORIGIN_SECRET", "a".repeat(64));
      const before = network.mock.calls.length;
      expect(
        (
          await backendRequest(
            new Request(
              "http://x/api/retailor/v1/shopify/callback?code=private_code_marker",
            ),
            "shopify/callback",
          )
        ).status,
      ).toBe(403);
      expect(network).toHaveBeenCalledTimes(before);
      const output = log.mock.calls.map((call) => String(call[0])).join("");
      expect(output).toContain("shopify_callback");
      expect(output).toContain("requestId");
      for (const hidden of [
        "private_provider_marker",
        "private_code_marker",
        "private_state_marker",
      ])
        expect(output).not.toContain(hidden);
    } finally {
      vi.unstubAllEnvs();
    }
  });
  it("forwards only the connection cookie/tab proof and rebuilds safe Lax cookie attributes", async () => {
    const io = ports(),
      token = "a".repeat(64),
      proof = "b".repeat(64);
    io.fetch.mockResolvedValue(
      Response.json(
        { schemaVersion: 1, tabProof: proof, expiresAt: 10 },
        {
          headers: {
            "Set-Cookie": `retailor_shopify=${token}; Domain=evil.example; Path=/`,
          },
        },
      ),
    );
    const result = await forward(
      new Request("http://x", {
        method: "POST",
        headers: {
          Origin: config.FRONTEND_ORIGIN,
          "Content-Type": "application/json",
          Cookie: `other=private; retailor_shopify=${token}`,
          "x-retailor-shopify-tab": proof,
          Authorization: "Bearer attacker",
        },
        body: "{}",
      }),
      "shopify/session",
      config,
      io,
    );
    expect(result.status).toBe(200);
    const sent = new Headers(io.fetch.mock.calls[0]![1]!.headers);
    expect(sent.get("cookie")).toBe(`retailor_shopify=${token}`);
    expect(sent.get("x-retailor-shopify-tab")).toBe(proof);
    expect(sent.has("authorization")).toBe(false);
    expect(result.headers.get("set-cookie")).toBe(
      `retailor_shopify=${token}; Path=/api/retailor/v1; HttpOnly; SameSite=Lax; Max-Age=7200`,
    );
  });
  it("forwards signed callback queries only to the fixed endpoint and returns a clean internal resume URL", async () => {
    const io = ports();
    io.fetch.mockResolvedValue(
      Response.json({
        schemaVersion: 1,
        outcome: "connected",
        returnTo: "connections",
      }),
    );
    const query = "?code=private-code&hmac=signed&state=private-state";
    const result = await forward(
      new Request(`http://x/api/retailor/v1/shopify/callback${query}`, {
        headers: {
          Cookie: `retailor_shopify=${"a".repeat(64)}; unrelated=secret`,
        },
      }),
      "shopify/callback",
      config,
      io,
    );
    expect(io.fetch.mock.calls[0]![0]).toBe(
      `${config.BACKEND_ORIGIN}/v1/shopify/callback${query}`,
    );
    expect(result.status).toBe(303);
    expect(result.headers.get("location")).toBe(
      "/demo?shopify=connected&shopifyReturn=connections",
    );
    expect(result.headers.get("referrer-policy")).toBe("no-referrer");
    expect(await result.text()).not.toContain("private-code");
  });
  it("rejects arbitrary install redirects, invalid cookies and query overrides", async () => {
    const io = ports();
    io.fetch.mockResolvedValue(
      Response.json({
        schemaVersion: 1,
        authorizationUrl: "https://evil.example",
      }),
    );
    expect(
      (
        await forward(
          new Request("http://x?shop=test"),
          "shopify/install",
          config,
          io,
        )
      ).status,
    ).toBe(502);
    io.fetch.mockResolvedValue(
      Response.json(
        { schemaVersion: 1, tabProof: "b".repeat(64), expiresAt: 1 },
        { headers: { "Set-Cookie": "other=secret" } },
      ),
    );
    expect(
      (
        await forward(
          new Request("http://x", {
            method: "POST",
            headers: {
              Origin: config.FRONTEND_ORIGIN,
              "Content-Type": "application/json",
            },
            body: "{}",
          }),
          "shopify/session",
          config,
          io,
        )
      ).status,
    ).toBe(502);
    const calls = io.fetch.mock.calls.length;
    expect(
      (
        await forward(
          new Request("http://x?url=https://evil.example", {
            method: "POST",
            headers: {
              Origin: config.FRONTEND_ORIGIN,
              "Content-Type": "application/json",
            },
            body: "{}",
          }),
          "shopify/status",
          config,
          io,
        )
      ).status,
    ).toBe(400);
    expect(io.fetch).toHaveBeenCalledTimes(calls);
  });
});
