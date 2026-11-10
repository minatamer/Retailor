import { createHash, createHmac } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { ProductSchema } from "@retailor/contracts/product";
import { ShopifyExportInputSchema } from "@retailor/contracts/shopify";
import { FixtureShopify } from "../../apps/backend/src/shopify/fixture.js";
import { ShopifyLedger } from "../../apps/backend/src/shopify/ledger.js";
import { LocalShopifyStore } from "../../apps/backend/src/shopify/storage.js";
import { ShopifyService } from "../../apps/backend/src/shopify/service.js";

export async function shopifyFixture() {
  let now = 1794305000000;
  const clock = () => now,
    shop = "retailor-fixture.myshopify.com",
    secret = "fixture-test-only";
  const directory = await mkdtemp(join(tmpdir(), "retailor-shopify-"));
  const provider = new FixtureShopify(secret, clock),
    ledger = new ShopifyLedger(
      new LocalShopifyStore(directory),
      "f".repeat(64),
      "fixture-app",
    );
  const auth = new ShopifyService(ledger, provider, "fixture-app", clock);
  const session = await auth.session(undefined, {
    schemaVersion: 1,
    workspaceId: "workspace",
    createdAt: clock(),
  });
  async function begin() {
    await auth.connect(session.cookie, session.result.tabProof, {
      schemaVersion: 1,
      workspaceId: "workspace",
      returnTo: "connections",
    });
    return auth.install(session.cookie, provider.installQuery(shop, clock()));
  }
  const consent = await begin();
  const params = {
    code: "fixture_code",
    shop,
    state: new URL(consent.authorizationUrl).searchParams.get("state")!,
    timestamp: String(Math.floor(clock() / 1000)),
  };
  const canonical = Object.entries(params)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
  await auth.callback(
    session.cookie,
    new URLSearchParams({
      ...params,
      hmac: createHmac("sha256", secret).update(canonical).digest("hex"),
    }).toString(),
    new AbortController().signal,
  );
  const bytes = Buffer.from(
    "UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoDAAMAAUAmJaQAA3AA/vxvIAA=",
    "base64",
  );
  const image = {
    id: "photo_a",
    hash: createHash("sha256").update(bytes).digest("hex"),
    mime: "image/webp" as const,
    width: 3,
    height: 3,
    bytes: bytes.byteLength,
  };
  const product = ProductSchema.parse({
    id: "tee",
    title: "Ivory Tee",
    description: "A cotton tee.",
    category: "tees",
    imageIds: [image.id],
    variants: [
      {
        id: "small",
        size: "S",
        colour: "Ivory",
        sku: "TEE-S",
        openingStock: 5,
        openedAt: new Date(now).toISOString(),
        price: 2900,
        unitCost: 1000,
        archived: false,
      },
      {
        id: "medium",
        size: "M",
        colour: "Ivory",
        sku: "TEE-M",
        openingStock: 3,
        openedAt: new Date(now).toISOString(),
        price: 3100,
        unitCost: 1200,
        archived: false,
      },
    ],
    sizingSystemId: "alpha-demo",
    attributes: [],
    archived: false,
  });
  const input = ShopifyExportInputSchema.parse({
    schemaVersion: 1,
    workspaceId: "workspace",
    revision: 1,
    product,
    photos: [{ image, base64: bytes.toString("base64") }],
  });
  return {
    directory,
    begin,
    auth,
    ledger,
    provider,
    shop,
    clock,
    cookie: session.cookie,
    proof: session.result.tabProof,
    input,
    bytes,
    advance: (milliseconds: number) => {
      now += milliseconds;
    },
    signal: () => new AbortController().signal,
    close: async () => {
      await auth.close();
      if (
        !resolve(directory).startsWith(resolve(tmpdir(), "retailor-shopify-"))
      )
        throw new Error("Unexpected fixture directory");
      await rm(directory, { recursive: true, force: true });
    },
  };
}
