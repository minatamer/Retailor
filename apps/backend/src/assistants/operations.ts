import type { CommerceGraph } from "@retailor/contracts/commerce";
import type { AssistantProposal } from "@retailor/contracts/assistant";
import { refundable } from "@retailor/commerce/selectors";
import type { CategorySchema } from "@retailor/contracts/product";
import type { z } from "zod";

type Operation = Extract<AssistantProposal, { kind: "operation" }>["operation"];
/** Eligibility narrows a proposed form target. The local command engine still owns final effects. */
export function operationEligible(
  g: CommerceGraph,
  type: Operation,
  id: string | null,
): boolean {
  if (type === "createProduct") return id === null;
  if (type === "saveOrderDraft")
    return id === null || g.orderDrafts.some((d) => d.id === id);
  if (type === "saveExpenseDraft")
    return id === null || g.expenseDrafts.some((d) => d.id === id);
  if (!id) return false;
  if (type === "updateProduct" || type === "removeProduct")
    return g.products.some((p) => p.id === id);
  if (["deleteOrderDraft", "placeOrder"].includes(type))
    return g.orderDrafts.some((d) => d.id === id);
  if (["postExpense", "deleteExpenseDraft"].includes(type))
    return g.expenseDrafts.some((d) => d.id === id);
  if (["correctExpense", "voidExpense"].includes(type))
    return (
      g.expenses.some((e) => e.id === id && e.kind === "posting") &&
      !g.expenses.some((e) => e.kind === "void" && e.parentId === id)
    );
  if (["adjustStock", "writeoffStock", "setUnitCost"].includes(type))
    return g.products.some(
      (p) => p.variants.some((v) => v.id === id && !v.archived) && !p.archived,
    );
  if (type === "undo")
    return g.receipts.at(-1)?.id === id && !!g.receipts.at(-1)?.undo;
  const order = g.orders.find((o) => o.id === id);
  if (type === "cancelOrder")
    return (
      order?.state === "placed" &&
      !g.refunds.some((r) => r.orderId === id) &&
      !g.returns.some((r) => r.orderId === id)
    );
  if (type === "advanceOrder")
    return order?.state === "placed" || order?.state === "shipped";
  if (type === "requestReturn")
    return !!order?.shippedAt && order.state !== "cancelled";
  if (type === "issueRefund") {
    if (!order || order.state === "cancelled") return false;
    const remaining = refundable(g, id);
    return (
      remaining.delivery > 0 ||
      remaining.tax > 0 ||
      remaining.lines.some((l) => l.amount > 0)
    );
  }
  const returned = g.returns.find((r) => r.id === id);
  if (type === "advanceReturn")
    return returned?.state === "requested" || returned?.state === "received";
  if (type === "receiveReturn") return returned?.state === "approved";
  if (type === "restockReturn")
    return (
      !!returned?.receivedAt &&
      !returned.restockedAt &&
      returned.lines.some((l) => l.restockable.length > 0)
    );
  return false;
}
export function operationTargets(
  g: CommerceGraph,
  type: Operation,
  query: string,
) {
  const products = g.products.map((p) => ({
    id: p.id,
    label: `${p.title} ${p.category}`,
  }));
  const variants = g.products.flatMap((p) =>
    p.variants.map((v) => ({
      id: v.id,
      label: `${p.title} ${p.category} ${v.size} ${v.colour} ${v.sku}`,
    })),
  );
  const rows =
    type === "updateProduct" || type === "removeProduct"
      ? products
      : ["adjustStock", "writeoffStock", "setUnitCost"].includes(type)
        ? variants
        : ["saveOrderDraft", "deleteOrderDraft", "placeOrder"].includes(type)
          ? g.orderDrafts.map((r) => ({ id: r.id, label: r.id }))
          : ["saveExpenseDraft", "deleteExpenseDraft", "postExpense"].includes(
                type,
              )
            ? g.expenseDrafts.map((r) => ({
                id: r.id,
                label: `${r.id} ${r.category} ${r.note}`,
              }))
            : ["correctExpense", "voidExpense"].includes(type)
              ? g.expenses.map((r) => ({
                  id: r.id,
                  label: `${r.id} ${r.category} ${r.note}`,
                }))
              : ["advanceReturn", "receiveReturn", "restockReturn"].includes(
                    type,
                  )
                ? g.returns.map((r) => ({
                    id: r.id,
                    label: `${r.id} ${r.orderId} ${r.state}`,
                  }))
                : type === "undo"
                  ? g.receipts.map((r) => ({ id: r.id, label: r.id }))
                  : g.orders.map((r) => ({
                      id: r.id,
                      label: `${r.id} ${r.state}`,
                    }));
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return rows.filter(
    (r) =>
      operationEligible(g, type, r.id) &&
      words.every((word) => r.label.toLowerCase().includes(word)),
  );
}
/** Declared development grammar, covering the same finite forms as live preparation. */
export function fixtureOperation(prompt: string): {
  operation: Operation;
  query: string;
  prefill: Extract<AssistantProposal, { kind: "operation" }>["prefill"];
} | null {
  const rules: readonly [RegExp, Operation][] = [
    [/\bundo\b/, "undo"],
    [/void.*expense/, "voidExpense"],
    [/correct.*expense/, "correctExpense"],
    [/post.*expense/, "postExpense"],
    [/(delete|remove).*expense.*draft/, "deleteExpenseDraft"],
    [/(create|new|add|edit|save).*expense/, "saveExpenseDraft"],
    [/restock.*return/, "restockReturn"],
    [/receive.*return/, "receiveReturn"],
    [/update.*return/, "advanceReturn"],
    [/refund/, "issueRefund"],
    [/(request|create|new).*return/, "requestReturn"],
    [/(delete|remove).*order.*draft/, "deleteOrderDraft"],
    [/place.*order/, "placeOrder"],
    [/cancel.*order/, "cancelOrder"],
    [/(ship|fulfil|update).*order/, "advanceOrder"],
    [/(create|new|add|edit|save).*order/, "saveOrderDraft"],
    [/(unit cost|future cost)/, "setUnitCost"],
    [/(write off|writeoff|damage).*stock/, "writeoffStock"],
    [/(adjust|add|reduce).*stock/, "adjustStock"],
    [
      /(delete|remove|archive).*(product|garment|jacket|jeans|hoodie|shirt|clothing|item|tee|blazer|trouser|cardigan|dress|skirt|shorts|swimwear|knitwear|activewear|loungewear|underwear|socks)/,
      "removeProduct",
    ],
    [
      /(edit|update).*(product|garment|jacket|jeans|hoodie|shirt|clothing|item|price|tee|blazer|trouser|cardigan|dress|skirt|shorts|swimwear|knitwear|activewear|loungewear|underwear|socks)/,
      "updateProduct",
    ],
    [
      /(create|new|add).*(product|garment|jacket|jeans|hoodie|shirt|clothing|tee|blazer|trouser|cardigan|dress|skirt|shorts|swimwear|knitwear|activewear|loungewear|underwear|socks)/,
      "createProduct",
    ],
  ];
  const operation = rules.find(([pattern]) => pattern.test(prompt))?.[1];
  if (!operation) return null;
  const categories: readonly [RegExp, z.infer<typeof CategorySchema>][] = [
    [/overshirt/, "overshirts"],
    [/t.?shirt|\btees?\b/, "tees"],
    [/shirt/, "shirts"],
    [/jacket/, "jackets"],
    [/jeans/, "jeans"],
    [/hoodie/, "hoodies"],
    [/trouser/, "trousers"],
    [/blazer/, "blazers"],
    [/cardigan/, "cardigans"],
    [/dress/, "dresses"],
    [/skirt/, "skirts"],
    [/swim/, "swimwear"],
    [/shorts/, "shorts"],
    [/knitwear/, "knitwear"],
    [/activewear/, "activewear"],
    [/loungewear/, "loungewear"],
    [/underwear|socks/, "underwear-socks"],
  ];
  const category =
    categories.find(([pattern]) => pattern.test(prompt))?.[1] ?? null;
  const title =
    operation === "createProduct"
      ? prompt
          .replace(/^.*?\b(?:create|add|new)\s+(?:a |an |the )?/, "")
          .trim()
          .slice(0, 100)
      : null;
  const query = [
    "updateProduct",
    "removeProduct",
    "adjustStock",
    "writeoffStock",
    "setUnitCost",
  ].includes(operation)
    ? [
        /(?:black|white|blue|cream|grey|gray|green|navy)\b/.exec(prompt)?.[0],
        category,
      ]
        .filter(Boolean)
        .join(" ")
    : "";
  return { operation, query, prefill: { title, category, note: null } };
}
