import { ModelAssistantReplySchema } from "@retailor/contracts/assistant";
import type {
  AssistantProposal,
  AssistantReference,
} from "@retailor/contracts/assistant";
import type { MetricFact } from "@retailor/contracts/facts";
import { facts } from "@retailor/commerce/facts";
import { dashboardFacts } from "@retailor/commerce/dashboard";
import { stockOf, refundable } from "@retailor/commerce/selectors";
import { deny } from "../security/errors.js";
import type { PreparedAssistantContext } from "./context.js";
import { assistantRecord } from "./tools.js";

export function referenceFact(
  prepared: PreparedAssistantContext,
  ref: Extract<AssistantReference, { kind: "fact" }>,
): MetricFact | undefined {
  const { graph, payload } = prepared;
  let scope = payload.context.scope;
  if (ref.day) {
    const start = `${ref.day}T00:00:00.000Z`,
      end = new Date(Date.parse(start) + 86_400_000).toISOString();
    const from = start > scope.from ? start : scope.from,
      to = end < scope.to ? end : scope.to;
    if (from >= to || ref.productId) return undefined;
    scope = { ...scope, from, to };
  }
  if (ref.productId) {
    const row = dashboardFacts(graph, scope).products.find(
      (p) => p.productId === ref.productId,
    );
    return ref.factId === "product_net_contribution"
      ? row?.fact
      : ref.factId === "net_units"
        ? row?.units
        : undefined;
  }
  return facts(graph, scope).find((f) => f.factId === ref.factId);
}
export function proposalValid(
  prepared: PreparedAssistantContext,
  proposal: AssistantProposal,
) {
  const { graph: g, payload } = prepared,
    role = payload.context.role;
  switch (proposal.kind) {
    case "design":
      return (
        role !== "shopper" &&
        !!(proposal.template || proposal.theme || proposal.typography)
      );
    case "logo-offer":
      return role !== "shopper" && payload.context.designConfirmed;
    case "scenario":
      return role === "owner";
    case "bag": {
      if (role !== "shopper") return false;
      const p = g.products.find((p) =>
          p.variants.some((v) => v.id === proposal.variantId),
        ),
        v = p?.variants.find((v) => v.id === proposal.variantId);
      return (
        !!p &&
        !!v &&
        !p.archived &&
        !v.archived &&
        p.imageIds.every((id) =>
          payload.context.availablePhotoIds.includes(id),
        ) &&
        stockOf(g, v.id) >= proposal.quantity
      );
    }
    case "operation": {
      if (role !== "owner") return false;
      const id = proposal.targetId,
        type = proposal.operation;
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
        return g.products.some((p) => p.variants.some((v) => v.id === id));
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
        return (
          returned?.state === "requested" || returned?.state === "received"
        );
      if (type === "receiveReturn") return returned?.state === "approved";
      if (type === "restockReturn")
        return (
          !!returned?.receivedAt &&
          !returned.restockedAt &&
          returned.lines.some((l) => l.restockable.length > 0)
        );
      return false;
    }
  }
}
/** Free prose is connective, not monetary authority. Exact values render from registered references. */
export function groundReply(
  prepared: PreparedAssistantContext,
  input: unknown,
) {
  const parsed = ModelAssistantReplySchema.safeParse(input);
  if (!parsed.success) return deny("UPSTREAM_FAILED", 502);
  const reply = parsed.data,
    { graph, payload, focusedRegistry } = prepared,
    role = payload.context.role;
  if (
    /[\d$€£¥%]|<\/?[a-z]|\b(?:dollars?|euros?|cents?|percent)\b/iu.test(
      reply.text,
    ) ||
    /guarantee|definitely fits|will (?:increase|improve) (?:sales|conversion)/iu.test(
      reply.text,
    )
  )
    return deny("UPSTREAM_FAILED", 502);
  if (
    /\b(?:cotton|wool|silk|polyester|linen|cashmere|nylon|viscose|bamboo|acrylic|elastane|leather|suede|satin|organic|sustainable|waterproof)\b|machine.wash|fits you|fits perfectly|will fit/iu.test(
      reply.text,
    )
  )
    return deny("UPSTREAM_FAILED", 502);
  // Specific material/care/fit values belong in validated typed claims/source cards;
  // unrelated uncertainty wording cannot grant authority to free prose.
  for (const ref of reply.references) {
    if (
      ref.kind === "product" &&
      !graph.products.some((p) => p.id === ref.productId)
    )
      return deny("UPSTREAM_FAILED", 502);
    if (
      ref.kind === "variant" &&
      !graph.products.some((p) =>
        p.variants.some((v) => v.id === ref.variantId),
      )
    )
      return deny("UPSTREAM_FAILED", 502);
    if (
      ref.kind === "fact" &&
      (role !== "owner" || !referenceFact(prepared, ref))
    )
      return deny("UPSTREAM_FAILED", 502);
    if (
      ref.kind === "record" &&
      (role !== "owner" ||
        !assistantRecord(prepared, ref.recordKind, ref.recordId))
    )
      return deny("UPSTREAM_FAILED", 502);
  }
  for (const claim of reply.claims) {
    if (claim.kind === "attribute") {
      const attr = graph.products
        .find((p) => p.id === claim.productId)
        ?.attributes.find((a) => a.name === claim.name);
      if (
        !attr ||
        attr.review !== "confirmed" ||
        attr.value !== claim.value ||
        attr.provenance === "unknown" ||
        attr.provenance === "demo_default"
      )
        return deny("UPSTREAM_FAILED", 502);
    } else {
      if (role !== "owner") return deny("UPSTREAM_FAILED", 502);
      const f = focusedRegistry.find((f) => f.factId === claim.factId);
      if (!f) return deny("UPSTREAM_FAILED", 502);
      const state =
        f.value === null
          ? "unavailable"
          : f.value > 0
            ? "positive"
            : f.value < 0
              ? "negative"
              : "zero";
      if (claim.state !== state) return deny("UPSTREAM_FAILED", 502);
    }
  }
  if (reply.navigation) {
    const n = reply.navigation;
    if (
      (n.kind === "owner-view" && role !== "owner") ||
      (n.kind === "filter" && role !== "shopper") ||
      (n.kind === "tour" && n.role !== role) ||
      (n.kind === "open-product" &&
        !graph.products.some((p) => p.id === n.productId))
    )
      return deny("UPSTREAM_FAILED", 502);
    if (
      n.kind === "filter" &&
      n.minimum !== null &&
      n.maximum !== null &&
      n.minimum > n.maximum
    )
      return deny("UPSTREAM_FAILED", 502);
  }
  if (reply.proposal && !proposalValid(prepared, reply.proposal))
    return deny("UPSTREAM_FAILED", 502);
  for (const claim of reply.claims) {
    const reference: AssistantReference =
      claim.kind === "attribute"
        ? { kind: "product", productId: claim.productId }
        : {
            kind: "fact",
            factId: claim.factId,
            day: payload.context.selectedDay,
            productId: null,
          };
    if (
      !reply.references.some(
        (ref) => JSON.stringify(ref) === JSON.stringify(reference),
      )
    )
      reply.references.push(reference);
  }
  if (reply.references.length > 8) return deny("UPSTREAM_FAILED", 502);
  return {
    reply,
    sensitivity: {
      currency: role === "shopper",
      scope:
        reply.references.some((ref) => ref.kind === "fact") ||
        reply.claims.some((claim) => claim.kind === "observation"),
      design:
        (role === "creator" &&
          !reply.references.some(
            (ref) => ref.kind === "product" || ref.kind === "variant",
          )) ||
        reply.proposal?.kind === "design" ||
        reply.proposal?.kind === "logo-offer",
      filters:
        reply.navigation?.kind === "filter" ||
        reply.navigation?.kind === "open-product",
    },
  };
}
