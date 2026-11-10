import { describe, expect, it, vi } from "vitest";
import { LiveCollectionProvider } from "./collection-provider.js";
import { LiveProductProvider } from "./product-provider.js";
import type { ProductContext } from "./product-provider.js";

const intent = {
  marker: "a".repeat(64),
  handle: `retailor-${"a".repeat(64)}`,
  remoteId: null,
  dispatched: true,
  removed: false,
};
const remote = {
  id: "gid://shopify/Collection/12",
  handle: intent.handle,
  metafield: { value: intent.marker },
  products: { nodes: [], pageInfo: { hasNextPage: false } },
};
const context = (): ProductContext => ({
  shop: "test.myshopify.com",
  access: "test-private",
  signal: new AbortController().signal,
  admit: vi.fn(async () => {}),
});
describe("fixed collection and photo transport", () => {
  it("uses bounded read/create/delete operations, app ownership and shared admission without publishing", async () => {
    const graphql = vi
      .fn()
      .mockResolvedValueOnce({ data: { collectionByIdentifier: null } })
      .mockResolvedValueOnce({
        data: { collectionCreate: { collection: remote, userErrors: [] } },
      })
      .mockResolvedValueOnce({
        data: {
          collectionDelete: { deletedCollectionId: remote.id, userErrors: [] },
        },
      });
    const provider = new LiveCollectionProvider(graphql),
      ctx = context();
    expect(await provider.read(ctx, { handle: intent.handle })).toBeNull();
    expect(await provider.create(ctx, intent)).toEqual(remote);
    expect(await provider.remove(ctx, remote.id)).toBe(true);
    expect(ctx.admit).toHaveBeenCalledTimes(3);
    expect(graphql.mock.calls[0]![3]).toEqual({
      identifier: { handle: intent.handle },
    });
    expect(graphql.mock.calls[1]![3]).toMatchObject({
      collection: {
        title: "Retailor",
        handle: intent.handle,
        metafields: [
          {
            namespace: "$app:retailor_demo",
            key: "session_collection",
            value: intent.marker,
          },
        ],
      },
    });
    expect(graphql.mock.calls[0]![2]).toContain("products(first:11)");
    expect(JSON.stringify(graphql.mock.calls)).not.toMatch(
      /publishablePublish|ruleSet|productDelete/u,
    );
  });
  it("rejects GraphQL errors, oversized reads and unsuccessful deletion", async () => {
    const graphql = vi
      .fn()
      .mockResolvedValueOnce({
        errors: [{ message: "failure" }],
        data: { collectionByIdentifier: remote },
      })
      .mockResolvedValueOnce({
        data: {
          collectionByIdentifier: {
            ...remote,
            products: {
              nodes: Array(12).fill({ id: "gid://shopify/Product/1" }),
              pageInfo: { hasNextPage: false },
            },
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          collectionDelete: {
            deletedCollectionId: null,
            userErrors: [{ message: "denied" }],
          },
        },
      });
    const provider = new LiveCollectionProvider(graphql),
      ctx = context();
    await expect(provider.read(ctx, { id: remote.id })).rejects.toMatchObject({
      code: "UPSTREAM_FAILED",
    });
    await expect(provider.read(ctx, { id: remote.id })).rejects.toMatchObject({
      code: "UPSTREAM_FAILED",
    });
    expect(await provider.remove(ctx, remote.id)).toBe(false);
  });
  it("attaches staged photos and the owned collection in the same DRAFT create", async () => {
    const graphql = vi.fn(async () => ({
      data: {
        productCreate: {
          product: null,
          userErrors: [{ message: "test rejection" }],
        },
      },
    }));
    const provider = new LiveProductProvider(graphql);
    await provider.create(
      context(),
      {
        title: "Tee",
        description: "Cotton",
        descriptionHtml: "<p>Cotton</p>",
        productType: "Tees",
        variants: [],
      },
      "retailor-demo-test",
      intent.marker,
      [
        {
          resourceUrl:
            "https://shopify-staged-uploads.storage.googleapis.com/image.webp",
          alt: "Retailor supplied view",
        },
      ],
      remote.id,
    );
    const call = graphql.mock.calls[0] as unknown as [
      string,
      string,
      string,
      Record<string, unknown>,
    ];
    expect(call[3]).toMatchObject({
      product: { status: "DRAFT", collectionsToJoin: [remote.id] },
      media: [
        {
          originalSource:
            "https://shopify-staged-uploads.storage.googleapis.com/image.webp",
          alt: "Retailor supplied view",
          mediaContentType: "IMAGE",
        },
      ],
    });
    expect(JSON.stringify(call[3])).not.toMatch(
      /blob:|localhost|127\.0\.0\.1/u,
    );
  });
  it("distinguishes explicit rejection from an empty uncertain create response", async () => {
    const graphql = vi
      .fn()
      .mockResolvedValueOnce({
        data: {
          collectionCreate: {
            collection: null,
            userErrors: [{ message: "permission denied" }],
          },
        },
      })
      .mockResolvedValueOnce({
        data: { collectionCreate: { collection: null, userErrors: [] } },
      });
    const provider = new LiveCollectionProvider(graphql);
    expect(await provider.create(context(), intent)).toBeNull();
    await expect(provider.create(context(), intent)).rejects.toMatchObject({
      code: "UPSTREAM_FAILED",
    });
  });
});
