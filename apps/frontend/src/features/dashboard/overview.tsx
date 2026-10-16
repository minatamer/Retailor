"use client";
import { CATEGORY_LABELS } from "@retailor/contracts/product";
import { useMemo } from "react";
import { useSession } from "../session/context";
import { dashboardModel, PERIOD_LABELS, factDisplay, labelOf } from "./model";
import { SalesTrend, RankedBars } from "./charts";
import type { ChartMark } from "./charts";
import { GarmentImage } from "../storefront/gallery";
import { EvidenceDrawer } from "./evidence-drawer";
import styles from "./dashboard.module.css";
export function DashboardOverview() {
  const { state, controller } = useSession(),
    period = state.dashboard.period;
  const model = useMemo(
    () => dashboardModel(state.graph, period),
    [state.graph, period],
  );
  const headlines = model.registry.filter((f) =>
    ["net_sales", "included_orders", "aov", "operating_result"].includes(
      f.factId,
    ),
  );
  const productMarks: ChartMark[] = model.products.map((row) => {
    const p = state.graph.products.find((p) => p.id === row.productId)!,
      photoId = p.imageIds.find((id) => controller.photos.view(id)),
      photo = photoId ? controller.photos.view(photoId) : undefined;
    return {
      key: p.id,
      label: `${p.title} · ${factDisplay(row.units)} net units${p.archived ? " · Archived" : ""}`,
      fact: row.fact,
      target: { kind: "product", productId: p.id },
      extra:
        photo && photoId ? (
          <GarmentImage
            photo={{ ...photo, id: photoId }}
            title={p.title}
            onFailure={(id) => controller.photos.reportUnavailable(id)}
          />
        ) : (
          <span>Photo needs repair</span>
        ),
    };
  });
  const funnelMarks: ChartMark[] = (
    [
      "eligible_sessions",
      "engagement_rate",
      "bag_rate",
      "checkout_rate",
      "conversion_rate",
    ] as const
  ).map((id) => {
    const fact = model.registry.find((f) => f.factId === id)!;
    return {
      key: id,
      label: labelOf(fact),
      fact,
      target: { kind: "metric", factId: id },
      magnitude: fact.numerator,
      magnitudeLabel: "eligible visits",
    };
  });
  const inventoryMarks: ChartMark[] = model.inventory
    .filter((r) => r.active)
    .map<ChartMark>((r) => {
      const p = state.graph.products.find((p) => p.id === r.productId)!,
        v = p.variants.find((v) => v.id === r.variantId)!;
      return {
        key: v.id,
        label: `${p.title} · ${v.size} · ${v.colour} · ${v.sku}${r.fact.numerator <= 2 ? " · Stock attention" : ""}`,
        fact: r.fact,
        target: { kind: "inventory", variantId: v.id },
      };
    })
    .sort((a, b) => a.fact.numerator - b.fact.numerator);
  return (
    <div className={styles.overview}>
      <div className={styles.scope} data-tailor-target="owner-scope">
        <div
          className={styles.segmented}
          role="group"
          aria-label="Dashboard period"
        >
          {(["7days", "28days", "all"] as const).map((p) => (
            <button
              key={p}
              type="button"
              aria-pressed={period === p}
              onClick={() => controller.setDashboardPeriod(p)}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
      </div>
      {model.comparison.registry && (
        <button
          type="button"
          className={styles.sourceLink}
          onClick={() =>
            controller.openDashboardEvidence({
              kind: "comparison",
              factId: "net_sales",
            })
          }
        >
          Previous period net sales:{" "}
          {factDisplay(
            model.comparison.registry.find((f) => f.factId === "net_sales")!,
          )}{" "}
          · Inspect basis ↗
        </button>
      )}
      <div className={styles.kpis} data-tailor-target="owner-kpis">
        {headlines.map((fact) => (
          <button
            type="button"
            key={fact.factId}
            onClick={() =>
              controller.openDashboardEvidence({
                kind: "metric",
                factId: fact.factId,
              })
            }
          >
            <span>
              {labelOf(fact)} <i aria-hidden="true">↗</i>
            </span>
            <strong>{factDisplay(fact)}</strong>
            <small>
              {fact.reason ??
                (fact.factId === "aov"
                  ? "Before refunds · Average cents rounded half away from zero"
                  : fact.factId === "operating_result"
                    ? "Sales − sold cost − expenses − inventory loss"
                    : fact.factId === "included_orders"
                      ? "Order-date period · Currently non-cancelled"
                      : "Merchandise only · Shipping/tax excluded")}
            </small>
          </button>
        ))}
      </div>
      <div
        className={styles.operations}
        aria-label="Current operation attention"
      >
        {model.registry
          .filter((f) =>
            [
              "awaiting_fulfilment",
              "open_returns",
              "low_stock",
              "refund_value",
            ].includes(f.factId),
          )
          .map((fact) => (
            <button
              key={fact.factId}
              type="button"
              onClick={() =>
                controller.openDashboardEvidence({
                  kind: "metric",
                  factId: fact.factId,
                })
              }
            >
              <strong>{factDisplay(fact)}</strong>
              <span>{labelOf(fact)}</span>
              <small>
                {fact.factId === "refund_value"
                  ? "Issued in selected period"
                  : "Current as-of balance"}
              </small>
            </button>
          ))}
      </div>
      <div data-tailor-target="owner-trend">
        <SalesTrend model={model} />
      </div>
      <div className={styles.panelGrid}>
        <div className={styles.panelColumn}>
          <RankedBars
            title="Which garments contribute?"
            note="Ranked net sales by actual product identity. Net units subtract cancellations and physical receipts, independently of refunds. Current names/photos link to immutable historical snapshots."
            marks={productMarks}
            limit={6}
          />
          <RankedBars
            title="Which options need attention?"
            note="Lowest available active options first. Two units or fewer needs attention; balances are current as-of, independent of the sales period. Open actual movements from each option."
            marks={inventoryMarks}
            ordered
            limit={8}
          />
          <RankedBars
            title="Who are the fictional buyers?"
            note="Distinct known non-cancelled-order buyers in this period. Repeat means a prior non-cancelled order before period start. Unknown IDs are excluded explicitly; no customer PII is collected."
            marks={(["new_buyer_share", "repeat_buyer_share"] as const).map(
              (id) => {
                const fact = model.registry.find((f) => f.factId === id)!;
                return {
                  key: id,
                  label: labelOf(fact),
                  fact,
                  target: { kind: "metric", factId: id },
                  magnitude: fact.numerator,
                  magnitudeLabel: "fictional buyers",
                };
              },
            )}
            ordered
          />
          <RankedBars
            title="What explains the demo result?"
            note="Event-dated merchandise, sold-cost snapshots, operating expenses and available-stock loss. Negative cost reversals or corrections remain signed. This is simulated performance, not bank balance or cash flow."
            marks={(
              [
                "net_sales",
                "sold_cost",
                "expenses",
                "inventory_loss",
                "operating_result",
              ] as const
            ).map((id) => {
              const fact = model.registry.find((f) => f.factId === id)!;
              return {
                key: id,
                label: labelOf(fact),
                fact,
                target: { kind: "metric", factId: id },
              };
            })}
            ordered
          />
        </div>
        <div className={styles.panelColumn}>
          <RankedBars
            title="Where do demo visits reach?"
            note="One nested session-start cohort, observed through as-of. Fictional seeded visits plus limited local shopper visits; owner/designer actions are excluded. Counts are unique visits, not clicks or orders."
            marks={funnelMarks}
            ordered
          />
          <RankedBars
            title="What is the category mix?"
            note="Current catalogue categories group exact historical product contributions. Signed contributions use bars around zero; a category rename does not rewrite old order snapshots."
            marks={model.categories.map((r) => ({
              key: r.category,
              label: CATEGORY_LABELS[r.category],
              fact: r.fact,
              target: { kind: "category", category: r.category },
            }))}
          />
          <RankedBars
            title="Where does operating spend go?"
            note="Posted demo expenses and linked signed corrections/voids, by posting date. Negative adjustments remain negative; inventory purchases are not charged again as operating spend."
            marks={model.expenses.map((r) => ({
              key: r.category,
              label: r.category,
              fact: r.fact,
              target: { kind: "expense", category: r.category },
            }))}
          />
          <RankedBars
            title="Why were clothes received back?"
            note="Recorded reasons for physical units actually received in this period. Requested returns and financial refunds are separate; this fictional small sample does not predict demand."
            marks={model.returnReasons.map((r) => ({
              key: r.reason,
              label: r.reason.replaceAll("-", " "),
              fact: r.fact,
              target: { kind: "return-reason", reason: r.reason },
            }))}
          />
        </div>
      </div>
      <section
        className={styles.metricGroup}
        aria-labelledby="store-health-heading"
      >
        <div className={styles.panelHeading}>
          <h3 id="store-health-heading">Store health</h3>
        </div>
        <div className={styles.relatedFacts}>
          {(
            [
              "gross_margin",
              "result_margin",
              "refunded_order_rate",
              "returned_unit_rate",
              "average_rating",
            ] as const
          ).map((id) => {
            const fact = model.registry.find((f) => f.factId === id)!;
            return (
              <button
                key={id}
                type="button"
                onClick={() =>
                  controller.openDashboardEvidence({
                    kind: "metric",
                    factId: id,
                  })
                }
              >
                <span>{labelOf(fact)}</span>
                <strong>{factDisplay(fact)}</strong>
                <small>
                  {fact.reason ??
                    `${fact.numerator} / ${fact.denominator} registered basis`}
                </small>
              </button>
            );
          })}
        </div>
      </section>
      <EvidenceDrawer model={model} />
    </div>
  );
}
