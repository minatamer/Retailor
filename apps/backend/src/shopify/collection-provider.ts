import { z } from "zod";
import { deny } from "../security/errors.js";
import type { GraphqlPort, ProductContext } from "./product-provider.js";

const id = z
  .string()
  .max(100)
  .regex(/^gid:\/\/shopify\/Collection\/\d+$/u);
export const CollectionIntentSchema = z.strictObject({
  marker: z.string().regex(/^[a-f0-9]{64}$/u),
  handle: z.string().max(100),
  remoteId: id.nullable(),
  dispatched: z.boolean(),
  removed: z.boolean(),
});
export type CollectionIntent = z.infer<typeof CollectionIntentSchema>;
const RemoteCollectionSchema = z.object({
  id,
  handle: z.string().max(255),
  metafield: z.object({ value: z.string().max(64) }).nullable(),
  products: z.object({
    nodes: z.array(z.object({ id: z.string().max(100) })).max(11),
    pageInfo: z.object({ hasNextPage: z.boolean() }),
  }),
});
export type RemoteCollection = z.infer<typeof RemoteCollectionSchema>;
export interface CollectionProvider {
  read(
    context: ProductContext,
    identifier: { id: string } | { handle: string },
  ): Promise<RemoteCollection | null>;
  create(
    context: ProductContext,
    intent: CollectionIntent,
  ): Promise<RemoteCollection | null>;
  remove(context: ProductContext, id: string): Promise<boolean>;
}
const fields = `id handle metafield(namespace:"$app:retailor_demo",key:"session_collection") { value }
  products(first:11) { nodes { id } pageInfo { hasNextPage } }`;
const errors = z.array(z.object({ message: z.string().max(2000) })).max(64);

export class LiveCollectionProvider implements CollectionProvider {
  constructor(private readonly graphql: GraphqlPort) {}
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
  async read(
    context: ProductContext,
    identifier: { id: string } | { handle: string },
  ) {
    const result = await this.query(
      context,
      `query RetailorCollection($identifier:CollectionIdentifierInput!) { collectionByIdentifier(identifier:$identifier) { ${fields} } }`,
      { identifier },
    );
    const parsed = z
      .object({
        data: z.object({
          collectionByIdentifier: RemoteCollectionSchema.nullable(),
        }),
      })
      .safeParse(result);
    if (
      !parsed.success ||
      (result && typeof result === "object" && "errors" in result)
    )
      return deny("UPSTREAM_FAILED", 502);
    return parsed.data.data.collectionByIdentifier;
  }
  async create(context: ProductContext, intent: CollectionIntent) {
    const result = await this.query(
      context,
      `mutation RetailorCollectionCreate($collection:CollectionCreateInput!) { collectionCreate(collection:$collection) { collection { ${fields} } userErrors { message } } }`,
      {
        collection: {
          title: "Retailor",
          handle: intent.handle,
          descriptionHtml:
            "<p>Temporary Retailor demo drafts. Removed when the demo ends.</p>",
          metafields: [
            {
              namespace: "$app:retailor_demo",
              key: "session_collection",
              type: "single_line_text_field",
              value: intent.marker,
            },
          ],
        },
      },
    );
    const parsed = z
      .object({
        data: z.object({
          collectionCreate: z.object({
            collection: RemoteCollectionSchema.nullable(),
            userErrors: errors,
          }),
        }),
      })
      .safeParse(result);
    if (
      !parsed.success ||
      (result && typeof result === "object" && "errors" in result)
    )
      return deny("UPSTREAM_FAILED", 502);
    const outcome = parsed.data.data.collectionCreate;
    // Null is a definite rejection only with Shopify userErrors. An empty or
    // malformed success remains uncertain and must never enable a duplicate.
    if (!outcome.collection && !outcome.userErrors.length)
      return deny("UPSTREAM_FAILED", 502);
    return outcome.collection;
  }
  async remove(context: ProductContext, collectionId: string) {
    const result = await this.query(
      context,
      `mutation RetailorCollectionDelete($input:CollectionDeleteInput!) { collectionDelete(input:$input) { deletedCollectionId userErrors { message } } }`,
      { input: { id: collectionId } },
    );
    const parsed = z
      .object({
        data: z.object({
          collectionDelete: z.object({
            deletedCollectionId: id.nullable(),
            userErrors: errors,
          }),
        }),
      })
      .safeParse(result);
    if (
      !parsed.success ||
      (result && typeof result === "object" && "errors" in result)
    )
      return deny("UPSTREAM_FAILED", 502);
    return (
      !parsed.data.data.collectionDelete.userErrors.length &&
      parsed.data.data.collectionDelete.deletedCollectionId === collectionId
    );
  }
}
