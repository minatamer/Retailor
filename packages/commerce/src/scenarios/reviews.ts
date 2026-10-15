import { COMMERCE_LIMITS } from "@retailor/contracts/commerce";
import type { CommerceGraph } from "@retailor/contracts/commerce";
import type { ScenarioPreset } from "@retailor/contracts/scenarios";
import { freeze, parseGraph, serializedBytes } from "../graph.js";
import { applyCommand } from "../commands.js";

const NAMES = [
  "Maya Thompson",
  "Oliver Reed",
  "Sofia Bennett",
  "Noah Patel",
  "Amelia Clarke",
  "Leo Morgan",
  "Isla Chen",
  "Ethan Brooks",
  "Aria Hassan",
  "Luca Rivera",
  "Chloe Martin",
  "Zoe Parker",
  "Finn Ellis",
  "Nora Kim",
  "Theo Williams",
  "Ava Wilson",
  "Sam Taylor",
  "Elena Rossi",
] as const;
const COMMENTS = [
  "The different photo angles made it easy to choose.",
  "A lovely addition to my wardrobe. I would browse this collection again.",
  "The colour and size choices were clearly laid out.",
  "I liked being able to take a closer look before deciding.",
  "Easy to find what I wanted, with useful product photos.",
  "A little more detail in the description would have helped me choose.",
] as const;
/** Complete disclosed demo feedback only. Never creates orders or changes stock/money. */
export function completeDemoReviews(
  input: CommerceGraph,
  preset: ScenarioPreset,
  eligibleIds?: ReadonlySet<string>,
) {
  const products = input.products.filter(
    (product) =>
      !product.archived && (!eligibleIds || eligibleIds.has(product.id)),
  );
  const feedback = input.feedback.map((review, index) => {
    if (review.reviewerName) return review;
    const buyer = input.buyers.find(
      (row) =>
        row.id ===
        input.orders.find((order) => order.id === review.orderId)?.buyerId,
    );
    return {
      ...review,
      reviewerName:
        buyer && !buyer.label.startsWith("Demo shopper")
          ? buyer.label
          : NAMES[index % NAMES.length]!,
    };
  });
  const ids = new Set(feedback.map((review) => review.id));
  for (const [productIndex, product] of products.entries()) {
    const current = feedback.filter(
      (review) => review.productId === product.id,
    );
    const usedNames = new Set(current.map((review) => review.reviewerName));
    for (
      let slot = current.length;
      slot < 3 && feedback.length < COMMERCE_LIMITS.feedback;
      slot++
    ) {
      let hash = 2166136261;
      for (const character of `${input.scenarioId}:${product.id}`)
        hash = Math.imul(hash ^ character.charCodeAt(0), 16777619) >>> 0;
      let id = "";
      for (let nonce = 0; nonce <= COMMERCE_LIMITS.feedback; nonce++) {
        id = `demo_review_${hash.toString(16)}_${slot}_${nonce}`;
        if (!ids.has(id)) break;
      }
      const reviewerName = Array.from(
        { length: NAMES.length },
        (_, index) => NAMES[(productIndex * 3 + slot + index) % NAMES.length]!,
      ).find((name) => !usedNames.has(name))!;
      usedNames.add(reviewerName);
      ids.add(id);
      const at = new Date(
        Math.max(
          Date.parse(input.anchorAt),
          Date.parse(input.asOf) -
            (2 + ((productIndex + slot * 5) % 21)) * 86_400_000,
        ),
      ).toISOString();
      feedback.push({
        id,
        productId: product.id,
        origin: "seeded_scenario",
        at,
        reviewerName,
        rating:
          preset === "loss"
            ? [2, 3, 4][slot % 3]!
            : preset === "breakeven"
              ? [4, 3, 5][slot % 3]!
              : [5, 4, 5][(slot + productIndex) % 3]!,
        comment: COMMENTS[(productIndex + slot) % COMMENTS.length]!,
        synthetic: true,
      });
    }
  }
  if (
    feedback.length === input.feedback.length &&
    feedback.every((review, index) => review === input.feedback[index])
  )
    return input;
  const next = { ...input, feedback };
  // Crowded historical saves keep their data, limits and recovery rather than being reset.
  if (
    input.revision === 1_000_000 ||
    serializedBytes(next) > COMMERCE_LIMITS.graphBytes
  )
    return input;
  const named = freeze(
    parseGraph({
      ...input,
      feedback: feedback.slice(0, input.feedback.length),
    }),
  );
  const added = feedback.slice(input.feedback.length);
  if (
    !added.length ||
    input.receipts.at(-1)?.undo ||
    input.receipts.length === COMMERCE_LIMITS.receipts
  )
    return named;
  let commandId = "";
  for (let nonce = 0; nonce <= COMMERCE_LIMITS.receipts; nonce++) {
    commandId = `demo_reviews_${input.revision}_${nonce}`;
    if (!input.receipts.some((receipt) => receipt.id === commandId)) break;
  }
  const result = applyCommand(
    named,
    {
      id: commandId,
      workspaceId: input.workspaceId,
      scenarioId: input.scenarioId,
      expectedRevision: input.revision,
      origin: "seeded_scenario",
      at: input.asOf,
      expiresAt: new Date(
        Math.min(Date.parse(input.expiresAt), Date.parse(input.asOf) + 60_000),
      ).toISOString(),
      type: "addFeedback",
      payload: { feedback: added },
    },
    {
      now: input.asOf,
      availablePhotoIds: new Set(input.photos.map((photo) => photo.id)),
    },
  );
  if (result.ok) return result.graph;
  if (result.code === "limit") return named;
  throw new Error("The fictional review update could not be completed.");
}
