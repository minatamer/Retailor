import { describe, expect, it } from "vitest";
import {
  ShopifyAuthorizeSchema,
  ShopifyConnectSchema,
  ShopifyDevInstallUrlSchema,
} from "./shopify.js";

const entry =
  "https://admin.shopify.com/?organization_id=246478493&no_redirect=true&redirect=/oauth/redirect_from_developer_dashboard?client_id%3D31874998d05aff3f0b7463e109913066";
describe("Shopify-owned development selection entry", () => {
  it("accepts the generated entry and rejects destination, parameter and nested redirect tampering", () => {
    expect(ShopifyDevInstallUrlSchema.safeParse(entry).success).toBe(true);
    for (const value of [
      entry.replace("admin.shopify.com", "evil.example"),
      entry + "#fragment",
      entry + "&redirect=https://evil.example",
      entry.replace(
        "/oauth/redirect_from_developer_dashboard",
        "//evil.example",
      ),
      entry.replace("no_redirect=true", "no_redirect=false"),
      entry.replace(
        "organization_id=246478493",
        "organization_id=1&organization_id=2",
      ),
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
