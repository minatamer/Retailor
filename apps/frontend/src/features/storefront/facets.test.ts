import { convertMinor } from "@retailor/commerce/currency";
import type { CommerceGraph } from "@retailor/contracts/commerce";
import { describe, expect, it } from "vitest";
import { environment, file } from "../../../test/workspace";
import { EMPTY_FILTERS, storeItems } from "./browse";
import { facetCounts, parseFilterPrices } from "./facets";

async function catalogue() {
  const env = environment(),
    controller = await env.open();
  await controller.photos.add([file("jeans"), file("another"), file("hoodie")]);
  await controller.draftCatalogue();
  controller.publish();
  return { env, controller, graph: controller.getSnapshot().state.graph };
}

describe("visual facet counts and exact transient price input", () => {
  it("keeps other selections and requires one variant to satisfy colour, size and stock", async () => {
    const { env, controller, graph } = await catalogue();
    try {
      const first = graph.products[0]!;
      const changed: CommerceGraph = {
        ...graph,
        products: [
          {
            ...first,
            sizingSystemId: "alpha-demo",
            variants: first.variants.map((variant, index) => ({
              ...variant,
              size: index === 0 ? "S" : "M",
              colour: index === 0 ? "Red" : "Blue",
              openingStock: index === 1 ? 0 : 3,
            })),
          },
        ],
      };
      const items = storeItems(changed, controller.photos.availableIds());
      const facets = facetCounts(items, {
        ...EMPTY_FILTERS,
        size: "M",
        available: true,
      });
      expect(facets.colours).toEqual([
        { value: "Red", count: 0 },
        { value: "Blue", count: 1 },
      ]);
      const red = facetCounts(items, {
        ...EMPTY_FILTERS,
        colour: "Red",
        size: "M",
        available: true,
      });
      expect(red.allSizes).toBe(1);
      expect(red.categories[0]!.count).toBe(0);
      expect(red.sizeGroups[0]!.options).toEqual([
        { value: "S", count: 1, group: "Alpha sizes" },
        { value: "M", count: 0, group: "Alpha sizes" },
      ]);
      changed.products[0]!.variants[2]!.openingStock = 0;
      expect(
        facetCounts(storeItems(changed, controller.photos.availableIds()), {
          ...EMPTY_FILTERS,
          size: "M",
          available: true,
        }).allColours,
      ).toBe(0);
    } finally {
      env.dispose();
    }
  });
  it("excludes archives, omits unknown colours and counts missing photos only when availability is off", async () => {
    const { env, controller, graph } = await catalogue();
    try {
      const changed = {
        ...graph,
        products: graph.products.map((product, index) => ({
          ...product,
          archived: index === 0,
        })),
      };
      const items = storeItems(changed, new Set());
      const facets = facetCounts(items, EMPTY_FILTERS);
      expect(facets.allCategories).toBe(2);
      expect(facets.colours).toEqual([]);
      expect(facets.categories.map(({ value }) => value)).toEqual([
        "jeans",
        "hoodies",
      ]);
      expect(
        facetCounts(items, { ...EMPTY_FILTERS, available: true }).allCategories,
      ).toBe(0);
      expect(
        facetCounts(storeItems(changed, controller.photos.availableIds()), {
          ...EMPTY_FILTERS,
          available: true,
        }).allCategories,
      ).toBe(2);
    } finally {
      env.dispose();
    }
  });
  it("counts inclusive rounded displayed EUR prices without changing source prices or counting variants twice", async () => {
    const { env, controller, graph } = await catalogue();
    try {
      const changed = {
        ...graph,
        products: graph.products.map((product, index) => ({
          ...product,
          variants: product.variants.map((variant) => ({
            ...variant,
            price: [15999, 16000, 16001][index]!,
          })),
        })),
      };
      const before = JSON.stringify(changed);
      const facets = facetCounts(
        storeItems(changed, controller.photos.availableIds()),
        { ...EMPTY_FILTERS, minPrice: 8000, maxPrice: 8000 },
        (cents) => convertMinor(cents, "0.5"),
      );
      expect(facets.allCategories).toBe(2);
      expect(facets.categories).toEqual([
        { value: "jeans", count: 2 },
        { value: "hoodies", count: 0 },
      ]);
      expect(JSON.stringify(changed)).toBe(before);
    } finally {
      env.dispose();
    }
  });
  it("groups real size systems and exposes a shared label once without guessing fit or measurements", async () => {
    const { env, controller, graph } = await catalogue();
    try {
      const changed = {
        ...graph,
        products: graph.products.map((product, index) => ({
          ...product,
          sizingSystemId:
            index === 2 ? ("regional-demo" as const) : ("alpha-demo" as const),
          variants: product.variants.map((variant, number) => ({
            ...variant,
            size: number === 0 ? "M" : index === 2 ? "40" : "S",
          })),
        })),
      };
      const groups = facetCounts(
        storeItems(changed, controller.photos.availableIds()),
        EMPTY_FILTERS,
      ).sizeGroups;
      expect(groups.map(({ label }) => label)).toEqual([
        "Shared size labels",
        "Alpha sizes",
        "Regional sizes",
      ]);
      expect(
        groups.flatMap(({ options }) => options.map(({ value }) => value)),
      ).toEqual(["M", "S", "40"]);
      expect(groups[0]!.options[0]!.count).toBe(3);
    } finally {
      env.dispose();
    }
  });
  it("accepts exact decimal boundaries and refuses reversed, negative, exponent, oversized or fractional-cent prices", () => {
    expect(parseFilterPrices(EMPTY_FILTERS, "", "")).toEqual({
      ok: true,
      filters: EMPTY_FILTERS,
    });
    expect(parseFilterPrices(EMPTY_FILTERS, " 0.01 ", "49.99")).toEqual({
      ok: true,
      filters: { ...EMPTY_FILTERS, minPrice: 1, maxPrice: 4999 },
    });
    expect(parseFilterPrices(EMPTY_FILTERS, "50", "49.99").ok).toBe(false);
    for (const invalid of [
      "-1",
      "1e3",
      "1.001",
      "999999999999999",
      "00.01",
      "abc",
    ]) {
      expect(parseFilterPrices(EMPTY_FILTERS, invalid, "").ok).toBe(false);
      expect(parseFilterPrices(EMPTY_FILTERS, "", invalid).ok).toBe(false);
    }
  });
});
