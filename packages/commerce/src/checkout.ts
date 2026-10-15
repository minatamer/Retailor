import type { CommerceGraph } from "@retailor/contracts/commerce";
import type { CurrencyScope } from "@retailor/contracts/currency";
import { exactProduct, exactSum } from "./allocation.js";
import {
  bagEntries,
  bagPromoDiscount,
  displayedBag,
  BAG_PROMO_CODE,
} from "./shopping.js";

/** Derive Stripe's nonnegative items/shipping and single discount without changing the captured quote. */
export function checkoutQuote(
  graph: CommerceGraph,
  photoIds: ReadonlySet<string>,
  scope: CurrencyScope,
  promoApplied: boolean,
) {
  const entries = bagEntries(graph, photoIds);
  if (
    !entries.length ||
    entries.some((entry) => entry.unavailable || !entry.photoId)
  )
    throw new RangeError("Unavailable bag");
  const discount = promoApplied ? bagPromoDiscount(entries, BAG_PROMO_CODE) : 0;
  const projected = displayedBag(entries, scope, discount);
  const component = (id: string) =>
    projected.rows.find((row) => row.id === id)?.amount ?? 0;
  const lines = entries.map((entry, index) => ({
    variantId: entry.variantId,
    photoId: entry.photoId!,
    name: `${entry.title} · ${entry.colour} · ${entry.size}`,
    quantity: entry.quantity,
    unitAmount: component(`line_${index}`) / entry.quantity,
  }));
  const shipping = component("delivery");
  const adjustment = Math.max(0, projected.roundingAdjustment);
  const discountAmount =
    -component("discount") + Math.max(0, -projected.roundingAdjustment);
  const gross = exactSum(
    lines.map((line) => exactProduct(line.quantity, line.unitAmount)),
  );
  if (
    lines.some(
      (line) => !Number.isSafeInteger(line.unitAmount) || line.unitAmount < 0,
    ) ||
    discountAmount > gross ||
    projected.total < 50 ||
    projected.total > 99_999_999 ||
    gross + shipping + adjustment - discountAmount !== projected.total
  )
    throw new RangeError("Unrepresentable sandbox quote");
  return {
    lines,
    shipping,
    adjustment,
    discountAmount,
    discountName: promoApplied ? "THREAD10" : "Currency rounding",
    currency: scope.currency,
    total: projected.total,
  };
}
export type CheckoutQuote = ReturnType<typeof checkoutQuote>;
