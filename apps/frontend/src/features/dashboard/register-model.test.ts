import { describe, expect, it } from "vitest";
import { emptyGraph } from "@retailor/commerce/graph";
import { ExpenseSchema } from "@retailor/contracts/commerce";
import { ProductSchema } from "@retailor/contracts/product";
import { expenseRegister, inventorySummary } from "./register-model";
import { INITIAL_EXPENSE_FILTERS } from "./state";
const at = "2026-10-15T12:00:00.000Z";
const graph = () =>
  structuredClone(
    emptyGraph({
      workspaceId: "workspace",
      scenarioId: "scenario",
      createdAt: at,
    }),
  );
const expense = (
  id: string,
  amount: number,
  date: string,
  category = "marketing",
) =>
  ExpenseSchema.parse({
    id,
    amount,
    at: date,
    category,
    kind: amount < 0 ? "correction" : "posting",
    note: "An expense",
    origin: "seeded_scenario",
    ...(amount < 0 ? { parentId: "september" } : {}),
  });
describe("owner registers keep actual signed records and stock", () => {
  it("filters by UTC month and category, preserves corrections and never counts undated drafts", () => {
    const g = graph();
    g.expenses = [
      expense("september", 3200, "2026-09-30T23:59:59.000Z"),
      expense("october", 2400, "2026-10-01T00:00:00.000Z"),
      expense("credit", -400, "2026-10-02T00:00:00.000Z"),
      expense("other", 1600, "2026-10-03T00:00:00.000Z", "platform"),
    ];
    g.expenseDrafts = [
      { id: "draft", amount: 9999, note: "Unposted", category: "marketing" },
    ];
    const before = structuredClone(g);
    const result = expenseRegister(g, {
      month: "2026-10",
      category: "marketing",
      sort: "newest",
    });
    expect(result.months).toEqual(["2026-10", "2026-09"]);
    expect(result.rows.map((row) => row.id)).toEqual(["credit", "october"]);
    expect(result.total).toBe(2000);
    expect(result.groups[0]?.total).toBe(2000);
    expect(g).toEqual(before);
    expect(expenseRegister(g, INITIAL_EXPENSE_FILTERS).total).toBe(6800);
  });
  it("orders months and dated entries both ways, with an honest empty filter", () => {
    const g = graph();
    g.expenses = [
      expense("oct", 100, at),
      expense("sep", 200, "2026-09-20T00:00:00.000Z"),
    ];
    expect(
      expenseRegister(g, {
        ...INITIAL_EXPENSE_FILTERS,
        sort: "oldest",
      }).groups.map((group) => group.month),
    ).toEqual(["2026-09", "2026-10"]);
    expect(
      expenseRegister(g, { ...INITIAL_EXPENSE_FILTERS, month: "2026-08" }),
    ).toMatchObject({ rows: [], groups: [], total: 0 });
  });
  it("counts actual movement-adjusted stock, includes held archive value and excludes archives from low-stock alerts", () => {
    const g = graph();
    g.products = [
      ProductSchema.parse({
        id: "shirt",
        title: "Shirt",
        description: "",
        category: "shirts",
        imageIds: ["photo"],
        sizingSystemId: "alpha-demo",
        attributes: [],
        archived: false,
        variants: [
          {
            id: "blue",
            size: "M",
            colour: "Blue",
            sku: "SH-M",
            price: 2500,
            unitCost: 1250,
            openingStock: 2,
            openedAt: at,
            archived: false,
          },
          {
            id: "archive",
            size: "S",
            colour: "Blue",
            sku: "SH-S",
            price: 2500,
            unitCost: 1250,
            openingStock: 1,
            openedAt: at,
            archived: true,
          },
        ],
      }),
    ];
    g.movements = [
      {
        id: "inbound",
        variantId: "blue",
        at,
        origin: "guest_action",
        units: 3,
        kind: "inbound",
        sourceId: "count",
        reason: "New stock",
      },
    ];
    expect(inventorySummary(g)).toEqual({ units: 6, low: 0, value: 7500 });
    g.movements = [];
    expect(inventorySummary(g)).toEqual({ units: 3, low: 1, value: 3750 });
  });
});
