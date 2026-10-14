"use client";
import { useEffect, useRef, useState } from "react";
import { formatDisplay, formatMinor } from "@retailor/commerce/currency";
import { exactSum } from "@retailor/commerce/allocation";
import { stockOf } from "@retailor/commerce/selectors";
import type { CurrencyScope } from "@retailor/contracts/currency";
import { useSession } from "../session/context";
import { merchantStyle } from "../store-design/presets";
import { selectedScope } from "../currency/display";
import { CurrencyPicker } from "../currency/picker";
import { GarmentImage } from "../storefront/gallery";
import { knownColour } from "../storefront/browse";
import { Button } from "../../components/ui/button";
import { Brand } from "../../components/ui/brand";
import { Icon } from "../../components/ui/icon";
import { bagEntries, tryDisplayedBag, displayedOrder } from "./quote";
import styles from "./bag-dialog.module.css";

type DisplayedTotal = ReturnType<typeof displayedOrder>;
function OrderTotals({
  totals,
  scope,
}: {
  totals: DisplayedTotal;
  scope: CurrencyScope;
}) {
  const subtotal = exactSum(
    totals.rows
      .filter((row) => row.id.startsWith("line_"))
      .map((row) => row.amount),
  );
  return (
    <dl className={styles.totals} aria-label="Order totals">
      <div>
        <dt>Subtotal</dt>
        <dd>{formatMinor(subtotal, scope.currency)}</dd>
      </div>
      {totals.rows
        .filter(
          (row) =>
            !row.id.startsWith("line_") &&
            (row.id !== "discount" || row.amount !== 0),
        )
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
          <dd>{formatMinor(totals.roundingAdjustment, scope.currency)}</dd>
        </div>
      )}
      <div className={styles.total}>
        <dt>Total</dt>
        <dd key={`${scope.currency}:${totals.total}`}>
          {formatMinor(totals.total, scope.currency)}
        </dd>
      </div>
    </dl>
  );
}

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
  const units = entries.reduce((sum, row) => sum + row.quantity, 0);
  const buyer = state.graph.buyers.find(
    (item) => item.id === state.shopping.buyerId,
  );
  const delivery = totals?.rows.find((row) => row.id === "delivery")?.amount;
  useEffect(() => {
    const node = dialog.current;
    if (!node) return;
    if (bagOpen) {
      node.inert = false;
      if (!node.open) {
        opener.current =
          document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null;
        node.showModal();
        heading.current?.focus({ preventScroll: true });
      }
    } else if (node.open) {
      node.inert = true;
      const current = getComputedStyle(node);
      const closing = node.animate(
        [
          { opacity: current.opacity, transform: current.transform },
          { opacity: 0, transform: "translateY(12px) scale(0.985)" },
        ],
        { duration: 180, easing: "cubic-bezier(0.16, 1, 0.3, 1)" },
      );
      let cancelled = false;
      void closing.finished
        .then(() => {
          if (
            !cancelled &&
            node.isConnected &&
            !controller.getSnapshot().bagOpen
          )
            node.close();
        })
        .catch(() => {});
      return () => {
        cancelled = true;
        closing.cancel();
      };
    }
  }, [bagOpen, controller]);
  useEffect(() => {
    if (bagOpen) {
      heading.current?.focus({ preventScroll: true });
      dialog.current?.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [bagOpen, mode, entries.length]);

  const itemLines = (
    <ul className={styles.lines} aria-label="Selected garments">
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
                  onFailure={(id) => controller.photos.reportUnavailable(id)}
                />
              ) : (
                <span>Photo unavailable</span>
              )}
            </div>
            <div className={styles.itemCopy}>
              <strong>{row.title}</strong>
              <span>
                {knownColour(row.colour) ? `${row.colour} · ` : ""}
                {row.size}
              </span>
              <span>{formatDisplay(row.unitPrice, scope)} each</span>
              {row.previousPrice !== row.unitPrice && (
                <span className={styles.problem}>
                  Price changed from {formatDisplay(row.previousPrice, scope)}.
                  Review the current price.
                </span>
              )}
              {row.unavailable && (
                <span className={styles.problem}>{row.unavailable}</span>
              )}
              {checkoutReview ? (
                <span>Quantity {row.quantity}</span>
              ) : (
                <div className={styles.rowActions}>
                  <div
                    className={styles.quantity}
                    role="group"
                    aria-label={`Quantity of ${row.title}, ${row.size}`}
                  >
                    <button
                      aria-label={`Decrease quantity of ${row.title}, ${row.size}`}
                      disabled={row.quantity <= 1}
                      onClick={() =>
                        controller.setBagQuantity(
                          row.variantId,
                          row.quantity - 1,
                        )
                      }
                    >
                      −
                    </button>
                    <output aria-live="polite" key={row.quantity}>
                      {row.quantity}
                    </output>
                    <button
                      aria-label={`Increase quantity of ${row.title}, ${row.size}`}
                      disabled={row.quantity >= Math.min(5, row.stock)}
                      onClick={() =>
                        controller.setBagQuantity(
                          row.variantId,
                          row.quantity + 1,
                        )
                      }
                    >
                      +
                    </button>
                  </div>
                  <button
                    className={styles.remove}
                    aria-label={`Remove ${row.title}, ${row.size}`}
                    onClick={() => controller.setBagQuantity(row.variantId, 0)}
                  >
                    Remove
                  </button>
                </div>
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
  );

  return (
    <dialog
      ref={dialog}
      className={styles.dialog}
      data-mode={mode}
      style={merchantStyle(state.acceptedDesign)}
      aria-labelledby="bag-heading"
      onCancel={(event) => {
        event.preventDefault();
        controller.closeBag();
      }}
      onClose={() => {
        if (
          !dialog.current?.isConnected ||
          dialog.current.open ||
          controller.getSnapshot().bagOpen
        )
          return;
        if (opener.current?.isConnected)
          opener.current.focus({ preventScroll: true });
        else
          document
            .querySelector<HTMLButtonElement>(
              'nav[aria-label="Store pages"] button[aria-current="page"]',
            )
            ?.focus({ preventScroll: true });
      }}
    >
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>{state.acceptedDesign.name}</span>
          <h2 ref={heading} tabIndex={-1} id="bag-heading">
            {order
              ? "Order placed."
              : checkoutReview
                ? "Demo checkout."
                : "Your bag."}
          </h2>
        </div>
        <button
          aria-label="Close shopping bag"
          onClick={() => controller.closeBag()}
        >
          <Icon name="close" />
        </button>
      </header>
      <div className={styles.screen} key={mode}>
        {order ? (
          <div className={styles.receipt}>
            <div className={styles.success} aria-hidden="true">
              <Icon name="check" size={32} />
            </div>
            <p className={styles.intro}>
              All set. Your demo order is in your dashboard.
            </p>
            <p className={styles.reference}>
              Demo order <strong>{order.id}</strong>
            </p>
            <ul className={styles.receiptLines} aria-label="Ordered garments">
              {order.lines.map((line, index) => (
                <li key={line.id}>
                  <div className={styles.itemCopy}>
                    <strong>{line.title}</strong>
                    <span>
                      {knownColour(line.colour) ? `${line.colour} · ` : ""}
                      {line.size} · Quantity {line.quantity}
                    </span>
                    <span>
                      {formatDisplay(line.unitPrice, scope)} each ·{" "}
                      {stockOf(state.graph, line.variantId)} currently in stock
                    </span>
                  </div>
                  <strong>
                    {formatMinor(totals!.rows[index]!.amount, scope.currency)}
                  </strong>
                </li>
              ))}
            </ul>
            <OrderTotals totals={totals!} scope={scope} />
            <p className={styles.note}>
              Receipt in {scope.currency}
              {scope.snapshot
                ? ` · Reference dated ${scope.snapshot.rateDate}`
                : ""}
              . Saved at placement.
            </p>
            <div className={styles.actions}>
              <Button variant="quiet" onClick={() => controller.closeBag()}>
                Keep exploring
              </Button>
              <Button onClick={() => controller.showBagOrderInOwner()}>
                See it in the dashboard <Icon name="arrow" />
              </Button>
            </div>
            <p className={styles.demoNote}>
              Simulated order. No payment or shipment.
            </p>
          </div>
        ) : checkoutReview ? (
          <div className={styles.checkout}>
            <section
              className={styles.checkoutDetails}
              aria-label="Demo checkout details"
            >
              <ol className={styles.progress} aria-label="Checkout progress">
                <li>Bag</li>
                <li aria-current="step">Checkout</li>
                <li>Complete</li>
              </ol>
              <h3>One last look.</h3>
              <p className={styles.intro}>
                Your choices. Ready for their next chapter.
              </p>
              <section className={styles.checkoutCard}>
                <span className={styles.sectionNumber}>01</span>
                <div>
                  <h4>Customer</h4>
                  <strong>{buyer?.label ?? "Demo shopper"}</strong>
                  <p>A fictional profile. No personal details needed.</p>
                </div>
                <Icon name="check" />
              </section>
              <section className={styles.checkoutCard}>
                <span className={styles.sectionNumber}>02</span>
                <div>
                  <h4>Delivery</h4>
                  <strong>
                    Sample delivery{" "}
                    {delivery === undefined
                      ? ""
                      : formatMinor(delivery, scope.currency)}
                  </strong>
                  <p>Demo destination. Nothing will be shipped.</p>
                </div>
                <Icon name="check" />
              </section>
              <section className={styles.checkoutCard}>
                <span className={styles.sectionNumber}>03</span>
                <div>
                  <h4>Payment</h4>
                  <strong>Demo payment</strong>
                  <p>Nothing will be charged.</p>
                </div>
                <Icon name="check" />
              </section>
              <div className={styles.checkoutBrand}>
                <Brand />
              </div>
            </section>
            <section
              className={styles.checkoutSummary}
              aria-label="Order summary"
            >
              <h3>
                Order summary{" "}
                <span>
                  {units} {units === 1 ? "item" : "items"}
                </span>
              </h3>
              {itemLines}
              {!quote.ok && (
                <p className={styles.problem} role="alert">
                  {quote.message}
                </p>
              )}
              {totals && <OrderTotals totals={totals} scope={scope} />}
              <p className={styles.note}>
                Prices in {scope.currency}
                {scope.snapshot
                  ? ` · Reference dated ${scope.snapshot.rateDate}`
                  : ""}
                .
              </p>
              <div className={styles.actions}>
                <Button variant="quiet" onClick={() => controller.editBag()}>
                  Back to bag
                </Button>
                <Button
                  disabled={
                    !quote.ok || entries.some((row) => !!row.unavailable)
                  }
                  onClick={() => controller.placeReviewed(checkoutReview)}
                >
                  Place demo order <Icon name="arrow" />
                </Button>
              </div>
              <p className={styles.demoNote}>
                No payment or shipment. This updates demo stock.
              </p>
            </section>
          </div>
        ) : entries.length ? (
          <div className={styles.bag}>
            <div className={styles.bagItems}>
              <div className={styles.currency}>
                <CurrencyPicker inline />
              </div>
              {itemLines}
            </div>
            <div className={styles.bagSummary}>
              <label className={styles.promo}>
                <input
                  type="checkbox"
                  checked={discount}
                  onChange={(event) => setDiscount(event.target.checked)}
                />
                <span>Try a {formatDisplay(500, scope)} demo discount</span>
              </label>
              {!quote.ok && (
                <p className={styles.problem} role="alert">
                  {quote.message}
                </p>
              )}
              {totals && <OrderTotals totals={totals} scope={scope} />}
              <Button
                className={styles.checkoutButton}
                disabled={
                  !quote.ok ||
                  currencyBusy ||
                  entries.some((row) => !!row.unavailable)
                }
                onClick={() => controller.reviewBag(deduction)}
              >
                Checkout <Icon name="arrow" />
              </Button>
              <button
                className={styles.continue}
                onClick={() => controller.closeBag()}
              >
                Continue shopping
              </button>
              <p className={styles.demoNote}>
                No payment or shipment. Your bag reserves no stock.
              </p>
            </div>
          </div>
        ) : (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>
              <Icon name="bag" size={40} />
            </div>
            <h3>A little room for possibility.</h3>
            <p>Your next favourite is waiting.</p>
            <Button
              onClick={() => {
                controller.closeBag();
                controller.browse({ page: "collection" });
              }}
            >
              Explore the collection <Icon name="arrow" />
            </Button>
          </div>
        )}
      </div>
      {bagNotice && (
        <p className={styles.notice} role="status">
          {bagNotice}
        </p>
      )}
    </dialog>
  );
}
