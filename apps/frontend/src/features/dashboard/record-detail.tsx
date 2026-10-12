"use client";
import { formatUsd } from "@retailor/commerce/money";
import { exactProduct } from "@retailor/commerce/allocation";
import { stockOf, orderFinancialState } from "@retailor/commerce/selectors";
import { useSession } from "../session/context";
import { GarmentImage } from "../storefront/gallery";
import { dashboardRecord } from "./state";
import styles from "./dashboard.module.css";
export function RecordDetail({ reference }: { reference: string }) {
  const { state, controller } = useSession(),
    graph = state.graph,
    resolved = dashboardRecord(graph, reference);
  const link = (ref: string) => (
    <button
      type="button"
      className={styles.sourceLink}
      onClick={() => controller.openDashboardSource(ref)}
    >
      {ref.replace(":", " · ")} ↗
    </button>
  );
  const product = (id: string) => {
    const p = graph.products.find((p) => p.id === id);
    if (!p)
      return (
        <p>
          The current product is unavailable; the historical record remains.
        </p>
      );
    const photoId = p.imageIds.find((id) => controller.photos.view(id)),
      photo = photoId ? controller.photos.view(photoId) : undefined;
    return (
      <div className={styles.productDetail}>
        {photo && photoId ? (
          <GarmentImage
            photo={{ ...photo, id: photoId }}
            title={p.title}
            onFailure={(id) => controller.photos.reportUnavailable(id)}
          />
        ) : (
          <p>Photo needs repair; no substitute is shown.</p>
        )}
        <h4>{p.title}</h4>
        <p>
          Current garment · {p.category} ·{" "}
          {p.archived ? "Archived from shopping" : "Offered in storefront"}
        </p>
        {p.variants.map((v) => (
          <p key={v.id}>
            {link(`variant:${v.id}`)} {v.size} · {v.colour} ·{" "}
            {formatUsd(v.price)} current price · {formatUsd(v.unitCost)}{" "}
            disclosed future cost · {stockOf(graph, v.id)} current units
          </p>
        ))}
      </div>
    );
  };
  if (!resolved)
    return (
      <p>
        This reference is unavailable in the current scenario. The displayed
        facts have been recomputed; choose a current contributor.
      </p>
    );
  const r = resolved.record;
  const sourceOrigin =
    resolved.kind === "line"
      ? resolved.origin
      : "origin" in r
        ? r.origin
        : undefined;
  const origin = sourceOrigin
    ? sourceOrigin === "seeded_scenario"
      ? "Synthetic seeded history"
      : "Local demo action"
    : "Current catalogue identity; costs, options and stock are demo inputs";
  return (
    <article className={styles.recordDetail}>
      <p className={styles.caption}>
        {origin} · {reference}
        {resolved.kind === "line"
          ? ` · Historical placement ${resolved.placedAt}`
          : ""}
      </p>
      {(() => {
        switch (resolved.kind) {
          case "order": {
            const o = resolved.record;
            return (
              <>
                <h4>Historical placed order</h4>
                <p>
                  {o.placedAt} · {o.state} · {orderFinancialState(graph, o.id)}{" "}
                  · {o.actor}
                </p>
                <p>
                  Original merchandise {formatUsd(o.merchandise)} · discount{" "}
                  {formatUsd(o.discount)} · delivery {formatUsd(o.delivery)} ·
                  tax {formatUsd(o.tax)} · recorded total {formatUsd(o.total)}
                </p>
                {o.lines.map((l) => (
                  <div key={l.id}>
                    <p>
                      {l.title} · {l.size} · {l.colour} · {l.quantity} ×{" "}
                      {formatUsd(l.unitPrice)} · captured cost{" "}
                      {formatUsd(l.unitCost)} each
                    </p>
                    {link(`line:${l.id}`)}
                    {link(`product:${l.productId}`)}
                  </div>
                ))}
                {o.buyerId && link(`buyer:${o.buyerId}`)}
                {o.trafficId && link(`traffic:${o.trafficId}`)}
                {graph.refunds
                  .filter((r) => r.orderId === o.id)
                  .map((r) => (
                    <div key={r.id}>{link(`refund:${r.id}`)}</div>
                  ))}
              </>
            );
          }
          case "line": {
            const l = resolved.record;
            return (
              <>
                <h4>{l.title} · Historical line snapshot</h4>
                <p>
                  {l.size} · {l.colour} · {l.quantity} units · recorded{" "}
                  {formatUsd(l.unitPrice)} price / {formatUsd(l.unitCost)} cost
                  each
                </p>
                <p>
                  Discounted unit allocations:{" "}
                  {l.unitNet.map(formatUsd).join(", ")}. These preserve the
                  original transaction.
                </p>
                {link(`order:${resolved.orderId}`)}
                {link(`product:${l.productId}`)}
              </>
            );
          }
          case "product":
            return product(resolved.record.id);
          case "variant": {
            const v = resolved.record;
            return (
              <>
                <h4>{v.sku} · Current option</h4>
                <p>
                  {v.size} · {v.colour} · {v.archived ? "Archived" : "Active"}
                </p>
                <p>
                  Opening {v.openingStock} units from {v.openedAt} · current{" "}
                  {stockOf(graph, v.id)} units · {formatUsd(v.price)} price ·{" "}
                  {formatUsd(v.unitCost)} future demo cost.
                </p>
                {link(`product:${resolved.productId}`)}
                {graph.movements
                  .filter((m) => m.variantId === v.id)
                  .map((m) => (
                    <div key={m.id}>{link(`movement:${m.id}`)}</div>
                  ))}
              </>
            );
          }
          case "refund": {
            const r = resolved.record;
            return (
              <>
                <h4>Issued financial refund</h4>
                <p>
                  {r.at} · Delivery {formatUsd(r.delivery)} · Tax{" "}
                  {formatUsd(r.tax)}. No automatic stock/cost restoration.
                </p>
                {r.lines.map((l) => (
                  <div key={l.lineId}>
                    {link(`line:${l.lineId}`)}
                    <p>{formatUsd(l.amount)} merchandise refunded</p>
                  </div>
                ))}
                {link(`order:${r.orderId}`)}
              </>
            );
          }
          case "return": {
            const r = resolved.record;
            return (
              <>
                <h4>Physical return · {r.reason}</h4>
                <p>
                  {r.state} · Requested {r.requestedAt} · Received{" "}
                  {r.receivedAt ?? "Not received"} · Restocked{" "}
                  {r.restockedAt ?? "Not restocked"}
                </p>
                <p>
                  Physical receipt does not issue money. Only inspected eligible
                  restock reverses sold cost.
                </p>
                {r.lines.map((l) => (
                  <div key={l.lineId}>
                    {link(`line:${l.lineId}`)}
                    <p>
                      Physical units {l.units.map((u) => u + 1).join(", ")} ·
                      Restockable inspected units{" "}
                      {l.restockable.map((u) => u + 1).join(", ") || "None"}
                    </p>
                  </div>
                ))}
                {link(`order:${r.orderId}`)}
              </>
            );
          }
          case "expense": {
            const e = resolved.record;
            return (
              <>
                <h4>
                  {e.category} · {formatUsd(e.amount)}
                </h4>
                <p>
                  {e.at} · {e.kind} · {e.note}
                </p>
                {e.parentId && link(`expense:${e.parentId}`)}
                <p>
                  Posted financial history. Corrections/void remain linked and
                  inspectable.
                </p>
              </>
            );
          }
          case "movement": {
            const m = resolved.record;
            return (
              <>
                <h4>
                  {m.kind} · {m.units} signed units
                </h4>
                <p>
                  {m.at} · {m.reason}
                </p>
                {link(`variant:${m.variantId}`)}
                {m.lineId && link(`line:${m.lineId}`)}
                <p>
                  Linked source {m.sourceId}. Current stock includes this
                  movement once.
                </p>
              </>
            );
          }
          case "writeoff": {
            const w = resolved.record;
            return (
              <>
                <h4>Available-stock writeoff</h4>
                <p>
                  {w.at} · {w.quantity} units × {formatUsd(w.unitCost)} captured
                  cost = {formatUsd(exactProduct(w.quantity, w.unitCost))} ·{" "}
                  {w.reason}
                </p>
                {link(`variant:${w.variantId}`)}
                <p>
                  Sold damaged returns retain sold cost and do not become a
                  second warehouse writeoff.
                </p>
              </>
            );
          }
          case "cancellation": {
            const c = resolved.record;
            return (
              <>
                <h4>Cancellation reversal</h4>
                <p>
                  {c.at} · merchandise {formatUsd(c.merchandise)} · delivery{" "}
                  {formatUsd(c.delivery)} · tax {formatUsd(c.tax)}
                </p>
                {link(`order:${c.orderId}`)}
              </>
            );
          }
          case "traffic": {
            const t = resolved.record;
            return (
              <>
                <h4>Known demo visit</h4>
                <p>
                  {t.startedAt} start · {t.lastAt} latest observation ·{" "}
                  {t.actor}
                </p>
                <p>
                  Engagement {t.engagedAt ?? "Not reached"} · bag{" "}
                  {t.bagAt ?? "Not reached"} · checkout{" "}
                  {t.checkoutAt ?? "Not reached"}
                </p>
                <p>
                  One eligible shopper visit counts once. Owner/designer visits
                  are excluded.
                </p>
                {t.orderIds.map((id) => (
                  <div key={id}>{link(`order:${id}`)}</div>
                ))}
                {t.productIds.map((id) => (
                  <div key={id}>{link(`product:${id}`)}</div>
                ))}
              </>
            );
          }
          case "buyer": {
            const b = resolved.record;
            return (
              <>
                <h4>{b.label} · Fictional identity</h4>
                <p>
                  No real customer contact information is collected. New/repeat
                  cohorts use known non-cancelled order dates.
                </p>
                {graph.orders
                  .filter((o) => o.buyerId === b.id)
                  .map((o) => (
                    <div key={o.id}>{link(`order:${o.id}`)}</div>
                  ))}
              </>
            );
          }
          case "feedback": {
            const f = resolved.record;
            return (
              <>
                <h4>{f.rating} / 5 · Synthetic feedback</h4>
                <p>
                  {f.at} · {f.comment}
                </p>
                {link(`product:${f.productId}`)}
                {f.orderId && link(`order:${f.orderId}`)}
                <p>
                  This authored small sample does not prove demand or guaranteed
                  conversion.
                </p>
              </>
            );
          }
        }
      })()}
    </article>
  );
}
