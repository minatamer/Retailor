"use client";
import { useId, useRef } from "react";
import { useSession } from "../session/context";
import styles from "./picker.module.css";
export function CurrencyPicker({ inline = false }: { inline?: boolean }) {
  const { controller, state, currencyBusy, currencyNotice } = useSession();
  const dialog = useRef<HTMLDialogElement>(null),
    opener = useRef<HTMLButtonElement>(null);
  const noticeId = useId();
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
      <div className={styles.toolbar}>
        <div
          className={styles.choices}
          role="group"
          aria-label="Store display currency"
          aria-busy={currencyBusy}
          data-selected={state.currency.selected}
        >
          {(["USD", "EUR"] as const).map((currency) => (
            <button
              key={currency}
              type="button"
              className={styles.choice}
              aria-pressed={state.currency.selected === currency}
              aria-describedby={noticeId}
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
        {!inline && (
          <button
            ref={opener}
            type="button"
            className={styles.info}
            aria-label="Currency details"
            onClick={() => dialog.current?.showModal()}
          >
            ⓘ
          </button>
        )}
      </div>
      <span id={noticeId} className={styles.status} role="status">
        {currencyNotice}
      </span>
      {inline ? (
        <p className={styles.status}>
          {quote
            ? `${quote.sourceId === "development-fixture" ? "Demo reference" : "ECB reference"} · ${rateDate} · 1 USD → ${quote.rateDecimal} EUR`
            : "USD records · Choose EUR for a dated reference conversion."}
        </p>
      ) : (
        <dialog
          ref={dialog}
          className={styles.dialog}
          aria-labelledby="currency-details-heading"
          onClose={() => opener.current?.focus({ preventScroll: true })}
        >
          <button
            type="button"
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
            Prices are recorded in USD. EUR shows a reference conversion from
            one dated quote, kept for this visit.
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
              Choose EUR to get a reference quote. USD browsing remains
              available while it loads.
            </p>
          )}
          {currencyNotice && <p>{currencyNotice}</p>}
        </dialog>
      )}
    </div>
  );
}
