"use client";
import { CATEGORY_LABELS } from "@retailor/contracts/product";
import { useSession } from "../session/context";
import { productReferenced } from "@retailor/commerce/selectors";
import { formatUsd } from "@retailor/commerce/money";
import { bagTotals } from "../bag/quote";
import { SIZING_LABELS } from "../storefront/browse";
import { GarmentImage } from "../storefront/gallery";
import styles from "./operations.module.css";
export function ReviewSummary() {
  const { ownerReview, state, controller } = useSession();
  if (!ownerReview) return null;
  const c = ownerReview.command,
    g = state.graph;
  const variant = (id: string) =>
    g.products.flatMap((p) => p.variants).find((v) => v.id === id);
  switch (c.type) {
    case "createProduct":
    case "updateProduct": {
      const p = c.payload;
      return (
        <div className={styles.effect}>
          <strong>
            {p.title} · {CATEGORY_LABELS[p.category]}
            {p.archived ? " · Archived from shopping" : " · Offered in store"}
          </strong>
          <div className={styles.photos}>
            {p.imageIds.map((id) => {
              const photo = controller.photos.view(id);
              return photo ? (
                <GarmentImage
                  key={id}
                  photo={{ ...photo, id }}
                  title={p.title}
                  onFailure={(id) => controller.photos.reportUnavailable(id)}
                />
              ) : (
                <p key={id}>Photo unavailable — repair before confirming.</p>
              );
            })}
          </div>
          <p>{p.description || "No supplied description."}</p>
          <p>Sizing convention: {SIZING_LABELS[p.sizingSystemId]}</p>
          {p.variants.map((v) => (
            <p key={v.id}>
              {v.size} · {v.colour} · {v.sku} · Current price{" "}
              {formatUsd(variant(v.id)?.price ?? 0)} → {formatUsd(v.price)} ·
              Future cost {formatUsd(variant(v.id)?.unitCost ?? 0)} →{" "}
              {formatUsd(v.unitCost)} · Opening {v.openingStock} units
              {v.archived ? " · Archived" : ""}
            </p>
          ))}
        </div>
      );
    }
    case "saveOrderDraft":
    case "placeOrder": {
      const draft =
        c.type === "saveOrderDraft"
          ? c.payload
          : g.orderDrafts.find((d) => d.id === c.payload.draftId);
      if (!draft) return <p>The current draft is unavailable.</p>;
      const rows = draft.lines.map((l) => ({
          quantity: l.quantity,
          unitPrice: variant(l.variantId)!.price,
        })),
        totals = bagTotals(rows, draft.discount, draft.delivery, draft.tax);
      return (
        <div className={styles.effect}>
          <p>
            Fictional identity:{" "}
            {g.buyers.find((buyer) => buyer.id === draft.buyerId)?.label ??
              "Owner demo identity"}
          </p>
          <strong>
            {c.type === "placeOrder"
              ? "Place this exact owner demo order"
              : "Unposted owner draft"}
          </strong>
          {draft.lines.map((l) => {
            const p = g.products.find((p) =>
                p.variants.some((v) => v.id === l.variantId),
              ),
              v = variant(l.variantId);
            return (
              <p key={l.variantId}>
                {p?.title} · {v?.size} · {v?.colour} · {l.quantity} ×{" "}
                {formatUsd(v!.price)}
              </p>
            );
          })}
          <p>
            Merchandise {formatUsd(totals.gross)} − discount{" "}
            {formatUsd(totals.discount)} + sample delivery{" "}
            {formatUsd(totals.delivery)} + simulated tax {formatUsd(totals.tax)}
          </p>
          <strong>Total {formatUsd(totals.total)}</strong>
        </div>
      );
    }
    case "advanceOrder":
      return (
        <p>
          Order {c.payload.orderId}:{" "}
          {g.orders.find((o) => o.id === c.payload.orderId)?.state} →{" "}
          {c.payload.state}. Simulated fulfilment only; stock is not deducted
          again.
        </p>
      );
    case "cancelOrder":
      return (
        <p>
          Cancel order {c.payload.orderId}, restore its original units and
          reverse recorded discounted charges once.
        </p>
      );
    case "advanceReturn":
      return (
        <p>
          Return {c.payload.returnId}:{" "}
          {g.returns.find((r) => r.id === c.payload.returnId)?.state} →{" "}
          {c.payload.state}. Financial refunds and physical restock remain
          separate.
        </p>
      );
    case "restockReturn":
      return (
        <p>
          Restock only the received inspected units from return{" "}
          {c.payload.returnId}. Their original sold-cost snapshots reverse once;
          no financial refund is issued.
        </p>
      );
    case "removeProduct": {
      const p = g.products.find((p) => p.id === c.payload.productId)!;
      const linked =
        productReferenced(g, p.id) ||
        g.orderDrafts.some((d) =>
          d.lines.some((l) => p.variants.some((v) => v.id === l.variantId)),
        );
      return (
        <p>
          {p.title}:{" "}
          {linked
            ? "Archive from the storefront and preserve linked history."
            : "Delete this unreferenced garment."}{" "}
          Affected bag lines are removed; no replacement is chosen.
        </p>
      );
    }
    case "setUnitCost":
      return (
        <p>
          Future cost for {variant(c.payload.variantId)?.sku}:{" "}
          {formatUsd(variant(c.payload.variantId)!.unitCost)} →{" "}
          {formatUsd(c.payload.cost)}. Past sold cost stays unchanged.
        </p>
      );
    case "adjustStock":
      return (
        <section>
          <h3>
            {c.payload.units > 0 ? "Add" : "Remove"} {Math.abs(c.payload.units)}{" "}
            {Math.abs(c.payload.units) === 1 ? "unit" : "units"}
          </h3>
          <p>
            {c.payload.kind === "inbound"
              ? "New stock received"
              : "Stock count correction"}
          </p>
          <p>{c.payload.reason}</p>
        </section>
      );
    case "writeoffStock":
      return (
        <section>
          <h3>
            Write off {c.payload.quantity}{" "}
            {c.payload.quantity === 1 ? "unit" : "units"}
          </h3>
          <p>{c.payload.reason}</p>
        </section>
      );
    case "issueRefund":
      return (
        <div className={styles.effect}>
          <strong>Order {c.payload.orderId}</strong>
          {c.payload.lines.map((l) => (
            <p key={l.lineId}>
              {
                g.orders
                  .find((o) => o.id === c.payload.orderId)
                  ?.lines.find((line) => line.id === l.lineId)?.title
              }
              : {formatUsd(l.amount)} merchandise refund
            </p>
          ))}
          <p>
            Delivery {formatUsd(c.payload.delivery)} · Tax{" "}
            {formatUsd(c.payload.tax)}. No automatic stock restoration.
          </p>
        </div>
      );
    case "requestReturn":
      return (
        <p>
          Order {c.payload.orderId} · {c.payload.reason} ·{" "}
          {c.payload.lines.reduce((sum, l) => sum + l.units.length, 0)} selected
          physical units. No refund/restock yet.
        </p>
      );
    case "receiveReturn":
      return (
        <p>
          Receive return {c.payload.returnId};{" "}
          {c.payload.restockable.reduce((sum, l) => sum + l.units.length, 0)}{" "}
          inspected units will be eligible for a separate restock action.
        </p>
      );
    case "saveExpenseDraft":
      return (
        <section aria-label="Expense draft review">
          <div className={styles.reviewAmount}>
            {formatUsd(c.payload.amount)}
          </div>
          <span className={styles.reviewCategory}>
            {c.payload.category} · Draft
          </span>
          <p>{c.payload.note || "No note added."}</p>
          <p>This saves a draft. Post it later to include it in expenses.</p>
        </section>
      );
    case "postExpense":
    case "deleteExpenseDraft": {
      const e = g.expenseDrafts.find((e) => e.id === c.payload.draftId);
      return (
        <section aria-label="Expense review">
          <div className={styles.reviewAmount}>{formatUsd(e?.amount ?? 0)}</div>
          <span className={styles.reviewCategory}>{e?.category}</span>
          <p>{e?.note}</p>
        </section>
      );
    }
    case "correctExpense":
      return (
        <section>
          <div className={styles.reviewAmount}>
            {formatUsd(c.payload.amount)}
          </div>
          <span className={styles.reviewCategory}>
            Linked expense adjustment
          </span>
          <p>{g.expenses.find((e) => e.id === c.payload.expenseId)?.note}</p>
          <p>{c.payload.note}</p>
        </section>
      );
    case "voidExpense":
      return (
        <section>
          <h3>Void this expense</h3>
          <p>{g.expenses.find((e) => e.id === c.payload.expenseId)?.note}</p>
          <p>{c.payload.note}</p>
          <p>
            Reverse this expense and its linked corrections. The original record
            stays in history.
          </p>
        </section>
      );
    default:
      return (
        <p>
          Exact record: {ownerReview.effect.refs[0]}. Current permitted
          lifecycle is shown in the effect review.
        </p>
      );
  }
}
