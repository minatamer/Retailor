import { describe, expect, it } from "vitest";
import {
  canRemoveSizeOption,
  nextSize,
  suggestSizeOption,
} from "./size-options";
import type { SizeOptionDraft } from "./size-options";

describe("removing sizes without losing a colour option", () => {
  it("allows original sizes down to one per normalized colour, independently of other colours", () => {
    const rows = [
      { id: "blue-s", colour: " Blue ", archived: false },
      { id: "blue-m", colour: "blue", archived: false },
      { id: "black-s", colour: "Black", archived: false },
    ];
    expect(canRemoveSizeOption(rows, "blue-s")).toBe(true);
    expect(canRemoveSizeOption(rows, "blue-m")).toBe(true);
    expect(canRemoveSizeOption(rows, "black-s")).toBe(false);
    const remaining = rows.filter((row) => row.id !== "blue-s");
    expect(canRemoveSizeOption(remaining, "blue-m")).toBe(false);
    expect(canRemoveSizeOption(remaining, "black-s")).toBe(false);
    expect(canRemoveSizeOption(remaining, "blue-s")).toBe(false);
    expect(canRemoveSizeOption([], "unknown")).toBe(false);
    expect(rows).toHaveLength(3);
  });
  it("does not treat an archived peer as the replacement for the last active size", () => {
    const rows = [
      { id: "active", colour: "Blue", archived: false },
      { id: "history", colour: "Blue", archived: true },
    ];
    expect(canRemoveSizeOption(rows, "active")).toBe(false);
    expect(canRemoveSizeOption(rows, "history")).toBe(true);
    expect(canRemoveSizeOption([rows[1]!], "history")).toBe(false);
    expect(
      canRemoveSizeOption(
        [...rows, { id: "older", colour: "Blue", archived: true }],
        "history",
      ),
    ).toBe(true);
  });
});

describe("bounded suggestions from entered clothing sizes", () => {
  it.each([
    [["S", "M", "L"], "alpha-demo", "XL"],
    [["XL", "XXL"], "alpha-demo", "XXXL"],
    [["XL", "2XL"], "alpha-demo", "3XL"],
    [["2XS"], "alpha-demo", "XS"],
    [["28/30", "30/30", "32/32"], "waist-inseam-demo", "34/32"],
    [["31/32", "32/32"], "waist-inseam-demo", "33/32"],
    [["W30 L32", "W32 L32"], "waist-inseam-demo", "W34 L32"],
    [["36", "38"], "regional-demo", "40"],
    [["UK 8", "UK 10"], "regional-demo", "UK 12"],
    [["US 4", "US 6"], "regional-demo", "US 8"],
    [["38R", "40R"], "chest-length-demo", "42R"],
    [["38/30", "40/30"], "chest-length-demo", "42/30"],
    [["2T", "3T"], "pending-demo", "4T"],
    [["8Y", "10Y"], "pending-demo", "12Y"],
    [["1", "2"], "pending-demo", "3"],
    [["One Size"], "one-size-demo", ""],
    [["OS"], "pending-demo", ""],
    [["M/L"], "alpha-demo", ""],
    [["6-9M"], "pending-demo", ""],
    [["Handmade"], "pending-demo", ""],
    [["7"], "pending-demo", ""],
    [["8XL"], "alpha-demo", ""],
  ] as const)("%j in %s suggests %s", (sizes, sizing, expected) => {
    expect(nextSize(sizes, sizing)).toBe(expected);
  });
  it("skips existing same-colour labels and stays within finite label/search bounds", () => {
    expect(nextSize(["M"], "alpha-demo", ["M", "L", "XL"])).toBe("XXL");
    expect(nextSize(["XL"], "alpha-demo", ["XL", "2XL"])).toBe("XXXL");
    expect(nextSize(["38"], "regional-demo", ["38", "40", "42"])).toBe("44");
    expect(
      nextSize(
        Array.from({ length: 25 }, () => "M"),
        "alpha-demo",
      ),
    ).toBe("");
    expect(nextSize(["198"], "regional-demo", ["198", "200"])).toBe("");
  });
  it("copies current unsaved same-colour raw values into a fresh identity without altering any row", () => {
    const row: SizeOptionDraft = {
      id: "blue",
      size: "L",
      colour: "Blue",
      sku: "ORIGINAL",
      price: "68.05",
      cost: "30.61",
      stock: "7",
      archived: false,
    };
    const rows = [
      row,
      { ...row, id: "black", colour: "Black", size: "XL", price: "99.00" },
    ];
    const before = structuredClone(rows);
    expect(suggestSizeOption(rows, "blue", "alpha-demo", "fresh")).toEqual({
      ...row,
      id: "fresh",
      sku: "SIZE-fresh",
      size: "XL",
    });
    expect(rows).toEqual(before);
    expect(
      suggestSizeOption(
        Array.from({ length: 24 }, (_, i) => ({ ...row, id: String(i) })),
        "0",
        "alpha-demo",
        "new",
      ),
    ).toBeUndefined();
    expect(
      suggestSizeOption(
        [{ ...row, archived: true }],
        undefined,
        "alpha-demo",
        "new",
      ),
    ).toBeUndefined();
  });
});
