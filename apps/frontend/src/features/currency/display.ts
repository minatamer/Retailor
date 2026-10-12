import {
  CurrencyPreferenceSchema,
  CurrencyScopeSchema,
  USD_SCOPE,
} from "@retailor/contracts/currency";
import type {
  CurrencyPreference,
  CurrencyScope,
} from "@retailor/contracts/currency";
export function selectedScope(preference: CurrencyPreference): CurrencyScope {
  const value = CurrencyPreferenceSchema.parse(preference);
  return value.selected === "EUR"
    ? CurrencyScopeSchema.parse({
        currency: "EUR",
        snapshot: value.acceptedSnapshot,
      })
    : USD_SCOPE;
}
