import { describe, expect, it } from "vitest";
import { FxSnapshotSchema, USD_SCOPE } from "@retailor/contracts/currency";
import { MAX_MINOR_AMOUNT } from "@retailor/contracts/core";
import {
  convertMinor,
  parseRate,
  validateSnapshot,
  formatDisplay,
  parseDisplay,
  projectComponents,
} from "./currency.js";
const now = Date.parse("2026-10-12T08:00:00.000Z");
const quote = FxSnapshotSchema.parse({
  schemaVersion: 1,
  snapshotId: "fx_test",
  base: "USD",
  quote: "EUR",
  rateDecimal: "0.5",
  rateDate: "2026-10-09",
  fetchedAt: "2026-10-12T08:00:00.000Z",
  sourceId: "frankfurter-ecb-v2",
});
const eur = { currency: "EUR" as const, snapshot: quote };
describe("exact dated USD/EUR display", () => {
  it("preserves the exact decimal rational, including long fractions, without binary multiplication", () => {
    expect(parseRate("0.9000")).toEqual({
      numerator: 9n,
      denominator: 10n,
      decimal: "0.9",
    });
    expect(parseRate("1.125")).toEqual({
      numerator: 9n,
      denominator: 8n,
      decimal: "1.125",
    });
    expect(parseRate("0.123456789012345678").numerator).toBe(
      61728394506172839n,
    );
    expect(convertMinor(199, "1.125")).toBe(224);
  });
  it("rounds half cents exactly, handles negative and zero display values and bounds the result", () => {
    expect(convertMinor(1, "0.5")).toBe(1);
    expect(convertMinor(-1, "0.5")).toBe(-1);
    expect(convertMinor(3, "0.5")).toBe(2);
    expect(convertMinor(1, "0.499999999999999999")).toBe(0);
    expect(convertMinor(-1, "0.49")).toBe(0);
    expect(convertMinor(0, "0.5")).toBe(0);
    expect(convertMinor(MAX_MINOR_AMOUNT, "999.999999999999999999")).toBe(
      1_000_000_000_000,
    );
    expect(() => convertMinor(MAX_MINOR_AMOUNT + 1, "0.5")).toThrow();
    for (const rate of [
      "0",
      "0.000",
      "-1",
      "1e-2",
      "Infinity",
      "1000",
      "0.1234567890123456789",
      "00.5",
    ])
      expect(() => parseRate(rate)).toThrow();
  });
  it("validates real dates, future retrieval, calendar freshness and declared fixtures", () => {
    expect(validateSnapshot(quote, now)).toEqual(quote);
    expect(
      validateSnapshot({ ...quote, rateDate: "2026-10-05" }, now).rateDate,
    ).toBe("2026-10-05");
    expect(() =>
      validateSnapshot({ ...quote, rateDate: "2026-10-04" }, now),
    ).toThrow();
    expect(() =>
      validateSnapshot({ ...quote, rateDate: "2026-10-13" }, now),
    ).toThrow();
    expect(() =>
      validateSnapshot(
        { ...quote, fetchedAt: "2026-10-12T08:00:01.000Z" },
        now,
      ),
    ).toThrow();
    expect(() =>
      validateSnapshot({ ...quote, rateDate: "2026-02-30" }, now),
    ).toThrow();
    expect(() =>
      validateSnapshot({ ...quote, sourceId: "development-fixture" }, now),
    ).toThrow();
    expect(
      validateSnapshot({ ...quote, sourceId: "development-fixture" }, now, true)
        .sourceId,
    ).toBe("development-fixture");
    expect(() => validateSnapshot({ ...quote, extra: true }, now)).toThrow();
  });
  it("keeps USD source inputs unchanged, formats exact cents and parses inclusive EUR bounds", () => {
    const source = { amount: 6800 };
    Object.freeze(source);
    expect(formatDisplay(source.amount, eur)).toBe("€34.00");
    expect(formatDisplay(source.amount, USD_SCOPE)).toBe("$68.00");
    expect(source.amount).toBe(6800);
    expect(parseDisplay("34.00")).toEqual({ ok: true, value: 3400 });
    expect(parseDisplay("1.001").ok).toBe(false);
    expect(parseDisplay("10000000000.01").ok).toBe(false);
    expect(formatDisplay(-5, eur)).toBe("-€0.03");
  });
  it("reconciles multi-line, discount/delivery and unit-times-quantity through an explicit adjustment", () => {
    const components = [
      { id: "line_a", usd: 3, unitUsd: 1, quantity: 3 },
      { id: "line_b", usd: 1 },
      { id: "discount", usd: -1 },
      { id: "delivery", usd: 1 },
      { id: "tax", usd: 0 },
    ];
    const projection = projectComponents(4, components, eur);
    expect(projection.rows.map((item) => item.amount)).toEqual([
      3, 1, -1, 1, 0,
    ]);
    expect(projection.total).toBe(2);
    expect(projection.roundingAdjustment).toBe(-2);
    expect(
      projection.rows.reduce((sum, row) => sum + row.amount, 0) +
        projection.roundingAdjustment,
    ).toBe(projection.total);
    expect(projectComponents(4, components, USD_SCOPE).roundingAdjustment).toBe(
      0,
    );
    expect(() => projectComponents(5, components, eur)).toThrow();
    expect(() =>
      projectComponents(4, [...components, components[0]!], eur),
    ).toThrow();
    expect(() =>
      projectComponents(
        3,
        [{ id: "bad", usd: 3, unitUsd: 2, quantity: 3 }],
        eur,
      ),
    ).toThrow();
  });
});
