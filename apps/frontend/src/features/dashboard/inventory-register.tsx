"use client";
import type { Product, Variant } from "@retailor/contracts/product";
import { formatUsd } from "@retailor/commerce/money";
import { stockOf } from "@retailor/commerce/selectors";
import { useSession } from "../session/context";
import { Button } from "../../components/ui/button";
import { RecordPhoto, MetricStrip } from "./record-photo";
import { inventorySummary, titleCase } from "./register-model";
import styles from "./registers.module.css";
export function InventoryRegister({
  rows,
}: {
  rows: readonly { p: Product; v: Variant }[];
}) {
  const { controller, state, ownerResult } = useSession();
  const summary = inventorySummary(state.graph);
  return (
    <>
      <MetricStrip
        items={[
          { label: "Units on hand", value: summary.units },
          {
            label: "Low stock options",
            value: summary.low,
            note: "Two units or fewer",
          },
          {
            label: "Estimated stock value",
            value: formatUsd(summary.value),
            note: "At current unit cost",
          },
        ]}
      />
      <div className={styles.inventoryGrid}>
        {rows.map(({ p, v }) => {
          const stock = stockOf(state.graph, v.id),
            archived = p.archived || v.archived;
          return (
            <article
              className={styles.inventoryCard}
              key={v.id}
              data-updated={
                ownerResult?.effect.stock.some(
                  (change) => change.variantId === v.id,
                ) || undefined
              }
            >
              <div className={styles.identity}>
                <RecordPhoto product={p} colour={v.colour} />
                <div>
                  <h3>{p.title}</h3>
                  <p>
                    {v.colour} · {v.size}
                  </p>
                  <small>{v.sku}</small>
                </div>
                <span
                  className={styles.status}
                  data-attention={(!archived && stock <= 2) || undefined}
                >
                  {archived
                    ? "Archived"
                    : stock === 0
                      ? "Out of stock"
                      : stock <= 2
                        ? "Low stock"
                        : "In stock"}
                </span>
              </div>
              <dl className={styles.inventoryNumbers}>
                <div>
                  <dt>Available units</dt>
                  <dd>
                    {stock}
                    <small> units</small>
                  </dd>
                </div>
                <div>
                  <dt>Unit cost</dt>
                  <dd>{formatUsd(v.unitCost)}</dd>
                </div>
                <div>
                  <dt>Stock value</dt>
                  <dd>{formatUsd(v.unitCost * stock)}</dd>
                </div>
              </dl>
              <div className={styles.rowActions}>
                <Button
                  variant="secondary"
                  onClick={() =>
                    controller.openOwnerOperation("adjustStock", v.id)
                  }
                >
                  Adjust stock
                </Button>
                <Button
                  variant="quiet"
                  onClick={() =>
                    controller.openOwnerOperation("setUnitCost", v.id)
                  }
                >
                  Change cost
                </Button>
                <Button
                  variant="quiet"
                  onClick={() =>
                    controller.openOwnerOperation("writeoffStock", v.id)
                  }
                >
                  Write off units
                </Button>
              </div>
              <details className={styles.history}>
                <summary>Stock history</summary>
                <p>Opening inventory: {v.openingStock} units</p>
                {state.graph.movements
                  .filter((m) => m.variantId === v.id)
                  .map((m) => (
                    <div key={m.id}>
                      <strong>
                        {m.units > 0 ? "+" : ""}
                        {m.units} units · {titleCase(m.kind)}
                      </strong>
                      <p>{m.reason}</p>
                      <small>
                        {new Date(m.at).toLocaleDateString("en-US", {
                          timeZone: "UTC",
                        })}{" "}
                        ·{" "}
                        {m.origin === "seeded_scenario"
                          ? "Synthetic shop activity"
                          : "Local demo action"}{" "}
                        · {m.id} · Source {m.sourceId}
                      </small>
                    </div>
                  ))}
              </details>
            </article>
          );
        })}
      </div>
      {!rows.length && (
        <p className={styles.empty}>No garment options match this search.</p>
      )}
    </>
  );
}
