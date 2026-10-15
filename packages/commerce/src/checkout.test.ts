import { describe, expect, it } from "vitest";
import { Harness, NOW } from "../test/fixtures.js";
import { checkoutQuote } from "./checkout.js";
import {
  displayedBag,
  bagEntries,
  bagPromoDiscount,
  BAG_PROMO_CODE,
} from "./shopping.js";
import type { CurrencyScope } from "@retailor/contracts/currency";

describe("shared exact sandbox quote", () => {
  for (const rate of ["1", "0.89321", "0.5001", "1.333333333333333333"])
    for (const quantity of [1, 2, 3, 5])
      for (const promo of [false, true]) {
        it(`reconciles ${rate} × ${quantity} with promo ${promo} without changing the graph`, () => {
          const h = new Harness();
          h.step("setBagLine", { variantId: "shirt_m", quantity });
          h.step("setBagLine", { variantId: "tee_m", quantity: 1 });
          const scope: CurrencyScope =
            rate === "1"
              ? { currency: "USD", snapshot: null }
              : {
                  currency: "EUR",
                  snapshot: {
                    schemaVersion: 1,
                    snapshotId: "quote",
                    base: "USD",
                    quote: "EUR",
                    rateDecimal: rate,
                    rateDate: NOW.slice(0, 10),
                    fetchedAt: NOW,
                    sourceId: "development-fixture",
                  },
                };
          const before = JSON.stringify(h.graph),
            photos = new Set(h.graph.photos.map((photo) => photo.id));
          const rows = bagEntries(h.graph, photos);
          const expected = displayedBag(
            rows,
            scope,
            promo ? bagPromoDiscount(rows, BAG_PROMO_CODE) : 0,
          );
          const result = checkoutQuote(h.graph, photos, scope, promo);
          expect(result.total).toBe(expected.total);
          expect(
            result.lines.reduce(
              (sum, line) => sum + line.unitAmount * line.quantity,
              0,
            ) +
              result.shipping +
              result.adjustment -
              result.discountAmount,
          ).toBe(expected.total);
          expect(result.lines[0]!.name).toContain("Cream · M");
          expect(JSON.stringify(h.graph)).toBe(before);
        });
      }
  it("rejects missing photographs and unavailable stock instead of inventing a line", () => {
    const h = new Harness();
    h.step("setBagLine", { variantId: "shirt_m", quantity: 2 });
    expect(() =>
      checkoutQuote(
        h.graph,
        new Set(),
        { currency: "USD", snapshot: null },
        false,
      ),
    ).toThrow();
    h.step("writeoffStock", {
      id: "lost",
      variantId: "shirt_m",
      quantity: 9,
      reason: "Damaged",
    });
    expect(() =>
      checkoutQuote(
        h.graph,
        new Set(h.graph.photos.map((p) => p.id)),
        { currency: "USD", snapshot: null },
        false,
      ),
    ).toThrow();
  });
});
