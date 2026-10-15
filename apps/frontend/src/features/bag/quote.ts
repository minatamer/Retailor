import { ZodError } from "zod";
import { MinorAmountSchema, MAX_MINOR_AMOUNT } from "@retailor/contracts/core";
import type { Order, CommerceGraph } from "@retailor/contracts/commerce";
import type { CurrencyScope } from "@retailor/contracts/currency";
import {
  exactSum,
  exactProduct,
  roundRatio,
} from "@retailor/commerce/allocation";
import { stockOf } from "@retailor/commerce/selectors";
import { projectComponents } from "@retailor/commerce/currency";
import { colourImageIds } from "@retailor/contracts/product";
export interface BagEntry {
  variantId: string;
  productId: string | null;
  title: string;
  size: string;
  colour: string;
  photoId: string | null;
  quantity: number;
  unitPrice: number;
  previousPrice: number;
  unitCost: number;
  stock: number;
  unavailable: string | null;
}
export const BAG_PROMO_CODE = "THREAD10";
export function bagPromoDiscount(
  entries: readonly Pick<BagEntry, "unitPrice" | "quantity">[],
  code: string,
) {
  if (code.trim().toUpperCase() !== BAG_PROMO_CODE) return 0;
  return roundRatio(
    exactSum(entries.map((row) => exactProduct(row.unitPrice, row.quantity))),
    10,
  );
}
export function bagEntries(
  graph: CommerceGraph,
  photos: ReadonlySet<string>,
): BagEntry[] {
  return graph.bag.map((line) => {
    const product = graph.products.find((item) =>
        item.variants.some((variant) => variant.id === line.variantId),
      ),
      variant = product?.variants.find((item) => item.id === line.variantId);
    const stock = variant ? stockOf(graph, variant.id) : 0;
    const photoId = product
      ? (colourImageIds(product, variant?.colour).find((id) =>
          photos.has(id),
        ) ?? null)
      : null;
    const unavailable =
      !product || !variant
        ? "This option is unavailable."
        : product.archived || variant.archived
          ? "This garment is archived."
          : !product.imageIds.every((id) => photos.has(id))
            ? "Repair the saved photograph before ordering."
            : stock < line.quantity
              ? `Only ${stock} units are available. Review the quantity.`
              : null;
    return {
      variantId: line.variantId,
      productId: product?.id ?? null,
      title: product?.title ?? "Unavailable garment",
      size: variant?.size ?? "",
      colour: variant?.colour ?? "",
      photoId,
      quantity: line.quantity,
      unitPrice: variant?.price ?? line.unitPrice,
      previousPrice: line.unitPrice,
      unitCost: variant?.unitCost ?? 0,
      stock,
      unavailable,
    };
  });
}
/** Photo/price/stock/cost witness, not a second mutable cart or an invented substitute. */
export function bagWitness(graph: CommerceGraph, photos: ReadonlySet<string>) {
  return JSON.stringify({
    workspace: graph.workspaceId,
    scenario: graph.scenarioId,
    rows: bagEntries(graph, photos).map((row) => [
      row.variantId,
      row.quantity,
      row.unitPrice,
      row.unitCost,
      row.stock,
      row.photoId,
      row.unavailable,
    ]),
  });
}
export function bagTotals(
  entries: readonly Pick<BagEntry, "unitPrice" | "quantity">[],
  discount = 0,
  delivery = 600,
  tax = 0,
) {
  MinorAmountSchema.parse(discount);
  MinorAmountSchema.parse(delivery);
  MinorAmountSchema.parse(tax);
  const gross = exactSum(
    entries.map((row) => exactProduct(row.unitPrice, row.quantity)),
  );
  if (gross > MAX_MINOR_AMOUNT || discount > gross)
    throw new RangeError("The demo amount needs review");
  const merchandise = gross - discount,
    total = exactSum([
      merchandise,
      entries.length ? delivery : 0,
      entries.length ? tax : 0,
    ]);
  MinorAmountSchema.parse(total);
  return {
    gross,
    discount,
    merchandise,
    delivery: entries.length ? delivery : 0,
    tax: entries.length ? tax : 0,
    total,
  };
}
export function displayedBag(
  entries: readonly BagEntry[],
  scope: CurrencyScope,
  discount = 0,
) {
  const totals = bagTotals(entries, discount);
  if (!entries.length)
    return {
      currency: scope.currency,
      snapshotId: scope.snapshot?.snapshotId ?? null,
      rows: [],
      roundingAdjustment: 0,
      total: 0,
    };
  return projectComponents(
    totals.total,
    [
      ...entries.map((row, index) => ({
        id: `line_${index}`,
        usd: exactProduct(row.unitPrice, row.quantity),
        unitUsd: row.unitPrice,
        quantity: row.quantity,
      })),
      { id: "discount", usd: -totals.discount },
      { id: "delivery", usd: totals.delivery },
      { id: "tax", usd: totals.tax },
    ],
    scope,
  );
}

export function displayedOrder(order: Order, scope: CurrencyScope) {
  return projectComponents(
    order.total,
    [
      ...order.lines.map((line, index) => ({
        id: `line_${index}`,
        usd: exactProduct(line.unitPrice, line.quantity),
        unitUsd: line.unitPrice,
        quantity: line.quantity,
      })),
      { id: "discount", usd: -order.discount },
      { id: "delivery", usd: order.delivery },
      { id: "tax", usd: order.tax },
    ],
    scope,
  );
}

/** A valid individual garment can still exceed the bounded order total. Keep its bag editable. */
export function tryDisplayedBag(
  entries: readonly BagEntry[],
  scope: CurrencyScope,
  discount = 0,
) {
  try {
    return { ok: true as const, value: displayedBag(entries, scope, discount) };
  } catch (error) {
    if (!(error instanceof RangeError) && !(error instanceof ZodError))
      throw error;
    return {
      ok: false as const,
      message:
        "This bag exceeds the demo amount limit. Reduce the quantity or remove a garment before reviewing.",
    };
  }
}
