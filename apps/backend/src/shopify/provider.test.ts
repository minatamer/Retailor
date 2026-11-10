import { describe, expect, it, vi } from "vitest";
import { createHmac } from "node:crypto";
import {
  LiveShopifyProvider,
  ShopifyAccessRejected,
  verifyShopifyQuery,
} from "./provider.js";
import { SHOPIFY_LIMITS } from "@retailor/contracts/shopify";

const now = 1_794_305_000_000,
  shop = "retailor-test.myshopify.com";
function nativeToken() {
  return {
    access_token: "test_access",
    refresh_token: "test_refresh",
    expires_in: 3600,
    refresh_token_expires_in: 7776000,
    scope: "write_products",
  };
}
function provider(http: typeof fetch) {
  return new LiveShopifyProvider(
    {
      clientId: "test-app",
      secret: "test-only-secret",
      redirectUri: "https://retailor.example/api/retailor/v1/shopify/callback",
    },
    http,
    () => now,
  );
}
describe("fixed standalone Shopify provider", () => {
  it("classifies rejected credentials without reading or exposing provider text", async () => {
    for (const status of [401, 403]) {
      const http = vi.fn<typeof fetch>(
        async () => new Response("private shop details", { status }),
      );
      const error = await provider(http)
        .identity(shop, "test_access", new AbortController().signal)
        .catch((error: unknown) => error);
      expect(error).toBeInstanceOf(ShopifyAccessRejected);
      expect(error).toMatchObject({ code: "FORBIDDEN", status: 403 });
      expect(String(error)).not.toContain("private shop details");
      expect(http).toHaveBeenCalledTimes(1);
    }
  });
  it("verifies canonical HMAC independently of query order and rejects tampering, replay time and duplicate keys", () => {
    const message =
      "code=abc&shop=retailor-test.myshopify.com&state=nonce&timestamp=1794305000";
    const hmac = createHmac("sha256", "test-only-secret")
      .update(message)
      .digest("hex");
    const query = `timestamp=1794305000&state=nonce&shop=${shop}&code=abc&hmac=${hmac}`;
    expect(verifyShopifyQuery(query, "test-only-secret", now).get("code")).toBe(
      "abc",
    );
    for (const changed of [
      query.replace("code=abc", "code=evil"),
      query + "&code=abc",
      query + "&url=https://evil.example",
    ]) {
      expect(() =>
        verifyShopifyQuery(changed, "test-only-secret", now),
      ).toThrow();
    }
    expect(() =>
      verifyShopifyQuery(query, "test-only-secret", now + 300001),
    ).toThrow();
  });
  it("exchanges and rotates expiring offline tokens only on the verified shop with fixed versioned identity query", async () => {
    const http = vi.fn<typeof fetch>(async () => Response.json(nativeToken()));
    const api = provider(http),
      signal = new AbortController().signal;
    const tokens = await api.exchange(shop, "code", signal);
    expect(tokens.expiresAt).toBe(now + 3600000);
    const body = JSON.parse(String(http.mock.calls[0]![1]!.body));
    expect(body).toMatchObject({
      client_id: "test-app",
      code: "code",
      expiring: 1,
    });
    await api.refresh(shop, tokens, signal);
    expect(JSON.parse(String(http.mock.calls[1]![1]!.body))).toMatchObject({
      grant_type: "refresh_token",
      refresh_token: "test_refresh",
    });
    http.mockResolvedValue(
      Response.json(
        {
          data: {
            shop: {
              id: "gid://shopify/Shop/1",
              name: "Test",
              myshopifyDomain: shop,
              currencyCode: "USD",
              plan: { partnerDevelopment: true },
            },
          },
        },
        { headers: { "x-shopify-api-version": SHOPIFY_LIMITS.apiVersion } },
      ),
    );
    expect((await api.identity(shop, tokens.access, signal)).development).toBe(
      true,
    );
    expect(http.mock.calls[2]![0]).toBe(
      `https://${shop}/admin/api/2026-10/graphql.json`,
    );
    const count = http.mock.calls.length;
    for (const invalid of [
      "evil.example",
      `${shop}:443`,
      `${shop}/path`,
      `user@${shop}`,
    ])
      await expect(api.exchange(invalid, "code", signal)).rejects.toThrow();
    expect(http).toHaveBeenCalledTimes(count);
  });
  it("rejects scope/version failures, oversized/deep provider JSON and redirects without forwarding provider text", async () => {
    const http = vi.fn<typeof fetch>(),
      api = provider(http),
      signal = new AbortController().signal;
    http.mockResolvedValue(
      Response.json({ ...nativeToken(), scope: "read_products" }),
    );
    await expect(api.exchange(shop, "code", signal)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    http.mockImplementation(
      async () =>
        new Response("[".repeat(17) + "0" + "]".repeat(17), {
          headers: { "content-type": "application/json" },
        }),
    );
    await expect(api.exchange(shop, "code", signal)).rejects.toMatchObject({
      code: "UPSTREAM_FAILED",
    });
    http.mockImplementation(async () =>
      Response.json({
        excess: "x".repeat(SHOPIFY_LIMITS.providerResponseBytes),
      }),
    );
    await expect(api.exchange(shop, "code", signal)).rejects.toMatchObject({
      code: "UPSTREAM_FAILED",
    });
    http.mockImplementation(
      async () =>
        new Response("private-provider-detail", {
          status: 302,
          headers: { Location: "https://evil.example" },
        }),
    );
    await expect(api.exchange(shop, "code", signal)).rejects.toMatchObject({
      code: "UPSTREAM_FAILED",
    });
    expect(http.mock.calls.every((call) => call[1]?.redirect === "error")).toBe(
      true,
    );
    http.mockResolvedValue(
      Response.json(
        { data: {} },
        { headers: { "x-shopify-api-version": "2026-07" } },
      ),
    );
    await expect(
      api.identity(shop, "test_access", signal),
    ).rejects.toMatchObject({ code: "UPSTREAM_FAILED" });
  });
});
