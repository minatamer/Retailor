import { describe, it, expect } from "vitest";
import { parseUsd, formatUsd } from "./money.js";
describe("exact USD amounts", () => {
  it("parses decimals without binary-float math", () => {
    expect(parseUsd("0.10")).toEqual({ ok: true, value: 10 });
    expect(parseUsd("68.9")).toEqual({ ok: true, value: 6890 });
    expect(parseUsd("0")).toEqual({ ok: true, value: 0 });
  });
  it.each([
    "0.001",
    "1e3",
    "NaN",
    "Infinity",
    "-1",
    "01",
    "1.",
    " 1",
    "1000000000",
  ])("rejects noncanonical or oversized %s", (value) => {
    expect(parseUsd(value).ok).toBe(false);
  });
  it("formats bounded signed facts", () => {
    expect(formatUsd(-48000)).toBe("-$480.00");
    expect(formatUsd(Number.MAX_SAFE_INTEGER)).toBe("$90,071,992,547,409.91");
    expect(() => formatUsd(0.1)).toThrow(RangeError);
  });
});
