import type { CommerceGraph } from "@retailor/contracts/commerce";

export type ProductFeedback = CommerceGraph["feedback"][number];
export function productReviews(
  feedback: readonly ProductFeedback[],
  productId: string,
) {
  const reviews = feedback
    .filter((review) => review.productId === productId)
    .sort(
      (a, b) => Date.parse(b.at) - Date.parse(a.at) || a.id.localeCompare(b.id),
    );
  return {
    reviews,
    count: reviews.length,
    average: reviews.length
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
      : null,
  };
}
/** Fill the actual fraction of each of five stars, including an exact half. */
export function starFills(rating: number | null) {
  const value = rating !== null && Number.isFinite(rating) ? rating : 0;
  return Array.from(
    { length: 5 },
    (_, index) => Math.min(1, Math.max(0, value - index)) * 100,
  );
}
