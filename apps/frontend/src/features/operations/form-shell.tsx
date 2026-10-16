"use client";
import { useCallback, useEffect, useId, useRef } from "react";
import { formatUsd } from "@retailor/commerce/money";
import { productReferenced } from "@retailor/commerce/selectors";
import { Button } from "../../components/ui/button";
import { Icon } from "../../components/ui/icon";
import { CONFIRM_LABELS } from "./presentation";
import { useSession } from "../session/context";
import type { OwnerOperationType } from "./state";
import { requiredProductIssues, visibleOwnerIssues } from "./validation";
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
    ownerNoticeTone,
    ownerIssues,
    ownerPhotoBusy,
    ownerFilling,
    state,
  } = useSession();
  const heading = useRef<HTMLHeadingElement>(null),
    formElement = useRef<HTMLFormElement>(null),
    opener = useRef<HTMLElement | null>(null),
    dialog = useRef<HTMLDialogElement>(null),
    titleId = useId();
  const focusField = useCallback((field: string) => {
    const control = Array.from(
      formElement.current?.querySelectorAll<HTMLElement>(
        "[data-owner-field]",
      ) ?? [],
    ).find(
      (node) =>
        node.dataset.ownerField === field &&
        !node.matches(":disabled") &&
        node.getClientRects().length,
    );
    control?.focus({ preventScroll: true });
    control?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);
  useEffect(() => {
    if (ownerNoticeTone === "error" && ownerIssues[0])
      focusField(ownerIssues[0].field);
  }, [ownerIssues, ownerNoticeTone, focusField]);
  useEffect(() => {
    const node = dialog.current;
    opener.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    if (node && !node.open) node.showModal();
    return () => {
      node?.close();
      if (opener.current?.isConnected)
        opener.current.focus({ preventScroll: true });
      else
        document
          .getElementById("owner-register-heading")
          ?.focus({ preventScroll: true });
    };
  }, [inline]);
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
    if (inline)
      heading.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    else formElement.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [inline, ownerForm?.id, ownerReview?.command.id]);
  if (!ownerForm) return null;
  const type = ownerForm.type,
    product = state.graph.products.find((p) => p.id === ownerForm.targetId);
  const linked =
    product &&
    (productReferenced(state.graph, product.id) ||
      state.graph.orderDrafts.some((d) =>
        d.lines.some((l) => product.variants.some((v) => v.id === l.variantId)),
      ));
  const missing = requiredProductIssues(
    ownerForm,
    controller.photos.availableIds(),
  );
  const issues = visibleOwnerIssues(
    ownerForm,
    ownerIssues,
    controller.photos.availableIds(),
  );
  const Panel = inline ? "section" : "dialog";
  return (
    <Panel
      ref={(node) => {
        dialog.current = node instanceof HTMLDialogElement ? node : null;
      }}
      className={`${styles.panel} ${inline ? styles.inline : styles.dialog}`}
      aria-label={inline ? "Current owner operation" : undefined}
      aria-labelledby={inline ? undefined : titleId}
      onCancel={(event) => {
        event.preventDefault();
        controller.closeOwnerOperation();
      }}
    >
      <div className={styles.top}>
        <h2 id={titleId} ref={heading} tabIndex={-1}>
          {OPERATION_LABELS[type]}
        </h2>
        <Button
          variant="quiet"
          aria-label="Cancel form"
          onClick={() => controller.closeOwnerOperation()}
        >
          <Icon name="close" />
        </Button>
      </div>
      <div className={styles.workflow}>
        <ol aria-label="Operation progress">
          <li aria-current={!ownerReview ? "step" : undefined}>
            <span>1</span>Details
          </li>
          <li aria-current={ownerReview ? "step" : undefined}>
            <span>2</span>Review
          </li>
        </ol>
        <p role="status">
          {ownerReview
            ? "Check your changes before applying."
            : "Make your changes, then review."}
        </p>
      </div>
      {(inline || ownerFilling) && (
        <div className={styles.actions}>
          {inline && (
            <Button
              type="button"
              variant="quiet"
              onClick={() => controller.moveOwnerForm("dashboard")}
            >
              Open full form
            </Button>
          )}
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
      )}
      <form
        className={styles.form}
        ref={formElement}
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
            {issues.length > 0 && (
              <div
                className={styles.errorSummary}
                role={ownerIssues.length ? "alert" : "status"}
              >
                <strong>Check the highlighted fields</strong>
                <ul>
                  {issues.map((issue) => (
                    <li key={issue.field}>
                      <button
                        type="button"
                        onClick={() => focusField(issue.field)}
                      >
                        {issue.message}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className={styles.submitBar}>
              <span>Next: check the changes.</span>
              <Button
                type="submit"
                disabled={ownerPhotoBusy || missing.length > 0}
              >
                Review changes <Icon name="arrow" size={16} />
              </Button>
            </div>
          </>
        ) : (
          <>
            <ReviewSummary />
            <EffectReview />
            <div className={styles.submitBar}>
              <Button
                type="button"
                variant="secondary"
                onClick={() => controller.editOwnerReview()}
              >
                Back to details
              </Button>
              <Button
                type="button"
                onClick={() => controller.confirmOwnerOperation(ownerReview)}
              >
                {CONFIRM_LABELS[type]} <Icon name="check" size={16} />
              </Button>
            </div>
          </>
        )}
      </form>
      {ownerNotice && (!ownerReview || ownerNoticeTone === "error") && (
        <p
          className={styles.notice}
          data-tone={ownerNoticeTone}
          role={ownerNoticeTone === "error" ? "alert" : "status"}
        >
          {ownerNoticeTone === "error" && <strong>Unable to continue. </strong>}
          {ownerNotice}
        </p>
      )}
    </Panel>
  );
}

function EffectReview() {
  const { ownerReview, ownerForm, state } = useSession();
  if (!ownerReview || !ownerForm) return null;
  const amounts = [
    { label: "Net sales", value: ownerReview.effect.netSales },
    { label: "Sold cost", value: ownerReview.effect.soldCost },
    { label: "Operating expenses", value: ownerReview.effect.expenses },
    { label: "Inventory loss", value: ownerReview.effect.inventoryLoss },
    { label: "Operating profit", value: ownerReview.effect.operatingResult },
  ];
  const changed = amounts.filter((amount) => amount.value !== 0);
  return (
    <>
      {changed.length > 0 && (
        <section className={styles.effect}>
          <h3>Impact of this change</h3>
          <dl>
            {changed.map((amount) => (
              <div key={amount.label}>
                <dt>{amount.label}</dt>
                <dd>{formatUsd(amount.value)}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
      {ownerReview.effect.stock.map((change) => {
        const product = state.graph.products.find((p) =>
            p.variants.some((v) => v.id === change.variantId),
          ),
          variant = product?.variants.find((v) => v.id === change.variantId);
        return (
          <div className={styles.stockImpact} key={change.variantId}>
            <span>
              {product?.title ?? ownerForm.fields.title ?? "New garment"} ·{" "}
              {variant?.size ??
                ownerForm.variants.find((v) => v.id === change.variantId)?.size}
            </span>
            <strong>
              {change.before}
              <Icon name="arrow" />
              {change.after}
              <small>available units</small>
            </strong>
          </div>
        );
      })}
      <details className={styles.accounting}>
        <summary>Accounting & record details</summary>
        <dl>
          {amounts.map((amount) => (
            <div key={amount.label}>
              <dt>{amount.label}</dt>
              <dd>{formatUsd(amount.value)}</dd>
            </div>
          ))}
        </dl>
        <ul>
          {ownerReview.effect.refs.map((ref) => (
            <li key={ref}>{ref}</li>
          ))}
        </ul>
      </details>
      <p className={styles.demoNote}>
        Demo changes only. No payment or shipment.
      </p>
    </>
  );
}
