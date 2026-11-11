import { ShopifyCollection } from "./collection.js";
import { createHash, randomBytes } from "node:crypto";
import {
  SHOPIFY_LIMITS,
  ShopifyExportSummarySchema,
  ShopifyImportResultSchema,
  ShopifyProductSummarySchema,
} from "@retailor/contracts/shopify";
import type {
  ShopifyExportInput,
  ShopifyExportSummary,
} from "@retailor/contracts/shopify";
import type { Product } from "@retailor/contracts/product";
import { CATEGORY_LABELS } from "@retailor/contracts/product";
import { parseUsd } from "@retailor/commerce/money";
import { inspectRaster } from "@retailor/contracts/raster";
import { prepareProviderImages } from "../catalogue/sanitize.js";
import { deny } from "../security/errors.js";
import type { ShopifyScope, ShopifyService } from "./service.js";
import type { ProductIntent } from "./product-model.js";
import type { Installation } from "./model.js";
import type {
  ProductContext,
  ProductProvider,
  RemoteProduct,
  WireProduct,
  WireVariant,
} from "./product-provider.js";
import { productDescription } from "./product-provider.js";

const digest = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
const normalize = (value: string) => value.replace(/\s+/gu, " ").trim();
const variantKey = (value: {
  colour: string;
  size: string;
  sku: string;
  price: string;
}) =>
  digest({
    colour: value.colour,
    size: value.size,
    sku: value.sku,
    price: value.price,
  });
const decimal = (cents: number) =>
  `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, "0")}`;
const sort = (values: string[]) =>
  values.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
export interface ProductCleanupPort {
  beforeWrite(signal: AbortSignal): Promise<void>;
}
export function exportSummary(intent: ProductIntent): ShopifyExportSummary {
  return ShopifyExportSummarySchema.parse({
    id: intent.id,
    sourceProductId: intent.sourceProductId,
    revision: intent.revision,
    state: intent.state,
    remoteId: intent.remoteId,
    handle: intent.handle,
  });
}
function wireProduct(
  product: Product,
  mapping: readonly { sourceId: string; remoteId: string | null }[] = [],
): WireProduct {
  if (product.archived) return deny("INVALID_INPUT", 400);
  const variants = product.variants.filter((v) => !v.archived);
  if (
    !variants.length ||
    variants.length > SHOPIFY_LIMITS.variants ||
    new Set(variants.map((v) => v.id)).size !== variants.length ||
    new Set(
      variants.map((v) => `${v.colour.toLowerCase()}\0${v.size.toLowerCase()}`),
    ).size !== variants.length ||
    [product.title, ...variants.flatMap((v) => [v.colour, v.size, v.sku])].some(
      (value) =>
        [...value].some(
          (character) =>
            character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127,
        ),
    )
  )
    return deny("INVALID_INPUT", 400);
  const description = productDescription(product.description);
  return {
    title: `Retailor demo — ${product.title}`,
    description: description.plain,
    descriptionHtml: description.html,
    productType: CATEGORY_LABELS[product.category],
    variants: variants.map((v) => {
      const remote = mapping.find((row) => row.sourceId === v.id)?.remoteId;
      return {
        sourceId: v.id,
        colour: v.colour,
        size: v.size,
        sku: v.sku,
        price: decimal(v.price),
        ...(remote ? { id: remote } : {}),
      };
    }),
  };
}
function sourceDigest(
  product: WireProduct,
  photos: readonly { id: string; hash: string }[],
) {
  return digest({
    title: product.title,
    description: product.description,
    productType: product.productType,
    variants: product.variants.map(
      ({ sourceId, colour, size, sku, price }) => ({
        sourceId,
        colour,
        size,
        sku,
        price,
      }),
    ),
    photos,
  });
}
function fingerprint(product: WireProduct, alts: readonly string[]) {
  return digest({
    title: product.title,
    description: normalize(product.description),
    productType: product.productType,
    variants: sort(
      product.variants.map(({ colour, size, sku, price }) =>
        variantKey({ colour, size, sku, price }),
      ),
    ),
    alts,
  });
}
function remoteVariant(
  variant: RemoteProduct["variants"]["nodes"][number],
): WireVariant | null {
  if (variant.selectedOptions.length !== 2 || !variant.sku) return null;
  const colour = variant.selectedOptions.find(
      (row) => row.name === "Colour",
    )?.value,
    size = variant.selectedOptions.find((row) => row.name === "Size")?.value,
    price = parseUsd(variant.price);
  if (!colour || !size || !price.ok) return null;
  return {
    sourceId: "remote",
    id: variant.id,
    colour,
    size,
    sku: variant.sku,
    price: decimal(price.value),
  };
}
function remoteFingerprint(product: RemoteProduct) {
  const variants = product.variants.nodes.map(remoteVariant);
  if (
    product.variants.pageInfo.hasNextPage ||
    product.variants.nodes.length > 64 ||
    product.media.pageInfo.hasNextPage ||
    product.media.nodes.length > 8 ||
    variants.some((v) => !v) ||
    product.media.nodes.some(
      (media) => media.mediaContentType !== "IMAGE" || !media.alt,
    )
  )
    return null;
  return fingerprint(
    {
      title: product.title,
      description: product.description,
      descriptionHtml: "",
      productType: product.productType,
      variants: variants.filter((v): v is WireVariant => !!v),
    },
    product.media.nodes.map((media) => media.alt!),
  );
}
function owns(product: RemoteProduct, intent: ProductIntent) {
  return (
    product.metafield?.value === intent.marker &&
    (!intent.remoteId || product.id === intent.remoteId)
  );
}
function reconcile(intent: ProductIntent, product: RemoteProduct, now: number) {
  if (!owns(product, intent)) return deny("FORBIDDEN", 403);
  intent.remoteId = product.id;
  intent.changedAt = now;
  intent.media = product.media.nodes.slice(0, 8).map((media) => ({
    id: media.id,
    alt: media.alt ?? "",
    status: media.status,
  }));
  for (const remote of product.variants.nodes) {
    const value = remoteVariant(remote);
    if (!value) continue;
    const key = variantKey(value),
      row = intent.variants.find((v) => v.signature === key);
    if (row) row.remoteId = remote.id;
  }
  if (product.status !== "DRAFT") intent.state = "needs_attention";
  else if (remoteFingerprint(product) !== intent.expected)
    intent.state = intent.configured ? "needs_attention" : "configuring";
  else if (product.media.nodes.some((media) => media.status === "FAILED"))
    intent.state = "needs_attention";
  else if (
    product.media.nodes.some(
      (media) => media.status !== "READY" || !media.image?.url,
    )
  )
    intent.state = "media_processing";
  else intent.state = "ready";
  if (remoteFingerprint(product) === intent.expected) intent.configured = true;
  if (intent.removalRequested) intent.state = "removal_pending";
}
function intentFor(installation: { products: ProductIntent[] }, id: string) {
  return (
    installation.products.find((item) => item.id === id) ??
    deny("NOT_FOUND", 404)
  );
}

function productSummary(product: RemoteProduct, installation: Installation) {
  return ShopifyProductSummarySchema.parse({
    productType: product.productType,
    giftCard: product.isGiftCard ?? false,
    ...(product.priceRangeV2
      ? {
          priceRange: {
            min: product.priceRangeV2.minVariantPrice.amount,
            max: product.priceRangeV2.maxVariantPrice.amount,
          },
        }
      : {}),
    id: product.id,
    title: product.title,
    description: product.description,
    status: product.status,
    variants: product.variants.nodes.slice(0, 64).map((v) => ({
      id: v.id,
      title: v.title,
      sku: v.sku,
      price: v.price,
      options: v.selectedOptions,
    })),
    variantsTruncated:
      product.variants.pageInfo.hasNextPage ||
      product.variants.nodes.length > 64,
    images: product.media.nodes
      .filter((media) => media.mediaContentType === "IMAGE" && media.image?.url)
      .slice(0, 8)
      .map((media) => ({ url: media.image!.url, alt: media.alt })),
    mediaTruncated:
      product.media.pageInfo.hasNextPage ||
      product.media.nodes.filter((item) => item.mediaContentType === "IMAGE")
        .length > 8,
    owned: installation.products.some(
      (intent) =>
        intent.remoteId === product.id &&
        intent.state !== "removed" &&
        owns(product, intent),
    ),
  });
}
export class ShopifyCatalogue {
  constructor(
    readonly auth: ShopifyService,
    readonly provider: ProductProvider,
    readonly cleanup: ProductCleanupPort | undefined = undefined,
    private readonly sanitize: typeof prepareProviderImages = prepareProviderImages,
  ) {}
  private context(
    shop: string,
    access: string,
    signal: AbortSignal,
    scope: ShopifyScope,
  ): ProductContext {
    return { shop, access, signal, admit: () => scope.admit() };
  }
  private async writes(signal: AbortSignal) {
    if (!this.cleanup && !this.auth.provider.simulated)
      return deny("UNAVAILABLE", 503);
    await this.cleanup?.beforeWrite(signal);
  }
  private async identity(
    installation: Installation,
    access: string,
    scope: ShopifyScope,
    signal: AbortSignal,
  ) {
    await scope.admit();
    const identity = await this.auth.provider.identity(
      installation.shop,
      access,
      signal,
    );
    if (
      identity.shop !== installation.shop ||
      identity.id !== installation.shopId ||
      !identity.development
    ) {
      await scope.update((current) => {
        current.state = "needs_attention";
        current.accessBlocked =
          identity.shop !== installation.shop ||
          identity.id !== installation.shopId;
      });
      return deny("FORBIDDEN", 403);
    }
    await scope.update((current) => {
      current.currency = identity.currency;
      current.name = identity.name;
    });
    return identity;
  }
  async list(
    cookie: string | undefined,
    proof: string | undefined,
    workspaceId: string,
    cursor: string | null,
    signal: AbortSignal,
    collectionId: string | null = null,
  ) {
    return this.auth.withConnection(
      cookie,
      proof,
      workspaceId,
      signal,
      async (installation, tokens, scope) => {
        const page = await scope.update((_shop, binding) => {
          const now = this.auth.clock();
          if (now - binding.reads.start >= 3600000)
            binding.reads = { start: now, count: 0 };
          if (++binding.reads.count > 60) return deny("BUSY", 429);
          if (cursor === null) return 1;
          if (
            !binding.catalogue ||
            binding.catalogue.cursor !== cursor ||
            binding.catalogue.collectionId !== collectionId ||
            binding.catalogue.page >= 5
          )
            return deny("STALE", 409);
          return binding.catalogue.page + 1;
        });
        const identity = await this.identity(
          installation,
          tokens.access,
          scope,
          signal,
        );
        const result = await this.provider.list(
          this.context(installation.shop, tokens.access, signal, scope),
          cursor,
          collectionId,
        );
        const next = page < 5 ? result.next : null;
        await scope.update((_shop, binding) => {
          binding.catalogue = { cursor: next, page, collectionId };
        });
        return {
          schemaVersion: 1 as const,
          page,
          nextCursor: next,
          limited: page === 5 && result.next !== null,
          currency: identity.currency,
          products: result.products.map((product) =>
            productSummary(product, installation),
          ),
        };
      },
    );
  }
  async collections(
    cookie: string | undefined,
    proof: string | undefined,
    workspaceId: string,
    cursor: string | null,
    signal: AbortSignal,
  ) {
    return this.auth.withConnection(
      cookie,
      proof,
      workspaceId,
      signal,
      async (installation, tokens, scope) => {
        const page = await scope.update((_shop, binding) => {
          const now = this.auth.clock();
          if (now - binding.reads.start >= 3600000)
            binding.reads = { start: now, count: 0 };
          if (++binding.reads.count > 60) return deny("BUSY", 429);
          if (!cursor) return 1;
          if (
            !binding.collectionBrowse ||
            binding.collectionBrowse.cursor !== cursor ||
            binding.collectionBrowse.page >= 5
          )
            return deny("STALE", 409);
          return binding.collectionBrowse.page + 1;
        });
        await this.identity(installation, tokens.access, scope, signal);
        const result = await this.provider.collectionList(
          this.context(installation.shop, tokens.access, signal, scope),
          cursor,
        );
        const nextCursor = page < 5 ? result.next : null;
        await scope.update((_shop, binding) => {
          binding.collectionBrowse = { cursor: nextCursor, page };
        });
        return {
          schemaVersion: 1 as const,
          collections: result.collections,
          nextCursor,
          page,
        };
      },
    );
  }
  async importProduct(
    cookie: string | undefined,
    proof: string | undefined,
    workspaceId: string,
    productId: string,
    signal: AbortSignal,
  ) {
    return this.auth.withConnection(
      cookie,
      proof,
      workspaceId,
      signal,
      async (installation, tokens, scope) => {
        await scope.update((_shop, binding) => {
          const now = this.auth.clock();
          if (now - binding.reads.start >= 3600000)
            binding.reads = { start: now, count: 0 };
          if (++binding.reads.count > 60) return deny("BUSY", 429);
        });
        const identity = await this.identity(
          installation,
          tokens.access,
          scope,
          signal,
        );
        if (identity.currency !== "USD") return deny("INVALID_INPUT", 400);
        const context = this.context(
          installation.shop,
          tokens.access,
          signal,
          scope,
        );
        const product = await this.provider.read(context, { id: productId });
        if (!product) return deny("NOT_FOUND", 404);
        if (
          product.isGiftCard ||
          /gift\s*card/iu.test(product.productType) ||
          product.variants.nodes.length > 24 ||
          product.variants.pageInfo.hasNextPage
        )
          return deny("INVALID_INPUT", 400);
        const photos = await this.provider.importPhotos(context, product);
        return ShopifyImportResultSchema.parse({
          schemaVersion: 1,
          product: productSummary(product, installation),
          photos,
          currency: "USD",
        });
      },
    );
  }
  async export(
    cookie: string | undefined,
    proof: string | undefined,
    input: ShopifyExportInput,
    update: boolean,
    signal: AbortSignal,
  ) {
    await this.writes(signal);
    const wire = wireProduct(input.product),
      photos = input.product.imageIds.map((id) =>
        input.photos.find((photo) => photo.image.id === id),
      );
    if (
      photos.some((photo) => !photo) ||
      photos.length !== input.photos.length ||
      new Set(input.product.imageIds).size !== photos.length
    )
      return deny("INVALID_INPUT", 400);
    return this.auth.withConnection(
      cookie,
      proof,
      input.workspaceId,
      signal,
      async (installation, tokens, scope) => {
        const files = new Map<string, Uint8Array>();
        for (const photo of input.photos) {
          const bytes = Buffer.from(photo.base64, "base64");
          if (bytes.toString("base64") !== photo.base64)
            return deny("INVALID_INPUT", 400);
          files.set(photo.image.id, bytes);
        }
        const sanitized = await this.sanitize(
          input.photos.map((photo) => photo.image),
          files,
          signal,
        );
        try {
          const identity = await this.identity(
            installation,
            tokens.access,
            scope,
            signal,
          );
          if (identity.currency !== "USD") return deny("FORBIDDEN", 403);
          const imageKeys = photos.map((photo) => ({
              id: photo!.image.id,
              hash: photo!.image.hash,
            })),
            photoDigest = digest(imageKeys),
            source = sourceDigest(wire, imageKeys);
          const prepared = await scope.update((shop, binding) => {
            const previous = [...shop.products]
              .reverse()
              .find(
                (item) =>
                  item.sourceProductId === input.product.id &&
                  item.state !== "removed",
              );
            if (previous) {
              if (previous.removalRequested) return deny("STALE", 409);
              const restart =
                !previous.remoteId &&
                (!previous.createDispatched || previous.createRejected);
              if (
                input.revision < previous.revision ||
                (!update && previous.digest !== source && !restart)
              )
                return deny("STALE", 409);
              if (update && previous.photoDigest !== photoDigest && !restart)
                return deny("STALE", 409);
              if (restart) {
                previous.digest = source;
                previous.photoDigest = photoDigest;
                previous.revision = input.revision;
                previous.expected = fingerprint(
                  wire,
                  imageKeys.map(
                    (photo) => `Retailor demo ${previous.id}:${photo.id}`,
                  ),
                );
                previous.variants = wire.variants.map((v) => ({
                  sourceId: v.sourceId,
                  signature: variantKey(v),
                  remoteId: null,
                }));
              }
              return { intent: structuredClone(previous), existing: true };
            }
            if (update) return deny("NOT_FOUND", 404);
            if (
              Math.max(binding.lifetimeCreates, shop.products.length) >=
              SHOPIFY_LIMITS.products
            )
              return deny("BUSY", 429);
            binding.lifetimeCreates =
              Math.max(binding.lifetimeCreates, shop.products.length) + 1;
            const id = randomBytes(32).toString("hex"),
              marker = randomBytes(32).toString("hex"),
              now = this.auth.clock();
            const alts = imageKeys.map(
              (photo) => `Retailor demo ${id}:${photo.id}`,
            );
            const intent: ProductIntent = {
              id,
              marker,
              sourceProductId: input.product.id,
              revision: input.revision,
              handle: `retailor-demo-${marker}`,
              digest: source,
              photoDigest,
              expected: fingerprint(wire, alts),
              state: "preparing",
              remoteId: null,
              createdAt: now,
              changedAt: now,
              createDispatched: false,
              createRejected: false,
              configured: false,
              media: [],
              variants: wire.variants.map((v) => ({
                sourceId: v.sourceId,
                signature: variantKey(v),
                remoteId: null,
              })),
              cleanupAttempts: 0,
              cleanupDue: 0,
              removalRequested: false,
            };
            shop.products.push(intent);
            return { intent: structuredClone(intent), existing: false };
          });
          const context = this.context(
              installation.shop,
              tokens.access,
              signal,
              scope,
            ),
            id = prepared.intent.id;
          if (prepared.existing) {
            const remote = await this.provider.read(
              context,
              prepared.intent.remoteId
                ? { id: prepared.intent.remoteId }
                : { handle: prepared.intent.handle },
            );
            if (!remote) {
              if (
                !prepared.intent.remoteId &&
                (!prepared.intent.createDispatched ||
                  prepared.intent.createRejected)
              )
                prepared.existing = false;
              else {
                await scope.update((shop) => {
                  intentFor(shop, id).state = "checking_outcome";
                });
                return this.result(scope, id);
              }
            } else {
              if (!owns(remote, prepared.intent)) return deny("FORBIDDEN", 403);
              await scope.update((shop) =>
                reconcile(intentFor(shop, id), remote, this.auth.clock()),
              );
              if (remote.status !== "DRAFT") return deny("STALE", 409);
              const current = await scope.update((shop) =>
                structuredClone(intentFor(shop, id)),
              );
              if (installation.collection)
                await new ShopifyCollection(this.provider.collections).ensure(
                  context,
                  scope,
                );
              if (
                current.configured &&
                (!update ||
                  (prepared.intent.digest === source &&
                    current.state !== "needs_attention"))
              ) {
                await this.verifyCollection(context, scope, id);
                return this.result(scope, id);
              }
              await scope.update((shop) => {
                const intent = intentFor(shop, id);
                intent.digest = source;
                intent.expected = fingerprint(
                  wire,
                  photos.map(
                    (photo) => `Retailor demo ${id}:${photo!.image.id}`,
                  ),
                );
                intent.revision = input.revision;
                intent.state = "updating";
                intent.configured = false;
                intent.changedAt = this.auth.clock();
                intent.variants = wire.variants.map((v) => ({
                  sourceId: v.sourceId,
                  signature: variantKey(v),
                  remoteId:
                    intent.variants.find((row) => row.sourceId === v.sourceId)
                      ?.remoteId ?? null,
                }));
              });
            }
          }
          const collectionId = !prepared.existing
            ? await new ShopifyCollection(this.provider.collections).ensure(
                context,
                scope,
              )
            : undefined;
          if (!prepared.existing) {
            const staged = await this.provider.stage(
              context,
              photos.map((photo) => {
                const bytes = sanitized.get(photo!.image.id)!;
                return {
                  id: photo!.image.id,
                  bytes,
                  mime: inspectRaster(bytes).mime,
                  alt: `Retailor demo ${id}:${photo!.image.id}`,
                };
              }),
              prepared.intent.marker,
            );
            await scope.update((shop) => {
              const intent = intentFor(shop, id);
              intent.state = "creating";
              intent.createDispatched = true;
              intent.changedAt = this.auth.clock();
            });
            const created = await this.provider.create(
              context,
              wire,
              prepared.intent.handle,
              prepared.intent.marker,
              staged,
              collectionId,
            );
            await scope.update((shop) => {
              const intent = intentFor(shop, id);
              intent.createRejected = created.rejected;
              if (created.product)
                reconcile(intent, created.product, this.auth.clock());
              else
                intent.state = created.rejected ? "failed" : "checking_outcome";
            });
            if (!created.product) return this.result(scope, id);
          }
          const current = await scope.update((shop) =>
            structuredClone(intentFor(shop, id)),
          );
          if (!current.remoteId) return this.result(scope, id);
          const confirmed = await this.provider.read(context, {
            id: current.remoteId,
          });
          if (
            !confirmed ||
            !owns(confirmed, current) ||
            confirmed.status !== "DRAFT"
          )
            return deny("STALE", 409);
          const mapped = wireProduct(input.product, current.variants);
          await scope.update((shop) => {
            intentFor(shop, id).state = "configuring";
          });
          const configured = await this.provider.configure(
            context,
            current.remoteId,
            mapped,
          );
          await scope.update((shop) => {
            const intent = intentFor(shop, id);
            if (configured.product)
              reconcile(intent, configured.product, this.auth.clock());
            else intent.state = "checking_outcome";
          });
          const readback = await this.provider.read(context, {
            id: current.remoteId,
          });
          if (readback)
            await scope.update((shop) =>
              reconcile(intentFor(shop, id), readback, this.auth.clock()),
            );
          await this.verifyCollection(context, scope, id);
          return this.result(scope, id);
        } catch (error) {
          await scope.update((shop) => {
            const intent = [...shop.products]
              .reverse()
              .find(
                (item) =>
                  item.sourceProductId === input.product.id &&
                  item.state !== "removed",
              );
            if (
              intent &&
              !["ready", "media_processing", "needs_attention"].includes(
                intent.state,
              )
            )
              intent.state = intent.createDispatched
                ? "checking_outcome"
                : "failed";
          });
          throw error;
        } finally {
          sanitized.clear();
          files.clear();
        }
      },
    );
  }
  private async verifyCollection(
    context: ProductContext,
    scope: ShopifyScope,
    id: string,
  ) {
    const intent = await scope.update((shop) =>
      structuredClone(intentFor(shop, id)),
    );
    if (intent.state !== "ready" || !intent.remoteId) return;
    await scope.update((shop) => {
      intentFor(shop, id).state = "checking_outcome";
    });
    const contains = await new ShopifyCollection(
      this.provider.collections,
    ).contains(context, scope, intent.remoteId);
    await scope.update((shop) => {
      intentFor(shop, id).state = contains ? "ready" : "needs_attention";
    });
  }
  private result(scope: ShopifyScope, id: string) {
    return scope.update((shop) => ({
      schemaVersion: 1 as const,
      export: exportSummary(intentFor(shop, id)),
    }));
  }
  async check(
    cookie: string | undefined,
    proof: string | undefined,
    workspaceId: string,
    id: string,
    signal: AbortSignal,
  ) {
    return this.auth.withConnection(
      cookie,
      proof,
      workspaceId,
      signal,
      async (installation, tokens, scope) => {
        const intent = await scope.update((shop) =>
          structuredClone(intentFor(shop, id)),
        );
        if (intent.state === "removed") return this.result(scope, id);
        const remote = await this.provider.read(
          this.context(installation.shop, tokens.access, signal, scope),
          intent.remoteId ? { id: intent.remoteId } : { handle: intent.handle },
        );
        if (remote)
          await scope.update((shop) =>
            reconcile(intentFor(shop, id), remote, this.auth.clock()),
          );
        // A missing result cannot prove an uncertain create will never finish.
        else
          await scope.update((shop) => {
            intentFor(shop, id).state = intent.remoteId
              ? "needs_attention"
              : "checking_outcome";
          });
        await this.verifyCollection(
          this.context(installation.shop, tokens.access, signal, scope),
          scope,
          id,
        );
        return this.result(scope, id);
      },
    );
  }
  /** Cleanup calls this only with a ledger-owned intent and authenticated scope. */
  async removeOwned(
    context: ProductContext,
    intent: ProductIntent,
    record: (change: (intent: ProductIntent) => void) => Promise<void>,
  ) {
    if (intent.state === "removed") return true;
    const product = await this.provider.read(
      context,
      intent.remoteId ? { id: intent.remoteId } : { handle: intent.handle },
    );
    if (!product) {
      if (
        intent.remoteId ||
        !intent.createDispatched ||
        intent.createRejected
      ) {
        await record((row) => {
          row.state = "removed";
        });
        return true;
      }
      await record((row) => {
        row.state = "checking_outcome";
      });
      return false;
    }
    if (!owns(product, intent)) return deny("FORBIDDEN", 403);
    await record((row) => {
      row.remoteId = product.id;
      row.state = "removal_pending";
    });
    if (!(await this.provider.remove(context, product.id))) return false;
    if (await this.provider.read(context, { id: product.id })) return false;
    await record((row) => {
      row.state = "removed";
    });
    return true;
  }
}
