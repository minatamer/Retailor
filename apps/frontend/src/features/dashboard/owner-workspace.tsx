"use client";
import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { formatUsd } from "@retailor/commerce/money";
import {
  stockOf,
  refundable,
  orderFinancialState,
} from "@retailor/commerce/selectors";
import { SCENARIO_LABELS } from "@retailor/commerce/scenarios";
import { Button } from "../../components/ui/button";
import { useSession } from "../session/context";
import { FormShell } from "../operations/form-shell";
import { DashboardOverview } from "./overview";
import type { OwnerOperationType, OwnerView } from "../operations/state";
import { GarmentImage } from "../storefront/gallery";
import styles from "./owner-workspace.module.css";
const VIEWS: { id: OwnerView; label: string }[] = [
  { id: "overview", label: "At a glance" },
  { id: "products", label: "Garments" },
  { id: "orders", label: "Orders" },
  { id: "returns", label: "Returns & refunds" },
  { id: "inventory", label: "Inventory & costs" },
  { id: "expenses", label: "Expenses" },
  { id: "traffic", label: "Visits & customers" },
  { id: "feedback", label: "Feedback" },
  { id: "design", label: "Design" },
];
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
  const { controller, state, ownerForm, ownerNotice } = useSession();
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
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
    traffic = graph.traffic.filter((t) => matches(t.id, t.actor, t.origin)),
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
          : view === "traffic"
            ? traffic.length
            : view === "feedback"
              ? feedback.length
              : 0;
  return (
    <section className={styles.owner} aria-label="Owner workspace">
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>
            Your temporary business, connected
          </span>
          <h1>
            The clothes.
            <br />
            <em>The whole picture.</em>
          </h1>
          <p>
            Real local records, fictional business activity. Every owner amount
            is USD.
          </p>
        </div>
        <div className={styles.headerActions}>
          <Button
            variant="secondary"
            onClick={() => controller.go("storefront")}
          >
            View storefront
          </Button>
          <Button
            onClick={() => {
              controller.ownerNavigate("products");
              open("createProduct");
            }}
          >
            Create a garment
          </Button>
        </div>
      </header>
      <ScenarioControl />
      <nav className={styles.nav} aria-label="Owner views">
        {VIEWS.map((item) => (
          <button
            key={item.id}
            aria-current={view === item.id ? "page" : undefined}
            onClick={() => controller.ownerNavigate(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>
      <div className={styles.layout} data-form={!!ownerForm}>
        <div className={styles.records}>
          <h2 id="owner-register-heading" ref={heading} tabIndex={-1}>
            {VIEWS.find((v) => v.id === view)?.label}
          </h2>
          {view === "overview" ? <DashboardOverview /> : null}
          {!["overview", "design", "returns", "expenses"].includes(view) && (
            <label className={styles.search}>
              <span>Find a current record</span>
              <input
                type="search"
                value={state.ownerSearch}
                maxLength={100}
                onChange={(event) => controller.ownerSearch(event.target.value)}
                placeholder="Title, option or exact reference"
              />
            </label>
          )}
          {view === "products" ? (
            <>
              <p className={styles.note}>
                Photos back every garment. Sizing, prices, future costs and
                opening inventory are disclosed demo inputs.
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
                        <div className={styles.missing}>Photo needs repair</div>
                      )}
                      <span className={styles.source}>
                        {p.category.replaceAll("-", " ")}
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
                            {a.name}: {a.value ?? "Unknown"} · {a.provenance} ·{" "}
                            {a.review}
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
                        Create a clothing garment with its photograph. This same
                        item will appear throughout your store.
                      </p>
                      <Button onClick={() => open("createProduct")}>
                        Create a garment
                      </Button>
                    </>
                  )}
                </div>
              )}
            </>
          ) : null}
          {view === "orders" ? (
            <>
              <div className={styles.actions}>
                <Button onClick={() => open("saveOrderDraft")}>
                  Create an order draft
                </Button>
              </div>
              <p className={styles.note}>
                Drafts reserve no stock. Placed snapshots preserve original
                titles, options, prices and costs. Shipment states are
                simulated.
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
                    <span className={styles.badge}>
                      {o.state} · {o.actor}
                    </span>
                    <h3>{o.id}</h3>
                    <Source origin={o.origin} at={o.placedAt} />
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
                            <strong>{l.title}</strong> · {l.size} · {l.colour} ·{" "}
                            {l.quantity} units · Recorded price{" "}
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
                <p>No placed orders yet. Begin with an editable demo draft.</p>
              )}
            </>
          ) : null}
          {view === "returns" ? (
            <>
              <p className={styles.note}>
                Physical receipts and financial refunds have independent dates
                and effects. Refunds do not restore stock; inspected restock
                does not issue payment.
              </p>
              {graph.returns.map((r) => {
                const order = graph.orders.find((o) => o.id === r.orderId)!;
                return (
                  <article className={styles.record} key={r.id}>
                    <span className={styles.badge}>
                      {r.state} · {r.reason}
                    </span>
                    <h3>{r.id}</h3>
                    <Source
                      origin={r.origin}
                      at={r.receivedAt ?? r.requestedAt}
                    />
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
                  <h3>Issued refund · {r.id}</h3>
                  <Source origin={r.origin} at={r.at} />
                  <p>
                    Order {r.orderId} · Merchandise{" "}
                    {formatUsd(r.lines.reduce((sum, l) => sum + l.amount, 0))} ·
                    Delivery {formatUsd(r.delivery)} · Tax {formatUsd(r.tax)}
                  </p>
                  <p>Independent financial adjustment; no automatic restock.</p>
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
          {view === "inventory" ? (
            <>
              <p className={styles.note}>
                Available units equal opening inventory plus signed movements.
                Low stock means two units or fewer. Future costs do not rewrite
                placed snapshots.
              </p>
              {inventory.slice(start, start + 20).map(({ p, v }) => (
                <article className={styles.record} key={v.id}>
                  <h3>
                    {p.title} · {v.size} · {v.colour}
                  </h3>
                  <p>
                    {v.sku}
                    {v.archived || p.archived ? " · Archived" : ""}
                  </p>
                  <dl>
                    <div>
                      <dt>Currently available</dt>
                      <dd>{stockOf(graph, v.id)} units</dd>
                    </div>
                    <div>
                      <dt>Current future cost / estimated value</dt>
                      <dd>
                        {formatUsd(v.unitCost)} /{" "}
                        {formatUsd(v.unitCost * stockOf(graph, v.id))}
                      </dd>
                    </div>
                    <div>
                      <dt>Disclosed opening inventory</dt>
                      <dd>{v.openingStock} units</dd>
                    </div>
                  </dl>
                  <details>
                    <summary>Movement history</summary>
                    {graph.movements
                      .filter((m) => m.variantId === v.id)
                      .map((m) => (
                        <div key={m.id}>
                          <p>
                            {m.kind} · {m.units} units · {m.reason}
                          </p>
                          <Source origin={m.origin} at={m.at} />
                          <p>
                            {m.id} · Source {m.sourceId}
                          </p>
                        </div>
                      ))}
                  </details>
                  <div className={styles.actions}>
                    <Button
                      variant="secondary"
                      onClick={() => open("adjustStock", v.id)}
                    >
                      Adjust stock
                    </Button>
                    <Button
                      variant="quiet"
                      onClick={() => open("setUnitCost", v.id)}
                    >
                      Change future cost
                    </Button>
                    <Button
                      variant="quiet"
                      onClick={() => open("writeoffStock", v.id)}
                    >
                      Review available damage
                    </Button>
                  </div>
                </article>
              ))}
            </>
          ) : null}
          {view === "expenses" ? (
            <>
              <Button onClick={() => open("saveExpenseDraft")}>
                Create an expense draft
              </Button>
              <p className={styles.note}>
                Unposted drafts have no result effect. Posted entries are
                immutable; correction/void adds a linked record.
              </p>
              {graph.expenseDrafts.map((e) => (
                <article className={styles.record} key={e.id}>
                  <h3>
                    Unposted · {e.category} · {formatUsd(e.amount)}
                  </h3>
                  <p>
                    {e.note} · {e.id}
                  </p>
                  <div className={styles.actions}>
                    <Button
                      variant="secondary"
                      onClick={() => open("saveExpenseDraft", e.id)}
                    >
                      Edit expense draft
                    </Button>
                    <Button onClick={() => open("postExpense", e.id)}>
                      Review posting
                    </Button>
                    <Button
                      variant="quiet"
                      onClick={() => open("deleteExpenseDraft", e.id)}
                    >
                      Delete expense draft
                    </Button>
                  </div>
                </article>
              ))}
              {graph.expenses.map((e) => (
                <article className={styles.record} key={e.id}>
                  <h3>
                    {e.category} · {formatUsd(e.amount)}
                  </h3>
                  <Source origin={e.origin} at={e.at} />
                  <p>
                    {e.kind} · {e.id}
                    {e.parentId ? ` · Linked to ${e.parentId}` : ""}
                  </p>
                  <p>{e.note}</p>
                  {e.kind === "posting" &&
                    !graph.expenses.some(
                      (v) => v.parentId === e.id && v.kind === "void",
                    ) && (
                      <div className={styles.actions}>
                        <Button
                          variant="secondary"
                          onClick={() => open("correctExpense", e.id)}
                        >
                          Review correction
                        </Button>
                        <Button
                          variant="quiet"
                          onClick={() => open("voidExpense", e.id)}
                        >
                          Review void
                        </Button>
                      </div>
                    )}
                </article>
              ))}
            </>
          ) : null}
          {view === "traffic" ? (
            <>
              <p className={styles.note}>
                {graph.buyers.length} fictional buyer identities · No real
                customer PII or external analytics. Visit stages are nested;
                owner/designer activity is excluded from the funnel.
              </p>
              {traffic.slice(start, start + 20).map((t) => (
                <article className={styles.record} key={t.id}>
                  <h3>
                    {t.id} · {t.actor}
                  </h3>
                  <Source origin={t.origin} at={t.startedAt} />
                  <p>
                    Engaged {t.engagedAt ? "yes" : "no"} · Bag{" "}
                    {t.bagAt ? "yes" : "no"} · Checkout{" "}
                    {t.checkoutAt ? "yes" : "no"} · {t.orderIds.length} linked
                    orders (at most one conversion)
                  </p>
                  <details>
                    <summary>Known linked records</summary>
                    <p>Products: {t.productIds.join(", ") || "None"}</p>
                    <p>Orders: {t.orderIds.join(", ") || "None"}</p>
                  </details>
                </article>
              ))}
            </>
          ) : null}
          {view === "feedback" ? (
            <>
              <p className={styles.note}>
                Authored fictional feedback, tied to actual product/order IDs.
                Small sample observations do not prove real demand or fit.
              </p>
              {feedback.slice(start, start + 20).map((f) => (
                <article className={styles.record} key={f.id}>
                  <h3>
                    {graph.products.find((p) => p.id === f.productId)?.title ??
                      "Historical garment"}{" "}
                    · {f.rating} / 5
                  </h3>
                  <Source origin={f.origin} at={f.at} />
                  <p>{f.comment}</p>
                  <p>
                    {f.id} · Order {f.orderId ?? "No linked order"}
                  </p>
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
                Finish or cancel the current form to edit your store design.
              </p>
            ) : (
              design
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
          {!ownerForm && (
            <p className={styles.notice} role="status">
              {ownerNotice}
            </p>
          )}
        </div>
        {ownerForm && <FormShell key={ownerForm.id} />}
      </div>
    </section>
  );
}
function ScenarioControl() {
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
    <>
      <div className={styles.scenario}>
        <div>
          <span className={styles.eyebrow}>
            Three fictional business stories
          </span>
          <strong>
            {state.scenario
              ? SCENARIO_LABELS[state.scenario.preset]
              : "Your local activity"}
          </strong>
        </div>
        <div>
          {(["healthy", "breakeven", "loss"] as const).map((preset) => (
            <button
              key={preset}
              onClick={() => controller.prepareScenario(preset)}
            >
              {SCENARIO_LABELS[preset]}
            </button>
          ))}
        </div>
      </div>
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
              result {formatUsd(scenarioReview.result)}. Edited inputs can
              change the intended story; these are actual linked records.
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
              <Button
                onClick={() => controller.confirmScenario(scenarioReview)}
              >
                Replace business activity
              </Button>
            </div>
          </>
        )}
      </dialog>
    </>
  );
}
