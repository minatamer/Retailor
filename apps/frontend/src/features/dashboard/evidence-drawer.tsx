"use client";
import { useEffect, useRef } from "react";
import { useSession } from "../session/context";
import { resolveDashboardTarget, factDisplay, labelOf } from "./model";
import type { DashboardModel } from "./model";
import { dashboardRecord } from "./state";
import { RecordDetail } from "./record-detail";
import styles from "./dashboard.module.css";
export function EvidenceDrawer({ model }: { model: DashboardModel }) {
  const { controller, state } = useSession(),
    prefs = state.dashboard;
  const dialog = useRef<HTMLDialogElement>(null),
    heading = useRef<HTMLHeadingElement>(null),
    recordHeading = useRef<HTMLHeadingElement>(null),
    opener = useRef<HTMLElement | null>(null),
    evidenceScroll = useRef(0);
  const opened = prefs.target !== null;
  const selected = prefs.target
    ? resolveDashboardTarget(model, prefs.target, prefs.series)
    : null;
  useEffect(() => {
    const node = dialog.current;
    if (opened && node && !node.open) {
      opener.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      node.showModal();
      heading.current?.focus({ preventScroll: true });
    } else if (!opened && node?.open) {
      node.close();
      if (opener.current?.isConnected)
        opener.current.focus({ preventScroll: true });
    }
  }, [opened]);
  useEffect(() => {
    const node = dialog.current;
    if (prefs.source) {
      if (node) node.scrollTop = 0;
      recordHeading.current?.focus({ preventScroll: true });
    } else if (node?.open) {
      node.scrollTop = evidenceScroll.current;
      heading.current?.focus({ preventScroll: true });
    }
  }, [prefs.source]);
  useEffect(() => {
    const node = dialog.current;
    return () => {
      node?.close();
      if (opener.current?.isConnected)
        opener.current.focus({ preventScroll: true });
    };
  }, []);
  const fact = selected?.fact,
    references = fact?.contributors ?? [],
    page = Math.min(
      prefs.page,
      Math.max(0, Math.ceil(references.length / 50) - 1),
    );
  const dayTarget = prefs.target?.kind === "day" ? prefs.target : null;
  const selectedDay = dayTarget
    ? model.days.find((d) => d.day === dayTarget.day)
    : undefined;
  const productTarget = prefs.target?.kind === "product" ? prefs.target : null;
  const selectedProduct = productTarget
    ? model.products.find((p) => p.productId === productTarget.productId)
    : undefined;
  return (
    <dialog
      ref={dialog}
      className={styles.drawer}
      aria-labelledby="dashboard-evidence-heading"
      onCancel={(event) => {
        event.preventDefault();
        controller.closeDashboardEvidence();
      }}
    >
      <div className={styles.drawerTop}>
        <span className={styles.caption}>
          Behind the number · Current records
        </span>
        <button
          type="button"
          onClick={() => controller.closeDashboardEvidence()}
        >
          Close evidence
        </button>
      </div>
      <h2 id="dashboard-evidence-heading" ref={heading} tabIndex={-1}>
        {selected?.label ?? "This selection is outside the current scope"}
      </h2>
      {prefs.source ? (
        <>
          <button
            className={styles.sourceLink}
            type="button"
            onClick={() => controller.openDashboardSource(null)}
          >
            ← Back to this figure
          </button>
          <h3 ref={recordHeading} tabIndex={-1}>
            Contributing record
          </h3>
          <RecordDetail reference={prefs.source} />
        </>
      ) : fact ? (
        <>
          <strong className={styles.evidenceValue}>{factDisplay(fact)}</strong>
          {selectedDay && (
            <div className={styles.relatedFacts}>
              {(
                [
                  "net_sales",
                  "included_orders",
                  "aov",
                  "operating_result",
                ] as const
              ).map((id) => {
                const related = selectedDay.registry.find(
                  (f) => f.factId === id,
                )!;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() =>
                      controller.openDashboardEvidence({
                        kind: "day",
                        day: selectedDay.day,
                        factId: id,
                      })
                    }
                  >
                    <span>{labelOf(related)}</span>
                    <strong>{factDisplay(related)}</strong>
                  </button>
                );
              })}
            </div>
          )}
          {selectedProduct && (
            <div className={styles.relatedFacts}>
              <button
                type="button"
                onClick={() =>
                  controller.openDashboardEvidence({
                    kind: "product",
                    productId: selectedProduct.productId,
                    factId: "product_net_contribution",
                  })
                }
              >
                <span>Net merchandise contribution</span>
                <strong>{factDisplay(selectedProduct.fact)}</strong>
              </button>
              <button
                type="button"
                onClick={() =>
                  controller.openDashboardEvidence({
                    kind: "product",
                    productId: selectedProduct.productId,
                    factId: "net_units",
                  })
                }
              >
                <span>Net units after cancellation/physical receipt</span>
                <strong>{factDisplay(selectedProduct.units)}</strong>
              </button>
              <button
                type="button"
                onClick={() => {
                  evidenceScroll.current = dialog.current?.scrollTop ?? 0;
                  controller.openDashboardSource(
                    `product:${selectedProduct.productId}`,
                  );
                }}
              >
                Inspect actual current garment ↗
              </button>
            </div>
          )}
          {fact.reason && <p className={styles.empty}>{fact.reason}</p>}
          <p className={styles.caption}>
            Updated from your current records, revision {fact.revision}. Costs,
            seeded traffic, buyers and feedback are disclosed demo inputs; no
            real payment or shipping occurs.
          </p>
          <section className={styles.calculation}>
            <h3>How this is calculated</h3>
            <p>{fact.formula}</p>
            <dl>
              <div>
                <dt>Exact numerator</dt>
                <dd>
                  {fact.numerator.toLocaleString("en-US")}{" "}
                  {fact.unit === "usd-cents"
                    ? "USD cents"
                    : fact.unit === "basis-points"
                      ? "count or underlying amount"
                      : "units"}
                </dd>
              </div>
              <div>
                <dt>Denominator</dt>
                <dd>
                  {fact.denominator?.toLocaleString("en-US") ??
                    "None · Exact sum/count"}
                </dd>
              </div>
              <div>
                <dt>Date basis</dt>
                <dd>{fact.dateBasis}</dd>
              </div>
              <div>
                <dt>Period start (included)</dt>
                <dd>{fact.scope.from}</dd>
              </div>
              <div>
                <dt>Period end (excluded)</dt>
                <dd>{fact.scope.to}</dd>
              </div>
              <div>
                <dt>Known as of</dt>
                <dd>{fact.scope.asOf}</dd>
              </div>
            </dl>
            <p>
              Average cents and ratios use the registered deterministic rounding
              rule. Shipping and tax are excluded from merchandise sales/result;
              issued refund value can include both.
            </p>
          </section>
          <h3>Contributing records · {references.length}</h3>
          <div className={styles.contributors}>
            {references.slice(page * 50, page * 50 + 50).map((ref) => (
              <button
                key={ref}
                type="button"
                disabled={!dashboardRecord(state.graph, ref)}
                onClick={() => {
                  evidenceScroll.current = dialog.current?.scrollTop ?? 0;
                  controller.openDashboardSource(ref);
                }}
              >
                <span>
                  {ref.split(":")[0]} ·{" "}
                  <small>{ref.slice(ref.indexOf(":") + 1)}</small>
                </span>
                <span aria-hidden="true">↗</span>
              </button>
            ))}
          </div>
          {!references.length && (
            <p className={styles.caption}>
              No contributing events in this period. A zero sum is distinct from
              an unavailable denominator.
            </p>
          )}
          {references.length > 50 && (
            <div className={styles.drawerTop}>
              <button
                type="button"
                disabled={page === 0}
                onClick={() => controller.setDashboardEvidencePage(page - 1)}
              >
                Previous records
              </button>
              <span>
                {page * 50 + 1}–{Math.min((page + 1) * 50, references.length)} /{" "}
                {references.length}
              </span>
              <button
                type="button"
                disabled={(page + 1) * 50 >= references.length}
                onClick={() => controller.setDashboardEvidencePage(page + 1)}
              >
                Next records
              </button>
            </div>
          )}
          <details className={styles.data}>
            <summary>
              Exclusions and unavailable records · {fact.excluded.length}
            </summary>
            {fact.excluded.length ? (
              fact.excluded.map((e) => (
                <p key={`${e.ref}:${e.reason}`}>
                  {e.ref} · {e.reason}
                </p>
              ))
            ) : (
              <p>
                No additional record exclusions for this registered figure. Its
                date/as-of and formula still define inclusion.
              </p>
            )}
          </details>
        </>
      ) : (
        <p className={styles.empty}>
          The period or catalogue changed. Choose a current figure; no old
          amount is attached to this selection.
        </p>
      )}
    </dialog>
  );
}
