"use client";
import { useId } from "react";
import { useSession } from "../session/context";
import styles from "./picker.module.css";

/** Store pricing is an owner setting; shopper surfaces consume its scope only. */
export function CurrencyPicker() {
  const { controller, state, currencyBusy, currencyNotice } = useSession();
  const id = useId();
  const descriptionId = `${id}-description`,
    noticeId = `${id}-notice`;
  const quote = state.currency.acceptedSnapshot;
  const rateDate = quote
    ? new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      }).format(new Date(`${quote.rateDate}T00:00:00Z`))
    : null;
  if (state.stage !== "dashboard") return null;
  return (
    <section className={styles.currency} aria-labelledby={`${id}-title`}>
      <div className={styles.toolbar}>
        <div className={styles.copy}>
          <h3 id={`${id}-title`}>Store currency</h3>
          <p id={descriptionId}>
            Choose the currency shown in your storefront and checkout. Dashboard
            records stay in USD.
          </p>
        </div>
        <div
          className={styles.choices}
          role="group"
          aria-label="Store currency"
          aria-busy={currencyBusy}
          data-selected={state.currency.selected}
        >
          {(["USD", "EUR"] as const).map((currency) => (
            <button
              key={currency}
              type="button"
              className={styles.choice}
              aria-pressed={state.currency.selected === currency}
              aria-describedby={`${descriptionId}${currencyNotice ? ` ${noticeId}` : ""}`}
              disabled={currency === "EUR" && currencyBusy}
              onClick={() => void controller.selectCurrency(currency)}
            >
              {currency === "EUR" && currencyBusy && (
                <span className={styles.spinner} aria-hidden="true" />
              )}
              {currency}
            </button>
          ))}
        </div>
      </div>
      {currencyNotice && (
        <p id={noticeId} className={styles.status} role="status">
          {currencyNotice}
        </p>
      )}
      {state.currency.selected === "EUR" && quote && (
        <p className={styles.reference}>
          {quote.sourceId === "development-fixture"
            ? "Demo reference"
            : "ECB reference"}{" "}
          · {rateDate} · 1 USD = {quote.rateDecimal} EUR
        </p>
      )}
    </section>
  );
}
