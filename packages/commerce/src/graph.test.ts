import { it, expect } from "vitest";
import { parseGraph, serializedBytes } from "./graph.js";
import { facts } from "./facts.js";
import { maximumGraph } from "../test/maximum.js";
import { Harness, NOW, DAY1, SCOPE, product } from "../test/fixtures.js";
import { applyCommand } from "./commands.js";
import { AttributeSchema } from "@retailor/contracts/product";
it("fits all declared record-count caps without truncating ledger history", () => {
  const graph = parseGraph(maximumGraph()),
    bytes = serializedBytes(graph);
  expect(graph.products).toHaveLength(40);
  expect(graph.products.flatMap((product) => product.variants)).toHaveLength(
    288,
  );
  expect(graph.orders).toHaveLength(30);
  expect(graph.returns).toHaveLength(60);
  expect(graph.refunds).toHaveLength(60);
  expect(graph.movements).toHaveLength(256);
  expect(graph.traffic).toHaveLength(320);
  expect(graph.receipts).toHaveLength(160);
  expect(bytes).toBeLessThanOrEqual(512 * 1024);
  const values = facts(graph, SCOPE);
  expect(values.find((item) => item.factId === "available_stock")!.value).toBe(
    1884,
  );
  expect(values.find((item) => item.factId === "net_sales")!.value).toBe(
    979940,
  );
  expect(values.find((item) => item.factId === "sold_cost")!.value).toBe(
    392000,
  );
  expect(values.find((item) => item.factId === "operating_result")!.value).toBe(
    574340,
  );
  console.log(`RTL-004 independent full-count graph: ${bytes} UTF-8 bytes`);
});
it("enforces serialized size separately from array caps without silently dropping history", () => {
  const graph = maximumGraph();
  for (const product of graph.products) {
    product.description = "x".repeat(1000);
    product.attributes = AttributeSchema.shape.name.options.map((name) => ({
      name,
      value: "x".repeat(100),
      provenance: "user_supplied",
      sourceIds: [],
      review: "confirmed",
    }));
  }
  for (const receipt of graph.receipts) receipt.identity = "x".repeat(3000);
  expect(serializedBytes(graph)).toBeGreaterThan(512 * 1024);
  expect(() => parseGraph(graph)).toThrow("512-KiB");
});
it("rejects active/retained/variant/count and option/provenance relation violations", () => {
  const h = new Harness();
  const input = product("goods");
  input.variants.push({ ...input.variants[0]!, id: "other_option" });
  expect(
    applyCommand(h.graph, h.command("createProduct", input), h.context),
  ).toMatchObject({ ok: false, code: "duplicate" });
  input.variants = input.variants.slice(0, 1);
  input.attributes = [
    {
      name: "material",
      value: "Invented",
      provenance: "image_observed",
      sourceIds: ["photo_tee"],
      review: "draft",
    },
  ];
  expect(
    applyCommand(h.graph, h.command("createProduct", input), h.context),
  ).toMatchObject({ ok: false, code: "relation" });
  const tooMany = maximumGraph();
  tooMany.products = tooMany.products.map((product) => ({
    ...product,
    archived: false,
  }));
  expect(() => parseGraph(tooMany)).toThrow("20 products");
});
it("rejects date/state/cost corruption and source-less financial stock mutations", () => {
  const h = new Harness();
  h.place();
  expect(() =>
    parseGraph({
      ...h.graph,
      orders: h.graph.orders.map((order) => ({
        ...order,
        shippedAt: DAY1,
        state: "placed",
      })),
    }),
  ).toThrow();
  expect(() =>
    parseGraph({
      ...h.graph,
      movements: [
        ...h.graph.movements,
        {
          id: "fake",
          variantId: "shirt_m",
          at: NOW,
          origin: "guest_action",
          units: 1,
          kind: "restock",
          sourceId: "missing",
          reason: "Fake",
        },
      ],
    }),
  ).toThrow();
});
it("rejects backdated guest records and expense over-corrections on recovery", () => {
  const h = new Harness();
  expect(
    applyCommand(
      h.graph,
      h.command("addTraffic", {
        sessions: [
          {
            id: "old",
            actor: "shopper",
            origin: "guest_action",
            startedAt: DAY1,
            lastAt: NOW,
            productIds: [],
          },
        ],
      }),
      h.context,
    ),
  ).toMatchObject({ ok: false, code: "relation" });
  h.step("saveExpenseDraft", {
    id: "bill",
    category: "operations",
    amount: 1_000_000_000,
    note: "",
  });
  h.step("postExpense", { draftId: "bill" });
  expect(() =>
    parseGraph({
      ...h.graph,
      expenses: [
        ...h.graph.expenses,
        {
          id: "over",
          parentId: "bill",
          kind: "correction",
          category: "operations",
          at: NOW,
          origin: "guest_action",
          amount: 1,
          note: "",
        },
      ],
    }),
  ).toThrow("over-correct");
});
