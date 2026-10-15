"use client";
import { CATEGORY_LABELS } from "@retailor/contracts/product";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { ReactNode } from "react";
import { formatUsd } from "@retailor/commerce/money";
import {
  stockOf,
  refundable,
  orderFinancialState,
} from "@retailor/commerce/selectors";
import { exactSum } from "@retailor/commerce/allocation";
import { SCENARIO_LABELS } from "@retailor/commerce/scenarios";
import { Button } from "../../components/ui/button";
import { Icon } from "../../components/ui/icon";
import { useSession } from "../session/context";
import { FormShell } from "../operations/form-shell";
import { DashboardOverview } from "./overview";
import type { OwnerOperationType } from "../operations/state";
import { GarmentImage } from "../storefront/gallery";
import { OwnerNavigation, OWNER_VIEWS } from "./owner-navigation";
import { InventoryRegister } from "./inventory-register";
import { ExpenseRegister } from "./expense-register";
import { RecordPhoto, MetricStrip } from "./record-photo";
import { inventorySummary } from "./register-model";
import { StarRating } from "../storefront/reviews";
import { CurrencyPicker } from "../currency/picker";
import styles from "./owner-workspace.module.css";
export const utc = (value: string) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(new Date(value)) + " UTC";
function Source({ origin, at }: { origin: string; at?: string }) {
  return (
    <p className={styles.source}>
      {origin === "seeded_scenario"
        ? "Synthetic seeded history"
        : "Local demo action"}
      {at ? ` · ${utc(at)}` : ""}
    </p>
  );
}
export function OwnerWorkspace({ design }: { design: ReactNode }) {
  const {
    controller,
    state,
    ownerForm,
    ownerNotice,
    ownerNoticeTone,
    ownerSurface,
  } = useSession();
  const heading = useRef<HTMLHeadingElement>(null);
  const [collapsed, setCollapsed] = useState(false),
    [navigationOpen, setNavigationOpen] = useState(false);
  const drawerId = useId();
  const closeNavigation = useCallback(() => setNavigationOpen(false), []);
  useEffect(() => {
    if (
      !document.activeElement?.matches("input,textarea,[contenteditable=true]")
    )
      heading.current?.focus({ preventScroll: true });
  }, [state.ownerView]);
  const graph = state.graph,
    view = state.ownerView,
    search = state.ownerSearch.toLowerCase(),
    start = state.ownerPage * 20;
  const open = (type: OwnerOperationType, id?: string) =>
    controller.openOwnerOperation(type, id);
  const matches = (...values: string[]) =>
    values.join(" ").toLowerCase().includes(search);
  const visitProduct = (id: string) => {
    controller.browse({ page: "product", productId: id, variantId: null });
    controller.go("storefront");
  };
  const products = graph.products.filter((p) =>
      matches(p.title, p.category, p.id),
    ),
    orders = graph.orders.filter((o) =>
      matches(o.id, o.state, ...o.lines.map((l) => l.title)),
    ),
    inventory = graph.products
      .flatMap((p) => p.variants.map((v) => ({ p, v })))
      .filter(({ p, v }) => matches(p.title, v.size, v.colour, v.sku)),
    feedback = graph.feedback.filter((f) =>
      matches(
        f.id,
        graph.products.find((p) => p.id === f.productId)?.title ?? f.productId,
      ),
    );
  const count =
    view === "products"
      ? products.length
      : view === "orders"
        ? orders.length
        : view === "inventory"
          ? inventory.length
          : view === "feedback"
            ? feedback.length
            : 0;
  return (
    <section
      className={styles.owner}
      data-owner-collapsed={collapsed}
      aria-label="Owner workspace"
    >
      <OwnerNavigation
        collapsed={collapsed}
        onToggle={() => setCollapsed((value) => !value)}
        drawerId={drawerId}
        mobileOpen={navigationOpen}
        onClose={closeNavigation}
      />
      <div className={styles.content}>
        <header className={styles.header}>
          <button
            type="button"
            className={styles.menu}
            aria-label="Open navigation"
            aria-haspopup="dialog"
            aria-controls={drawerId}
            aria-expanded={navigationOpen}
            onClick={() => setNavigationOpen(true)}
          >
            <Icon name="menu" />
            <span>Navigation</span>
          </button>
        </header>
        <ScenarioReviewDialog />
        <div className={styles.layout}>
          <div
            className={styles.records}
            data-view={view}
            data-tailor-target="owner-records"
          >
            <div className={styles.titleRow}>
              <div>
                <span className={styles.eyebrow}>Your store</span>
                <h2 id="owner-register-heading" ref={heading} tabIndex={-1}>
                  {OWNER_VIEWS.find((v) => v.id === view)?.label}
                </h2>
              </div>
              {view === "products" ? (
                <Button onClick={() => open("createProduct")}>
                  Create a garment
                </Button>
              ) : view === "expenses" ? (
                <Button onClick={() => open("saveExpenseDraft")}>
                  Add expense
                </Button>
              ) : view === "orders" ? (
                <Button onClick={() => open("saveOrderDraft")}>
                  New order draft
                </Button>
              ) : null}
            </div>
            {!["overview", "design"].includes(view) && (
              <p className={styles.intro}>
                {
                  (
                    {
                      products: "Your collection, ready for its next chapter.",
                      orders: "Follow every order from draft to delivery.",
                      returns:
                        "Manage returns, refunds and the units coming back.",
                      inventory:
                        "See what is on hand. Keep every option ready to shop.",
                      expenses: "Keep your spending in view, month by month.",
                      feedback:
                        "What shoppers are saying about your collection.",
                    } as Record<string, string>
                  )[view]
                }
              </p>
            )}
            {!ownerForm && ownerNotice && (
              <div
                className={styles.resultBanner}
                data-tone={ownerNoticeTone}
                role={ownerNoticeTone === "error" ? "alert" : "status"}
              >
                <Icon
                  name={ownerNoticeTone === "success" ? "check" : "feedback"}
                />
                <span>{ownerNotice}</span>
                <button
                  aria-label="Dismiss message"
                  onClick={() => controller.dismissOwnerNotice()}
                >
                  <Icon name="close" size={16} />
                </button>
              </div>
            )}
            {view === "products" && (
              <MetricStrip
                items={[
                  {
                    label: "Active garments",
                    value: graph.products.filter((p) => !p.archived).length,
                  },
                  {
                    label: "Garment options",
                    value: graph.products.flatMap((p) => p.variants).length,
                  },
                  {
                    label: "Units on hand",
                    value: inventorySummary(graph).units,
                  },
                ]}
              />
            )}
            {view === "orders" && (
              <MetricStrip
                items={[
                  {
                    label: "To fulfil",
                    value: graph.orders.filter(
                      (o) => o.state === "placed" || o.state === "shipped",
                    ).length,
                  },
                  {
                    label: "Completed orders",
                    value: graph.orders.filter((o) => o.state === "fulfilled")
                      .length,
                  },
                  { label: "Unplaced drafts", value: graph.orderDrafts.length },
                ]}
              />
            )}
            {view === "returns" && (
              <MetricStrip
                items={[
                  {
                    label: "Open returns",
                    value: graph.returns.filter((r) => r.state !== "closed")
                      .length,
                  },
                  {
                    label: "Ready to inspect",
                    value: graph.returns.filter((r) => r.state === "approved")
                      .length,
                  },
                  {
                    label: "Refunds issued",
                    value: formatUsd(
                      exactSum(
                        graph.refunds.map((r) =>
                          exactSum([
                            ...r.lines.map((l) => l.amount),
                            r.delivery,
                            r.tax,
                          ]),
                        ),
                      ),
                    ),
                  },
                ]}
              />
            )}
            {view === "feedback" && (
              <MetricStrip
                items={[
                  {
                    label: "Average rating",
                    value: feedback.length
                      ? `${(feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length).toFixed(1)} / 5`
                      : "—",
                  },
                  { label: "Reviews", value: feedback.length },
                  {
                    label: "Reviewed garments",
                    value: new Set(feedback.map((f) => f.productId)).size,
                  },
                ]}
              />
            )}
            {view === "overview" ? <DashboardOverview /> : null}
            {!["overview", "design", "returns", "expenses"].includes(view) && (
              <label className={styles.search}>
                <span>Find a current record</span>
                <input
                  type="search"
                  value={state.ownerSearch}
                  maxLength={100}
                  onChange={(event) =>
                    controller.ownerSearch(event.target.value)
                  }
                  placeholder="Title, option or exact reference"
                />
              </label>
            )}
            {view === "products" ? (
              <>
                <p className={styles.note}>
                  Manage photos, garment details and options in one place.
                </p>
                <div className={styles.productGrid}>
                  {products.slice(start, start + 20).map((p) => {
                    const photoId = p.imageIds.find((id) =>
                        controller.photos.availableIds().has(id),
                      ),
                      photo = photoId
                        ? controller.photos.view(photoId)
                        : undefined;
                    return (
                      <article className={styles.product} key={p.id}>
                        {photo && photoId ? (
                          <GarmentImage
                            photo={{ ...photo, id: photoId }}
                            title={p.title}
                            onFailure={(id) =>
                              controller.photos.reportUnavailable(id)
                            }
                          />
                        ) : (
                          <div className={styles.missing}>
                            Photo needs repair
                          </div>
                        )}
                        <span className={styles.source}>
                          {CATEGORY_LABELS[p.category]}
                          {p.archived ? " · Archived" : " · Current garment"}
                        </span>
                        <h3>{p.title}</h3>
                        <p>
                          {p.variants
                            .filter((v) => !v.archived)
                            .reduce(
                              (sum, v) => sum + stockOf(graph, v.id),
                              0,
                            )}{" "}
                          available units · {p.variants.length} named options
                        </p>
                        <details>
                          <summary>Source & supported details</summary>
                          <p>{p.description || "No supplied description."}</p>
                          <p>Photo references: {p.imageIds.join(", ")}</p>
                          {p.attributes.map((a) => (
                            <p key={a.name}>
                              {a.name}: {a.value ?? "Unknown"} · {a.provenance}{" "}
                              · {a.review}
                            </p>
                          ))}
                        </details>
                        <div className={styles.actions}>
                          <Button
                            variant="secondary"
                            onClick={() => open("updateProduct", p.id)}
                          >
                            Edit {p.title}
                          </Button>
                          <Button
                            variant="quiet"
                            onClick={() => open("removeProduct", p.id)}
                            disabled={p.archived}
                          >
                            Remove from store
                          </Button>
                          <Button
                            variant="quiet"
                            onClick={() => visitProduct(p.id)}
                          >
                            View current garment
                          </Button>
                        </div>
                      </article>
                    );
                  })}
                </div>
                {!products.length && (
                  <div className={styles.empty}>
                    {graph.products.length ? (
                      <>
                        <h3>No garments match this search.</h3>
                        <p>
                          Your catalogue is still here. Clear the search to see
                          all garments.
                        </p>
                        <Button onClick={() => controller.ownerSearch("")}>
                          Clear search
                        </Button>
                      </>
                    ) : (
                      <>
                        <h3>A new chapter starts here.</h3>
                        <p>
                          Create a clothing garment with its photograph. This
                          same item will appear throughout your store.
                        </p>
                        <p>Choose Create a garment above to begin.</p>
                      </>
                    )}
                  </div>
                )}
              </>
            ) : null}
            {view === "orders" ? (
              <>
                <p className={styles.note}>
                  Drafts stay editable. Placed orders keep their original prices
                  and costs.
                </p>
                {graph.orderDrafts.map((d) => (
                  <article className={styles.record} key={d.id}>
                    <h3>Unplaced draft · {d.id}</h3>
                    <Source origin={d.origin} at={d.at} />
                    <p>
                      {d.lines.length} actual lines · {d.actor} · No sales or
                      stock effect
                    </p>
                    <div className={styles.actions}>
                      <Button
                        variant="secondary"
                        onClick={() => open("saveOrderDraft", d.id)}
                      >
                        Edit draft
                      </Button>
                      <Button onClick={() => open("placeOrder", d.id)}>
                        Review placement
                      </Button>
                      <Button
                        variant="quiet"
                        onClick={() => open("deleteOrderDraft", d.id)}
                      >
                        Delete draft
                      </Button>
                    </div>
                  </article>
                ))}
                {orders.slice(start, start + 20).map((o) => {
                  const remaining = refundable(graph, o.id);
                  return (
                    <article className={styles.record} key={o.id}>
                      <div className={styles.recordHeading}>
                        <RecordPhoto
                          product={graph.products.find(
                            (p) => p.id === o.lines[0]?.productId,
                          )}
                          colour={o.lines[0]?.colour}
                        />
                        <div>
                          <span className={styles.badge}>
                            {o.state} · {o.actor}
                          </span>
                          <h3>
                            {o.lines[0]?.title ?? "Order"}
                            {o.lines.length > 1
                              ? ` + ${o.lines.length - 1} more`
                              : ""}
                          </h3>
                          <small>{o.id}</small>
                          <Source origin={o.origin} at={o.placedAt} />
                        </div>
                        <strong className={styles.recordAmount}>
                          {formatUsd(o.total)}
                          <small>Order total</small>
                        </strong>
                      </div>
                      <dl>
                        <div>
                          <dt>Financial state</dt>
                          <dd>{orderFinancialState(graph, o.id)}</dd>
                        </div>
                        <div>
                          <dt>Merchandise before refund</dt>
                          <dd>{formatUsd(o.merchandise)}</dd>
                        </div>
                        <div>
                          <dt>Recorded total incl. sample delivery/tax</dt>
                          <dd>{formatUsd(o.total)}</dd>
                        </div>
                        <div>
                          <dt>Discount / delivery / simulated tax</dt>
                          <dd>
                            {formatUsd(o.discount)} / {formatUsd(o.delivery)} /{" "}
                            {formatUsd(o.tax)}
                          </dd>
                        </div>
                      </dl>
                      <details>
                        <summary>
                          Historical line snapshots & linked effects
                        </summary>
                        {o.lines.map((l) => (
                          <div key={l.id}>
                            <p>
                              <strong>{l.title}</strong> · {l.size} · {l.colour}{" "}
                              · {l.quantity} units · Recorded price{" "}
                              {formatUsd(l.unitPrice)} / cost{" "}
                              {formatUsd(l.unitCost)}
                            </p>
                            <Button
                              variant="quiet"
                              onClick={() => visitProduct(l.productId)}
                            >
                              Open current product
                            </Button>
                          </div>
                        ))}
                        {graph.movements
                          .filter((m) => m.sourceId === o.id)
                          .map((m) => (
                            <p key={m.id}>
                              {m.kind}: {m.units} units · {m.id}
                            </p>
                          ))}
                        {graph.refunds
                          .filter((r) => r.orderId === o.id)
                          .map((r) => (
                            <p key={r.id}>
                              Refund {r.id} · {utc(r.at)}
                            </p>
                          ))}
                        <p>
                          Fictional buyer {o.buyerId ?? "Owner demo identity"} ·
                          Eligible visit{" "}
                          {o.trafficId ?? "No shopper conversion link"}
                        </p>
                      </details>
                      <div className={styles.actions}>
                        {(o.state === "placed" || o.state === "shipped") && (
                          <Button
                            variant="secondary"
                            onClick={() => open("advanceOrder", o.id)}
                          >
                            {o.state === "placed"
                              ? "Mark shipped"
                              : "Mark fulfilled"}
                          </Button>
                        )}
                        {o.state === "placed" &&
                          !graph.returns.some((r) => r.orderId === o.id) &&
                          !graph.refunds.some((r) => r.orderId === o.id) && (
                            <Button
                              variant="quiet"
                              onClick={() => open("cancelOrder", o.id)}
                            >
                              Review cancellation
                            </Button>
                          )}
                        {o.shippedAt && o.state !== "cancelled" && (
                          <Button
                            variant="secondary"
                            onClick={() => open("requestReturn", o.id)}
                          >
                            Request return
                          </Button>
                        )}
                        {o.state !== "cancelled" &&
                          remaining.delivery +
                            remaining.tax +
                            remaining.lines.reduce(
                              (sum, l) => sum + l.amount,
                              0,
                            ) >
                            0 && (
                            <Button
                              variant="quiet"
                              onClick={() => open("issueRefund", o.id)}
                            >
                              Review refund
                            </Button>
                          )}
                      </div>
                    </article>
                  );
                })}
                {!orders.length && graph.orders.length > 0 && (
                  <div className={styles.empty}>
                    <h3>No placed orders match this search.</h3>
                    <p>Your order history is still here.</p>
                    <Button onClick={() => controller.ownerSearch("")}>
                      Clear search
                    </Button>
                  </div>
                )}
                {!graph.orders.length && !graph.orderDrafts.length && (
                  <p>
                    No placed orders yet. Begin with an editable demo draft.
                  </p>
                )}
              </>
            ) : null}
            {view === "returns" ? (
              <>
                <p className={styles.note}>
                  Inspect returned items and manage refunds separately.
                  Refunding does not automatically restock a garment.
                </p>
                {graph.returns.map((r) => {
                  const order = graph.orders.find((o) => o.id === r.orderId)!;
                  const returnedLine = order.lines.find(
                    (line) => line.id === r.lines[0]?.lineId,
                  );
                  return (
                    <article className={styles.record} key={r.id}>
                      <div className={styles.recordHeading}>
                        <RecordPhoto
                          product={graph.products.find(
                            (p) => p.id === returnedLine?.productId,
                          )}
                          colour={returnedLine?.colour}
                        />
                        <div>
                          <span className={styles.badge}>
                            {r.state} · {r.reason}
                          </span>
                          <h3>{returnedLine?.title ?? "Returned garments"}</h3>
                          <Source
                            origin={r.origin}
                            at={r.receivedAt ?? r.requestedAt}
                          />
                        </div>
                        <strong className={styles.recordAmount}>
                          {r.lines.reduce(
                            (sum, line) => sum + line.units.length,
                            0,
                          )}
                          <small>Returning units</small>
                        </strong>
                      </div>
                      <details>
                        <summary>Return reference</summary>
                        <p>{r.id}</p>
                      </details>
                      <p>Order {r.orderId}</p>
                      {r.lines.map((l) => (
                        <p key={l.lineId}>
                          {
                            order.lines.find((line) => line.id === l.lineId)
                              ?.title
                          }{" "}
                          · {l.units.length} physical units ·{" "}
                          {l.restockable.length} inspected restockable
                        </p>
                      ))}
                      <div className={styles.actions}>
                        {r.state === "requested" && (
                          <Button onClick={() => open("advanceReturn", r.id)}>
                            Approve return
                          </Button>
                        )}
                        {r.state === "approved" && (
                          <Button onClick={() => open("receiveReturn", r.id)}>
                            Receive & inspect
                          </Button>
                        )}
                        {r.receivedAt &&
                          !r.restockedAt &&
                          r.lines.some((l) => l.restockable.length) && (
                            <Button onClick={() => open("restockReturn", r.id)}>
                              Review restock
                            </Button>
                          )}
                        {r.state !== "closed" && (
                          <Button
                            variant="quiet"
                            onClick={() => {
                              open("advanceReturn", r.id);
                              controller.editOwnerField("state", "closed");
                            }}
                          >
                            Close return
                          </Button>
                        )}
                      </div>
                    </article>
                  );
                })}
                {graph.refunds.map((r) => (
                  <article className={styles.record} key={r.id}>
                    <div className={styles.recordHeading}>
                      <span className={styles.recordIcon}>
                        <Icon name="returns" />
                      </span>
                      <div>
                        <h3>Refund issued</h3>
                        <small>{r.id}</small>
                      </div>
                      <strong className={styles.recordAmount}>
                        {formatUsd(
                          exactSum([
                            ...r.lines.map((l) => l.amount),
                            r.delivery,
                            r.tax,
                          ]),
                        )}
                        <small>Recorded refund</small>
                      </strong>
                    </div>
                    <Source origin={r.origin} at={r.at} />
                    <p>
                      Order {r.orderId} · Merchandise{" "}
                      {formatUsd(r.lines.reduce((sum, l) => sum + l.amount, 0))}{" "}
                      · Delivery {formatUsd(r.delivery)} · Tax{" "}
                      {formatUsd(r.tax)}
                    </p>
                    <p>
                      Independent financial adjustment; no automatic restock.
                    </p>
                  </article>
                ))}
                {!graph.returns.length && !graph.refunds.length && (
                  <p>
                    Open a shipped order to request a physical return, or an
                    eligible order to review a financial refund.
                  </p>
                )}
              </>
            ) : null}
            {view === "inventory" && (
              <InventoryRegister rows={inventory.slice(start, start + 20)} />
            )}
            {view === "expenses" && <ExpenseRegister />}
            {view === "feedback" ? (
              <>
                <p className={styles.note}>
                  Demo reviews, connected to the garments in your store.
                </p>
                {feedback.slice(start, start + 20).map((f) => (
                  <article className={styles.record} key={f.id}>
                    <div className={styles.recordHeading}>
                      <RecordPhoto
                        product={graph.products.find(
                          (p) => p.id === f.productId,
                        )}
                      />
                      <div>
                        <h3>
                          {graph.products.find((p) => p.id === f.productId)
                            ?.title ?? "Historical garment"}
                        </h3>
                        <div className={styles.rating}>
                          <StarRating rating={f.rating} />
                          <span>{f.rating} / 5</span>
                        </div>
                      </div>
                    </div>
                    <blockquote className={styles.reviewQuote}>
                      <strong>{f.reviewerName ?? "Demo shopper"}</strong>
                      <br />
                      {f.comment}
                    </blockquote>
                    <details>
                      <summary>Review details</summary>
                      <Source origin={f.origin} at={f.at} />
                      <p>
                        {f.id} · Order {f.orderId ?? "No linked order"}
                      </p>
                    </details>
                    <Button
                      variant="quiet"
                      onClick={() => visitProduct(f.productId)}
                    >
                      Open current garment
                    </Button>
                  </article>
                ))}
              </>
            ) : null}
            {view === "design" ? (
              ownerForm ? (
                <p>
                  Finish or cancel the current form to personalize your store.
                </p>
              ) : (
                <>
                  <CurrencyPicker />
                  {design}
                </>
              )
            ) : null}
            {count > 20 && (
              <div className={styles.pagination}>
                <Button
                  variant="quiet"
                  disabled={!state.ownerPage}
                  onClick={() => controller.ownerPage(state.ownerPage - 1)}
                >
                  Previous records
                </Button>
                <span>
                  {start + 1}–{Math.min(start + 20, count)} of {count}
                </span>
                <Button
                  variant="quiet"
                  disabled={start + 20 >= count}
                  onClick={() => controller.ownerPage(state.ownerPage + 1)}
                >
                  Next records
                </Button>
              </div>
            )}
            {!ownerForm && graph.receipts.at(-1)?.undo && (
              <Button
                variant="secondary"
                onClick={() => open("undo", graph.receipts.at(-1)!.id)}
              >
                Review latest unposted Undo
              </Button>
            )}
          </div>
          {ownerForm && ownerSurface === "dashboard" && (
            <FormShell key={ownerForm.id} />
          )}
          {ownerForm && ownerSurface === "tailor" && (
            <Button
              variant="secondary"
              onClick={() => controller.moveOwnerForm("dashboard")}
            >
              Open your current Tailor draft in the full form
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
function ScenarioReviewDialog() {
  const { controller, state, scenarioReview, ownerForm } = useSession();
  const dialog = useRef<HTMLDialogElement>(null),
    opener = useRef<HTMLElement | null>(null),
    heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    const node = dialog.current;
    if (scenarioReview && node && !node.open) {
      opener.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      node.showModal();
      heading.current?.focus({ preventScroll: true });
    } else if (!scenarioReview && node?.open) node.close();
  }, [scenarioReview]);
  return (
    <dialog
      ref={dialog}
      className={styles.dialog}
      aria-labelledby="scenario-heading"
      onCancel={(event) => {
        event.preventDefault();
        controller.cancelScenario();
      }}
      onClose={() => {
        controller.cancelScenario();
        if (opener.current?.isConnected)
          opener.current.focus({ preventScroll: true });
      }}
    >
      <h2 ref={heading} tabIndex={-1} id="scenario-heading">
        Replace this demo’s business activity?
      </h2>
      {scenarioReview && (
        <>
          <p>
            {SCENARIO_LABELS[scenarioReview.info.preset]} · Actual simulated
            result {formatUsd(scenarioReview.result)}. Edited inputs can change
            the intended story; these are actual linked records.
          </p>
          <p>
            Replaces orders, returns, refunds, visits, fictional buyers,
            feedback, expenses, writeoffs, movements and their receipts.
            Discards {scenarioReview.discardedDrafts} saved unposted drafts
            {ownerForm ? " and your open unsaved form" : ""}.
          </p>
          <p>
            Your garments, validated photos and accepted design/brand remain.
            Active variants restart with 20 demo units; price, cost and named
            options are preserved. Bag selections are revalidated.
          </p>
          <details>
            <summary>
              Inspect rebuilt stock ({scenarioReview.stockChanges.length}{" "}
              options)
            </summary>
            {scenarioReview.stockChanges.map((change) => {
              const p = state.graph.products.find((p) =>
                  p.variants.some((v) => v.id === change.variantId),
                ),
                v = p?.variants.find((v) => v.id === change.variantId);
              return (
                <p key={change.variantId}>
                  {p?.title} · {v?.size}: {change.before} → {change.after}
                </p>
              );
            })}
          </details>
          <div className={styles.actions}>
            <Button
              variant="secondary"
              onClick={() => controller.cancelScenario()}
            >
              Keep current activity
            </Button>
            <Button onClick={() => controller.confirmScenario(scenarioReview)}>
              Replace business activity
            </Button>
          </div>
        </>
      )}
    </dialog>
  );
}
