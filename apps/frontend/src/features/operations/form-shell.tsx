"use client";
import { useEffect, useRef } from "react";
import { formatUsd } from "@retailor/commerce/money";
import { productReferenced } from "@retailor/commerce/selectors";
import { Button } from "../../components/ui/button";
import { useSession } from "../session/context";
import type { OwnerOperationType } from "./state";
import { ownerIntent } from "./state";
import { ReviewSummary } from "./review-summary";
import { ProductForm } from "./product-form";
import { OrderForm } from "./order-form";
import { InventoryForm } from "./inventory-form";
import { ReturnForm } from "./return-form";
import { ExpenseForm } from "./expense-form";
import styles from "./operations.module.css";
export const OPERATION_LABELS: Record<OwnerOperationType, string> = {
  createProduct: "Create a garment",
  updateProduct: "Edit this garment",
  removeProduct: "Remove this garment",
  saveOrderDraft: "Save an order draft",
  deleteOrderDraft: "Delete this order draft",
  placeOrder: "Place this demo order",
  cancelOrder: "Cancel this demo order",
  advanceOrder: "Update simulated fulfilment",
  requestReturn: "Request a physical return",
  advanceReturn: "Update this return",
  receiveReturn: "Receive and inspect this return",
  restockReturn: "Restock inspected units",
  issueRefund: "Issue a demo refund",
  adjustStock: "Adjust available stock",
  writeoffStock: "Write off available units",
  setUnitCost: "Change future unit cost",
  saveExpenseDraft: "Save an expense draft",
  deleteExpenseDraft: "Delete this expense draft",
  postExpense: "Post this demo expense",
  correctExpense: "Correct this posted expense",
  voidExpense: "Void this posted expense",
  undo: "Undo latest reversible change",
};
export function FormShell({ inline = false }: { inline?: boolean }) {
  const {
    controller,
    ownerForm,
    ownerReview,
    ownerNotice,
    ownerPhotoBusy,
    ownerFilling,
    state,
  } = useSession();
  const heading = useRef<HTMLHeadingElement>(null),
    opener = useRef<HTMLElement | null>(null);
  useEffect(() => {
    opener.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    return () => {
      if (opener.current?.isConnected)
        opener.current.focus({ preventScroll: true });
      else
        document
          .getElementById("owner-register-heading")
          ?.focus({ preventScroll: true });
    };
  }, []);
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
    heading.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [ownerForm?.id, ownerReview?.command.id]);
  if (!ownerForm) return null;
  const type = ownerForm.type,
    product = state.graph.products.find((p) => p.id === ownerForm.targetId);
  const linked =
    product &&
    (productReferenced(state.graph, product.id) ||
      state.graph.orderDrafts.some((d) =>
        d.lines.some((l) => product.variants.some((v) => v.id === l.variantId)),
      ));
  let missing = "";
  if (type === "createProduct" || type === "updateProduct") {
    if (
      !ownerForm.photoIds.length ||
      !ownerForm.photoIds.every((id) =>
        controller.photos.availableIds().has(id),
      )
    )
      missing = "Choose at least one available clothing photograph.";
    else if (!ownerForm.fields.title?.trim())
      missing = "Give this garment a title.";
    else {
      try {
        ownerIntent(ownerForm, state.graph);
      } catch {
        missing =
          "Review the category, option labels, USD prices and whole stock quantities.";
      }
    }
  }
  return (
    <section
      className={`${styles.panel} ${inline ? styles.inline : ""}`}
      aria-label="Current owner operation"
    >
      <div className={styles.top}>
        <h2 ref={heading} tabIndex={-1}>
          {OPERATION_LABELS[type]}
        </h2>
        <Button
          variant="quiet"
          onClick={() => controller.closeOwnerOperation()}
        >
          Cancel form
        </Button>
      </div>
      <p>Current records · Owner amounts in USD · Temporary local demo</p>
      <div className={styles.actions}>
        <Button
          type="button"
          variant="quiet"
          onClick={() =>
            controller.moveOwnerForm(inline ? "dashboard" : "tailor")
          }
        >
          {inline ? "Open full form" : "Continue in Tailor"}
        </Button>
        {ownerFilling && (
          <Button
            type="button"
            variant="quiet"
            onClick={() => controller.stopOwnerPrefill()}
          >
            Stop suggested fill
          </Button>
        )}
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          controller.reviewOwnerOperation();
        }}
      >
        {!ownerReview ? (
          <>
            {type === "createProduct" || type === "updateProduct" ? (
              <ProductForm />
            ) : type === "removeProduct" ? (
              <p>
                {product?.title ?? "Unavailable garment"}.{" "}
                {linked
                  ? "Remove from storefront; keep its demo history. This archives the garment and preserves linked records."
                  : "This garment has no linked history and will be deleted."}{" "}
                Affected bag lines are removed, with no replacement selected.
              </p>
            ) : type === "undo" ? (
              <p>
                Undo only the latest eligible unposted change. Placed orders and
                posted financial/stock history remain immutable.
              </p>
            ) : type.includes("Expense") ? (
              <ExpenseForm />
            ) : ["adjustStock", "writeoffStock", "setUnitCost"].includes(
                type,
              ) ? (
              <InventoryForm />
            ) : [
                "requestReturn",
                "advanceReturn",
                "receiveReturn",
                "restockReturn",
                "issueRefund",
              ].includes(type) ? (
              <ReturnForm />
            ) : (
              <OrderForm />
            )}
            <div className={styles.actions}>
              <Button type="submit" disabled={ownerPhotoBusy || !!missing}>
                Review exact effects
              </Button>
            </div>
            {missing && <p role="status">{missing}</p>}
          </>
        ) : (
          <>
            <ReviewSummary />
            <div className={styles.effect}>
              <h3>Exactly what changes</h3>
              <dl>
                {[
                  ["Net merchandise", ownerReview.effect.netSales],
                  ["Sold cost", ownerReview.effect.soldCost],
                  ["Operating expenses", ownerReview.effect.expenses],
                  ["Inventory loss", ownerReview.effect.inventoryLoss],
                  ["Demo result", ownerReview.effect.operatingResult],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{formatUsd(Number(value))}</dd>
                  </div>
                ))}
              </dl>
              {ownerReview.effect.stock.map((change) => {
                const p = state.graph.products.find((p) =>
                    p.variants.some((v) => v.id === change.variantId),
                  ),
                  v = p?.variants.find((v) => v.id === change.variantId);
                return (
                  <p key={change.variantId}>
                    {p?.title ?? ownerForm.fields.title ?? "New garment"} ·{" "}
                    {v?.size ??
                      ownerForm.variants.find((v) => v.id === change.variantId)
                        ?.size}{" "}
                    · Stock {change.before} → {change.after}
                  </p>
                );
              })}
              <details>
                <summary>Affected record references</summary>
                <ul>
                  {ownerReview.effect.refs.map((ref) => (
                    <li key={ref}>{ref}</li>
                  ))}
                </ul>
              </details>
            </div>
            <p>
              No payment or shipment occurs. Confirmation applies this exact
              current review once.
            </p>
            <div className={styles.actions}>
              <Button
                type="button"
                onClick={() => controller.confirmOwnerOperation(ownerReview)}
              >
                {OPERATION_LABELS[type]}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => controller.editOwnerReview()}
              >
                Back to editable fields
              </Button>
            </div>
          </>
        )}
      </form>
      <p className={styles.notice} role="status">
        {ownerNotice}
      </p>
    </section>
  );
}
