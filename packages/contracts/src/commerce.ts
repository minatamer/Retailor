import { z } from "zod";
import { IdSchema, MinorAmountSchema, RevisionSchema } from "./core.js";
import { ProductSchema, CategorySchema } from "./product.js";
import { PhotoSchema } from "./photos.js";

export const COMMERCE_LIMITS = Object.freeze({
  products: 40,
  activeProducts: 20,
  variants: 288,
  orders: 30,
  seededOrders: 20,
  guestOrders: 10,
  orderDrafts: 4,
  expenses: 40,
  expenseDrafts: 4,
  writeoffs: 24,
  returns: 60,
  refunds: 60,
  movements: 256,
  receipts: 160,
  traffic: 320,
  seededTraffic: 300,
  guestTraffic: 20,
  buyers: 40,
  feedback: 60,
  graphBytes: 512 * 1024,
  commandBytes: 96 * 1024,
});
export const TimestampSchema = z.iso.datetime({ precision: 3 }).max(32);
export const OriginSchema = z.enum(["seeded_scenario", "guest_action"]);
export type Origin = z.infer<typeof OriginSchema>;
export const QuantitySchema = z.number().int().min(1).max(5);
export const SignedUnitsSchema = z
  .number()
  .int()
  .min(-10_000)
  .max(10_000)
  .refine((value) => value !== 0);
export const SignedAmountSchema = z
  .number()
  .int()
  .min(-1_000_000_000)
  .max(1_000_000_000);
export const ActorSchema = z.enum(["shopper", "owner"]);
export const BagLineSchema = z.strictObject({
  variantId: IdSchema,
  quantity: QuantitySchema,
  unitPrice: MinorAmountSchema,
});
export const DraftLineSchema = z.strictObject({
  variantId: IdSchema,
  quantity: QuantitySchema,
});
export const OrderDraftInputSchema = z.strictObject({
  id: IdSchema,
  actor: ActorSchema,
  buyerId: IdSchema.optional(),
  trafficId: IdSchema.optional(),
  lines: z.array(DraftLineSchema).min(1).max(8),
  discount: MinorAmountSchema,
  delivery: MinorAmountSchema,
  tax: MinorAmountSchema,
});
export const OrderDraftSchema = OrderDraftInputSchema.extend({
  lines: z.array(BagLineSchema).min(1).max(8),
  at: TimestampSchema,
  origin: OriginSchema,
});
export type OrderDraft = z.infer<typeof OrderDraftSchema>;
export const OrderLineSchema = z.strictObject({
  id: IdSchema,
  productId: IdSchema,
  variantId: IdSchema,
  photoId: IdSchema,
  title: z.string().min(1).max(100),
  category: CategorySchema,
  size: z.string().min(1).max(16),
  colour: z.string().min(1).max(32),
  sku: z.string().min(1).max(40),
  quantity: QuantitySchema,
  unitPrice: MinorAmountSchema,
  unitCost: MinorAmountSchema,
  unitNet: z.array(MinorAmountSchema).min(1).max(5),
});
export const OrderSchema = z.strictObject({
  id: IdSchema,
  actor: ActorSchema,
  origin: OriginSchema,
  buyerId: IdSchema.optional(),
  trafficId: IdSchema.optional(),
  placedAt: TimestampSchema,
  state: z.enum(["placed", "shipped", "fulfilled", "cancelled"]),
  shippedAt: TimestampSchema.optional(),
  fulfilledAt: TimestampSchema.optional(),
  lines: z.array(OrderLineSchema).min(1).max(8),
  gross: MinorAmountSchema,
  discount: MinorAmountSchema,
  merchandise: MinorAmountSchema,
  delivery: MinorAmountSchema,
  tax: MinorAmountSchema,
  total: MinorAmountSchema,
});
export type Order = z.infer<typeof OrderSchema>;
export type OrderLine = z.infer<typeof OrderLineSchema>;
export const CancellationSchema = z.strictObject({
  id: IdSchema,
  orderId: IdSchema,
  at: TimestampSchema,
  origin: OriginSchema,
  merchandise: MinorAmountSchema,
  delivery: MinorAmountSchema,
  tax: MinorAmountSchema,
});
export const UnitSelectionSchema = z.strictObject({
  lineId: IdSchema,
  units: z.array(z.number().int().min(0).max(4)).min(1).max(5),
});
export const ReturnLineSchema = UnitSelectionSchema.extend({
  restockable: z.array(z.number().int().min(0).max(4)).max(5),
});
export const ReturnSchema = z.strictObject({
  id: IdSchema,
  orderId: IdSchema,
  origin: OriginSchema,
  reason: z.enum(["sizing", "changed-mind", "damaged", "other"]),
  lines: z.array(ReturnLineSchema).min(1).max(8),
  state: z.enum(["requested", "approved", "received", "closed"]),
  requestedAt: TimestampSchema,
  approvedAt: TimestampSchema.optional(),
  receivedAt: TimestampSchema.optional(),
  closedAt: TimestampSchema.optional(),
  restockedAt: TimestampSchema.optional(),
});
export type ReturnRecord = z.infer<typeof ReturnSchema>;
export const RefundLineSchema = z.strictObject({
  lineId: IdSchema,
  amount: MinorAmountSchema,
});
export const RefundSchema = z.strictObject({
  id: IdSchema,
  orderId: IdSchema,
  at: TimestampSchema,
  origin: OriginSchema,
  lines: z.array(RefundLineSchema).max(8),
  delivery: MinorAmountSchema,
  tax: MinorAmountSchema,
});
export type Refund = z.infer<typeof RefundSchema>;
export const MovementSchema = z.strictObject({
  id: IdSchema,
  variantId: IdSchema,
  at: TimestampSchema,
  origin: OriginSchema,
  units: SignedUnitsSchema,
  kind: z.enum([
    "sale",
    "cancel",
    "restock",
    "inbound",
    "correction",
    "writeoff",
  ]),
  sourceId: IdSchema,
  lineId: IdSchema.optional(),
  reason: z.string().min(1).max(120),
});
export type Movement = z.infer<typeof MovementSchema>;
export const ExpenseCategorySchema = z.enum([
  "marketing",
  "packaging",
  "platform",
  "operations",
]);
export const ExpenseDraftSchema = z.strictObject({
  id: IdSchema,
  category: ExpenseCategorySchema,
  amount: MinorAmountSchema,
  note: z.string().max(160),
});
export const ExpenseSchema = ExpenseDraftSchema.extend({
  at: TimestampSchema,
  origin: OriginSchema,
  amount: SignedAmountSchema,
  kind: z.enum(["posting", "correction", "void"]),
  parentId: IdSchema.optional(),
});
export type Expense = z.infer<typeof ExpenseSchema>;
export const WriteoffSchema = z.strictObject({
  id: IdSchema,
  variantId: IdSchema,
  at: TimestampSchema,
  origin: OriginSchema,
  quantity: z.number().int().min(1).max(10_000),
  unitCost: MinorAmountSchema,
  reason: z.string().min(1).max(120),
});
export const BuyerSchema = z.strictObject({
  id: IdSchema,
  label: z.string().min(1).max(40),
  origin: OriginSchema,
  fictional: z.literal(true),
});
export const TrafficInputSchema = z.strictObject({
  id: IdSchema,
  actor: z.enum(["shopper", "owner", "designer"]),
  origin: OriginSchema,
  startedAt: TimestampSchema,
  lastAt: TimestampSchema,
  engagedAt: TimestampSchema.optional(),
  bagAt: TimestampSchema.optional(),
  checkoutAt: TimestampSchema.optional(),
  productIds: z.array(IdSchema).max(20),
});
export const TrafficSchema = TrafficInputSchema.extend({
  orderIds: z.array(IdSchema).max(10),
});
export type TrafficSession = z.infer<typeof TrafficSchema>;
export const FeedbackSchema = z.strictObject({
  id: IdSchema,
  productId: IdSchema,
  orderId: IdSchema.optional(),
  origin: OriginSchema,
  at: TimestampSchema,
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(160),
  reviewerName: z.string().trim().min(1).max(60).optional(),
  synthetic: z.literal(true),
});
export const ProductCopySchema = z.strictObject({
  title: ProductSchema.shape.title,
  description: ProductSchema.shape.description,
  category: ProductSchema.shape.category,
  imageIds: ProductSchema.shape.imageIds,
  colourPhotos: ProductSchema.shape.colourPhotos,
  sizingSystemId: ProductSchema.shape.sizingSystemId,
  attributes: ProductSchema.shape.attributes,
});
export const UndoSchema = z.discriminatedUnion("type", [
  z.strictObject({
    type: z.literal("product-copy"),
    productId: IdSchema,
    before: ProductCopySchema,
  }),
  z.strictObject({
    type: z.literal("bag"),
    before: z.array(BagLineSchema).max(8),
  }),
  z.strictObject({
    type: z.literal("order-draft"),
    id: IdSchema,
    before: OrderDraftSchema.nullable(),
  }),
  z.strictObject({
    type: z.literal("expense-draft"),
    id: IdSchema,
    before: ExpenseDraftSchema.nullable(),
  }),
]);
export type Undo = z.infer<typeof UndoSchema>;
export const ReceiptSchema = z.strictObject({
  id: IdSchema,
  identity: z.string().min(1).max(COMMERCE_LIMITS.commandBytes),
  revision: RevisionSchema,
  appliedAt: TimestampSchema,
  refs: z.array(z.string().min(1).max(100)).max(320),
  undo: UndoSchema.optional(),
});
export type Receipt = z.infer<typeof ReceiptSchema>;
export const GraphSchema = z.strictObject({
  schemaVersion: z.literal(1),
  workspaceId: IdSchema,
  scenarioId: IdSchema,
  revision: RevisionSchema,
  createdAt: TimestampSchema,
  anchorAt: TimestampSchema,
  expiresAt: TimestampSchema,
  asOf: TimestampSchema,
  photos: z.array(PhotoSchema).max(32),
  products: z.array(ProductSchema).max(40),
  bag: z.array(BagLineSchema).max(8),
  orderDrafts: z.array(OrderDraftSchema).max(4),
  orders: z.array(OrderSchema).max(30),
  cancellations: z.array(CancellationSchema).max(30),
  returns: z.array(ReturnSchema).max(60),
  refunds: z.array(RefundSchema).max(60),
  movements: z.array(MovementSchema).max(256),
  expenseDrafts: z.array(ExpenseDraftSchema).max(4),
  expenses: z.array(ExpenseSchema).max(40),
  writeoffs: z.array(WriteoffSchema).max(24),
  buyers: z.array(BuyerSchema).max(40),
  traffic: z.array(TrafficSchema).max(320),
  feedback: z.array(FeedbackSchema).max(60),
  receipts: z.array(ReceiptSchema).max(160),
});
export type CommerceGraph = z.infer<typeof GraphSchema>;
