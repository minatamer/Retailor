import { describe, it, expect } from "vitest";
import { environment, file } from "../../../test/workspace";
import {
  BrowseSchema,
  collection,
  EMPTY_FILTERS,
  filterOptions,
  INITIAL_BROWSE,
  storeItems,
  matchingOption,
} from "./browse";
import type { CommerceGraph } from "@retailor/contracts/commerce";

async function catalogue() {
  const env = environment(),
    controller = await env.open();
  await controller.photos.add([file("jeans"), file("another"), file("hoodie")]);
  await controller.draftCatalogue();
  controller.publish();
  return { env, controller, graph: controller.getSnapshot().state.graph };
}
describe("one current catalogue across every storefront family", () => {
  it("requires the same variant to satisfy colour, size, price and stock", async () => {
    const { env, controller, graph } = await catalogue();
    try {
      const first = graph.products[0]!;
      const changed: CommerceGraph = {
        ...graph,
        products: [
          {
            ...first,
            variants: first.variants.map((variant, index) => ({
              ...variant,
              size: index === 0 ? "S" : "M",
              colour: index === 0 ? "Red" : "Blue",
              price: index === 0 ? 1000 : 2000,
              openingStock: index === 1 ? 0 : 3,
            })),
          },
        ],
      };
      const items = storeItems(changed, controller.photos.availableIds());
      expect(
        collection(items, {
          sort: "recommended",
          filters: { ...EMPTY_FILTERS, colour: "Red", size: "M" },
        }),
      ).toEqual([]);
      expect(
        collection(items, {
          sort: "recommended",
          filters: {
            ...EMPTY_FILTERS,
            colour: "Blue",
            size: "M",
            available: true,
            maxPrice: 2000,
          },
        }),
      ).toHaveLength(1);
      expect(matchingOption(items[0]!, "M")?.variant.id).toBe(
        first.variants[2]!.id,
      );
      expect(
        collection(items, {
          sort: "recommended",
          filters: {
            ...EMPTY_FILTERS,
            colour: "Blue",
            size: "M",
            available: true,
            maxPrice: 1999,
          },
        }),
      ).toHaveLength(0);
      changed.products[0]!.variants[2]!.openingStock = 0;
      expect(
        collection(storeItems(changed, controller.photos.availableIds()), {
          sort: "recommended",
          filters: {
            ...EMPTY_FILTERS,
            colour: "Blue",
            size: "M",
            available: true,
          },
        }),
      ).toHaveLength(0);
    } finally {
      env.dispose();
    }
  });
  it("exposes real options, honest missing photos and no archived/unknown filter facts", async () => {
    const { env, controller, graph } = await catalogue();
    try {
      const current = storeItems(graph, controller.photos.availableIds());
      expect(filterOptions(current).colours).toEqual([]);
      expect(filterOptions(current).sizes).toContain("28/30");
      expect(
        collection(current, {
          sort: "recommended",
          filters: { ...EMPTY_FILTERS, category: "hoodies" },
        }).map(({ product }) => product.id),
      ).toEqual([graph.products[2]!.id]);
      const changed = {
        ...graph,
        products: graph.products.map((product, index) => ({
          ...product,
          archived: index === 0,
        })),
      };
      const missing = storeItems(changed, new Set<string>());
      expect(missing.every((item) => !item.available)).toBe(true);
      expect(
        collection(missing, { sort: "recommended", filters: EMPTY_FILTERS }),
      ).toHaveLength(2);
      expect(
        collection(missing, {
          sort: "recommended",
          filters: { ...EMPTY_FILTERS, available: true },
        }),
      ).toEqual([]);
      expect(missing[0]!.product).toEqual(changed.products[0]);
      const noOptions = storeItems(
        {
          ...graph,
          products: [
            {
              ...graph.products[0]!,
              variants: graph.products[0]!.variants.map((variant) => ({
                ...variant,
                archived: true,
              })),
            },
          ],
        },
        controller.photos.availableIds(),
      );
      expect(
        collection(noOptions, { sort: "recommended", filters: EMPTY_FILTERS }),
      ).toHaveLength(1);
      expect(noOptions[0]!.price).toBeNull();
      expect(noOptions[0]!.available).toBe(false);
    } finally {
      env.dispose();
    }
  });
  it("projects exact current stock, preserves authored order and never mutates source records", async () => {
    const { env, controller, graph } = await catalogue();
    try {
      const before = JSON.stringify(graph),
        first = graph.products[0]!.variants[0]!;
      const adjusted = {
        ...graph,
        movements: [
          {
            id: "stock_change",
            variantId: first.id,
            units: -7,
            kind: "correction" as const,
            at: graph.asOf,
            sourceId: "stock_change",
            origin: "guest_action" as const,
            reason: "Demo stock correction",
          },
        ],
      };
      // Selector reads current movements; the independent expected value is opening 10 minus 7.
      const items = storeItems(adjusted, controller.photos.availableIds());
      expect(items[0]!.variants[0]!.stock).toBe(3);
      expect(
        collection(items, { sort: "recommended", filters: EMPTY_FILTERS }).map(
          ({ product }) => product.id,
        ),
      ).toEqual(graph.products.map((product) => product.id));
      expect(
        collection(items, { sort: "price-low", filters: EMPTY_FILTERS }).map(
          ({ price }) => price,
        ),
      ).toEqual([6400, 6800, 7400]);
      expect(JSON.stringify(graph)).toBe(before);
    } finally {
      env.dispose();
    }
  });
  it("bounds and validates presentation without arbitrary categories or invalid money ranges", () => {
    expect(
      BrowseSchema.safeParse({
        ...INITIAL_BROWSE,
        filters: { ...EMPTY_FILTERS, category: "shoes" },
      }).success,
    ).toBe(false);
    expect(
      BrowseSchema.safeParse({
        ...INITIAL_BROWSE,
        filters: { ...EMPTY_FILTERS, minPrice: 2000, maxPrice: 1999 },
      }).success,
    ).toBe(false);
    expect(
      BrowseSchema.safeParse({
        ...INITIAL_BROWSE,
        filters: { ...EMPTY_FILTERS, search: "x".repeat(101) },
      }).success,
    ).toBe(false);
  });
});
