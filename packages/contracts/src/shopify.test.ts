import { describe, expect, it } from "vitest";
import {
  ShopifyAuthorizeSchema,
  ShopifyConnectSchema,
  ShopifyInstallUrlSchema,
  ShopifyStatusSchema,
} from "./shopify.js";

const entry =
  "https://admin.shopify.com/oauth/install?client_id=31874998d05aff3f0b7463e109913066";
describe("Shopify-owned installation entry", () => {
  it("accepts the shared app entry and rejects destination and query tampering", () => {
    expect(ShopifyInstallUrlSchema.safeParse(entry).success).toBe(true);
    expect(
      ShopifyAuthorizeSchema.safeParse({
        schemaVersion: 1,
        authorizationUrl: entry,
      }).success,
    ).toBe(true);
    for (const value of [
      entry.replace("admin.shopify.com", "evil.example"),
      entry + "#fragment",
      entry + "&redirect=https://evil.example",
      entry + "&organization_id=246478493",
      entry + "&shop=retailor-test.myshopify.com",
      entry + "&client_id=another-app",
      entry.replace("/oauth/install", "/store/retailor-test/oauth/install"),
      entry.replace("https://", "http://"),
      entry.replace("?client_id=", "?client_id=%26"),
      "https://admin.shopify.com/?organization_id=1&no_redirect=true&redirect=/oauth/redirect_from_developer_dashboard?client_id%3Dtest-app",
      entry.replace("https://", "https://user@"),
    ])
      expect(
        ShopifyAuthorizeSchema.safeParse({
          schemaVersion: 1,
          authorizationUrl: value,
        }).success,
      ).toBe(false);
  });
  it("accepts Connect without a shop and refuses caller-supplied shops", () => {
    const request = {
      schemaVersion: 1,
      workspaceId: "workspace",
      returnTo: "onboarding",
    };
    expect(ShopifyConnectSchema.safeParse(request).success).toBe(true);
    expect(
      ShopifyConnectSchema.safeParse({ ...request, shop: "test.myshopify.com" })
        .success,
    ).toBe(false);
  });
});

it("keeps legacy status compatible while exposing ended removal separately from app access", () => {
  const old = {
    schemaVersion: 1,
    available: true,
    simulated: true,
    state: "cleanup_pending",
    shop: "test.myshopify.com",
    name: "Test",
    currency: "USD",
    expiresAt: 1,
    productCount: 0,
  };
  expect(ShopifyStatusSchema.parse(old).ended).toBe(false);
  expect(ShopifyStatusSchema.parse({ ...old, ended: true }).ended).toBe(true);
  expect(ShopifyStatusSchema.safeParse({ ...old, ended: "true" }).success).toBe(
    false,
  );
});
