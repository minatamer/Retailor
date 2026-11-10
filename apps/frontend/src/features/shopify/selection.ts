import type { Product } from "@retailor/contracts/product";

/** Only selectable garments enter a review; preserve catalogue order and the lifetime cap. */
export function exportSelection(
  products: readonly Product[],
  tracked: ReadonlySet<string>,
  photos: ReadonlySet<string>,
  remaining: number,
  selected?: readonly string[],
) {
  const requested = selected ? new Set(selected) : null;
  return products
    .filter(
      (product) =>
        !product.archived &&
        !tracked.has(product.id) &&
        product.imageIds.length > 0 &&
        product.imageIds.every((id) => photos.has(id)) &&
        product.variants.some((variant) => !variant.archived) &&
        (!requested || requested.has(product.id)),
    )
    .slice(0, Math.max(0, Math.min(10, remaining)))
    .map((product) => product.id);
}
