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
import { SHOPIFY_APP, SHOPIFY_HOSTED } from "./shopify-app.js";
import { z } from "zod";

const appSchema = z.object({
  clientId: z.string().regex(/^[a-zA-Z0-9_-]{1,200}$/u),
  provider: z.enum(["live", "fixture"]),
  storageProject: z.string().max(100),
  storageBucket: z.string().max(200),
});

export function configuredShopify(
  env: Environment,
  app = env.APP_ENV === "production" ? SHOPIFY_HOSTED : SHOPIFY_APP,
) {
  if (!appSchema.safeParse(app).success) return undefined;
  if (app.provider === "fixture") {
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
    !!app.clientId &&
    !!env.SHOPIFY_CLIENT_SECRET &&
    /^[a-f0-9]{64}$/u.test(env.SHOPIFY_ENCRYPTION_KEY);
  if (!required) return undefined;
  const hosted = !!app.storageProject && !!app.storageBucket;
  if (!!app.storageProject !== !!app.storageBucket) return undefined;
  if (app.storageBucket === SANDBOX_CHECKOUT.bucketName) return undefined;
  if (
    env.APP_ENV === "production" &&
    (!hosted ||
      env.FAKE_MODE ||
      env.FRONTEND_ORIGIN !== SHOPIFY_HOSTED.origin ||
      app.clientId !== SHOPIFY_HOSTED.clientId ||
      app.storageProject !== SHOPIFY_HOSTED.storageProject ||
      app.storageBucket !== SHOPIFY_HOSTED.storageBucket)
  )
    return undefined;
  const redirectUri = `${env.FRONTEND_ORIGIN}/api/retailor/v1/shopify/callback`;
  const provider = new LiveShopifyProvider({
    clientId: app.clientId,
    secret: env.SHOPIFY_CLIENT_SECRET,
    redirectUri,
  });
  return {
    appId: app.clientId,
    provider,
    secret: env.SHOPIFY_CLIENT_SECRET,
    products: new LiveProductProvider(provider.graphql.bind(provider)),
    ledger: new ShopifyLedger(
      hosted
        ? new GcsShopifyStore(app.storageProject, app.storageBucket)
        : new LocalShopifyStore(
            fileURLToPath(new URL("../../.shopify-local/", import.meta.url)),
          ),
      env.SHOPIFY_ENCRYPTION_KEY,
      app.clientId,
    ),
  };
}
