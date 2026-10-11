import { CommandSchema } from "@retailor/contracts/commands";
import type { CommerceCommand } from "@retailor/contracts/commands";
import {
  GraphSchema,
  TimestampSchema,
  COMMERCE_LIMITS,
} from "@retailor/contracts/commerce";
import type {
  CommerceGraph,
  Receipt,
  Undo,
  Movement,
} from "@retailor/contracts/commerce";
import { ProductCopySchema } from "@retailor/contracts/commerce";
import type { ProductInput, Product } from "@retailor/contracts/product";
import { MAX_MINOR_AMOUNT } from "@retailor/contracts/core";
import {
  parseGraph,
  canonical,
  utf8Bytes,
  freeze,
  invalidGraph,
} from "./graph.js";
import { ensure, unique } from "./errors.js";
import type { CommerceError } from "./errors.js";
import {
  variantOf,
  orderOf,
  stockOf,
  productReferenced,
  refundable,
} from "./selectors.js";
import {
  allocate,
  allocateUnits,
  exactProduct,
  exactSum,
} from "./allocation.js";

export interface CommandContext {
  now: string;
  availablePhotoIds: ReadonlySet<string>;
}
export type CommandResult =
  | { ok: true; graph: CommerceGraph; receipt: Receipt; replayed: boolean }
  | { ok: false; code: CommerceError["code"]; message: string };
function put<T extends { id: string }>(items: T[], value: T) {
  const index = items.findIndex((item) => item.id === value.id);
  if (index < 0) items.push(value);
  else items[index] = value;
}
function witness(
  graph: CommerceGraph,
  ids: readonly string[],
  context: CommandContext,
) {
  ensure(
    ids.length > 0 &&
      ids.every(
        (id) =>
          context.availablePhotoIds.has(id) &&
          graph.photos.some((photo) => photo.id === id),
      ),
    "unavailable-photo",
    "This product needs its validated photo bytes. Reselect missing photos before continuing.",
  );
}
function productOf(graph: CommerceGraph, id: string) {
  const product = graph.products.find((item) => item.id === id);
  ensure(product, "not-found", "This product is unavailable.");
  return product;
}
function copyOf(
  product: Pick<
    Product,
    | "title"
    | "description"
    | "category"
    | "imageIds"
    | "sizingSystemId"
    | "attributes"
  >,
) {
  return ProductCopySchema.parse({
    title: product.title,
    description: product.description,
    category: product.category,
    imageIds: product.imageIds,
    sizingSystemId: product.sizingSystemId,
    attributes: product.attributes,
  });
}
function referenced(
  graph: CommerceGraph,
  productId: string,
  variantId?: string,
) {
  return (
    productReferenced(graph, productId, variantId) ||
    graph.orderDrafts.some((draft) =>
      draft.lines.some((line) =>
        variantId
          ? line.variantId === variantId
          : variantOf(graph, line.variantId).product.id === productId,
      ),
    )
  );
}
function productFrom(
  input: ProductInput,
  graph: CommerceGraph,
  command: CommerceCommand,
  context: CommandContext,
  old?: Product,
): Product {
  witness(graph, input.imageIds, context);
  const variants = input.variants.map((item) => {
    const previous = old?.variants.find((entry) => entry.id === item.id);
    if (previous) {
      ensure(
        previous.openingStock === item.openingStock,
        "stock",
        "Change existing stock with a reasoned movement.",
      );
      if (referenced(graph, old!.id, item.id))
        ensure(
          previous.size === item.size &&
            previous.colour === item.colour &&
            previous.sku === item.sku,
          "relation",
          "Keep referenced variant options stable; archive it and create a new variant.",
        );
    }
    return { ...item, openedAt: previous?.openedAt ?? command.at };
  });
  if (old)
    for (const item of old.variants)
      if (
        !variants.some((entry) => entry.id === item.id) &&
        referenced(graph, old.id, item.id)
      )
        variants.push({ ...item, archived: true });
  return { ...input, variants };
}
function move(
  graph: CommerceGraph,
  command: CommerceCommand,
  index: number,
  data: Pick<
    Movement,
    "variantId" | "units" | "kind" | "sourceId" | "reason"
  > & { lineId?: string },
) {
  graph.movements.push({
    id: `${command.id}_move_${index}`,
    at: command.at,
    origin: command.origin,
    ...data,
  });
}
function monetary(value: number) {
  ensure(
    value >= 0 && value <= MAX_MINOR_AMOUNT,
    "amount",
    "This amount exceeds the demo's bounded USD limit.",
  );
  return value;
}
function edit(
  graph: CommerceGraph,
  command: CommerceCommand,
  context: CommandContext,
): { refs: string[]; undo?: Undo } {
  switch (command.type) {
    case "registerPhotos": {
      for (const photo of command.payload.photos) {
        ensure(
          context.availablePhotoIds.has(photo.id),
          "unavailable-photo",
          "Only locally validated available photos may be registered.",
        );
        const old = graph.photos.find((item) => item.id === photo.id);
        if (
          old &&
          (graph.products.some((item) => item.imageIds.includes(photo.id)) ||
            graph.orders.some((order) =>
              order.lines.some((line) => line.photoId === photo.id),
            ))
        )
          ensure(
            canonical(old) === canonical(photo),
            "relation",
            "Referenced photo identities cannot be replaced with different bytes.",
          );
        put(graph.photos, photo);
      }
      return { refs: command.payload.photos.map((item) => `photo:${item.id}`) };
    }
    case "createProduct": {
      ensure(
        !graph.products.some((item) => item.id === command.payload.id),
        "duplicate",
        "This product identity already exists.",
      );
      graph.products.push(
        productFrom(command.payload, graph, command, context),
      );
      return { refs: [`product:${command.payload.id}`] };
    }
    case "updateProduct": {
      const old = productOf(graph, command.payload.id),
        replacement = productFrom(
          command.payload,
          graph,
          command,
          context,
          old,
        );
      const undo =
        canonical(old.variants) === canonical(replacement.variants) &&
        old.archived === replacement.archived
          ? {
              type: "product-copy" as const,
              productId: old.id,
              before: copyOf(old),
            }
          : undefined;
      put(graph.products, replacement);
      graph.bag = graph.bag.filter((line) => {
        if (
          !graph.products.some((product) =>
            product.variants.some((variant) => variant.id === line.variantId),
          )
        )
          return false;
        const item = variantOf(graph, line.variantId);
        return !item.product.archived && !item.variant.archived;
      });
      return { refs: [`product:${old.id}`], ...(undo ? { undo } : {}) };
    }
    case "updateProductCopy": {
      const old = productOf(graph, command.payload.productId),
        before = copyOf(old),
        copy = copyOf(command.payload);
      witness(graph, copy.imageIds, context);
      put(graph.products, { ...old, ...copy });
      return {
        refs: [`product:${old.id}`],
        undo: { type: "product-copy", productId: old.id, before },
      };
    }
    case "removeProduct": {
      const product = productOf(graph, command.payload.productId),
        ids = new Set(product.variants.map((item) => item.id));
      if (referenced(graph, product.id)) product.archived = true;
      else
        graph.products = graph.products.filter(
          (item) => item.id !== product.id,
        );
      graph.bag = graph.bag.filter((line) => !ids.has(line.variantId));
      return { refs: [`product:${product.id}`] };
    }
    case "setUnitCost": {
      const { variant } = variantOf(graph, command.payload.variantId);
      variant.unitCost = command.payload.cost;
      return { refs: [`variant:${variant.id}`] };
    }
    case "setBagLine": {
      const before = graph.bag,
        { product, variant } = variantOf(graph, command.payload.variantId);
      if (command.payload.quantity) {
        ensure(
          !product.archived && !variant.archived,
          "transition",
          "This item is no longer available to shop.",
        );
        witness(graph, product.imageIds, context);
        ensure(
          stockOf(graph, variant.id) >= command.payload.quantity,
          "stock",
          "There are not enough units available for this bag line.",
        );
      }
      graph.bag = graph.bag.filter((line) => line.variantId !== variant.id);
      if (command.payload.quantity)
        graph.bag.push({
          variantId: variant.id,
          quantity: command.payload.quantity,
          unitPrice: variant.price,
        });
      return { refs: [`variant:${variant.id}`], undo: { type: "bag", before } };
    }
    case "saveOrderDraft": {
      const input = command.payload,
        before = graph.orderDrafts.find((item) => item.id === input.id) ?? null;
      unique(input.lines.map((line) => line.variantId));
      const lines = input.lines.map((line) => {
        const { product, variant } = variantOf(graph, line.variantId);
        ensure(
          !product.archived && !variant.archived,
          "transition",
          "Choose an active sellable variant.",
        );
        return { ...line, unitPrice: variant.price };
      });
      monetary(
        exactSum(
          lines.map((line) => exactProduct(line.unitPrice, line.quantity)),
        ),
      );
      ensure(
        input.discount <=
          exactSum(
            lines.map((line) => exactProduct(line.unitPrice, line.quantity)),
          ),
        "amount",
        "Discount exceeds merchandise value.",
      );
      put(graph.orderDrafts, {
        ...input,
        lines,
        at: command.at,
        origin: command.origin,
      });
      return {
        refs: [`order-draft:${input.id}`],
        undo: { type: "order-draft", id: input.id, before },
      };
    }
    case "deleteOrderDraft": {
      const before = graph.orderDrafts.find(
        (item) => item.id === command.payload.draftId,
      );
      ensure(before, "not-found", "This order draft is unavailable.");
      graph.orderDrafts = graph.orderDrafts.filter(
        (item) => item.id !== before.id,
      );
      return {
        refs: [`order-draft:${before.id}`],
        undo: { type: "order-draft", id: before.id, before },
      };
    }
    case "placeOrder": {
      const draft = graph.orderDrafts.find(
        (item) => item.id === command.payload.draftId,
      );
      ensure(draft, "not-found", "This order draft is unavailable.");
      ensure(
        command.at >= draft.at,
        "transition",
        "An order cannot be placed before its reviewed draft.",
      );
      ensure(
        !graph.orders.some((item) => item.id === command.payload.orderId),
        "duplicate",
        "This order identity already exists.",
      );
      const bases = draft.lines.map((line) => {
        const item = variantOf(graph, line.variantId);
        ensure(
          !item.product.archived && !item.variant.archived,
          "transition",
          "A selected item is no longer sellable.",
        );
        witness(graph, item.product.imageIds, context);
        ensure(
          line.unitPrice === item.variant.price,
          "price-changed",
          "Prices changed. Review and save this order draft again.",
        );
        ensure(
          stockOf(graph, line.variantId) >= line.quantity,
          "stock",
          "Not enough stock. No order line was placed.",
        );
        return exactProduct(line.unitPrice, line.quantity);
      });
      const gross = monetary(exactSum(bases));
      ensure(
        draft.discount <= gross,
        "amount",
        "Discount exceeds the current merchandise basis.",
      );
      const discounts = allocate(draft.discount, bases),
        merchandise = gross - draft.discount,
        total = monetary(exactSum([merchandise, draft.delivery, draft.tax]));
      const lines = draft.lines.map((line, index) => {
        const { product, variant } = variantOf(graph, line.variantId);
        return {
          id: `${command.id}_line_${index}`,
          productId: product.id,
          variantId: variant.id,
          photoId: product.imageIds[0]!,
          title: product.title,
          category: product.category,
          size: variant.size,
          colour: variant.colour,
          sku: variant.sku,
          quantity: line.quantity,
          unitPrice: variant.price,
          unitCost: variant.unitCost,
          unitNet: allocateUnits(
            bases[index]! - discounts[index]!,
            line.quantity,
          ),
        };
      });
      const order = {
        id: command.payload.orderId,
        actor: draft.actor,
        origin: command.origin,
        ...(draft.buyerId ? { buyerId: draft.buyerId } : {}),
        ...(draft.trafficId ? { trafficId: draft.trafficId } : {}),
        placedAt: command.at,
        state: "placed" as const,
        lines,
        gross,
        discount: draft.discount,
        merchandise,
        delivery: draft.delivery,
        tax: draft.tax,
        total,
      };
      if (draft.trafficId) {
        const session = graph.traffic.find(
          (item) => item.id === draft.trafficId,
        );
        ensure(
          draft.actor === "shopper" &&
            session?.actor === "shopper" &&
            session.checkoutAt &&
            session.checkoutAt <= command.at,
          "relation",
          "Conversion requires a known eligible checkout session.",
        );
        session.orderIds.push(order.id);
        if (command.at > session.lastAt) session.lastAt = command.at;
      }
      graph.orders.push(order);
      for (let index = 0; index < lines.length; index++) {
        const line = lines[index]!;
        move(graph, command, index, {
          variantId: line.variantId,
          units: -line.quantity,
          kind: "sale",
          sourceId: order.id,
          lineId: line.id,
          reason: "Placed demo order",
        });
      }
      graph.orderDrafts = graph.orderDrafts.filter(
        (item) => item.id !== draft.id,
      );
      if (draft.actor === "shopper") graph.bag = [];
      return {
        refs: [
          `order:${order.id}`,
          ...lines.map((_, index) => `movement:${command.id}_move_${index}`),
        ],
      };
    }
    case "cancelOrder": {
      const order = orderOf(graph, command.payload.orderId);
      ensure(
        order.state === "placed" &&
          !graph.returns.some((item) => item.orderId === order.id) &&
          !graph.refunds.some((item) => item.orderId === order.id),
        "transition",
        "Only an unadjusted placed order can be cancelled.",
      );
      order.state = "cancelled";
      const id = `${command.id}_cancel`;
      graph.cancellations.push({
        id,
        orderId: order.id,
        at: command.at,
        origin: command.origin,
        merchandise: order.merchandise,
        delivery: order.delivery,
        tax: order.tax,
      });
      for (let index = 0; index < order.lines.length; index++) {
        const line = order.lines[index]!;
        move(graph, command, index, {
          variantId: line.variantId,
          units: line.quantity,
          kind: "cancel",
          sourceId: id,
          lineId: line.id,
          reason: "Cancelled demo order",
        });
      }
      return { refs: [`order:${order.id}`, `cancellation:${id}`] };
    }
    case "advanceOrder": {
      const order = orderOf(graph, command.payload.orderId);
      if (command.payload.state === "shipped") {
        ensure(
          order.state === "placed",
          "transition",
          "Only a placed order can ship.",
        );
        order.state = "shipped";
        order.shippedAt = command.at;
      } else {
        ensure(
          order.state === "shipped",
          "transition",
          "Only a shipped order can be fulfilled.",
        );
        order.state = "fulfilled";
        order.fulfilledAt = command.at;
      }
      return { refs: [`order:${order.id}`] };
    }
    case "requestReturn": {
      const input = command.payload,
        order = orderOf(graph, input.orderId);
      ensure(
        order.shippedAt && order.state !== "cancelled",
        "transition",
        "Receive returns only for shipped units.",
      );
      ensure(
        !graph.returns.some((item) => item.id === input.id),
        "duplicate",
        "This return identity already exists.",
      );
      graph.returns.push({
        ...input,
        origin: command.origin,
        state: "requested",
        requestedAt: command.at,
        lines: input.lines.map((line) => ({ ...line, restockable: [] })),
      });
      return { refs: [`return:${input.id}`] };
    }
    case "advanceReturn": {
      const returned = graph.returns.find(
        (item) => item.id === command.payload.returnId,
      );
      ensure(returned, "not-found", "This return is unavailable.");
      if (command.payload.state === "approved") {
        ensure(
          returned.state === "requested",
          "transition",
          "Only a requested return can be approved.",
        );
        returned.state = "approved";
        returned.approvedAt = command.at;
      } else {
        ensure(
          returned.state !== "closed",
          "transition",
          "This return is already closed.",
        );
        returned.state = "closed";
        returned.closedAt = command.at;
      }
      return { refs: [`return:${returned.id}`] };
    }
    case "receiveReturn": {
      const returned = graph.returns.find(
        (item) => item.id === command.payload.returnId,
      );
      ensure(
        returned?.state === "approved",
        "transition",
        "Approve the requested return before receiving it.",
      );
      unique(command.payload.restockable.map((line) => line.lineId));
      ensure(
        command.payload.restockable.every((line) =>
          returned.lines.some((item) => item.lineId === line.lineId),
        ),
        "relation",
        "Restock inspection references an unknown return line.",
      );
      for (const line of returned.lines)
        line.restockable =
          command.payload.restockable.find(
            (item) => item.lineId === line.lineId,
          )?.units ?? [];
      returned.state = "received";
      returned.receivedAt = command.at;
      return { refs: [`return:${returned.id}`] };
    }
    case "restockReturn": {
      const returned = graph.returns.find(
        (item) => item.id === command.payload.returnId,
      );
      ensure(
        returned?.receivedAt &&
          !returned.restockedAt &&
          returned.lines.some((line) => line.restockable.length),
        "transition",
        "Only received inspected units can be restocked once.",
      );
      const order = orderOf(graph, returned.orderId);
      returned.restockedAt = command.at;
      for (let index = 0; index < returned.lines.length; index++) {
        const line = returned.lines[index]!;
        if (!line.restockable.length) continue;
        const placed = order.lines.find((item) => item.id === line.lineId)!;
        move(graph, command, index, {
          variantId: placed.variantId,
          units: line.restockable.length,
          kind: "restock",
          sourceId: returned.id,
          lineId: line.lineId,
          reason: "Inspected returned units restocked",
        });
      }
      return { refs: [`return:${returned.id}`] };
    }
    case "issueRefund": {
      const input = command.payload,
        order = orderOf(graph, input.orderId);
      ensure(
        order.state !== "cancelled",
        "transition",
        "A cancelled order cannot be refunded again.",
      );
      ensure(
        !graph.refunds.some((item) => item.id === input.id),
        "duplicate",
        "This refund identity already exists.",
      );
      unique(input.lines.map((line) => line.lineId));
      const remaining = refundable(graph, order.id);
      ensure(
        input.lines.every((line) => {
          const basis = remaining.lines.find(
            (item) => item.lineId === line.lineId,
          );
          return basis && line.amount <= basis.amount;
        }) &&
          input.delivery <= remaining.delivery &&
          input.tax <= remaining.tax,
        "refund-limit",
        "Refund exceeds the remaining discounted components.",
      );
      ensure(
        exactSum([
          ...input.lines.map((line) => line.amount),
          input.delivery,
          input.tax,
        ]) > 0,
        "amount",
        "Choose a positive refund amount.",
      );
      graph.refunds.push({ ...input, at: command.at, origin: command.origin });
      return { refs: [`refund:${input.id}`, `order:${order.id}`] };
    }
    case "adjustStock": {
      const input = command.payload;
      variantOf(graph, input.variantId);
      ensure(
        input.kind !== "inbound" || input.units > 0,
        "stock",
        "Inbound stock must add positive units.",
      );
      ensure(
        stockOf(graph, input.variantId) + input.units >= 0,
        "stock",
        "A movement cannot remove unavailable stock.",
      );
      move(graph, command, 0, { ...input, sourceId: command.id });
      return {
        refs: [`movement:${command.id}_move_0`, `variant:${input.variantId}`],
      };
    }
    case "writeoffStock": {
      const input = command.payload,
        { variant } = variantOf(graph, input.variantId);
      ensure(
        !graph.writeoffs.some((item) => item.id === input.id),
        "duplicate",
        "This writeoff identity already exists.",
      );
      ensure(
        stockOf(graph, variant.id) >= input.quantity,
        "stock",
        "Only available warehouse units can be written off.",
      );
      graph.writeoffs.push({
        ...input,
        at: command.at,
        origin: command.origin,
        unitCost: variant.unitCost,
      });
      move(graph, command, 0, {
        variantId: variant.id,
        units: -input.quantity,
        kind: "writeoff",
        sourceId: input.id,
        reason: input.reason,
      });
      return {
        refs: [`writeoff:${input.id}`, `movement:${command.id}_move_0`],
      };
    }
    case "saveExpenseDraft": {
      const before =
        graph.expenseDrafts.find((item) => item.id === command.payload.id) ??
        null;
      put(graph.expenseDrafts, command.payload);
      return {
        refs: [`expense-draft:${command.payload.id}`],
        undo: { type: "expense-draft", id: command.payload.id, before },
      };
    }
    case "deleteExpenseDraft": {
      const before = graph.expenseDrafts.find(
        (item) => item.id === command.payload.draftId,
      );
      ensure(before, "not-found", "This expense draft is unavailable.");
      graph.expenseDrafts = graph.expenseDrafts.filter(
        (item) => item.id !== before.id,
      );
      return {
        refs: [`expense-draft:${before.id}`],
        undo: { type: "expense-draft", id: before.id, before },
      };
    }
    case "postExpense": {
      const draft = graph.expenseDrafts.find(
        (item) => item.id === command.payload.draftId,
      );
      ensure(draft, "not-found", "This expense draft is unavailable.");
      ensure(
        !graph.expenses.some((item) => item.id === draft.id),
        "duplicate",
        "This expense was already posted.",
      );
      graph.expenses.push({
        ...draft,
        kind: "posting",
        at: command.at,
        origin: command.origin,
      });
      graph.expenseDrafts = graph.expenseDrafts.filter(
        (item) => item.id !== draft.id,
      );
      return { refs: [`expense:${draft.id}`] };
    }
    case "correctExpense":
    case "voidExpense": {
      const input = command.payload,
        original = graph.expenses.find((item) => item.id === input.expenseId);
      ensure(
        original?.kind === "posting",
        "not-found",
        "Choose an original posted expense.",
      );
      const prior = graph.expenses.filter(
        (item) => item.parentId === original.id,
      );
      ensure(
        !prior.some((item) => item.kind === "void"),
        "transition",
        "A voided expense cannot be corrected again.",
      );
      ensure(
        !graph.expenses.some((item) => item.id === input.id),
        "duplicate",
        "This adjustment identity already exists.",
      );
      const balance = exactSum([
          original.amount,
          ...prior.map((item) => item.amount),
        ]),
        amount =
          command.type === "voidExpense" ? -balance : command.payload.amount;
      ensure(
        amount !== 0 &&
          balance + amount >= 0 &&
          balance + amount <= MAX_MINOR_AMOUNT,
        "amount",
        "Correction must keep the remaining expense within its exact bounds.",
      );
      graph.expenses.push({
        id: input.id,
        category: original.category,
        note: input.note,
        amount,
        kind: command.type === "voidExpense" ? "void" : "correction",
        parentId: original.id,
        at: command.at,
        origin: command.origin,
      });
      return { refs: [`expense:${original.id}`, `expense:${input.id}`] };
    }
    case "addBuyers": {
      for (const buyer of command.payload.buyers) {
        ensure(
          buyer.origin === command.origin,
          "relation",
          "Buyer origin must match this operation.",
        );
        ensure(
          !graph.buyers.some((item) => item.id === buyer.id),
          "duplicate",
          "This fictional buyer already exists.",
        );
        graph.buyers.push(buyer);
      }
      return { refs: command.payload.buyers.map((item) => `buyer:${item.id}`) };
    }
    case "addTraffic": {
      for (const session of command.payload.sessions) {
        ensure(
          session.origin === command.origin,
          "relation",
          "Traffic origin must match this operation.",
        );
        ensure(
          !graph.traffic.some((item) => item.id === session.id),
          "duplicate",
          "This traffic session already exists.",
        );
        graph.traffic.push({ ...session, orderIds: [] });
      }
      return {
        refs: command.payload.sessions.map((item) => `traffic:${item.id}`),
      };
    }
    case "touchTraffic": {
      const input = command.payload,
        session = graph.traffic.find((item) => item.id === input.sessionId);
      ensure(session, "not-found", "This traffic session is unavailable.");
      ensure(
        command.at >= session.lastAt,
        "relation",
        "Traffic cannot move backwards in time.",
      );
      if (input.productId) {
        ensure(
          graph.products.some((item) => item.id === input.productId),
          "relation",
          "Unknown engaged product.",
        );
        if (!session.productIds.includes(input.productId))
          session.productIds.push(input.productId);
      }
      const stages = ["visit", "engaged", "bag", "checkout"],
        index = stages.indexOf(input.stage);
      if (index >= 1) session.engagedAt ??= command.at;
      if (index >= 2) session.bagAt ??= command.at;
      if (index >= 3) session.checkoutAt ??= command.at;
      session.lastAt = command.at;
      return { refs: [`traffic:${session.id}`] };
    }
    case "addFeedback": {
      for (const item of command.payload.feedback) {
        ensure(
          item.origin === command.origin,
          "relation",
          "Feedback origin must match this operation.",
        );
        ensure(
          !graph.feedback.some((entry) => entry.id === item.id),
          "duplicate",
          "This feedback identity already exists.",
        );
        graph.feedback.push(item);
      }
      return {
        refs: command.payload.feedback.map((item) => `feedback:${item.id}`),
      };
    }
    case "undo": {
      const last = graph.receipts.at(-1);
      ensure(
        last?.id === command.payload.receiptId && last.undo,
        "undo",
        "Only the latest eligible unposted change can be undone.",
      );
      const action = last.undo;
      switch (action.type) {
        case "product-copy": {
          witness(graph, action.before.imageIds, context);
          put(graph.products, {
            ...productOf(graph, action.productId),
            ...action.before,
          });
          break;
        }
        case "bag": {
          for (const line of action.before) {
            const { product, variant } = variantOf(graph, line.variantId);
            witness(graph, product.imageIds, context);
            ensure(
              !product.archived &&
                !variant.archived &&
                line.quantity <= stockOf(graph, line.variantId) &&
                line.unitPrice === variant.price,
              "undo",
              "The previous bag needs review before it can be restored.",
            );
          }
          graph.bag = action.before;
          break;
        }
        case "order-draft": {
          graph.orderDrafts = graph.orderDrafts.filter(
            (item) => item.id !== action.id,
          );
          if (action.before) graph.orderDrafts.push(action.before);
          break;
        }
        case "expense-draft": {
          graph.expenseDrafts = graph.expenseDrafts.filter(
            (item) => item.id !== action.id,
          );
          if (action.before) graph.expenseDrafts.push(action.before);
          break;
        }
      }
      return { refs: last.refs };
    }
  }
}
/** Every successful action publishes a fresh frozen graph; rejection never mutates input. */
export function applyCommand(
  input: unknown,
  raw: unknown,
  context: CommandContext,
): CommandResult {
  try {
    const checked = CommandSchema.safeParse(raw);
    ensure(checked.success, "invalid", "This operation has invalid fields.");
    const command = checked.data,
      now = TimestampSchema.parse(context.now),
      previous = parseGraph(input);
    ensure(
      command.workspaceId === previous.workspaceId &&
        command.scenarioId === previous.scenarioId,
      "stale",
      "This operation belongs to an older demo or scenario.",
    );
    ensure(
      now >= previous.asOf && now < previous.expiresAt,
      "expired",
      "This temporary workspace has expired or its clock is invalid.",
    );
    const identity = canonical({
      type: command.type,
      payload: command.payload,
      at: command.at,
      origin: command.origin,
    });
    ensure(
      utf8Bytes(identity) <= COMMERCE_LIMITS.commandBytes,
      "limit",
      "This operation exceeds the bounded command size.",
    );
    const prior = previous.receipts.find(
      (receipt) => receipt.id === command.id,
    );
    if (prior) {
      ensure(
        prior.identity === identity,
        "replay",
        "This command identity was already used for different values.",
      );
      return { ok: true, graph: previous, receipt: prior, replayed: true };
    }
    ensure(
      command.expectedRevision === previous.revision,
      "stale",
      "The demo changed. Review the current values before applying this operation.",
    );
    ensure(
      command.expiresAt > now &&
        command.expiresAt <= previous.expiresAt &&
        Date.parse(command.expiresAt) - Date.parse(now) <= 120_000,
      "expired",
      "This reviewed operation expired. Prepare it again.",
    );
    ensure(
      command.at >= previous.anchorAt &&
        command.at <= now &&
        (command.origin === "seeded_scenario" ||
          command.at >= previous.createdAt),
      "invalid",
      "This event date is outside the permitted demo history.",
    );
    ensure(
      previous.receipts.length < COMMERCE_LIMITS.receipts,
      "limit",
      "This scenario reached its 160-command limit. Start a new scenario.",
    );
    const graph = GraphSchema.parse(previous),
      result = edit(graph, command, context);
    graph.revision++;
    graph.asOf = now;
    for (const receipt of graph.receipts) delete receipt.undo;
    const receipt: Receipt = {
      id: command.id,
      identity,
      revision: graph.revision,
      appliedAt: now,
      refs: result.refs,
      ...(result.undo ? { undo: result.undo } : {}),
    };
    graph.receipts.push(receipt);
    const valid = parseGraph(graph);
    return {
      ok: true,
      graph: valid,
      receipt: freeze(receipt),
      replayed: false,
    };
  } catch (error) {
    const failure = invalidGraph(error);
    return { ok: false, code: failure.code, message: failure.message };
  }
}
