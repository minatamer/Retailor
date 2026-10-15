import { describe, expect, it } from "vitest";
import type { CurrencyScope } from "@retailor/contracts/currency";
import {
  bagPromoDiscount,
  bagTotals,
  displayedBag,
  tryDisplayedBag,
  type BagEntry,
} from "./quote";

const row = (unitPrice: number, quantity = 1): BagEntry => ({
  variantId: "variant",
  productId: "product",
  title: "Shirt",
  size: "M",
  colour: "Blue",
  photoId: "photo",
  unitPrice,
  previousPrice: unitPrice,
  unitCost: 100,
  stock: 20,
  quantity,
  unavailable: null,
});

describe("cart promotion", () => {
  it("accepts the offered code with case/outer whitespace differences, but no other code", () => {
    expect(bagPromoDiscount([row(6800)], " thread10 ")).toBe(680);
    for (const code of ["", "THREAD", "THREAD 10", "OTHER10", "THREAD100"])
      expect(bagPromoDiscount([row(6800)], code)).toBe(0);
  });
  it("rounds 10% once over all merchandise and excludes delivery and tax", () => {
    const entries = [row(1005, 3), row(502, 2)];
    const discount = bagPromoDiscount(entries, "THREAD10");
    expect(discount).toBe(402);
    expect(bagTotals(entries, discount, 600, 123)).toEqual({
      gross: 4019,
      discount: 402,
      merchandise: 3617,
      delivery: 600,
      tax: 123,
      total: 4340,
    });
    expect(bagPromoDiscount([row(5), row(5)], "THREAD10")).toBe(1);
    expect(bagPromoDiscount([row(15)], "THREAD10")).toBe(2);
    expect(bagPromoDiscount([], "THREAD10")).toBe(0);
    expect(bagPromoDiscount([row(0)], "THREAD10")).toBe(0);
    expect(bagPromoDiscount([row(6800, 2)], "THREAD10")).toBe(1360);
  });
  it("keeps over-limit bags recoverable even with a promotion", () => {
    const scope = { currency: "USD", snapshot: null } as const;
    for (const entries of [
      [row(600_000_000, 2)],
      Array.from({ length: 8 }, () => row(1_000_000_000, 5)),
    ])
      expect(
        tryDisplayedBag(entries, scope, bagPromoDiscount(entries, "THREAD10")),
      ).toMatchObject({ ok: false });
  });
  it("reconciles USD and EUR visible components for the same canonical discount", () => {
    const entries = [row(1005, 3), row(502, 2)];
    const scopes: CurrencyScope[] = [
      { currency: "USD", snapshot: null },
      {
        currency: "EUR",
        snapshot: {
          schemaVersion: 1,
          snapshotId: "quote",
          base: "USD",
          quote: "EUR",
          rateDecimal: "0.89321",
          rateDate: "2026-10-11",
          fetchedAt: "2026-10-11T18:00:00.000Z",
          sourceId: "development-fixture",
        },
      },
    ];
    for (const scope of scopes) {
      const displayed = displayedBag(
        entries,
        scope,
        bagPromoDiscount(entries, "THREAD10"),
      );
      expect(
        displayed.rows.reduce((sum, part) => sum + part.amount, 0) +
          displayed.roundingAdjustment,
      ).toBe(displayed.total);
      expect(
        displayed.rows.find((part) => part.id === "discount")?.amount,
      ).toBe(scope.currency === "USD" ? -402 : -359);
    }
  });
});
