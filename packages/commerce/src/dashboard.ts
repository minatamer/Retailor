import { ExpenseCategorySchema } from "@retailor/contracts/commerce";
import { CategorySchema } from "@retailor/contracts/product";
import { MetricFactSchema } from "@retailor/contracts/facts";
import type { MetricFact } from "@retailor/contracts/facts";
import { exactSum } from "./allocation.js";
import { parseGraph, freeze } from "./graph.js";
import { facts, productContribution } from "./facts.js";
import { stockOf } from "./selectors.js";
import { unitEvents } from "./unit-events.js";

/** Named breakdowns of registered facts, with the same date and identity authority. */
export function dashboardFacts(input: unknown, rawScope: unknown) {
  const graph = parseGraph(input),
    registry = facts(graph, rawScope);
  const base = (id: MetricFact["factId"]) =>
    registry.find((f) => f.factId === id)!;
  const scope = registry[0]!.scope;
  const inPeriod = (at: string) =>
    at >= scope.from && at < scope.to && at <= scope.asOf;
  const grouped = (
    source: MetricFact,
    numerator: number,
    contributors: string[],
    formula: string,
    dateBasis = source.dateBasis,
  ) => {
    const common = { ...source };
    delete common.productId;
    return MetricFactSchema.parse({
      ...common,
      numerator,
      value: source.availability === "available" ? numerator : null,
      denominator: null,
      contributors: [...new Set(contributors)],
      formula,
      dateBasis,
    });
  };
  const products = graph.products.map((p) => {
    const units = unitEvents(graph, scope, p.id);
    return {
      productId: p.id,
      fact: productContribution(graph, scope, p.id),
      units: MetricFactSchema.parse({
        ...grouped(
          base("net_units"),
          units.value,
          units.contributors,
          base("net_units").formula,
        ),
        productId: p.id,
      }),
    };
  });
  const categories = CategorySchema.options
    .filter((category) => graph.products.some((p) => p.category === category))
    .map((category) => {
      const rows = products.filter(
        (row) =>
          graph.products.find((p) => p.id === row.productId)!.category ===
          category,
      );
      return {
        category,
        fact: grouped(
          rows[0]!.fact,
          exactSum(rows.map((row) => row.fact.numerator)),
          rows.flatMap((row) => row.fact.contributors),
          "sum registered product net contributions in this current category",
          "Placement/adjustment event dates; current catalogue category grouping",
        ),
      };
    });
  const expenses = ExpenseCategorySchema.options.map((category) => {
    const rows = graph.expenses.filter(
      (e) => e.category === category && inPeriod(e.at),
    );
    return {
      category,
      fact: grouped(
        base("expenses"),
        exactSum(rows.map((e) => e.amount)),
        rows.map((e) => `expense:${e.id}`),
        "category posted expenses + signed linked corrections",
      ),
    };
  });
  const returnReasons = (
    ["sizing", "changed-mind", "damaged", "other"] as const
  ).map((reason) => {
    const rows = graph.returns.filter(
      (r) => r.reason === reason && r.receivedAt && inPeriod(r.receivedAt),
    );
    return {
      reason,
      fact: grouped(
        base("returned_units"),
        exactSum(rows.flatMap((r) => r.lines.map((l) => l.units.length))),
        rows.flatMap((r) => [`return:${r.id}`, `order:${r.orderId}`]),
        "physically received units grouped by recorded return reason",
        "Physical receipt dates; requests/refunds excluded",
      ),
    };
  });
  const inventory = graph.products.flatMap((p) =>
    p.variants.map((v) => ({
      productId: p.id,
      variantId: v.id,
      active: !p.archived && !v.archived,
      fact: grouped(
        base("available_stock"),
        stockOf(graph, v.id, scope.asOf),
        [
          `variant:${v.id}`,
          ...graph.movements
            .filter((m) => m.variantId === v.id && m.at <= scope.asOf)
            .map((m) => `movement:${m.id}`),
        ],
        "variant opening units + signed stock movements",
      ),
    })),
  );
  return freeze({
    registry,
    products,
    categories,
    expenses,
    returnReasons,
    inventory,
  });
}
