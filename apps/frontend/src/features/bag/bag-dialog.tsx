"use client";
import { useEffect, useRef, useState } from "react";
import { formatDisplay, formatMinor } from "@retailor/commerce/currency";
import { stockOf } from "@retailor/commerce/selectors";
import { useSession } from "../session/context";
import { merchantStyle } from "../store-design/presets";
import { selectedScope } from "../currency/display";
import { CurrencyPicker } from "../currency/picker";
import { GarmentImage } from "../storefront/gallery";
import { Button } from "../../components/ui/button";
import { bagEntries, tryDisplayedBag, displayedOrder } from "./quote";
import styles from "./bag-dialog.module.css";
export function BagDialog() {
  const {
    controller,
    state,
    bagOpen,
    bagReceiptId,
    bagNotice,
    checkoutReview,
    currencyBusy,
  } = useSession();
  const dialog = useRef<HTMLDialogElement>(null),
    heading = useRef<HTMLHeadingElement>(null),
    opener = useRef<HTMLElement | null>(null);
  const [discount, setDiscount] = useState(false);
  const entries = bagEntries(state.graph, controller.photos.availableIds());
  const order = !entries.length
    ? state.graph.orders.find((item) => item.id === bagReceiptId)
    : undefined;
  const historicalScope =
    order &&
    state.orderDisplays.find((item) => item.orderId === order.id)?.scope;
  const scope =
    historicalScope ?? checkoutReview?.scope ?? selectedScope(state.currency);
  const deduction =
    checkoutReview?.discount ??
    (discount
      ? Math.min(
          500,
          entries.reduce((sum, row) => sum + row.unitPrice * row.quantity, 0),
        )
      : 0);
  const quote = tryDisplayedBag(entries, scope, deduction);
  const totals = order
    ? displayedOrder(order, scope)
    : quote.ok
      ? quote.value
      : null;
  const mode = order ? "receipt" : checkoutReview ? "review" : "bag";
  useEffect(() => {
    const node = dialog.current;
    if (bagOpen && node && !node.open) {
      opener.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      node.showModal();
      heading.current?.focus({ preventScroll: true });
    } else if (!bagOpen && node?.open) node.close();
  }, [bagOpen]);
  useEffect(() => {
    if (bagOpen) {
      heading.current?.focus({ preventScroll: true });
      dialog.current?.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [bagOpen, mode, entries.length]);
  return (
    <dialog
      ref={dialog}
      className={styles.dialog}
      style={merchantStyle(state.acceptedDesign)}
      aria-labelledby="bag-heading"
      onCancel={(event) => {
        event.preventDefault();
        controller.closeBag();
      }}
      onClose={() => {
        controller.closeBag();
        if (opener.current?.isConnected)
          opener.current.focus({ preventScroll: true });
      }}
    >
      <div className={styles.header}>
        <span className={styles.eyebrow}>Your collection, closer</span>
        <button
          aria-label="Close shopping bag"
          onClick={() => controller.closeBag()}
        >
          ×
        </button>
      </div>
      <h2 ref={heading} tabIndex={-1} id="bag-heading">
        {order
          ? "A little demo magic."
          : checkoutReview
            ? "One last look."
            : "Good choices."}
      </h2>
      <p className={styles.intro}>
        {order
          ? "Your order is saved in this temporary demo. No payment or shipment occurs."
          : checkoutReview
            ? "This simulates an order and updates this demo’s stock and dashboard. No payment or shipment occurs."
            : "Your bag is temporary. It does not reserve inventory."}
      </p>
      {order ? (
        <>
          <p className={styles.reference}>
            Demo order <strong>{order.id}</strong>
          </p>
          <ul className={styles.lines}>
            {order.lines.map((line, index) => (
              <li key={line.id}>
                <div className={styles.itemCopy}>
                  <strong>{line.title}</strong>
                  <span>
                    {line.colour} · {line.size} · Quantity {line.quantity}
                  </span>
                  <span>
                    {stockOf(state.graph, line.variantId)} currently available ·
                    Recorded unit price {formatDisplay(line.unitPrice, scope)}
                  </span>
                </div>
                <strong>
                  {formatMinor(totals!.rows[index]!.amount, scope.currency)}
                </strong>
              </li>
            ))}
          </ul>
          <p className={styles.note}>
            Receipt currency: {scope.currency}
            {scope.snapshot
              ? ` · Reference dated ${scope.snapshot.rateDate}`
              : ""}
            . Recorded at placement; later currency choices do not change this
            receipt.
          </p>
        </>
      ) : entries.length ? (
        <>
          {!checkoutReview && <CurrencyPicker inline />}
          <ul className={styles.lines}>
            {entries.map((row, index) => {
              const photo = row.photoId
                ? controller.photos.view(row.photoId)
                : undefined;
              return (
                <li key={row.variantId}>
                  <div className={styles.photo}>
                    {photo && row.photoId ? (
                      <GarmentImage
                        photo={{ ...photo, id: row.photoId }}
                        title={row.title}
                        onFailure={(id) =>
                          controller.photos.reportUnavailable(id)
                        }
                      />
                    ) : (
                      <span>Photo unavailable</span>
                    )}
                  </div>
                  <div className={styles.itemCopy}>
                    <strong>{row.title}</strong>
                    <span>
                      {row.colour} · {row.size}
                    </span>
                    <span>
                      {formatDisplay(row.unitPrice, scope)} each · {row.stock}{" "}
                      available
                    </span>
                    {row.previousPrice !== row.unitPrice && (
                      <span className={styles.problem}>
                        Price changed from{" "}
                        {formatDisplay(row.previousPrice, scope)}. Review the
                        current price.
                      </span>
                    )}
                    {row.unavailable && (
                      <span className={styles.problem}>{row.unavailable}</span>
                    )}
                    {!checkoutReview ? (
                      <div className={styles.rowActions}>
                        <label>
                          Quantity
                          <select
                            aria-label={`Quantity of ${row.title}, ${row.size}`}
                            value={row.quantity}
                            onChange={(event) =>
                              controller.setBagQuantity(
                                row.variantId,
                                Number(event.target.value),
                              )
                            }
                          >
                            {[1, 2, 3, 4, 5].map((n) => (
                              <option key={n}>{n}</option>
                            ))}
                          </select>
                        </label>
                        <button
                          onClick={() =>
                            controller.setBagQuantity(row.variantId, 0)
                          }
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <span>
                        Quantity {row.quantity} · Deducts {row.quantity} units
                        at placement
                      </span>
                    )}
                  </div>
                  <strong className={styles.lineTotal}>
                    {totals
                      ? formatMinor(totals.rows[index]!.amount, scope.currency)
                      : `${formatDisplay(row.unitPrice, scope)} × ${row.quantity}`}
                  </strong>
                </li>
              );
            })}
          </ul>
          {!checkoutReview && (
            <label className={styles.promo}>
              <input
                type="checkbox"
                checked={discount}
                onChange={(event) => setDiscount(event.target.checked)}
              />{" "}
              Try the {formatDisplay(500, scope)} demo merchandise discount (up
              to the merchandise value)
            </label>
          )}
          {checkoutReview && (
            <p className={styles.note}>
              Fictional delivery identity: Demo shopper. Display currency{" "}
              {scope.currency}
              {scope.snapshot
                ? ` · Reference dated ${scope.snapshot.rateDate}`
                : ""}
              .
            </p>
          )}
        </>
      ) : (
        <div className={styles.empty}>
          <p>Your next favourite is waiting.</p>
          <Button onClick={() => controller.closeBag()}>
            Explore the collection
          </Button>
        </div>
      )}
      {!quote.ok && !order && (
        <p className={styles.problem} role="alert">
          {quote.message}
        </p>
      )}
      {totals && (entries.length > 0 || order) && (
        <>
          <dl className={styles.totals}>
            {totals.rows
              .filter((row) => !row.id.startsWith("line_"))
              .map((row) => (
                <div key={row.id}>
                  <dt>
                    {row.id === "discount"
                      ? "Demo discount"
                      : row.id === "delivery"
                        ? "Sample delivery"
                        : "Simulated tax"}
                  </dt>
                  <dd>{formatMinor(row.amount, scope.currency)}</dd>
                </div>
              ))}
            {totals.roundingAdjustment !== 0 && (
              <div>
                <dt>Currency rounding adjustment</dt>
                <dd>
                  {formatMinor(totals.roundingAdjustment, scope.currency)}
                </dd>
              </div>
            )}
            <div className={styles.total}>
              <dt>Total</dt>
              <dd>{formatMinor(totals.total, scope.currency)}</dd>
            </div>
          </dl>
          <p className={styles.note}>
            Sample delivery is {formatDisplay(600, scope)}; simulated tax is
            zero. These are demo assumptions. Merchandise budgets exclude
            delivery.
          </p>
          <div className={styles.actions}>
            {order ? (
              <>
                <Button
                  onClick={() => {
                    controller.closeBag();
                    controller.go("dashboard");
                  }}
                >
                  See it in the dashboard
                </Button>
                <Button variant="quiet" onClick={() => controller.closeBag()}>
                  Keep exploring
                </Button>
              </>
            ) : checkoutReview ? (
              <>
                <Button
                  onClick={() => controller.placeReviewed(checkoutReview)}
                >
                  Place demo order
                </Button>
                <Button variant="quiet" onClick={() => controller.editBag()}>
                  Edit my bag
                </Button>
              </>
            ) : (
              <Button
                disabled={
                  currencyBusy || entries.some((row) => !!row.unavailable)
                }
                onClick={() => controller.reviewBag(deduction)}
              >
                Review demo order
              </Button>
            )}
          </div>
        </>
      )}
      <p className={styles.notice} role="status">
        {bagNotice}
      </p>
    </dialog>
  );
}
