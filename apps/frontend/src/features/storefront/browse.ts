import { DisplayMinorSchema } from "@retailor/contracts/currency";
import { z } from "zod";
import { IdSchema } from "@retailor/contracts/core";
import { CategorySchema } from "@retailor/contracts/product";
import type { Product, Variant } from "@retailor/contracts/product";
import type { CommerceGraph } from "@retailor/contracts/commerce";
import { stockOf } from "@retailor/commerce/selectors";

export const FiltersSchema = z
  .strictObject({
    search: z.string().max(100),
    category: CategorySchema.nullable(),
    colour: z.string().min(1).max(32).nullable(),
    size: z.string().min(1).max(16).nullable(),
    minPrice: DisplayMinorSchema.nullable(),
    maxPrice: DisplayMinorSchema.nullable(),
    available: z.boolean(),
  })
  .refine(
    (value) =>
      value.minPrice === null ||
      value.maxPrice === null ||
      value.minPrice <= value.maxPrice,
    "Minimum price exceeds maximum.",
  );
export const EMPTY_FILTERS = FiltersSchema.parse({
  search: "",
  category: null,
  colour: null,
  size: null,
  minPrice: null,
  maxPrice: null,
  available: false,
});
export const BrowseSchema = z.strictObject({
  page: z.enum(["home", "collection", "product"]),
  productId: IdSchema.nullable(),
  variantId: IdSchema.nullable(),
  filters: FiltersSchema,
  sort: z.enum(["recommended", "price-low", "price-high", "title"]),
});
export type BrowseState = z.infer<typeof BrowseSchema>;
export type Filters = z.infer<typeof FiltersSchema>;
export const INITIAL_BROWSE: BrowseState = {
  page: "home",
  productId: null,
  variantId: null,
  filters: EMPTY_FILTERS,
  sort: "recommended",
};
export interface StoreItem {
  product: Product;
  variants: readonly { variant: Variant; stock: number }[];
  photoIds: readonly string[];
  price: number | null;
  available: boolean;
}
export function knownColour(value: string) {
  return !/^(demo colou?r|unconfirmed( colou?r)?|unknown|not supplied)$/iu.test(
    value.trim(),
  );
}
/** Current projection only: history, stock and prices remain in the domain graph. */
export function storeItems(
  graph: CommerceGraph,
  availablePhotos: ReadonlySet<string>,
): StoreItem[] {
  return graph.products.map((product) => {
    const variants = product.variants
      .filter((variant) => !variant.archived)
      .map((variant) => ({ variant, stock: stockOf(graph, variant.id) }));
    const photoIds = product.imageIds.filter((id) => availablePhotos.has(id));
    return {
      product,
      variants,
      photoIds,
      price: variants.length
        ? Math.min(...variants.map(({ variant }) => variant.price))
        : null,
      available:
        !product.archived &&
        photoIds.length > 0 &&
        variants.some(({ stock }) => stock > 0),
    };
  });
}
export function collection(
  items: readonly StoreItem[],
  browse: Pick<BrowseState, "filters" | "sort">,
  displayPrice: (cents: number) => number = (value) => value,
) {
  const { filters: f, sort } = browse;
  const query = f.search.trim().toLocaleLowerCase("en-US");
  const result = items.filter(
    ({ product, variants, available }) =>
      !product.archived &&
      (!query ||
        `${product.title} ${product.category} ${product.description}`
          .toLocaleLowerCase("en-US")
          .includes(query)) &&
      (!f.category || product.category === f.category) &&
      (!f.available || available) &&
      ((!variants.length &&
        !f.colour &&
        !f.size &&
        f.minPrice === null &&
        f.maxPrice === null &&
        !f.available) ||
        variants.some(
          ({ variant: v, stock }) =>
            (!f.colour || (knownColour(v.colour) && v.colour === f.colour)) &&
            (!f.size || v.size === f.size) &&
            (f.minPrice === null || displayPrice(v.price) >= f.minPrice) &&
            (f.maxPrice === null || displayPrice(v.price) <= f.maxPrice) &&
            (!f.available || stock > 0),
        )),
  );
  if (sort === "price-low")
    result.sort(
      (a, b) =>
        (a.price === null ? Infinity : displayPrice(a.price)) -
        (b.price === null ? Infinity : displayPrice(b.price)),
    );
  if (sort === "price-high")
    result.sort(
      (a, b) =>
        (b.price === null ? -Infinity : displayPrice(b.price)) -
        (a.price === null ? -Infinity : displayPrice(a.price)),
    );
  if (sort === "title")
    result.sort((a, b) => a.product.title.localeCompare(b.product.title, "en"));
  return result;
}
/** Prefer an available option without concealing a real sold-out matching option. */
export function matchingOption(item: StoreItem, size: string, colour?: string) {
  const matches = item.variants.filter(
    ({ variant }) =>
      variant.size === size && (!colour || variant.colour === colour),
  );
  return matches.find(({ stock }) => stock > 0) ?? matches[0];
}
export function filterOptions(items: readonly StoreItem[]) {
  const current = items.filter(({ product }) => !product.archived);
  return {
    categories: [...new Set(current.map(({ product }) => product.category))],
    colours: [
      ...new Set(
        current.flatMap(({ variants }) =>
          variants.map(({ variant }) => variant.colour).filter(knownColour),
        ),
      ),
    ],
    sizes: [
      ...new Set(
        current.flatMap(({ variants }) =>
          variants.map(({ variant }) => variant.size),
        ),
      ),
    ],
  };
}
export const SIZING_LABELS: Record<Product["sizingSystemId"], string> = {
  "alpha-demo": "Alpha sizes",
  "waist-inseam-demo": "Waist / inseam",
  "regional-demo": "Regional sizes",
  "chest-length-demo": "Chest / length",
  "one-size-demo": "One size",
  "pending-demo": "Options awaiting confirmation",
};
