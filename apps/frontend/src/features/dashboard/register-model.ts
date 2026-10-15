import type { CommerceGraph } from "@retailor/contracts/commerce";
import { exactSum } from "@retailor/commerce/allocation";
import { stockOf } from "@retailor/commerce/selectors";
import type { ExpenseFilters } from "./state";

export function expenseRegister(graph: CommerceGraph, filters: ExpenseFilters) {
  const months = [...new Set(graph.expenses.map((row) => row.at.slice(0, 7)))]
    .sort()
    .reverse();
  const rows = graph.expenses
    .filter(
      (row) =>
        (!filters.month || row.at.slice(0, 7) === filters.month) &&
        (filters.category === "all" || row.category === filters.category),
    )
    .sort(
      (a, b) =>
        (filters.sort === "oldest" ? 1 : -1) *
          (Date.parse(a.at) - Date.parse(b.at)) || a.id.localeCompare(b.id),
    );
  const groups = new Map<string, typeof rows>();
  for (const row of rows) {
    const month = row.at.slice(0, 7);
    groups.set(month, [...(groups.get(month) ?? []), row]);
  }
  return {
    months,
    rows,
    total: exactSum(rows.map((row) => row.amount)),
    groups: [...groups].map(([month, entries]) => ({
      month,
      entries,
      total: exactSum(entries.map((row) => row.amount)),
    })),
  };
}
export function inventorySummary(graph: CommerceGraph) {
  const options = graph.products.flatMap((product) =>
    product.variants.map((variant) => ({
      product,
      variant,
      stock: stockOf(graph, variant.id),
    })),
  );
  return {
    units: exactSum(options.map((option) => option.stock)),
    low: options.filter(
      ({ product, variant, stock }) =>
        !product.archived && !variant.archived && stock <= 2,
    ).length,
    value: exactSum(
      options.map(({ variant, stock }) => variant.unitCost * stock),
    ),
  };
}
export const monthLabel = (month: string) =>
  new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${month}-01T00:00:00.000Z`));
export const titleCase = (value: string) =>
  value.charAt(0).toUpperCase() + value.slice(1);
