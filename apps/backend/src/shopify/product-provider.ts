import { z } from "zod";
import {
  SHOPIFY_LIMITS,
  ShopifyProductIdSchema,
} from "@retailor/contracts/shopify";
import { boundedBytes } from "../security/bounded.js";
import { deny } from "../security/errors.js";
import { LiveCollectionProvider } from "./collection-provider.js";
import type { CollectionProvider } from "./collection-provider.js";
import { importPhotos } from "./import.js";
import type { ShopifyImportResult } from "@retailor/contracts/shopify";

export const DEMO_NAMESPACE = "$app:retailor_demo";
export const DEMO_KEY = "session_export";
export interface ProductContext {
  shop: string;
  access: string;
  signal: AbortSignal;
  admit(): Promise<void>;
}
export interface WireVariant {
  sourceId: string;
  colour: string;
  size: string;
  sku: string;
  price: string;
  id?: string;
}
export interface WireProduct {
  title: string;
  description: string;
  descriptionHtml: string;
  productType: string;
  variants: WireVariant[];
}
const VariantSchema = z.object({
  id: z
    .string()
    .max(100)
    .regex(/^gid:\/\/shopify\/ProductVariant\/\d+$/u),
  title: z.string().max(255),
  sku: z.string().max(255).nullable(),
  price: z
    .string()
    .max(32)
    .regex(/^\d{1,16}(?:\.\d{1,4})?$/u),
  selectedOptions: z
    .array(z.object({ name: z.string().max(255), value: z.string().max(255) }))
    .max(3),
});
const MediaSchema = z.object({
  id: z.string().max(100),
  alt: z.string().max(512).nullable(),
  mediaContentType: z.string().max(32),
  status: z.enum(["UPLOADED", "PROCESSING", "READY", "FAILED"]),
  image: z
    .object({
      url: z
        .string()
        .max(2048)
        .regex(/^https:\/\/cdn\.shopify\.com\/[^\s\\]*$/u),
    })
    .nullable()
    .optional(),
});
export const RemoteProductSchema = z.object({
  id: ShopifyProductIdSchema,
  handle: z.string().max(255),
  title: z.string().max(255),
  description: z.string().max(1200),
  productType: z.string().max(255),
  status: z.enum(["ACTIVE", "DRAFT", "ARCHIVED", "UNLISTED"]),
  isGiftCard: z.boolean().optional(),
  priceRangeV2: z
    .object({
      minVariantPrice: z.object({
        amount: z
          .string()
          .max(32)
          .regex(/^\d{1,16}(?:\.\d{1,4})?$/u),
      }),
      maxVariantPrice: z.object({
        amount: z
          .string()
          .max(32)
          .regex(/^\d{1,16}(?:\.\d{1,4})?$/u),
      }),
    })
    .optional(),
  metafield: z.object({ value: z.string().max(64) }).nullable(),
  variants: z.object({
    nodes: z.array(VariantSchema).max(65),
    pageInfo: z.object({ hasNextPage: z.boolean() }),
  }),
  media: z.object({
    nodes: z.array(MediaSchema).max(9),
    pageInfo: z.object({ hasNextPage: z.boolean() }),
  }),
});
export type RemoteProduct = z.infer<typeof RemoteProductSchema>;
export interface ProductMutation {
  product: RemoteProduct | null;
  rejected: boolean;
  uncertain: boolean;
}
export interface StagedPhoto {
  resourceUrl: string;
  alt: string;
}
export interface ProductProvider {
  readonly collections: CollectionProvider;
  collectionList(
    context: ProductContext,
    cursor: string | null,
  ): Promise<{
    collections: { id: string; title: string }[];
    next: string | null;
  }>;
  importPhotos(
    context: ProductContext,
    product: RemoteProduct,
  ): Promise<ShopifyImportResult["photos"]>;
  list(
    context: ProductContext,
    cursor: string | null,
    collectionId?: string | null,
  ): Promise<{ products: RemoteProduct[]; next: string | null }>;
  read(
    context: ProductContext,
    identifier: { id: string } | { handle: string },
  ): Promise<RemoteProduct | null>;
  stage(
    context: ProductContext,
    photos: readonly {
      id: string;
      bytes: Uint8Array;
      mime: string;
      alt: string;
    }[],
    marker: string,
  ): Promise<StagedPhoto[]>;
  create(
    context: ProductContext,
    product: WireProduct,
    handle: string,
    marker: string,
    photos: readonly StagedPhoto[],
    collectionId?: string,
  ): Promise<ProductMutation>;
  configure(
    context: ProductContext,
    id: string,
    product: WireProduct,
  ): Promise<ProductMutation>;
  remove(context: ProductContext, id: string): Promise<boolean>;
  uninstall(context: ProductContext): Promise<boolean>;
}
export type GraphqlPort = (
  shop: string,
  access: string,
  query: string,
  variables: Record<string, unknown>,
  signal: AbortSignal,
) => Promise<unknown>;
const UserErrorsSchema = z
  .array(
    z.object({
      field: z.array(z.string().max(200)).max(16).nullable().optional(),
      message: z.string().max(2000),
    }),
  )
  .max(64);
const fields = (
  variants: number,
  media: number,
) => `id handle title description(truncateAt: 1200) productType status isGiftCard
  priceRangeV2 { minVariantPrice { amount } maxVariantPrice { amount } }
  metafield(namespace: "${DEMO_NAMESPACE}", key: "${DEMO_KEY}") { value }
  variants(first: ${variants}) { nodes { id title sku price selectedOptions { name value } } pageInfo { hasNextPage } }
  media(first: ${media}) { nodes { id alt mediaContentType status ... on MediaImage { image { url(transform:{maxWidth:1600,maxHeight:1600,preferredContentType:WEBP}) } } } pageInfo { hasNextPage } }`;
function checked<T>(schema: z.ZodType<T>, value: unknown): T {
  const parsed = schema.safeParse(value);
  return parsed.success ? parsed.data : deny("UPSTREAM_FAILED", 502);
}
function hasErrors(result: unknown) {
  return !!result && typeof result === "object" && "errors" in result;
}
function escaped(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
export function productDescription(description: string) {
  const plain =
    `Temporary Retailor demo product. Cleanup is requested when this demo ends. ${description}`
      .replace(/\s+/gu, " ")
      .trim();
  return { plain, html: `<p>${escaped(plain)}</p>` };
}
function stageUrl(value: string) {
  const url = new URL(value);
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.port ||
    url.hash ||
    ![
      "shopify-staged-uploads.storage.googleapis.com",
      "shopify.s3.amazonaws.com",
    ].includes(url.hostname)
  )
    return deny("UPSTREAM_FAILED", 502);
  return url;
}
export class LiveProductProvider implements ProductProvider {
  readonly collections: CollectionProvider;
  constructor(
    private readonly graphql: GraphqlPort,
    private readonly http: typeof fetch = fetch,
  ) {
    this.collections = new LiveCollectionProvider(graphql);
  }
  private async query(
    context: ProductContext,
    query: string,
    variables: Record<string, unknown>,
  ) {
    await context.admit();
    return this.graphql(
      context.shop,
      context.access,
      query,
      variables,
      context.signal,
    );
  }
  async collectionList(context: ProductContext, cursor: string | null) {
    const result = await this.query(
      context,
      `query RetailorCollections($after:String) { collections(first:20,after:$after,sortKey:ID) { nodes { id title } pageInfo { hasNextPage endCursor } } }`,
      { after: cursor },
    );
    if (hasErrors(result)) return deny("UPSTREAM_FAILED", 502);
    const data = checked(
      z.object({
        data: z.object({
          collections: z.object({
            nodes: z
              .array(
                z.object({
                  id: z
                    .string()
                    .max(100)
                    .regex(/^gid:\/\/shopify\/Collection\/\d+$/u),
                  title: z.string().max(255),
                }),
              )
              .max(20),
            pageInfo: z.object({
              hasNextPage: z.boolean(),
              endCursor: z.string().max(2048).nullable(),
            }),
          }),
        }),
      }),
      result,
    ).data.collections;
    return {
      collections: data.nodes,
      next: data.pageInfo.hasNextPage ? data.pageInfo.endCursor : null,
    };
  }
  importPhotos(context: ProductContext, product: RemoteProduct) {
    return importPhotos(context, product, this.http);
  }
  async list(
    context: ProductContext,
    cursor: string | null,
    collectionId?: string | null,
  ) {
    // Page summaries keep requested GraphQL cost below the single-query ceiling.
    const result = await this.query(
      context,
      collectionId
        ? `query RetailorCollectionProducts($id:ID!,$after:String) { collection(id:$id) { products(first:20,after:$after) { nodes { ${fields(4, 2)} } pageInfo { hasNextPage endCursor } } } }`
        : `query RetailorProducts($after: String) { products(first:20,after:$after,sortKey:ID) {
      nodes { ${fields(4, 2)} } pageInfo { hasNextPage endCursor } } }`,
      collectionId ? { after: cursor, id: collectionId } : { after: cursor },
    );
    if (hasErrors(result)) return deny("UPSTREAM_FAILED", 502);
    const envelope = collectionId
      ? checked(
          z.object({
            data: z.object({
              collection: z.object({ products: z.unknown() }).nullable(),
            }),
          }),
          result,
        ).data.collection
      : null;
    if (collectionId && !envelope) return deny("NOT_FOUND", 404);
    const data = checked(
      z.object({
        data: z.object({
          products: z.object({
            nodes: z.array(RemoteProductSchema).max(20),
            pageInfo: z.object({
              hasNextPage: z.boolean(),
              endCursor: z.string().max(2048).nullable(),
            }),
          }),
        }),
      }),
      collectionId ? { data: envelope } : result,
    ).data.products;
    return {
      products: data.nodes,
      next: data.pageInfo.hasNextPage ? data.pageInfo.endCursor : null,
    };
  }
  async read(
    context: ProductContext,
    identifier: { id: string } | { handle: string },
  ) {
    const result = await this.query(
      context,
      `query RetailorProduct($identifier:ProductIdentifierInput!) {
      product:productByIdentifier(identifier:$identifier) { ${fields(65, 9)} } }`,
      { identifier },
    );
    if (hasErrors(result)) return deny("UPSTREAM_FAILED", 502);
    return checked(
      z.object({ data: z.object({ product: RemoteProductSchema.nullable() }) }),
      result,
    ).data.product;
  }
  private mutation(
    result: unknown,
    name: "productCreate" | "productSet",
  ): ProductMutation {
    const envelope = checked(
      z.object({
        data: z.record(z.string(), z.unknown()).nullable().optional(),
      }),
      result,
    );
    const payload = envelope.data?.[name];
    if (!payload) return { product: null, rejected: false, uncertain: true };
    const data = checked(
      z.object({
        product: RemoteProductSchema.nullable(),
        userErrors: UserErrorsSchema,
      }),
      payload,
    );
    return {
      product: data.product,
      rejected:
        !data.product && data.userErrors.length > 0 && !hasErrors(result),
      uncertain:
        hasErrors(result) || data.userErrors.length > 0 || !data.product,
    };
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
    const result = await this.query(
      context,
      `mutation RetailorStage($input:[StagedUploadInput!]!) {
      stagedUploadsCreate(input:$input) { stagedTargets { url resourceUrl parameters { name value } } userErrors {field message} } }`,
      {
        input: photos.map((photo) => ({
          filename: `retailor-${marker}-${photo.id}.webp`,
          mimeType: photo.mime,
          resource: "PRODUCT_IMAGE",
          httpMethod: "POST",
          fileSize: String(photo.bytes.byteLength),
        })),
      },
    );
    if (hasErrors(result)) return deny("UPSTREAM_FAILED", 502);
    const data = checked(
      z.object({
        data: z.object({
          stagedUploadsCreate: z.object({
            userErrors: UserErrorsSchema,
            stagedTargets: z
              .array(
                z.object({
                  url: z.string().max(4096),
                  resourceUrl: z.string().max(4096),
                  parameters: z
                    .array(
                      z.object({
                        name: z
                          .string()
                          .min(1)
                          .max(100)
                          .regex(/^[A-Za-z0-9_-]+$/u),
                        value: z.string().max(8192),
                      }),
                    )
                    .min(1)
                    .max(20),
                }),
              )
              .max(8),
          }),
        }),
      }),
      result,
    ).data.stagedUploadsCreate;
    if (data.userErrors.length || data.stagedTargets.length !== photos.length)
      return deny("UPSTREAM_FAILED", 502);
    const staged: StagedPhoto[] = [];
    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i]!,
        target = data.stagedTargets[i]!,
        url = stageUrl(target.url),
        resource = stageUrl(target.resourceUrl);
      if (
        url.origin !== resource.origin ||
        resource.pathname === "/" ||
        target.parameters.some((p) => p.name === "file") ||
        new Set(target.parameters.map((p) => p.name)).size !==
          target.parameters.length
      )
        return deny("UPSTREAM_FAILED", 502);
      const body = new FormData();
      for (const parameter of target.parameters)
        body.append(parameter.name, parameter.value);
      body.append(
        "file",
        new Blob([new Uint8Array(photo.bytes)], { type: photo.mime }),
        `retailor-${marker}-${photo.id}.webp`,
      );
      await context.admit();
      const controller = new AbortController(),
        timer = setTimeout(() => controller.abort(), SHOPIFY_LIMITS.providerMs);
      const signal = AbortSignal.any([context.signal, controller.signal]);
      try {
        const response = await this.http(url.href, {
          method: "POST",
          body,
          signal,
          redirect: "error",
        });
        await boundedBytes(response, 65536, signal);
        if (!response.ok) return deny("UPSTREAM_FAILED", 502);
        staged.push({ resourceUrl: resource.href, alt: photo.alt });
      } finally {
        clearTimeout(timer);
        controller.abort();
      }
    }
    return staged;
  }
  async create(
    context: ProductContext,
    product: WireProduct,
    handle: string,
    marker: string,
    photos: readonly StagedPhoto[],
    collectionId?: string,
  ) {
    const result = await this.query(
      context,
      `mutation RetailorCreate($product:ProductCreateInput!,$media:[CreateMediaInput!]) {
      productCreate(product:$product,media:$media) { product { ${fields(65, 9)} } userErrors { field message } } }`,
      {
        product: {
          title: product.title,
          descriptionHtml: product.descriptionHtml,
          productType: product.productType,
          status: "DRAFT",
          handle,
          tags: ["Retailor demo"],
          ...(collectionId ? { collectionsToJoin: [collectionId] } : {}),
          metafields: [
            {
              namespace: DEMO_NAMESPACE,
              key: DEMO_KEY,
              type: "single_line_text_field",
              value: marker,
            },
          ],
        },
        media: photos.map((photo) => ({
          originalSource: photo.resourceUrl,
          alt: photo.alt,
          mediaContentType: "IMAGE",
        })),
      },
    );
    return this.mutation(result, "productCreate");
  }
  async configure(context: ProductContext, id: string, product: WireProduct) {
    ShopifyProductIdSchema.parse(id);
    const result = await this.query(
      context,
      `mutation RetailorConfigure($id:ID!,$input:ProductSetInput!) {
      productSet(identifier:{id:$id},input:$input,synchronous:true) { product { ${fields(65, 9)} } userErrors {field message} } }`,
      {
        id,
        input: {
          title: product.title,
          descriptionHtml: product.descriptionHtml,
          productType: product.productType,
          status: "DRAFT",
          productOptions: [
            {
              name: "Colour",
              values: [...new Set(product.variants.map((v) => v.colour))].map(
                (name) => ({ name }),
              ),
            },
            {
              name: "Size",
              values: [...new Set(product.variants.map((v) => v.size))].map(
                (name) => ({ name }),
              ),
            },
          ],
          variants: product.variants.map((v) => ({
            ...(v.id ? { id: v.id } : {}),
            optionValues: [
              { optionName: "Colour", name: v.colour },
              { optionName: "Size", name: v.size },
            ],
            price: v.price,
            sku: v.sku,
          })),
        },
      },
    );
    return this.mutation(result, "productSet");
  }
  async remove(context: ProductContext, id: string) {
    ShopifyProductIdSchema.parse(id);
    const result = await this.query(
      context,
      `mutation RetailorRemove($id:ID!) {
      productDelete(input:{id:$id},synchronous:true) { deletedProductId userErrors {field message} } }`,
      { id },
    );
    if (hasErrors(result)) return deny("UPSTREAM_FAILED", 502);
    const data = checked(
      z.object({
        data: z.object({
          productDelete: z.object({
            deletedProductId: ShopifyProductIdSchema.nullable(),
            userErrors: UserErrorsSchema,
          }),
        }),
      }),
      result,
    ).data.productDelete;
    return !data.userErrors.length && data.deletedProductId === id;
  }
  async uninstall(context: ProductContext) {
    const result = await this.query(
      context,
      `mutation RetailorUninstall { appUninstall { app { id } userErrors { field message } } }`,
      {},
    );
    if (hasErrors(result)) return deny("UPSTREAM_FAILED", 502);
    const payload = checked(
      z.object({
        data: z.object({
          appUninstall: z.object({
            app: z.object({ id: z.string().max(100) }).nullable(),
            userErrors: UserErrorsSchema,
          }),
        }),
      }),
      result,
    ).data.appUninstall;
    if (payload.app && payload.userErrors.length === 0) return true;
    if (!payload.app && payload.userErrors.length > 0) return false;
    return deny("UPSTREAM_FAILED", 502);
  }
}
