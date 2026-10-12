"use client";
import { useEffect, useRef } from "react";
import { formatUsd } from "@retailor/commerce/money";
import { useSession } from "../session/context";
import { OPERATION_LABELS } from "../operations/form-shell";
import { dashboardRecord } from "../dashboard/state";
import styles from "./tailor.module.css";
export function OperationResult() {
  const { controller, state, ownerResult } = useSession();
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
    heading.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [ownerResult?.receiptId]);
  if (!ownerResult) return null;
  const receipt = state.graph.receipts.find(
    (r) => r.id === ownerResult.receiptId,
  );
  if (!receipt) return null;
  const latest =
    state.graph.receipts.at(-1)?.id === receipt.id &&
    state.graph.revision === receipt.revision;
  const draft =
    receipt.undo?.type === "order-draft" ||
    receipt.undo?.type === "expense-draft"
      ? receipt.undo
      : null;
  return (
    <article
      className={styles.operationResult}
      aria-label="Applied operation result"
    >
      <h3 ref={heading} tabIndex={-1}>
        Applied once
      </h3>
      <small>{OPERATION_LABELS[ownerResult.type]}</small>
      <p>
        {latest
          ? "Your current records now reflect this review."
          : "A completed operation. More recent changes may affect current figures."}
      </p>
      <p>
        Change in demo result: {formatUsd(ownerResult.effect.operatingResult)}
      </p>
      {ownerResult.effect.stock.map((change) => (
        <p key={change.variantId}>
          Reviewed stock: {change.before} → {change.after}
        </p>
      ))}
      <div className={styles.referenceList}>
        {receipt.refs
          .filter((ref) => dashboardRecord(state.graph, ref))
          .map((ref) => (
            <button
              key={ref}
              onClick={() => {
                controller.openDashboardEvidence({
                  kind: "metric",
                  factId: "operating_result",
                });
                controller.openDashboardSource(ref);
                controller.toggleTailor(false);
              }}
            >
              Open actual {ref.split(":")[0]} record ↗
            </button>
          ))}
      </div>
      {draft?.type === "order-draft" &&
        state.graph.orderDrafts.some((d) => d.id === draft.id) && (
          <button
            onClick={() => {
              controller.openOwnerOperation("saveOrderDraft", draft.id);
              controller.moveOwnerForm("tailor");
            }}
          >
            Open saved order draft
          </button>
        )}
      {draft?.type === "expense-draft" &&
        state.graph.expenseDrafts.some((d) => d.id === draft.id) && (
          <button
            onClick={() => {
              controller.openOwnerOperation("saveExpenseDraft", draft.id);
              controller.moveOwnerForm("tailor");
            }}
          >
            Open saved expense draft
          </button>
        )}
      {latest && receipt.undo && (
        <button
          onClick={() => {
            controller.openOwnerOperation("undo", receipt.id);
            controller.moveOwnerForm("tailor");
          }}
        >
          Review latest reversible Undo
        </button>
      )}
      {!receipt.undo && (
        <p className={styles.note}>
          Posted history stays recorded. Use the permitted lifecycle or a
          reviewed correcting movement.
        </p>
      )}
    </article>
  );
}
