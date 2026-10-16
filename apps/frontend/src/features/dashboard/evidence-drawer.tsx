"use client";
import { useEffect, useRef } from "react";
import { Icon } from "../../components/ui/icon";
import { useSession } from "../session/context";
import {
  resolveDashboardTarget,
  factDisplay,
  labelOf,
  PERIOD_LABELS,
} from "./model";
import type { DashboardModel } from "./model";
import { dashboardRecord } from "./state";
import { RecordDetail } from "./record-detail";
import {
  describeRecord,
  evidenceDate,
  explainFact,
} from "./evidence-presentation";
import { EvidenceFields, RecordLink } from "./evidence-ui";
import styles from "./dashboard.module.css";

export function EvidenceDrawer({ model }: { model: DashboardModel }) {
  const { controller, state } = useSession(),
    prefs = state.dashboard;
  const dialog = useRef<HTMLDialogElement>(null),
    body = useRef<HTMLDivElement>(null),
    heading = useRef<HTMLHeadingElement>(null),
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
    evidenceScroll.current = 0;
    if (body.current) body.current.scrollTop = 0;
    if (dialog.current?.open) heading.current?.focus({ preventScroll: true });
  }, [prefs.target]);
  useEffect(() => {
    if (dialog.current?.open) {
      if (body.current)
        body.current.scrollTop = prefs.source ? 0 : evidenceScroll.current;
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
  const rememberScroll = () => {
    evidenceScroll.current = body.current?.scrollTop ?? 0;
  };
  const fact = selected?.fact,
    references = fact?.contributors ?? [];
  const currentBalance =
    fact &&
    [
      "awaiting_fulfilment",
      "open_returns",
      "available_stock",
      "stockouts",
      "low_stock",
      "inventory_value",
    ].includes(fact.factId);
  const page = Math.min(
    prefs.page,
    Math.max(0, Math.ceil(references.length / 50) - 1),
  );
  const visibleReferences = references.slice(page * 50, page * 50 + 50);
  const dayTarget = prefs.target?.kind === "day" ? prefs.target : null;
  const day = dayTarget
    ? model.days.find((d) => d.day === dayTarget.day)
    : undefined;
  const productTarget = prefs.target?.kind === "product" ? prefs.target : null;
  const product = productTarget
    ? model.products.find((p) => p.productId === productTarget.productId)
    : undefined;
  const source = prefs.source
    ? dashboardRecord(state.graph, prefs.source)
    : null;
  const sourceInfo = source ? describeRecord(state.graph, source) : null;
  const title =
    day && fact ? labelOf(fact) : (selected?.label ?? "Selection unavailable");
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
      <header className={styles.evidenceHeader}>
        <div>
          <span className={styles.evidenceEyebrow}>
            {prefs.source ? "Contributing record" : "Behind the number"}
          </span>
          <h2 id="dashboard-evidence-heading" ref={heading} tabIndex={-1}>
            {prefs.source
              ? sourceInfo
                ? sourceInfo.kind + " details"
                : "Record unavailable"
              : title}
          </h2>
        </div>
        <button
          type="button"
          className={styles.evidenceClose}
          aria-label="Close evidence"
          title="Close evidence"
          onClick={() => controller.closeDashboardEvidence()}
        >
          <Icon name="close" />
        </button>
      </header>
      <div className={styles.evidenceBody} ref={body}>
        {prefs.source && (
          <>
            <button
              className={styles.evidenceBack}
              type="button"
              onClick={() => controller.openDashboardSource(null)}
            >
              ← Back to {title}
            </button>
            <RecordDetail key={prefs.source} reference={prefs.source} />
          </>
        )}
        <div key={JSON.stringify(prefs.target)} hidden={Boolean(prefs.source)}>
          {fact ? (
            <>
              <section
                className={styles.evidenceHero}
                aria-label="Figure summary"
              >
                <span className={styles.evidenceBadge}>
                  {currentBalance
                    ? "Current balance"
                    : fact.factId === "sell_through"
                      ? "Demo to date"
                      : day
                        ? evidenceDate(day.day, false)
                        : prefs.target?.kind === "comparison"
                          ? "Previous period"
                          : PERIOD_LABELS[prefs.period]}
                </span>
                <strong className={styles.evidenceValue}>
                  {factDisplay(fact)}
                </strong>
                <p>{explainFact(fact)}</p>
                <small>
                  {currentBalance || fact.factId === "sell_through" ? (
                    <>As of {evidenceDate(fact.scope.asOf)}</>
                  ) : (
                    <>
                      {evidenceDate(fact.scope.from, false)} →{" "}
                      {evidenceDate(fact.scope.to, false)} · UTC
                    </>
                  )}
                </small>
              </section>
              {fact.reason && <p className={styles.empty}>{fact.reason}</p>}
              {day && (
                <div
                  className={styles.evidenceRelated}
                  aria-label="Other figures for this day"
                >
                  {(
                    [
                      "net_sales",
                      "included_orders",
                      "aov",
                      "operating_result",
                    ] as const
                  ).map((id) => {
                    const related = day.registry.find((f) => f.factId === id)!;
                    return (
                      <button
                        key={id}
                        type="button"
                        aria-pressed={fact.factId === id}
                        onClick={() =>
                          controller.openDashboardEvidence({
                            kind: "day",
                            day: day.day,
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
              {product && (
                <div
                  className={styles.evidenceRelated}
                  aria-label="Other garment figures"
                >
                  <button
                    type="button"
                    aria-pressed={fact.factId === "product_net_contribution"}
                    onClick={() =>
                      controller.openDashboardEvidence({
                        kind: "product",
                        productId: product.productId,
                        factId: "product_net_contribution",
                      })
                    }
                  >
                    <span>Net sales contribution</span>
                    <strong>{factDisplay(product.fact)}</strong>
                  </button>
                  <button
                    type="button"
                    aria-pressed={fact.factId === "net_units"}
                    onClick={() =>
                      controller.openDashboardEvidence({
                        kind: "product",
                        productId: product.productId,
                        factId: "net_units",
                      })
                    }
                  >
                    <span>Net units after cancellation / receipt</span>
                    <strong>{factDisplay(product.units)}</strong>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      rememberScroll();
                      controller.openDashboardSource(
                        "product:" + product.productId,
                      );
                    }}
                  >
                    <span>Explore the current garment</span>
                    <Icon name="garment" />
                  </button>
                </div>
              )}
              <section
                className={styles.evidenceRecords}
                aria-labelledby="evidence-records-heading"
              >
                <div className={styles.evidenceSectionTitle}>
                  <h3 id="evidence-records-heading">
                    Records behind this figure
                  </h3>
                  <span>{references.length}</span>
                </div>
                <p className={styles.evidenceHint}>
                  Open a record to see its garments, amounts and linked
                  activity.
                </p>
                <div className={styles.contributors}>
                  {visibleReferences.map((reference) => (
                    <RecordLink
                      key={reference}
                      reference={reference}
                      onOpen={rememberScroll}
                    />
                  ))}
                </div>
                {!references.length && (
                  <p className={styles.empty}>
                    No linked records for this figure. A zero value is different
                    from an unavailable denominator.
                  </p>
                )}
                {references.length > 50 && (
                  <nav
                    className={styles.evidencePagination}
                    aria-label="Contributing record pages"
                  >
                    <button
                      type="button"
                      disabled={page === 0}
                      onClick={() =>
                        controller.setDashboardEvidencePage(page - 1)
                      }
                    >
                      ← Previous
                    </button>
                    <span>
                      {page * 50 + 1}–
                      {Math.min((page + 1) * 50, references.length)} of{" "}
                      {references.length}
                    </span>
                    <button
                      type="button"
                      disabled={(page + 1) * 50 >= references.length}
                      onClick={() =>
                        controller.setDashboardEvidencePage(page + 1)
                      }
                    >
                      Next →
                    </button>
                  </nav>
                )}
              </section>
              <details className={styles.evidencePrecision}>
                <summary>Calculation & exact scope</summary>
                <div className={styles.precisionContent}>
                  <h3>How this is calculated</h3>
                  <p className={styles.evidenceFormula}>{fact.formula}</p>
                  <EvidenceFields
                    items={[
                      [
                        "Exact numerator",
                        fact.numerator.toLocaleString("en-US") +
                          " " +
                          (fact.unit === "usd-cents"
                            ? "USD cents"
                            : fact.unit === "basis-points"
                              ? "count or underlying amount"
                              : fact.unit === "rating-hundredths"
                                ? "rating hundredths"
                                : "units"),
                      ],
                      [
                        "Denominator",
                        fact.denominator?.toLocaleString("en-US") ??
                          "None · Exact sum/count",
                      ],
                      ["Date basis", fact.dateBasis],
                      ["Period start (included)", fact.scope.from],
                      ["Period end (excluded)", fact.scope.to],
                      ["Known as of", fact.scope.asOf],
                      ["Record revision", fact.revision],
                    ]}
                  />
                  <p className={styles.evidenceHint}>
                    Average cents and ratios use the registered deterministic
                    rounding rule. Shipping and tax are excluded from
                    merchandise sales/result; issued refund value can include
                    both.
                  </p>
                  <p className={styles.evidenceHint}>
                    Updated from your current records. Costs, seeded traffic,
                    buyers and feedback are disclosed demo inputs; no real
                    payment or shipping occurs.
                  </p>
                  <h3>Exact references on this page</h3>
                  <ul className={styles.exactReferences}>
                    {visibleReferences.map((reference) => (
                      <li key={reference}>
                        <code>{reference}</code>
                      </li>
                    ))}
                  </ul>
                </div>
              </details>
              <details className={styles.evidencePrecision}>
                <summary>
                  Exclusions & unavailable records{" "}
                  <span>{fact.excluded.length}</span>
                </summary>
                <div className={styles.precisionContent}>
                  {fact.excluded.length ? (
                    fact.excluded.map((e) => (
                      <div
                        className={styles.excludedRecord}
                        key={e.ref + ":" + e.reason}
                      >
                        <RecordLink reference={e.ref} onOpen={rememberScroll} />
                        <p>{e.reason}</p>
                        <code>{e.ref}</code>
                      </div>
                    ))
                  ) : (
                    <p className={styles.evidenceHint}>
                      No additional record exclusions for this figure. Its exact
                      date scope and formula still define inclusion.
                    </p>
                  )}
                </div>
              </details>
            </>
          ) : (
            <p className={styles.empty}>
              The period or catalogue changed. Choose a current figure; no old
              amount is attached to this selection.
            </p>
          )}
        </div>
      </div>
      <footer className={styles.evidenceFooter}>
        <span /> Demo records · No actual payment or shipment
      </footer>
    </dialog>
  );
}
