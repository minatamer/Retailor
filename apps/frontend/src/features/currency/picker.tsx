"use client";
import { useRef } from "react";
import { useSession } from "../session/context";
import styles from "./picker.module.css";
export function CurrencyPicker() {
  const { controller, state, currencyBusy, currencyNotice } = useSession();
  const dialog = useRef<HTMLDialogElement>(null),
    opener = useRef<HTMLButtonElement>(null);
  const quote = state.currency.acceptedSnapshot;
  const rateDate = quote
    ? new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      }).format(new Date(`${quote.rateDate}T00:00:00Z`))
    : null;
  return (
    <div className={styles.currency}>
      <div className={styles.choices} aria-label="Store display currency">
        {(["USD", "EUR"] as const).map((currency) => (
          <button
            key={currency}
            aria-pressed={state.currency.selected === currency}
            disabled={currency === "EUR" && currencyBusy}
            onClick={() => void controller.selectCurrency(currency)}
          >
            {currency === "EUR" && currencyBusy ? "EUR…" : currency}
          </button>
        ))}
        <button
          ref={opener}
          aria-label="Currency details"
          onClick={() => dialog.current?.showModal()}
        >
          ⓘ
        </button>
      </div>
      <span className={styles.status} role="status">
        {currencyNotice}
      </span>
      <dialog
        ref={dialog}
        className={styles.dialog}
        aria-labelledby="currency-details-heading"
        onClose={() => opener.current?.focus({ preventScroll: true })}
      >
        <button
          className={styles.close}
          autoFocus
          aria-label="Close currency details"
          onClick={() => dialog.current?.close()}
        >
          ×
        </button>
        <span className={styles.eyebrow}>Your store’s prices</span>
        <h2 id="currency-details-heading">A little perspective.</h2>
        <p>
          Prices are recorded in USD. EUR shows a reference conversion from one
          dated quote, kept for this visit.
        </p>
        {quote ? (
          <dl>
            <div>
              <dt>Reference</dt>
              <dd>
                {quote.sourceId === "development-fixture"
                  ? "Demo quote · Development fixture"
                  : "ECB via Frankfurter"}
              </dd>
            </div>
            <div>
              <dt>Rate date</dt>
              <dd>{rateDate}</dd>
            </div>
            <div>
              <dt>Conversion</dt>
              <dd>1 USD → {quote.rateDecimal} EUR</dd>
            </div>
          </dl>
        ) : (
          <p>
            Choose EUR to get a reference quote. USD browsing remains available
            while it loads.
          </p>
        )}
        {currencyNotice && <p>{currencyNotice}</p>}
      </dialog>
    </div>
  );
}
