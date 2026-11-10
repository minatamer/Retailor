import { describe, expect, it, vi } from "vitest";
import { LiveProductProvider, productDescription } from "./product-provider.js";
import type { ProductContext, WireProduct } from "./product-provider.js";

const wire: WireProduct = {
  title: "Retailor demo — Tee",
  description: "Temporary demo",
  descriptionHtml: "<p>Temporary demo</p>",
  productType: "Tees",
  variants: [
    {
      sourceId: "a",
      colour: "Ivory",
      size: "S",
      sku: "TEE-S",
      price: "29.99",
      id: "gid://shopify/ProductVariant/2",
    },
  ],
};
const context = (): ProductContext => ({
  shop: "test.myshopify.com",
  access: "private-access-token",
  signal: new AbortController().signal,
  admit: vi.fn(async () => {}),
});

describe("fixed Shopify product transport", () => {
  it("sends exact prices, IDs and options without inventory, cost or publish operations", async () => {
    const graphql = vi.fn(async () => ({
      data: {
        productSet: {
          product: null,
          userErrors: [{ message: "Invalid test field" }],
        },
      },
    }));
    const provider = new LiveProductProvider(graphql);
    const result = await provider.configure(
      context(),
      "gid://shopify/Product/1",
      wire,
    );
    expect(result).toEqual({ product: null, rejected: true, uncertain: true });
    const call = graphql.mock.calls[0] as unknown as [
      string,
      string,
      string,
      Record<string, unknown>,
    ];
    expect(call[2]).toContain("identifier:{id:$id}");
    expect(call[3]).toMatchObject({
      id: "gid://shopify/Product/1",
      input: {
        status: "DRAFT",
        variants: [
          {
            id: "gid://shopify/ProductVariant/2",
            sku: "TEE-S",
            price: "29.99",
            optionValues: [
              { optionName: "Colour", name: "Ivory" },
              { optionName: "Size", name: "S" },
            ],
          },
        ],
      },
    });
    expect(JSON.stringify(call[3])).not.toMatch(
      /inventory|cost|publish|tax|discount/iu,
    );
  });
  it("keeps top-level mutation failures uncertain and never treats HTTP data as success", async () => {
    const graphql = vi.fn(async () => ({
      errors: [{ message: "Throttle" }],
      data: null,
    }));
    const provider = new LiveProductProvider(graphql);
    expect(
      await provider.create(
        context(),
        wire,
        "retailor-demo-test",
        "a".repeat(64),
        [],
      ),
    ).toEqual({ product: null, rejected: false, uncertain: true });
    expect(graphql).toHaveBeenCalledTimes(1);
    await expect(provider.list(context(), null)).rejects.toMatchObject({
      code: "UPSTREAM_FAILED",
    });
    expect(productDescription("<script>bad</script>").html).not.toContain(
      "<script>",
    );
  });
  it("stages only sanitized bytes to allowed Shopify hosts without sending app tokens", async () => {
    const graphql = vi.fn(async () => ({
      data: {
        stagedUploadsCreate: {
          userErrors: [],
          stagedTargets: [
            {
              url: "https://shopify-staged-uploads.storage.googleapis.com/",
              resourceUrl:
                "https://shopify-staged-uploads.storage.googleapis.com/demo/image.webp",
              parameters: [{ name: "key", value: "demo/image.webp" }],
            },
          ],
        },
      },
    }));
    const http = vi.fn<typeof fetch>(
      async () => new Response(null, { status: 204 }),
    );
    const provider = new LiveProductProvider(graphql, http);
    const ctx = context();
    expect(
      await provider.stage(
        ctx,
        [
          {
            id: "photo_a",
            bytes: new Uint8Array([1, 2, 3]),
            mime: "image/webp",
            alt: "owned-alt",
          },
        ],
        "a".repeat(64),
      ),
    ).toEqual([
      {
        resourceUrl:
          "https://shopify-staged-uploads.storage.googleapis.com/demo/image.webp",
        alt: "owned-alt",
      },
    ]);
    const options = http.mock.calls[0]![1]!;
    expect(options.redirect).toBe("error");
    expect(options.headers).toBeUndefined();
    expect(options.body).toBeInstanceOf(FormData);
    const file = (options.body as FormData).get("file") as File;
    expect(new Uint8Array(await file.arrayBuffer())).toEqual(
      new Uint8Array([1, 2, 3]),
    );
    expect(ctx.admit).toHaveBeenCalledTimes(2);
    graphql.mockResolvedValueOnce({
      data: {
        stagedUploadsCreate: {
          userErrors: [],
          stagedTargets: [
            {
              url: "https://evil.example/",
              resourceUrl: "https://evil.example/photo.webp",
              parameters: [{ name: "key", value: "x" }],
            },
          ],
        },
      },
    });
    await expect(
      provider.stage(
        ctx,
        [
          {
            id: "photo_a",
            bytes: new Uint8Array([1]),
            mime: "image/webp",
            alt: "owned-alt",
          },
        ],
        "a".repeat(64),
      ),
    ).rejects.toMatchObject({ code: "UPSTREAM_FAILED" });
    expect(http).toHaveBeenCalledTimes(1);
  });
});
