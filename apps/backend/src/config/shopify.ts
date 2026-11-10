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
import { SHOPIFY_APP } from "./shopify-app.js";
import { z } from "zod";
import { ShopifyDevInstallUrlSchema } from "@retailor/contracts/shopify";

const appSchema = z.object({
  clientId: z.string().max(200),
  developmentInstallUrl: ShopifyDevInstallUrlSchema,
  provider: z.enum(["live", "fixture"]),
  storageProject: z.string().max(100),
  storageBucket: z.string().max(200),
});

export function configuredShopify(env: Environment, app = SHOPIFY_APP) {
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
  // This app currently has only a development installation entry. A public
  // listing and distribution acceptance must be configured separately later.
  const selectedApp = new URL(
    new URL(app.developmentInstallUrl).searchParams.get("redirect")!,
    "https://admin.shopify.com",
  ).searchParams.get("client_id");
  if (env.APP_ENV === "production" || selectedApp !== app.clientId)
    return undefined;
  const required =
    !!app.clientId &&
    !!env.SHOPIFY_CLIENT_SECRET &&
    /^[a-f0-9]{64}$/u.test(env.SHOPIFY_ENCRYPTION_KEY);
  if (!required) return undefined;
  const hosted = !!app.storageProject && !!app.storageBucket;
  if (!!app.storageProject !== !!app.storageBucket) return undefined;
  if (app.storageBucket === SANDBOX_CHECKOUT.bucketName) return undefined;
  const redirectUri = `${env.FRONTEND_ORIGIN}/api/retailor/v1/shopify/callback`;
  const provider = new LiveShopifyProvider({
    clientId: app.clientId,
    secret: env.SHOPIFY_CLIENT_SECRET,
    redirectUri,
    developmentInstallUrl: app.developmentInstallUrl,
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
