import { z } from "zod";
import { TimestampSchema } from "@retailor/contracts/commerce";
import { IdSchema } from "@retailor/contracts/core";
import type { CommerceCommand } from "@retailor/contracts/commands";
import type { CurrencyScope } from "@retailor/contracts/currency";
export const SHOPPER_INACTIVITY_MS = 30 * 60_000;
export const ShoppingSchema = z.strictObject({
  visitId: IdSchema.nullable(),
  lastActivityAt: TimestampSchema.nullable().default(null),
  buyerId: IdSchema.nullable(),
  draftId: IdSchema.nullable(),
  lastOrderId: IdSchema.nullable(),
});
export type ShoppingState = z.infer<typeof ShoppingSchema>;
export const INITIAL_SHOPPING: ShoppingState = {
  visitId: null,
  lastActivityAt: null,
  buyerId: null,
  draftId: null,
  lastOrderId: null,
};
export interface CheckoutReview {
  command: Extract<CommerceCommand, { type: "placeOrder" }>;
  scope: CurrencyScope;
  witness: string;
  discount: number;
}
