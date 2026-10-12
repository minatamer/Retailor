import { describe, expect, it } from "vitest";
import {
  AssistantToolArgumentsSchema,
  OwnerOperationSchema,
  ModelAssistantReplySchema,
} from "@retailor/contracts/assistant";
import {
  assistantFixture,
  ASSISTANT_NOW,
} from "../../test/assistant-fixture.js";
import { prepareAssistantContext } from "./context.js";
import { executeAssistantTool } from "./tools.js";
import { groundReply } from "./grounding.js";
import { fixtureOperation, operationEligible } from "./operations.js";
import { fixtureAssistant } from "./fake.js";
const args = (patch: Record<string, unknown>) =>
  AssistantToolArgumentsSchema.parse({
    ...Object.fromEntries(
      Object.keys(AssistantToolArgumentsSchema.shape).map((k) => [k, null]),
    ),
    ...patch,
  });
describe("bounded exact owner preparation", () => {
  it("resolves deliberate literal references locally but never treats a category word as an exact ID", async () => {
    const payload = structuredClone(assistantFixture());
    const base = payload.context.graph.products[0]!;
    payload.context.graph.products.push({
      ...base,
      id: "second_jeans",
      variants: base.variants.map((v) => ({
        ...v,
        id: "second_option",
        sku: "SECOND",
      })),
    });
    for (const [prompt, expected] of [
      ["remove jeans", "operation-choices"],
      ["remove product reference second_jeans", "operation"],
    ] as const) {
      payload.prompt = prompt;
      const prepared = prepareAssistantContext(payload, ASSISTANT_NOW);
      const output = await fixtureAssistant()
        .begin(prepared)
        .next(
          [],
          false,
          new AbortController().signal,
          () => undefined,
          () => undefined,
        );
      expect(output.kind).toBe("reply");
      if (output.kind === "reply")
        expect(
          ModelAssistantReplySchema.parse(output.reply).proposal?.kind,
        ).toBe(expected);
    }
  });
  it("offers explicit duplicate-name choices, bounds the list and never resolves the first item", () => {
    const payload = structuredClone(assistantFixture());
    const base = payload.context.graph.products[0]!;
    payload.context.graph.products = Array.from({ length: 7 }, (_, index) => ({
      ...base,
      id: `jacket_${index}`,
      title: "Black denim jacket",
      category: "jackets" as const,
      variants: base.variants.map((v) => ({
        ...v,
        id: `option_${index}`,
        sku: `JACKET-${index}`,
      })),
    }));
    const prepared = prepareAssistantContext(payload, ASSISTANT_NOW);
    const graph = JSON.stringify(prepared.graph);
    const output = executeAssistantTool(
      prepared,
      "prepareOperation",
      args({ operation: "removeProduct", query: "black jackets" }),
    );
    expect(output.proposal).toMatchObject({
      kind: "operation-choices",
      targetIds: [
        "jacket_0",
        "jacket_1",
        "jacket_2",
        "jacket_3",
        "jacket_4",
        "jacket_5",
      ],
      moreMatches: true,
    });
    expect(JSON.stringify(prepared.graph)).toBe(graph);
    const exact = executeAssistantTool(
      prepared,
      "prepareOperation",
      args({ operation: "removeProduct", recordId: "jacket_1" }),
    );
    expect(exact.proposal).toMatchObject({
      kind: "operation",
      targetId: "jacket_1",
    });
    expect(() =>
      executeAssistantTool(
        prepared,
        "prepareOperation",
        args({ operation: "removeProduct", recordId: "invented" }),
      ),
    ).toThrow("STALE");
    expect(() =>
      groundReply(prepared, {
        text: "Choose the exact item.",
        references: [],
        claims: [],
        navigation: null,
        proposal: { ...output.proposal, targetIds: ["invented"] },
      }),
    ).toThrow("UPSTREAM_FAILED");
  });
  it("keeps creation target-free, missing records honest and shopper preparation forbidden", () => {
    const prepared = prepareAssistantContext(assistantFixture(), ASSISTANT_NOW);
    expect(
      executeAssistantTool(
        prepared,
        "prepareOperation",
        args({ operation: "createProduct" }),
      ).proposal,
    ).toMatchObject({ kind: "operation", targetId: null });
    expect(
      executeAssistantTool(
        prepared,
        "prepareOperation",
        args({ operation: "issueRefund" }),
      ).proposal,
    ).toMatchObject({ kind: "operation-choices", targetIds: [] });
    const shopper = prepareAssistantContext(
      assistantFixture("shopper"),
      ASSISTANT_NOW,
    );
    expect(() =>
      executeAssistantTool(
        shopper,
        "prepareOperation",
        args({ operation: "createProduct" }),
      ),
    ).toThrow("FORBIDDEN");
    expect(operationEligible(prepared.graph, "placeOrder", "jeans")).toBe(
      false,
    );
    expect(operationEligible(prepared.graph, "undo", "command_1")).toBe(false);
  });
  it("covers the declared development grammar for all owner form families without invented prices", () => {
    const examples = [
      "create a black denim jacket",
      "update garment price",
      "remove the black jacket",
      "create order",
      "delete order draft",
      "place order",
      "cancel order",
      "ship order",
      "request return",
      "update return",
      "receive return",
      "restock return",
      "refund order",
      "adjust stock",
      "write off stock",
      "change future unit cost",
      "create expense",
      "delete expense draft",
      "post expense",
      "correct expense",
      "void expense",
      "undo",
    ];
    const operations = examples.map(
      (prompt) => fixtureOperation(prompt)?.operation,
    );
    expect(new Set(operations)).toEqual(new Set(OwnerOperationSchema.options));
    expect(fixtureOperation(examples[0]!)?.prefill).toEqual({
      title: "black denim jacket",
      category: "jackets",
      note: null,
    });
    expect(fixtureOperation("tell me a joke")).toBeNull();
    expect(fixtureOperation("remove the blazer")?.query).toBe("blazers");
  });
});
