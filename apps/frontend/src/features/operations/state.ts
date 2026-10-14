import { z } from "zod";
import { IdSchema } from "@retailor/contracts/core";
import {
  CategorySchema,
  ProductInputSchema,
  relabelColourPhotos,
} from "@retailor/contracts/product";
import type { CommerceGraph } from "@retailor/contracts/commerce";
import {
  UnitSelectionSchema,
  OrderDraftInputSchema,
  ExpenseDraftSchema,
} from "@retailor/contracts/commerce";
import type { CommerceCommand } from "@retailor/contracts/commands";
import { parseUsd } from "@retailor/commerce/money";
import { refundable } from "@retailor/commerce/selectors";
import type { previewCommand } from "@retailor/commerce/effects";
export const OwnerViewSchema = z.enum([
  "overview",
  "products",
  "orders",
  "returns",
  "inventory",
  "expenses",
  "traffic",
  "feedback",
  "design",
]);
export type OwnerView = z.infer<typeof OwnerViewSchema>;
export const OWNER_OPERATION_TYPES = [
  "createProduct",
  "updateProduct",
  "removeProduct",
  "saveOrderDraft",
  "deleteOrderDraft",
  "placeOrder",
  "cancelOrder",
  "advanceOrder",
  "requestReturn",
  "advanceReturn",
  "receiveReturn",
  "restockReturn",
  "issueRefund",
  "adjustStock",
  "writeoffStock",
  "setUnitCost",
  "saveExpenseDraft",
  "deleteExpenseDraft",
  "postExpense",
  "correctExpense",
  "voidExpense",
  "undo",
] as const;
export type OwnerOperationType = (typeof OWNER_OPERATION_TYPES)[number];
export type OwnerIntent = {
  [K in OwnerOperationType]: Pick<
    Extract<CommerceCommand, { type: K }>,
    "type" | "payload"
  >;
}[OwnerOperationType];
const FIELD_NAMES = [
  "title",
  "description",
  "category",
  "sizingSystemId",
  "discount",
  "delivery",
  "tax",
  "reason",
  "state",
  "variantId",
  "quantity",
  "units",
  "kind",
  "cost",
  "amount",
  "expenseCategory",
  "note",
  "refundDelivery",
  "refundTax",
  "buyerId",
  "productState",
] as const;
const FieldSchema = z.enum(FIELD_NAMES);
export type OwnerField = (typeof FIELD_NAMES)[number];
const VariantDraftSchema = z.strictObject({
  id: IdSchema,
  size: z.string().max(16),
  colour: z.string().max(32),
  sku: z.string().max(40),
  price: z.string().max(16),
  cost: z.string().max(16),
  stock: z.string().max(6),
  archived: z.boolean(),
});
export const OwnerFormSchema = z.strictObject({
  id: IdSchema,
  type: z.enum(OWNER_OPERATION_TYPES),
  targetId: IdSchema,
  fields: z.partialRecord(FieldSchema, z.string().max(1000)),
  dirty: z
    .array(
      z.enum([
        ...FIELD_NAMES,
        "photos",
        "variants",
        "lines",
        "unitsSelection",
        "refunds",
      ]),
    )
    .max(30),
  photoIds: z.array(IdSchema).max(8),
  variants: z.array(VariantDraftSchema).max(24),
  lines: z
    .array(z.strictObject({ variantId: IdSchema, quantity: z.string().max(2) }))
    .max(8),
  unitsSelection: z.array(UnitSelectionSchema).max(8),
  refunds: z
    .array(z.strictObject({ lineId: IdSchema, amount: z.string().max(16) }))
    .max(8),
});
export type OwnerForm = z.infer<typeof OwnerFormSchema>;
export type OwnerReview = {
  command: CommerceCommand;
  effect: Extract<ReturnType<typeof previewCommand>, { ok: true }>["effect"];
  formId: string;
};
export const decimal = (cents: number) =>
  `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, "0")}`;
export function amount(value: string) {
  const parsed = parseUsd(value);
  if (!parsed.ok)
    throw new Error("Use a valid USD amount with at most two decimal places.");
  return parsed.value;
}
function integer(value: string, signed = false) {
  if (!(signed ? /^-?\d+$/ : /^\d+$/).test(value))
    throw new Error("Use a whole number of units.");
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed))
    throw new Error("Use a bounded number of units.");
  return parsed;
}
export function openOwnerForm(
  graph: CommerceGraph,
  type: OwnerOperationType,
  targetId: string | undefined,
  id: () => string,
): OwnerForm {
  const target = targetId ?? id();
  const product = graph.products.find((p) => p.id === target),
    draft = graph.orderDrafts.find((d) => d.id === target),
    expense = graph.expenseDrafts.find((e) => e.id === target),
    order = graph.orders.find((o) => o.id === target),
    returned = graph.returns.find((r) => r.id === target);
  const selected = graph.products
    .flatMap((p) => p.variants)
    .find((v) => v.id === target);
  const fields: OwnerForm["fields"] = {
    title: product?.title ?? "",
    description: product?.description ?? "",
    category: product?.category ?? "other-clothing",
    sizingSystemId: product?.sizingSystemId ?? "pending-demo",
    discount: decimal(draft?.discount ?? 0),
    delivery: decimal(draft?.delivery ?? 600),
    tax: decimal(draft?.tax ?? 0),
    reason: "",
    state:
      type === "advanceReturn"
        ? "approved"
        : order?.state === "placed"
          ? "shipped"
          : "fulfilled",
    variantId: selected?.id ?? "",
    quantity: "1",
    units: "1",
    kind: "correction",
    cost: decimal(selected?.unitCost ?? 0),
    amount: decimal(expense?.amount ?? 0),
    expenseCategory: expense?.category ?? "marketing",
    note: expense?.note ?? "",
    refundDelivery: "0.00",
    refundTax: "0.00",
    buyerId: draft?.buyerId ?? "",
    productState: product?.archived ? "archived" : "active",
  };
  const remaining =
    type === "issueRefund" && order ? refundable(graph, order.id) : undefined;
  return OwnerFormSchema.parse({
    id: id(),
    type,
    targetId: target,
    fields,
    dirty: [],
    photoIds: product?.imageIds ?? [],
    variants: product
      ? product.variants.map((v) => ({
          id: v.id,
          size: v.size,
          colour: v.colour,
          sku: v.sku,
          price: decimal(v.price),
          cost: decimal(v.unitCost),
          stock: String(v.openingStock),
          archived: v.archived,
        }))
      : type === "createProduct"
        ? [
            {
              id: id(),
              size: "Demo option",
              colour: "Unconfirmed",
              sku: `DEMO-${target.slice(0, 16)}`,
              price: "60.00",
              cost: "24.00",
              stock: "10",
              archived: false,
            },
          ]
        : [],
    lines:
      draft?.lines.map((l) => ({
        variantId: l.variantId,
        quantity: String(l.quantity),
      })) ?? [],
    unitsSelection:
      type === "requestReturn" && order
        ? []
        : (returned?.lines
            .filter((l) => l.restockable.length > 0)
            .map((l) => ({
              lineId: l.lineId,
              units: l.restockable,
            })) ?? []),
    refunds:
      remaining?.lines.map((l) => ({ lineId: l.lineId, amount: "0.00" })) ?? [],
  });
}
/** The same detached raw fields serve dashboard and later Tailor; suggestions preserve human edits. */
export function editOwnerField(
  form: OwnerForm,
  field: OwnerField,
  value: string,
  origin: "human" | "suggestion" = "human",
): OwnerForm {
  if (origin === "suggestion" && form.dirty.includes(field)) return form;
  if (
    form.fields[field] === value &&
    (origin === "suggestion" || form.dirty.includes(field))
  )
    return form;
  return OwnerFormSchema.parse({
    ...form,
    fields: { ...form.fields, [field]: value },
    dirty:
      origin === "human" ? [...new Set([...form.dirty, field])] : form.dirty,
  });
}
export function ownerIntent(
  form: OwnerForm,
  graph: CommerceGraph,
): OwnerIntent {
  const f = form.fields,
    get = (key: OwnerField) => f[key] ?? "",
    target = form.targetId;
  switch (form.type) {
    case "createProduct":
    case "updateProduct": {
      const current = graph.products.find((p) => p.id === target);
      const variants = form.variants.map((v) => ({
        id: v.id,
        size: v.size,
        colour: v.colour,
        sku: v.sku,
        price: amount(v.price),
        unitCost: amount(v.cost),
        openingStock: integer(v.stock),
        archived: v.archived,
      }));
      return {
        type: form.type,
        payload: ProductInputSchema.parse({
          id: target,
          title: get("title"),
          description: get("description"),
          category: CategorySchema.parse(get("category")),
          imageIds: form.photoIds,
          colourPhotos: current
            ? relabelColourPhotos(current, variants, form.photoIds)
            : undefined,
          sizingSystemId: get("sizingSystemId"),
          attributes: current?.attributes ?? [],
          archived:
            z.enum(["active", "archived"]).parse(get("productState")) ===
            "archived",
          variants,
        }),
      };
    }
    case "removeProduct":
      return { type: form.type, payload: { productId: target } };
    case "saveOrderDraft":
      return {
        type: form.type,
        payload: OrderDraftInputSchema.parse({
          id: target,
          actor: "owner",
          ...(get("buyerId") ? { buyerId: get("buyerId") } : {}),
          lines: form.lines.map((l) => ({
            variantId: l.variantId,
            quantity: integer(l.quantity),
          })),
          discount: amount(get("discount")),
          delivery: amount(get("delivery")),
          tax: amount(get("tax")),
        }),
      };
    case "deleteOrderDraft":
    case "placeOrder":
      return form.type === "placeOrder"
        ? { type: form.type, payload: { draftId: target, orderId: form.id } }
        : { type: form.type, payload: { draftId: target } };
    case "cancelOrder":
      return { type: form.type, payload: { orderId: target } };
    case "advanceOrder":
      return {
        type: form.type,
        payload: {
          orderId: target,
          state: z.enum(["shipped", "fulfilled"]).parse(get("state")),
        },
      };
    case "requestReturn":
      return {
        type: form.type,
        payload: {
          id: form.id,
          orderId: target,
          reason: z
            .enum(["sizing", "changed-mind", "damaged", "other"])
            .parse(get("reason")),
          lines: form.unitsSelection,
        },
      };
    case "advanceReturn":
      return {
        type: form.type,
        payload: {
          returnId: target,
          state: z.enum(["approved", "closed"]).parse(get("state")),
        },
      };
    case "receiveReturn":
      return {
        type: form.type,
        payload: { returnId: target, restockable: form.unitsSelection },
      };
    case "restockReturn":
      return { type: form.type, payload: { returnId: target } };
    case "issueRefund":
      return {
        type: form.type,
        payload: {
          id: form.id,
          orderId: target,
          lines: form.refunds
            .map((l) => ({ lineId: l.lineId, amount: amount(l.amount) }))
            .filter((l) => l.amount > 0),
          delivery: amount(get("refundDelivery")),
          tax: amount(get("refundTax")),
        },
      };
    case "adjustStock":
      return {
        type: form.type,
        payload: {
          variantId: get("variantId"),
          units: integer(get("units"), true),
          kind: z.enum(["inbound", "correction"]).parse(get("kind")),
          reason: get("reason"),
        },
      };
    case "writeoffStock":
      return {
        type: form.type,
        payload: {
          id: form.id,
          variantId: get("variantId"),
          quantity: integer(get("quantity")),
          reason: get("reason"),
        },
      };
    case "setUnitCost":
      return {
        type: form.type,
        payload: { variantId: get("variantId"), cost: amount(get("cost")) },
      };
    case "saveExpenseDraft":
      return {
        type: form.type,
        payload: ExpenseDraftSchema.parse({
          id: target,
          category: get("expenseCategory"),
          amount: amount(get("amount")),
          note: get("note"),
        }),
      };
    case "deleteExpenseDraft":
    case "postExpense":
      return { type: form.type, payload: { draftId: target } };
    case "correctExpense":
      return {
        type: form.type,
        payload: {
          id: form.id,
          expenseId: target,
          amount: get("amount").startsWith("-")
            ? -amount(get("amount").slice(1))
            : amount(get("amount")),
          note: get("note"),
        },
      };
    case "undo":
      return { type: form.type, payload: { receiptId: target } };
    case "voidExpense":
      return {
        type: form.type,
        payload: { id: form.id, expenseId: target, note: get("note") },
      };
  }
}
