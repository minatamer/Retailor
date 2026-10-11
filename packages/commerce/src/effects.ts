import type { CommerceGraph } from "@retailor/contracts/commerce";
import type { FactId } from "@retailor/contracts/facts";
import { applyCommand } from "./commands.js";
import type { CommandContext } from "./commands.js";
import { facts, allActivityScope } from "./facts.js";
import { parseGraph, freeze } from "./graph.js";
import { stockOf } from "./selectors.js";
export function previewCommand(
  input: unknown,
  command: unknown,
  context: CommandContext,
) {
  const before = parseGraph(input),
    applied = applyCommand(before, command, context);
  if (!applied.ok) return applied;
  const after = applied.graph,
    oldFacts = facts(before, allActivityScope(before)),
    newFacts = facts(after, allActivityScope(after));
  const delta = (id: FactId) =>
    newFacts.find((item) => item.factId === id)!.numerator -
    oldFacts.find((item) => item.factId === id)!.numerator;
  const inventory = (graph: CommerceGraph) =>
    new Map(
      graph.products.flatMap((product) =>
        product.variants.map(
          (variant) => [variant.id, stockOf(graph, variant.id)] as const,
        ),
      ),
    );
  const oldStock = inventory(before),
    newStock = inventory(after),
    ids = new Set([...oldStock.keys(), ...newStock.keys()]);
  return {
    ok: true as const,
    receipt: applied.receipt,
    replayed: applied.replayed,
    effect: freeze({
      revision: before.revision,
      netSales: delta("net_sales"),
      soldCost: delta("sold_cost"),
      expenses: delta("expenses"),
      inventoryLoss: delta("inventory_loss"),
      operatingResult: delta("operating_result"),
      stock: [...ids].flatMap((id) =>
        oldStock.get(id) === newStock.get(id)
          ? []
          : [
              {
                variantId: id,
                before: oldStock.get(id) ?? 0,
                after: newStock.get(id) ?? 0,
              },
            ],
      ),
      refs: applied.receipt.refs,
    }),
  };
}
