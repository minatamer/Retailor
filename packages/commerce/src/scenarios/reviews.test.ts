import { describe, expect, it } from "vitest";
import { Harness, NOW, product } from "../../test/fixtures.js";
import { generateScenario } from "./generate.js";
import { completeDemoReviews } from "./reviews.js";
import { parseGraph } from "../graph.js";
import { facts, allActivityScope } from "../facts.js";

describe("bounded fictional garment reviews", () => {
  it("covers all twenty active garments in every scenario without inventing purchases", () => {
    const h = new Harness();
    for (let index = 2; index < 20; index++)
      h.step("createProduct", {
        ...product(`uploaded_${index}`),
        imageIds: ["photo_goods"],
      });
    h.step("setBagLine", { variantId: "shirt_m", quantity: 1 });
    for (const preset of ["healthy", "breakeven", "loss"] as const) {
      const { graph } = generateScenario(h.graph, preset, {
        scenarioId: `named_${preset}`,
        now: NOW,
        availablePhotoIds: h.context.availablePhotoIds,
      });
      expect(graph.feedback).toHaveLength(60);
      expect(graph.bag).toEqual(h.graph.bag);
      expect(parseGraph(graph)).toEqual(graph);
      for (const item of graph.products) {
        const reviews = graph.feedback.filter(
          (review) => review.productId === item.id,
        );
        expect(reviews).toHaveLength(3);
        expect(new Set(reviews.map((review) => review.reviewerName)).size).toBe(
          3,
        );
        expect(new Set(reviews.map((review) => review.comment)).size).toBe(3);
        expect(
          reviews.every(
            (review) =>
              review.synthetic &&
              review.origin === "seeded_scenario" &&
              review.reviewerName!.includes(" ") &&
              review.at <= graph.asOf,
          ),
        ).toBe(true);
        for (const review of reviews.filter((row) => row.orderId))
          expect(
            graph.orders
              .find((order) => order.id === review.orderId)
              ?.lines.some((line) => line.productId === item.id),
          ).toBe(true);
      }
      expect(graph.feedback.some((review) => !review.orderId)).toBe(true);
      expect(completeDemoReviews(graph, preset)).toBe(graph);
    }
  });
  it("completes old records once, preserves original identities/comments/links and every financial record", () => {
    const h = new Harness();
    const generated = generateScenario(h.graph, "healthy", {
      scenarioId: "old",
      now: NOW,
      availablePhotoIds: h.context.availablePhotoIds,
    }).graph;
    const legacy = parseGraph({
      ...generated,
      feedback: generated.feedback
        .slice(0, 1)
        .map(({ reviewerName: _name, ...review }) => review),
    });
    const before = structuredClone(legacy);
    const next = completeDemoReviews(legacy, "healthy");
    expect(next.feedback.length).toBeGreaterThan(legacy.feedback.length);
    expect(next.feedback[0]).toMatchObject(legacy.feedback[0]!);
    expect(next.feedback[0]!.reviewerName).toBeTruthy();
    expect(next.revision).toBe(legacy.revision + 1);
    expect({
      ...next,
      feedback: legacy.feedback,
      revision: legacy.revision,
      receipts: legacy.receipts,
    }).toEqual(legacy);
    expect(next.receipts.slice(0, -1)).toEqual(legacy.receipts);
    expect(
      facts(next, allActivityScope(next))
        .filter((fact) => fact.factId !== "average_rating")
        .map(({ revision: _revision, ...fact }) => fact),
    ).toEqual(
      facts(legacy, allActivityScope(legacy))
        .filter((fact) => fact.factId !== "average_rating")
        .map(({ revision: _revision, ...fact }) => fact),
    );
    expect(legacy).toEqual(before);
    expect(completeDemoReviews(next, "healthy")).toBe(next);
    const atMaxRevision = parseGraph({
      ...legacy,
      revision: 1_000_000,
      receipts: legacy.receipts.map((receipt, index) =>
        index === legacy.receipts.length - 1
          ? { ...receipt, revision: 1_000_000 }
          : receipt,
      ),
    });
    expect(completeDemoReviews(atMaxRevision, "healthy")).toBe(atMaxRevision);
  });
  it("keeps the cap and unknown/archived/empty garment boundaries intact", () => {
    const h = new Harness();
    const source = parseGraph({
      ...h.graph,
      feedback: Array.from({ length: 60 }, (_, index) => ({
        id: `old_${index}`,
        productId: "shirt",
        origin: "seeded_scenario",
        at: NOW,
        rating: 4,
        comment: "Existing fictional feedback",
        reviewerName: `Demo Name ${index}`,
        synthetic: true,
      })),
    });
    expect(completeDemoReviews(source, "healthy")).toBe(source);
    const eligible = completeDemoReviews(
      h.graph,
      "healthy",
      new Set(["shirt"]),
    );
    expect(
      eligible.feedback.every((review) => review.productId === "shirt"),
    ).toBe(true);
    expect(completeDemoReviews(h.graph, "healthy", new Set(["missing"]))).toBe(
      h.graph,
    );
    const empty = parseGraph({
      ...h.graph,
      products: h.graph.products.map((item) => ({ ...item, archived: true })),
    });
    expect(completeDemoReviews(empty, "healthy")).toBe(empty);
  });
});
