import { importPhotos } from "./import.js";
import { randomBytes, createHmac } from "node:crypto";
import { deny } from "../security/errors.js";
import { verifyShopifyQuery } from "./provider.js";
import type { ShopifyProvider } from "./provider.js";
import type {
  CollectionProvider,
  RemoteCollection,
} from "./collection-provider.js";
import type { Tokens } from "./model.js";
import type {
  ProductContext,
  ProductProvider,
  RemoteProduct,
  WireProduct,
  StagedPhoto,
  ProductMutation,
} from "./product-provider.js";

/** Explicit development adapter. No network, image bytes, disk or live fallback. */
export class FixtureShopify implements ShopifyProvider, ProductProvider {
  private groups = new Map<string, Map<string, RemoteCollection>>();
  private collectionRecords(shop: string) {
    let rows = this.groups.get(shop);
    if (!rows) {
      rows = new Map();
      this.groups.set(shop, rows);
    }
    return rows;
  }
  readonly collections: CollectionProvider = {
    read: async (context, identifier) => {
      await this.admitted(context);
      const rows = this.collectionRecords(context.shop);
      const row =
        "id" in identifier
          ? rows.get(identifier.id)
          : [...rows.values()].find(
              (item) => item.handle === identifier.handle,
            );
      if (!row) return null;
      const result = structuredClone(row);
      result.products.nodes = result.products.nodes.filter((item) =>
        this.records(context.shop).has(item.id),
      );
      return result;
    },
    create: async (context, intent) => {
      await this.admitted(context);
      const row: RemoteCollection = {
        id: `gid://shopify/Collection/${this.next++}`,
        handle: intent.handle,
        metafield: { value: intent.marker },
        products: { nodes: [], pageInfo: { hasNextPage: false } },
      };
      this.collectionRecords(context.shop).set(row.id, row);
      return structuredClone(row);
    },
    remove: async (context, id) => {
      await this.admitted(context);
      return this.collectionRecords(context.shop).delete(id);
    },
  };
  readonly simulated = true;
  private shops = new Map<string, Map<string, RemoteProduct>>();
  private tokens = new Map<string, Tokens>();
  private next = 1;
  constructor(
    readonly secret: string,
    readonly clock: () => number = Date.now,
  ) {}
  installationUrl() {
    return "https://admin.shopify.com/?organization_id=1&no_redirect=true&redirect=/oauth/redirect_from_developer_dashboard?client_id%3Dfixture";
  }
  authorizationUrl(shop: string, state: string) {
    return `https://${shop}/admin/oauth/authorize?state=${state}`;
  }
  verifyQuery(query: string, now: number) {
    return verifyShopifyQuery(query, this.secret, now);
  }
  installQuery(shop: string, now: number) {
    return this.signed({ shop, timestamp: String(Math.floor(now / 1000)) });
  }
  consent(shop: string, state: string, approved: boolean, now: number) {
    if (
      approved &&
      shop === "retailor-demo.myshopify.com" &&
      this.records(shop).size === 0
    )
      this.seed(shop, {
        id: "gid://shopify/Product/900000",
        handle: "sample-store-hoodie",
        title: "Existing store hoodie",
        description: "A simulated merchant product. Read-only in Retailor.",
        productType: "Hoodies",
        status: "ACTIVE",
        metafield: null,
        variants: {
          nodes: [
            {
              id: "gid://shopify/ProductVariant/900000",
              title: "Default Title",
              sku: "EXISTING-HOODIE",
              price: "48.00",
              selectedOptions: [{ name: "Title", value: "Default Title" }],
            },
          ],
          pageInfo: { hasNextPage: false },
        },
        media: { nodes: [], pageInfo: { hasNextPage: false } },
      });
    const params = {
      shop,
      state,
      timestamp: String(Math.floor(now / 1000)),
      ...(approved
        ? { code: "simulated_consent" }
        : { error: "access_denied" }),
    };
    return this.signed(params);
  }
  private signed(params: Record<string, string>) {
    const message = Object.entries(params)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([key, value]) => `${key}=${value}`)
      .join("&");
    return new URLSearchParams({
      ...params,
      hmac: createHmac("sha256", this.secret).update(message).digest("hex"),
    }).toString();
  }
  private issued(shop: string) {
    if (!this.tokens.has(shop) && this.tokens.size >= 10)
      return deny("BUSY", 429);
    const token = {
      access: `fixture_access_${randomBytes(16).toString("hex")}`,
      refresh: `fixture_refresh_${randomBytes(16).toString("hex")}`,
      expiresAt: this.clock() + 3600000,
      refreshExpiresAt: this.clock() + 7776000000,
      scope: "write_products",
    };
    this.tokens.set(shop, token);
    return structuredClone(token);
  }
  async exchange(shop: string, _code: string, signal: AbortSignal) {
    signal.throwIfAborted();
    return this.issued(shop);
  }
  async refresh(shop: string, tokens: Tokens, signal: AbortSignal) {
    signal.throwIfAborted();
    if (
      this.tokens.get(shop)?.refresh !== tokens.refresh ||
      tokens.refreshExpiresAt <= this.clock()
    )
      return deny("FORBIDDEN", 403);
    return this.issued(shop);
  }
  private verified(shop: string, access: string) {
    const token = this.tokens.get(shop);
    if (!token || token.access !== access || token.expiresAt <= this.clock())
      return deny("FORBIDDEN", 403);
  }
  async identity(shop: string, access: string, signal: AbortSignal) {
    signal.throwIfAborted();
    this.verified(shop, access);
    return {
      id: "gid://shopify/Shop/1",
      shop,
      name: "Simulated Shopify store",
      currency: "USD",
      development: true,
    };
  }
  private records(shop: string) {
    let records = this.shops.get(shop);
    if (!records) {
      if (this.shops.size >= 10) return deny("BUSY", 429);
      records = new Map();
      this.shops.set(shop, records);
    }
    return records;
  }
  /** Development fixture inspection/merchant edits; never exposed by an API route. */
  snapshot(shop: string) {
    return [...this.records(shop).values()].map((value) =>
      structuredClone(value),
    );
  }
  seed(shop: string, product: RemoteProduct) {
    const records = this.records(shop);
    if (records.size >= 256 && !records.has(product.id))
      return deny("BUSY", 429);
    records.set(product.id, structuredClone(product));
  }
  private async admitted(context: ProductContext) {
    context.signal.throwIfAborted();
    await context.admit();
    this.verified(context.shop, context.access);
  }
  async collectionList(context: ProductContext, cursor: string | null) {
    await this.admitted(context);
    const offset = cursor ? Number(cursor.slice(1)) : 0;
    if (!Number.isSafeInteger(offset) || offset < 0 || offset > 100)
      return deny("INVALID_INPUT", 400);
    const rows = [...this.collectionRecords(context.shop).values()];
    return {
      collections: rows
        .slice(offset, offset + 20)
        .map((row) => ({ id: row.id, title: "Retailor" })),
      next: rows.length > offset + 20 ? `c${offset + 20}` : null,
    };
  }
  importPhotos(context: ProductContext, product: RemoteProduct) {
    return importPhotos(
      context,
      product,
      async () =>
        new Response(
          Buffer.from(
            "UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoDAAMAAUAmJaQAA3AA/vxvIAA=",
            "base64",
          ),
        ),
    );
  }
  async list(
    context: ProductContext,
    cursor: string | null,
    collectionId?: string | null,
  ) {
    await this.admitted(context);
    const offset = cursor ? Number(cursor.slice(1)) : 0;
    if (!Number.isSafeInteger(offset) || offset < 0 || offset > 256)
      return deny("INVALID_INPUT", 400);
    const group = collectionId
      ? this.collectionRecords(context.shop).get(collectionId)
      : null;
    if (collectionId && !group) return deny("NOT_FOUND", 404);
    const all = this.snapshot(context.shop).filter(
      (row) =>
        !group || group.products.nodes.some((member) => member.id === row.id),
    );
    return {
      products: all.slice(offset, offset + 20),
      next: all.length > offset + 20 ? `c${offset + 20}` : null,
    };
  }
  async read(
    context: ProductContext,
    identifier: { id: string } | { handle: string },
  ) {
    await this.admitted(context);
    const rows = this.records(context.shop);
    const row =
      "id" in identifier
        ? rows.get(identifier.id)
        : [...rows.values()].find((item) => item.handle === identifier.handle);
    return row ? structuredClone(row) : null;
  }
  async stage(
    context: ProductContext,
    photos: readonly {
      id: string;
      bytes: Uint8Array;
      mime: string;
      alt: string;
    }[],
    marker: string,
  ) {
    await this.admitted(context);
    const result: StagedPhoto[] = [];
    for (const photo of photos) {
      await this.admitted(context);
      result.push({
        resourceUrl: `https://shopify-staged-uploads.storage.googleapis.com/tmp/fixture/${marker}/${photo.id}.webp`,
        alt: photo.alt,
      });
    }
    return result;
  }
  async create(
    context: ProductContext,
    product: WireProduct,
    handle: string,
    marker: string,
    photos: readonly StagedPhoto[],
    collectionId?: string,
  ): Promise<ProductMutation> {
    await this.admitted(context);
    const records = this.records(context.shop);
    if (records.size >= 256) return deny("BUSY", 429);
    const id = `gid://shopify/Product/${this.next++}`;
    const remote: RemoteProduct = {
      id,
      handle,
      title: product.title,
      description: product.description,
      productType: product.productType,
      status: "DRAFT",
      metafield: { value: marker },
      variants: {
        nodes: [
          {
            id: `gid://shopify/ProductVariant/${this.next++}`,
            title: "Default Title",
            sku: null,
            price: "0.00",
            selectedOptions: [{ name: "Title", value: "Default Title" }],
          },
        ],
        pageInfo: { hasNextPage: false },
      },
      media: {
        nodes: photos.map((photo) => ({
          id: `gid://shopify/MediaImage/${this.next++}`,
          alt: photo.alt,
          mediaContentType: "IMAGE",
          status: "READY",
          image: {
            url: `https://cdn.shopify.com/s/files/1/0000/0000/fixture-${this.next}.webp`,
          },
        })),
        pageInfo: { hasNextPage: false },
      },
    };
    records.set(id, remote);
    if (collectionId)
      this.collectionRecords(context.shop)
        .get(collectionId)
        ?.products.nodes.push({ id });
    return {
      product: structuredClone(remote),
      rejected: false,
      uncertain: false,
    };
  }
  async configure(
    context: ProductContext,
    id: string,
    product: WireProduct,
  ): Promise<ProductMutation> {
    await this.admitted(context);
    const remote = this.records(context.shop).get(id);
    if (!remote) return { product: null, rejected: true, uncertain: true };
    remote.title = product.title;
    remote.description = product.description;
    remote.productType = product.productType;
    remote.variants.nodes = product.variants.map((v) => ({
      id: v.id ?? `gid://shopify/ProductVariant/${this.next++}`,
      title: `${v.colour} / ${v.size}`,
      sku: v.sku,
      price: v.price,
      selectedOptions: [
        { name: "Colour", value: v.colour },
        { name: "Size", value: v.size },
      ],
    }));
    return {
      product: structuredClone(remote),
      rejected: false,
      uncertain: false,
    };
  }
  async remove(context: ProductContext, id: string) {
    await this.admitted(context);
    return this.records(context.shop).delete(id);
  }
  async uninstall(context: ProductContext) {
    await this.admitted(context);
    this.tokens.delete(context.shop);
    return true;
  }
}
