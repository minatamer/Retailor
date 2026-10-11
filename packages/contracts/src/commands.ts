import { z } from "zod";
import { IdSchema, RevisionSchema, MinorAmountSchema } from "./core.js";
import { ProductInputSchema } from "./product.js";
import { PhotoSchema } from "./photos.js";
import {
  TimestampSchema,
  OriginSchema,
  SignedUnitsSchema,
  OrderDraftInputSchema,
  ExpenseDraftSchema,
  SignedAmountSchema,
  UnitSelectionSchema,
  RefundLineSchema,
  BuyerSchema,
  TrafficInputSchema,
  FeedbackSchema,
  ProductCopySchema,
} from "./commerce.js";

const base = z.strictObject({
  id: IdSchema.max(40),
  workspaceId: IdSchema,
  scenarioId: IdSchema,
  expectedRevision: RevisionSchema,
  expiresAt: TimestampSchema,
  at: TimestampSchema,
  origin: OriginSchema,
});
export const CommandSchema = z.discriminatedUnion("type", [
  base.extend({
    type: z.literal("registerPhotos"),
    payload: z.strictObject({ photos: z.array(PhotoSchema).min(1).max(32) }),
  }),
  base.extend({
    type: z.literal("createProduct"),
    payload: ProductInputSchema,
  }),
  base.extend({
    type: z.literal("updateProduct"),
    payload: ProductInputSchema,
  }),
  base.extend({
    type: z.literal("updateProductCopy"),
    payload: ProductCopySchema.extend({ productId: IdSchema }),
  }),
  base.extend({
    type: z.literal("removeProduct"),
    payload: z.strictObject({ productId: IdSchema }),
  }),
  base.extend({
    type: z.literal("setUnitCost"),
    payload: z.strictObject({ variantId: IdSchema, cost: MinorAmountSchema }),
  }),
  base.extend({
    type: z.literal("setBagLine"),
    payload: z.strictObject({
      variantId: IdSchema,
      quantity: z.number().int().min(0).max(5),
    }),
  }),
  base.extend({
    type: z.literal("saveOrderDraft"),
    payload: OrderDraftInputSchema,
  }),
  base.extend({
    type: z.literal("deleteOrderDraft"),
    payload: z.strictObject({ draftId: IdSchema }),
  }),
  base.extend({
    type: z.literal("placeOrder"),
    payload: z.strictObject({ draftId: IdSchema, orderId: IdSchema }),
  }),
  base.extend({
    type: z.literal("cancelOrder"),
    payload: z.strictObject({ orderId: IdSchema }),
  }),
  base.extend({
    type: z.literal("advanceOrder"),
    payload: z.strictObject({
      orderId: IdSchema,
      state: z.enum(["shipped", "fulfilled"]),
    }),
  }),
  base.extend({
    type: z.literal("requestReturn"),
    payload: z.strictObject({
      id: IdSchema,
      orderId: IdSchema,
      reason: z.enum(["sizing", "changed-mind", "damaged", "other"]),
      lines: z.array(UnitSelectionSchema).min(1).max(8),
    }),
  }),
  base.extend({
    type: z.literal("advanceReturn"),
    payload: z.strictObject({
      returnId: IdSchema,
      state: z.enum(["approved", "closed"]),
    }),
  }),
  base.extend({
    type: z.literal("receiveReturn"),
    payload: z.strictObject({
      returnId: IdSchema,
      restockable: z.array(UnitSelectionSchema).max(8),
    }),
  }),
  base.extend({
    type: z.literal("restockReturn"),
    payload: z.strictObject({ returnId: IdSchema }),
  }),
  base.extend({
    type: z.literal("issueRefund"),
    payload: z.strictObject({
      id: IdSchema,
      orderId: IdSchema,
      lines: z.array(RefundLineSchema).max(8),
      delivery: MinorAmountSchema,
      tax: MinorAmountSchema,
    }),
  }),
  base.extend({
    type: z.literal("adjustStock"),
    payload: z.strictObject({
      variantId: IdSchema,
      units: SignedUnitsSchema,
      kind: z.enum(["inbound", "correction"]),
      reason: z.string().min(1).max(120),
    }),
  }),
  base.extend({
    type: z.literal("writeoffStock"),
    payload: z.strictObject({
      id: IdSchema,
      variantId: IdSchema,
      quantity: z.number().int().min(1).max(10_000),
      reason: z.string().min(1).max(120),
    }),
  }),
  base.extend({
    type: z.literal("saveExpenseDraft"),
    payload: ExpenseDraftSchema,
  }),
  base.extend({
    type: z.literal("deleteExpenseDraft"),
    payload: z.strictObject({ draftId: IdSchema }),
  }),
  base.extend({
    type: z.literal("postExpense"),
    payload: z.strictObject({ draftId: IdSchema }),
  }),
  base.extend({
    type: z.literal("correctExpense"),
    payload: z.strictObject({
      id: IdSchema,
      expenseId: IdSchema,
      amount: SignedAmountSchema,
      note: z.string().max(160),
    }),
  }),
  base.extend({
    type: z.literal("voidExpense"),
    payload: z.strictObject({
      id: IdSchema,
      expenseId: IdSchema,
      note: z.string().max(160),
    }),
  }),
  base.extend({
    type: z.literal("addBuyers"),
    payload: z.strictObject({ buyers: z.array(BuyerSchema).min(1).max(40) }),
  }),
  base.extend({
    type: z.literal("addTraffic"),
    payload: z.strictObject({
      sessions: z.array(TrafficInputSchema).min(1).max(320),
    }),
  }),
  base.extend({
    type: z.literal("touchTraffic"),
    payload: z.strictObject({
      sessionId: IdSchema,
      stage: z.enum(["visit", "engaged", "bag", "checkout"]),
      productId: IdSchema.optional(),
    }),
  }),
  base.extend({
    type: z.literal("addFeedback"),
    payload: z.strictObject({
      feedback: z.array(FeedbackSchema).min(1).max(60),
    }),
  }),
  base.extend({
    type: z.literal("undo"),
    payload: z.strictObject({ receiptId: IdSchema }),
  }),
]);
export type CommerceCommand = z.infer<typeof CommandSchema>;
