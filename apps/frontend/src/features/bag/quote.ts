import { ZodError } from "zod";
import type { CurrencyScope } from "@retailor/contracts/currency";
import { displayedBag } from "@retailor/commerce/shopping";
import type { BagEntry } from "@retailor/commerce/shopping";
export {
  BAG_PROMO_CODE,
  bagPromoDiscount,
  bagEntries,
  bagWitness,
  bagTotals,
  displayedBag,
  displayedOrder,
} from "@retailor/commerce/shopping";
export type { BagEntry } from "@retailor/commerce/shopping";
/** A valid individual garment can still exceed the bounded order total. Keep its bag editable. */
export function tryDisplayedBag(
  entries: readonly BagEntry[],
  scope: CurrencyScope,
  discount = 0,
) {
  try {
    return { ok: true as const, value: displayedBag(entries, scope, discount) };
  } catch (error) {
    if (!(error instanceof RangeError) && !(error instanceof ZodError))
      throw error;
    return {
      ok: false as const,
      message:
        "This bag exceeds the demo amount limit. Reduce the quantity or remove a garment before reviewing.",
    };
  }
}
