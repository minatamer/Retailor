import { describe, expect, it } from "vitest";
import { FeedbackSchema } from "@retailor/contracts/commerce";
import { productReviews, starFills } from "./review-model";

const review = (
  id: string,
  productId: string,
  rating: number,
  at = "2026-10-15T12:00:00.000Z",
) =>
  FeedbackSchema.parse({
    id,
    productId,
    rating,
    at,
    origin: "seeded_scenario",
    comment: "A fictional review",
    synthetic: true,
  });
describe("product reviews use the existing feedback records", () => {
  it("isolates a product, retains comments and calculates its real half-star mean without mutating records", () => {
    const rows = [
      { ...review("first", "shirt", 4), reviewerName: "Maya Thompson" },
      review("other", "jeans", 1),
      review("second", "shirt", 5, "2026-10-15T13:00:00.000Z"),
    ];
    const before = structuredClone(rows);
    const summary = productReviews(rows, "shirt");
    expect(summary).toMatchObject({ count: 2, average: 4.5 });
    expect(summary.reviews.map((row) => row.id)).toEqual(["second", "first"]);
    expect(summary.reviews[0]).toBe(rows[2]);
    expect(summary.reviews[1]!.reviewerName).toBe("Maya Thompson");
    expect(starFills(summary.average)).toEqual([100, 100, 100, 100, 50]);
    expect(rows).toEqual(before);
  });
  it("uses stable ordering for identical dates and includes rating-only reviews", () => {
    const rows = [
      review("b", "shirt", 5),
      { ...review("a", "shirt", 2), comment: "" },
    ];
    expect(productReviews(rows, "shirt").reviews.map((row) => row.id)).toEqual([
      "a",
      "b",
    ]);
    expect(productReviews(rows, "shirt").average).toBe(3.5);
  });
  it("does not invent a zero rating or feedback for a missing product or empty preview", () => {
    expect(productReviews([], "shirt")).toEqual({
      reviews: [],
      count: 0,
      average: null,
    });
    expect(productReviews([review("a", "jeans", 5)], "shirt")).toEqual({
      reviews: [],
      count: 0,
      average: null,
    });
    expect(starFills(null)).toEqual([0, 0, 0, 0, 0]);
  });
  it("supports all half-star values and actual fractional means within five bounded stars", () => {
    for (let half = 0; half <= 10; half++) {
      const rating = half / 2;
      const fills = starFills(rating);
      expect(fills).toHaveLength(5);
      expect(fills.reduce((sum, fill) => sum + fill, 0)).toBe(rating * 100);
      expect(
        fills.every((fill) => fill === 0 || fill === 50 || fill === 100),
      ).toBe(true);
    }
    const average = productReviews(
      [
        review("a", "shirt", 4),
        review("b", "shirt", 4),
        review("c", "shirt", 5),
      ],
      "shirt",
    ).average!;
    expect(average).toBeCloseTo(13 / 3);
    expect(starFills(average)[4]).toBeCloseTo(100 / 3);
    expect(starFills(8)).toEqual([100, 100, 100, 100, 100]);
    expect(starFills(-1)).toEqual([0, 0, 0, 0, 0]);
    expect(starFills(Number.NaN)).toEqual([0, 0, 0, 0, 0]);
  });
});
