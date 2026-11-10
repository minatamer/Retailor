import { fileURLToPath } from "node:url";
import type { Environment } from "./environment.js";
import { ShopifyLedger } from "../shopify/ledger.js";
import { GcsShopifyStore, LocalShopifyStore } from "../shopify/storage.js";
import { LiveShopifyProvider } from "../shopify/provider.js";
import { SANDBOX_CHECKOUT } from "./checkout.js";
import { randomBytes } from "node:crypto";
import { FixtureShopify } from "../shopify/fixture.js";
import { FixtureShopifyStore } from "../shopify/storage.js";
import { LiveProductProvider } from "../shopify/product-provider.js";

export function configuredShopify(env: Environment) {
  if (env.SHOPIFY_PROVIDER === "fixture") {
    if (env.APP_ENV === "production") return undefined;
    const appId = "retailor-local-simulation",
      secret = randomBytes(32).toString("hex"),
      provider = new FixtureShopify(secret);
    return {
      appId,
      secret,
      provider,
      products: provider,
      ledger: new ShopifyLedger(
        new FixtureShopifyStore(),
        randomBytes(32).toString("hex"),
        appId,
      ),
    };
  }
  const required =
    !!env.SHOPIFY_CLIENT_ID &&
    !!env.SHOPIFY_CLIENT_SECRET &&
    /^[a-f0-9]{64}$/u.test(env.SHOPIFY_ENCRYPTION_KEY);
  if (!required) return undefined;
  const hosted = !!env.SHOPIFY_STORAGE_PROJECT && !!env.SHOPIFY_STORAGE_BUCKET;
  if (!!env.SHOPIFY_STORAGE_PROJECT !== !!env.SHOPIFY_STORAGE_BUCKET)
    return undefined;
  if (
    (env.APP_ENV === "production" && !hosted) ||
    env.SHOPIFY_STORAGE_BUCKET === SANDBOX_CHECKOUT.bucketName
  )
    return undefined;
  const redirectUri = `${env.FRONTEND_ORIGIN}/api/retailor/v1/shopify/callback`;
  const provider = new LiveShopifyProvider({
    clientId: env.SHOPIFY_CLIENT_ID,
    secret: env.SHOPIFY_CLIENT_SECRET,
    redirectUri,
  });
  return {
    appId: env.SHOPIFY_CLIENT_ID,
    provider,
    secret: env.SHOPIFY_CLIENT_SECRET,
    products: new LiveProductProvider(provider.graphql.bind(provider)),
    ledger: new ShopifyLedger(
      hosted
        ? new GcsShopifyStore(
            env.SHOPIFY_STORAGE_PROJECT,
            env.SHOPIFY_STORAGE_BUCKET,
          )
        : new LocalShopifyStore(
            fileURLToPath(new URL("../../.shopify-local/", import.meta.url)),
          ),
      env.SHOPIFY_ENCRYPTION_KEY,
      env.SHOPIFY_CLIENT_ID,
    ),
  };
}
