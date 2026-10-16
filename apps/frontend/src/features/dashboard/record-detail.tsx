"use client";
import { CATEGORY_LABELS } from "@retailor/contracts/product";
import { formatUsd } from "@retailor/commerce/money";
import { exactProduct } from "@retailor/commerce/allocation";
import { stockOf, orderFinancialState } from "@retailor/commerce/selectors";
import { useSession } from "../session/context";
import { GarmentImage } from "../storefront/gallery";
import { dashboardRecord } from "./state";
import { describeRecord, readable } from "./evidence-presentation";
import { EvidenceDate, EvidenceFields, RecordLink } from "./evidence-ui";
import styles from "./dashboard.module.css";

export function RecordDetail({ reference }: { reference: string }) {
  const { state, controller } = useSession(),
    graph = state.graph;
  const resolved = dashboardRecord(graph, reference);
  if (!resolved)
    return (
      <p className={styles.empty}>
        This record is no longer available in the current demo. Go back to the
        figure to choose a current record.
      </p>
    );
  const info = describeRecord(graph, resolved),
    record = resolved.record;
  const sourceOrigin =
    resolved.kind === "line"
      ? resolved.origin
      : "origin" in record
        ? record.origin
        : undefined;
  const origin =
    sourceOrigin === "seeded_scenario"
      ? "Demo history"
      : sourceOrigin
        ? "Your demo activity"
        : "Current catalogue · Demo inputs";
  const link = (ref: string, label?: string) => (
    <RecordLink reference={ref} {...(label ? { label } : {})} />
  );
  return (
    <article className={styles.recordDetail}>
      <div className={styles.recordSummary}>
        <span className={styles.evidenceBadge}>{origin}</span>
        <div className={styles.recordSummaryTitle}>
          <h3>{info.title}</h3>
          {info.value && (
            <div className={styles.recordHeadlineValue}>
              <strong>{info.value}</strong>
              <small>{info.valueLabel}</small>
            </div>
          )}
        </div>
        <p>
          {info.detail}
          {info.at && (
            <>
              {" "}
              · <EvidenceDate value={info.at} />
            </>
          )}
        </p>
      </div>
      {(() => {
        switch (resolved.kind) {
          case "order": {
            const o = resolved.record;
            return (
              <>
                <EvidenceFields
                  items={[
                    ["Fulfilment", readable(o.state)],
                    ["Refund status", orderFinancialState(graph, o.id)],
                  ]}
                />
                <details className={styles.evidencePrecision}>
                  <summary>Order amount breakdown</summary>
                  <div className={styles.precisionContent}>
                    <EvidenceFields
                      items={[
                        ["Merchandise", formatUsd(o.merchandise)],
                        ["Discount", formatUsd(o.discount)],
                        ["Delivery", formatUsd(o.delivery)],
                        ["Tax", formatUsd(o.tax)],
                        ["Recorded total", formatUsd(o.total)],
                      ]}
                    />
                  </div>
                </details>
                <section className={styles.recordSection}>
                  <h3>Garments in this order</h3>
                  <p className={styles.evidenceHint}>
                    These are the details captured when the order was placed.
                  </p>
                  {o.lines.map((l) => (
                    <div className={styles.snapshotItem} key={l.id}>
                      <div className={styles.snapshotHeading}>
                        <div>
                          <strong>{l.title}</strong>
                          <small>
                            {l.colour} · {l.size} · Quantity {l.quantity}
                          </small>
                        </div>
                        <strong>
                          {formatUsd(exactProduct(l.quantity, l.unitPrice))}
                        </strong>
                      </div>
                      <EvidenceFields
                        items={[
                          ["Price per item", formatUsd(l.unitPrice)],
                          ["Captured cost per item", formatUsd(l.unitCost)],
                        ]}
                      />
                      <div className={styles.recordLinks}>
                        {link("line:" + l.id, "Inspect historical item")}
                        {link("product:" + l.productId, "View current garment")}
                      </div>
                    </div>
                  ))}
                </section>
                <section className={styles.recordSection}>
                  <h3>Related records</h3>
                  <div className={styles.recordLinks}>
                    {o.buyerId && link("buyer:" + o.buyerId)}
                    {o.trafficId && link("traffic:" + o.trafficId)}
                    {graph.refunds
                      .filter((r) => r.orderId === o.id)
                      .map((r) => (
                        <RecordLink key={r.id} reference={"refund:" + r.id} />
                      ))}
                  </div>
                </section>
              </>
            );
          }
          case "line": {
            const l = resolved.record;
            return (
              <>
                <EvidenceFields
                  items={[
                    ["Colour", l.colour],
                    ["Size", l.size],
                    ["Quantity", l.quantity],
                    ["Recorded price per item", formatUsd(l.unitPrice)],
                    ["Captured cost per item", formatUsd(l.unitCost)],
                    [
                      "Net allocations per item",
                      l.unitNet.map(formatUsd).join(" · "),
                    ],
                  ]}
                />
                <p className={styles.evidenceHint}>
                  This historical snapshot and its discounted unit allocations
                  preserve the original transaction.
                </p>
                <div className={styles.recordLinks}>
                  {link("order:" + resolved.orderId, "View the order")}
                  {link("product:" + l.productId, "View current garment")}
                </div>
              </>
            );
          }
          case "product": {
            const p = resolved.record,
              photoId = p.imageIds.find((id) => controller.photos.view(id)),
              photo = photoId ? controller.photos.view(photoId) : undefined;
            return (
              <>
                <div className={styles.productEvidence}>
                  {photo && photoId ? (
                    <GarmentImage
                      photo={{ ...photo, id: photoId }}
                      title={p.title}
                      onFailure={(id) =>
                        controller.photos.reportUnavailable(id)
                      }
                    />
                  ) : (
                    <p className={styles.evidenceHint}>
                      Photo needs repair; no substitute is shown.
                    </p>
                  )}
                  <EvidenceFields
                    items={[
                      ["Category", CATEGORY_LABELS[p.category]],
                      [
                        "Store status",
                        p.archived
                          ? "Archived from shopping"
                          : "Offered in storefront",
                      ],
                    ]}
                  />
                </div>
                <section className={styles.recordSection}>
                  <h3>Size & colour options</h3>
                  <div className={styles.recordLinks}>
                    {p.variants.map((v) => (
                      <div className={styles.snapshotItem} key={v.id}>
                        {link("variant:" + v.id)}
                        <EvidenceFields
                          items={[
                            ["Future demo cost", formatUsd(v.unitCost)],
                            ["Current units", stockOf(graph, v.id)],
                          ]}
                        />
                      </div>
                    ))}
                  </div>
                </section>
              </>
            );
          }
          case "variant": {
            const v = resolved.record;
            return (
              <>
                <EvidenceFields
                  items={[
                    ["Colour", v.colour],
                    ["Size", v.size],
                    ["SKU", v.sku],
                    ["Status", v.archived ? "Archived" : "Active"],
                    ["Current stock", stockOf(graph, v.id) + " units"],
                    ["Opening stock", v.openingStock + " units"],
                    [
                      "Opening date",
                      <EvidenceDate key="opened" value={v.openedAt} />,
                    ],
                    ["Current price", formatUsd(v.price)],
                    ["Future demo cost", formatUsd(v.unitCost)],
                  ]}
                />
                <div className={styles.recordLinks}>
                  {link(
                    "product:" + resolved.productId,
                    "View current garment",
                  )}
                </div>
                <section className={styles.recordSection}>
                  <h3>Stock movements</h3>
                  <div className={styles.recordLinks}>
                    {graph.movements
                      .filter((m) => m.variantId === v.id)
                      .map((m) => (
                        <RecordLink key={m.id} reference={"movement:" + m.id} />
                      ))}
                  </div>
                </section>
              </>
            );
          }
          case "refund": {
            const r = resolved.record;
            return (
              <>
                <EvidenceFields
                  items={[
                    ["Issued", <EvidenceDate key="issued" value={r.at} />],
                    ["Delivery refunded", formatUsd(r.delivery)],
                    ["Tax refunded", formatUsd(r.tax)],
                  ]}
                />
                <section className={styles.recordSection}>
                  <h3>Refunded items</h3>
                  {r.lines.map((l) => (
                    <div className={styles.snapshotItem} key={l.lineId}>
                      {link("line:" + l.lineId)}
                      <EvidenceFields
                        items={[["Merchandise refunded", formatUsd(l.amount)]]}
                      />
                    </div>
                  ))}
                </section>
                <p className={styles.evidenceHint}>
                  A refund does not automatically restore stock or sold cost.
                </p>
                <div className={styles.recordLinks}>
                  {link("order:" + r.orderId, "View the order")}
                </div>
              </>
            );
          }
          case "return": {
            const r = resolved.record;
            return (
              <>
                <EvidenceFields
                  items={[
                    ["Status", readable(r.state)],
                    ["Reason", readable(r.reason)],
                  ]}
                />
                <ol className={styles.recordTimeline}>
                  {(
                    [
                      ["Requested", r.requestedAt],
                      ["Approved", r.approvedAt],
                      ["Received", r.receivedAt],
                      ["Restocked", r.restockedAt],
                      ["Closed", r.closedAt],
                    ] as const
                  ).map(([label, at]) => (
                    <li key={label} data-reached={Boolean(at)}>
                      <strong>{label}</strong>
                      <EvidenceDate value={at} empty="Not yet" />
                    </li>
                  ))}
                </ol>
                <section className={styles.recordSection}>
                  <h3>Returned items</h3>
                  {r.lines.map((l) => (
                    <div className={styles.snapshotItem} key={l.lineId}>
                      {link("line:" + l.lineId)}
                      <EvidenceFields
                        items={[
                          [
                            "Physical units",
                            l.units.map((u) => u + 1).join(", "),
                          ],
                          [
                            "Inspected restockable units",
                            l.restockable.map((u) => u + 1).join(", ") ||
                              "None",
                          ],
                        ]}
                      />
                    </div>
                  ))}
                </section>
                <p className={styles.evidenceHint}>
                  Receiving a return does not issue a refund. Only inspected,
                  eligible restock reverses sold cost.
                </p>
                <div className={styles.recordLinks}>
                  {link("order:" + r.orderId, "View the order")}
                </div>
              </>
            );
          }
          case "expense": {
            const e = resolved.record;
            return (
              <>
                <EvidenceFields
                  items={[
                    ["Category", readable(e.category)],
                    ["Entry type", readable(e.kind)],
                    ["Posted", <EvidenceDate key="posted" value={e.at} />],
                    ["Note", e.note || "No note"],
                  ]}
                />
                {e.parentId && (
                  <div className={styles.recordLinks}>
                    {link("expense:" + e.parentId, "View original expense")}
                  </div>
                )}
                <p className={styles.evidenceHint}>
                  Posted financial history. Corrections and voids remain linked
                  to the original entry.
                </p>
              </>
            );
          }
          case "movement": {
            const m = resolved.record;
            return (
              <>
                <EvidenceFields
                  items={[
                    ["Movement", readable(m.kind)],
                    ["Signed units", m.units],
                    ["Recorded", <EvidenceDate key="at" value={m.at} />],
                    ["Reason", m.reason],
                  ]}
                />
                <div className={styles.recordLinks}>
                  {link("variant:" + m.variantId)}
                  {m.lineId && link("line:" + m.lineId)}
                </div>
                <p className={styles.evidenceHint}>
                  Current stock includes this linked movement once.
                </p>
              </>
            );
          }
          case "writeoff": {
            const w = resolved.record;
            return (
              <>
                <EvidenceFields
                  items={[
                    ["Recorded", <EvidenceDate key="at" value={w.at} />],
                    ["Units written off", w.quantity],
                    ["Captured unit cost", formatUsd(w.unitCost)],
                    [
                      "Total cost",
                      formatUsd(exactProduct(w.quantity, w.unitCost)),
                    ],
                    ["Reason", w.reason],
                  ]}
                />
                <div className={styles.recordLinks}>
                  {link("variant:" + w.variantId)}
                </div>
                <p className={styles.evidenceHint}>
                  Sold damaged returns retain sold cost; they do not create a
                  second warehouse writeoff.
                </p>
              </>
            );
          }
          case "cancellation": {
            const c = resolved.record;
            return (
              <>
                <EvidenceFields
                  items={[
                    ["Cancelled", <EvidenceDate key="at" value={c.at} />],
                    ["Merchandise reversed", formatUsd(c.merchandise)],
                    ["Delivery reversed", formatUsd(c.delivery)],
                    ["Tax reversed", formatUsd(c.tax)],
                  ]}
                />
                <div className={styles.recordLinks}>
                  {link("order:" + c.orderId, "View the order")}
                </div>
              </>
            );
          }
          case "traffic": {
            const t = resolved.record;
            return (
              <>
                <EvidenceFields
                  items={[
                    ["Visitor role", readable(t.actor)],
                    [
                      "Latest observation",
                      <EvidenceDate key="last" value={t.lastAt} />,
                    ],
                  ]}
                />
                <ol className={styles.recordTimeline}>
                  {(
                    [
                      ["Visit started", t.startedAt],
                      ["Viewed a garment", t.engagedAt],
                      ["Added to bag", t.bagAt],
                      ["Reached checkout", t.checkoutAt],
                    ] as const
                  ).map(([label, at]) => (
                    <li key={label} data-reached={Boolean(at)}>
                      <strong>{label}</strong>
                      <EvidenceDate value={at} empty="Not reached" />
                    </li>
                  ))}
                </ol>
                <p className={styles.evidenceHint}>
                  One eligible shopper visit counts once. Owner and designer
                  visits are excluded.
                </p>
                <div className={styles.recordLinks}>
                  {t.orderIds.map((id) => (
                    <RecordLink key={id} reference={"order:" + id} />
                  ))}
                  {t.productIds.map((id) => (
                    <RecordLink key={id} reference={"product:" + id} />
                  ))}
                </div>
              </>
            );
          }
          case "buyer": {
            const b = resolved.record;
            return (
              <>
                <p className={styles.evidenceHint}>
                  This is a fictional customer. No real contact information is
                  collected. New and repeat cohorts use known, non-cancelled
                  order dates.
                </p>
                <section className={styles.recordSection}>
                  <h3>Linked orders</h3>
                  <div className={styles.recordLinks}>
                    {graph.orders
                      .filter((o) => o.buyerId === b.id)
                      .map((o) => (
                        <RecordLink key={o.id} reference={"order:" + o.id} />
                      ))}
                  </div>
                </section>
              </>
            );
          }
          case "feedback": {
            const f = resolved.record;
            return (
              <>
                <blockquote className={styles.evidenceQuote}>
                  {f.comment || "No written comment."}
                </blockquote>
                <div className={styles.recordLinks}>
                  {link("product:" + f.productId)}
                  {f.orderId && link("order:" + f.orderId)}
                </div>
                <p className={styles.evidenceHint}>
                  This authored demo review is part of a small fictional sample;
                  it does not predict demand or conversion.
                </p>
              </>
            );
          }
        }
      })()}
      <details className={styles.evidencePrecision}>
        <summary>Record references & exact dates</summary>
        <EvidenceFields
          items={[
            ["Reference", <code key="reference">{reference}</code>],
            ["Origin", sourceOrigin ?? "Current catalogue identity"],
            ...(resolved.kind === "line"
              ? [
                  ["Historical placement", resolved.placedAt] as const,
                  ["Order reference", resolved.orderId] as const,
                ]
              : []),
            ...Object.entries(record)
              .filter(
                ([key, value]) =>
                  typeof value === "string" &&
                  (key === "id" || key.endsWith("Id") || key.endsWith("At")),
              )
              .map(
                ([key, value]) =>
                  [
                    readable(key.replace(/([a-z])([A-Z])/gu, "$1 $2")),
                    <code key={key}>{String(value)}</code>,
                  ] as const,
              ),
          ]}
        />
      </details>
    </article>
  );
}
