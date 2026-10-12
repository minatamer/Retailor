import { describe, expect, it } from "vitest";
import { AssistantToolArgumentsSchema } from "@retailor/contracts/assistant";
import {
  assistantFixture,
  ASSISTANT_NOW,
} from "../../test/assistant-fixture.js";
import { prepareAssistantContext } from "./context.js";
import { executeAssistantTool } from "./tools.js";
import { groundReply } from "./grounding.js";
const args = (patch: Record<string, unknown> = {}) =>
  AssistantToolArgumentsSchema.parse({
    ...Object.fromEntries(
      Object.keys(AssistantToolArgumentsSchema.shape).map((k) => [k, null]),
    ),
    ...patch,
  });
const reply = {
  text: "Inspect the actual references.",
  references: [],
  claims: [],
  navigation: null,
  proposal: null,
};
describe("role tools and inert grounded replies", () => {
  it("attaches application sources to confirmed typed claims without relying on provider prose", () => {
    const input = structuredClone(assistantFixture("shopper"));
    input.context.graph.products[0]!.attributes[0] = {
      name: "material",
      value: "cotton",
      provenance: "user_supplied",
      sourceIds: [],
      review: "confirmed",
    };
    const c = prepareAssistantContext(input, ASSISTANT_NOW),
      output = groundReply(c, {
        ...reply,
        claims: [
          {
            kind: "attribute",
            productId: "jeans",
            name: "material",
            value: "cotton",
          },
        ],
      });
    expect(output.reply.references).toEqual([
      { kind: "product", productId: "jeans" },
    ]);
    const owner = prepareAssistantContext(assistantFixture(), ASSISTANT_NOW);
    expect(
      groundReply(owner, {
        ...reply,
        claims: [{ kind: "observation", factId: "net_sales", state: "zero" }],
      }).reply.references,
    ).toContainEqual({
      kind: "fact",
      factId: "net_sales",
      day: null,
      productId: null,
    });
  });
  it("does not let unrelated uncertainty or spelled-out money bypass connective prose policy", () => {
    const c = prepareAssistantContext(
      assistantFixture("shopper"),
      ASSISTANT_NOW,
    );
    for (const text of [
      "This is cotton; its fit is unknown.",
      "This is waterproof. Care is unconfirmed.",
      "The price is sixty dollars.",
    ])
      expect(() => groundReply(c, { ...reply, text })).toThrow(
        "UPSTREAM_FAILED",
      );
    expect(
      groundReply(c, {
        ...reply,
        text: "Material and personal fit remain unconfirmed. Inspect the reviewed details.",
      }).reply.text,
    ).toContain("unconfirmed");
  });
  it("filters actual rounded display prices and never treats unknown material as confirmed", () => {
    const input = assistantFixture("shopper");
    input.context.currency = {
      currency: "EUR",
      snapshot: {
        schemaVersion: 1,
        snapshotId: "quote",
        base: "USD",
        quote: "EUR",
        rateDecimal: "0.9",
        rateDate: "2026-10-12",
        fetchedAt: ASSISTANT_NOW,
        sourceId: "development-fixture",
      },
    };
    const c = prepareAssistantContext(input, ASSISTANT_NOW);
    const found = executeAssistantTool(
      c,
      "applyCatalogueFilter",
      args({ category: "jeans", maximum: 5400 }),
    );
    expect(found.references).toEqual([{ kind: "product", productId: "jeans" }]);
    expect(found.navigation).toMatchObject({
      kind: "filter",
      category: "jeans",
      maximum: 5400,
    });
    expect(
      executeAssistantTool(
        c,
        "searchCatalogue",
        args({ category: "jeans", maximum: 5399 }),
      ).references,
    ).toEqual([]);
    expect(() =>
      groundReply(c, {
        ...reply,
        claims: [
          {
            kind: "attribute",
            productId: "jeans",
            name: "material",
            value: "cotton",
          },
        ],
      }),
    ).toThrow();
  });
  it("rejects cross-role, foreign tools/fields, unknown IDs, oversell and unsupported authoritative prose", () => {
    const c = prepareAssistantContext(
      assistantFixture("shopper"),
      ASSISTANT_NOW,
    );
    expect(() =>
      executeAssistantTool(
        c,
        "getMetricFacts",
        args({ factIds: ["net_sales"] }),
      ),
    ).toThrow();
    expect(() => executeAssistantTool(c, "execute_shell", args())).toThrow();
    expect(() =>
      executeAssistantTool(
        c,
        "getStorePolicies",
        args({ operation: "placeOrder" }),
      ),
    ).toThrow();
    expect(() =>
      executeAssistantTool(
        c,
        "prepareBagChange",
        args({ variantId: "jeans_m", quantity: 4 }),
      ),
    ).toThrow();
    expect(() =>
      groundReply(c, {
        ...reply,
        references: [{ kind: "product", productId: "invented" }],
      }),
    ).toThrow();
    expect(() =>
      groundReply(c, { ...reply, text: "Your profit is $20." }),
    ).toThrow();
    expect(() =>
      groundReply(c, {
        ...reply,
        text: "This organic cotton definitely fits you.",
      }),
    ).toThrow();
    expect(() =>
      groundReply(c, {
        ...reply,
        proposal: {
          kind: "operation",
          operation: "createProduct",
          targetId: null,
          prefill: { title: "Jacket", category: "jackets", note: null },
        },
      }),
    ).toThrow();
  });
  it("keeps valid preparation inert and applies only relevant explanation scope fences", () => {
    const c = prepareAssistantContext(assistantFixture(), ASSISTANT_NOW),
      before = JSON.stringify(c.graph);
    const prepared = executeAssistantTool(
      c,
      "prepareOperation",
      args({
        operation: "createProduct",
        prefill: { title: "Jacket", category: "jackets", note: null },
      }),
    );
    expect(
      groundReply(c, { ...reply, proposal: prepared.proposal }).reply.proposal
        ?.kind,
    ).toBe("operation");
    expect(JSON.stringify(c.graph)).toBe(before);
    expect(
      groundReply(c, {
        ...reply,
        references: [{ kind: "product", productId: "jeans" }],
      }).sensitivity.scope,
    ).toBe(false);
    const creator = prepareAssistantContext(
      assistantFixture("creator"),
      ASSISTANT_NOW,
    );
    expect(
      groundReply(creator, {
        ...reply,
        references: [{ kind: "product", productId: "jeans" }],
      }).sensitivity.design,
    ).toBe(false);
    expect(() =>
      executeAssistantTool(
        creator,
        "prepareScenarioSwitch",
        args({ scenario: "loss" }),
      ),
    ).toThrow();
    expect(() =>
      groundReply(c, {
        ...reply,
        claims: [
          {
            kind: "observation",
            factId: "product_net_contribution",
            state: "unavailable",
          },
        ],
      }),
    ).toThrow();
  });
});
