import { parseDisplay } from "@retailor/commerce/currency";
import {
  collection,
  filterOptions,
  FiltersSchema,
  SIZING_LABELS,
} from "./browse";
import type { Filters, StoreItem } from "./browse";

/** Counts use the same matching variant and exact displayed prices as the collection. */
export function facetCounts(
  items: readonly StoreItem[],
  filters: Filters,
  displayPrice: (price: number) => number = (value) => value,
) {
  const options = filterOptions(items),
    prices = new Map<number, number>();
  const displayed = (price: number) => {
    const cached = prices.get(price);
    if (cached !== undefined) return cached;
    const value = displayPrice(price);
    prices.set(price, value);
    return value;
  };
  const count = (patch: Partial<Filters>) =>
    collection(
      items,
      { filters: { ...filters, ...patch }, sort: "recommended" },
      displayed,
    ).length;
  const sizes = options.sizes.map((value) => {
    const systems = [
      ...new Set(
        items
          .filter(
            (item) =>
              !item.product.archived &&
              item.variants.some(({ variant }) => variant.size === value),
          )
          .map((item) => item.product.sizingSystemId),
      ),
    ];
    return {
      value,
      count: count({ size: value }),
      group:
        systems.length === 1
          ? SIZING_LABELS[systems[0]!]
          : "Shared size labels",
    };
  });
  return {
    allCategories: count({ category: null }),
    allColours: count({ colour: null }),
    allSizes: count({ size: null }),
    categories: options.categories.map((value) => ({
      value,
      count: count({ category: value }),
    })),
    colours: options.colours.map((value) => ({
      value,
      count: count({ colour: value }),
    })),
    sizeGroups: [...new Set(sizes.map((size) => size.group))].map((label) => ({
      label,
      options: sizes.filter((size) => size.group === label),
    })),
  };
}

/** Transient form text never commits a loose float or a reversed/oversized range. */
export function parseFilterPrices(
  filters: Filters,
  minimumText: string,
  maximumText: string,
) {
  const minimum = minimumText.trim(),
    maximum = maximumText.trim();
  const min = minimum ? parseDisplay(minimum) : null,
    max = maximum ? parseDisplay(maximum) : null;
  if ((min && !min.ok) || (max && !max.ok))
    return {
      ok: false as const,
      message: "Use a valid price with up to two decimal places.",
    };
  const parsed = FiltersSchema.safeParse({
    ...filters,
    minPrice: min?.ok ? min.value : null,
    maxPrice: max?.ok ? max.value : null,
  });
  if (!parsed.success)
    return {
      ok: false as const,
      message: "Minimum price must be no greater than maximum.",
    };
  return { ok: true as const, filters: parsed.data };
}
