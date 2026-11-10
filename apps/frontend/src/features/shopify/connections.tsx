"use client";
import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  ShopifyShopSchema,
  ShopifyProductIdSchema,
} from "@retailor/contracts/shopify";
import { formatUsd } from "@retailor/commerce/money";
import { CATEGORY_LABELS } from "@retailor/contracts/product";
import { Button } from "../../components/ui/button";
import { Icon } from "../../components/ui/icon";
import { useSession } from "../session/context";
import styles from "./connections.module.css";

const states = {
  unavailable: "Unavailable",
  disconnected: "Not connected",
  authorizing: "Waiting for consent",
  connected: "Connected",
  writing: "Writing reviewed drafts",
  checking_outcome: "Checking outcome",
  cleanup_pending: "Removal pending",
  cleaning: "Removing owned products",
  cleaned: "Cleanup confirmed · connection closed",
  disconnecting: "Closing app access",
  needs_attention: "Needs attention",
};
const outcomes = {
  preparing: "Preparing images",
  creating: "Creating draft",
  checking_outcome: "Outcome unknown · check before retrying",
  configuring: "Fields need checking",
  media_processing: "Images still processing",
  ready: "Ready · draft verified",
  updating: "Updating reviewed fields",
  removal_pending: "Removal pending",
  removed: "Removal verified",
  failed: "Not completed · review before retrying",
  needs_attention: "Needs attention · inspect in Shopify",
};
function adminLink(shop: string | null, id: string | null) {
  return ShopifyShopSchema.safeParse(shop).success &&
    ShopifyProductIdSchema.safeParse(id).success
    ? `https://${shop}/admin/products/${id!.split("/").at(-1)}`
    : null;
}
function ReviewDialog({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose(): void;
}) {
  const dialog = useRef<HTMLDialogElement>(null),
    titleId = useId();
  useEffect(() => {
    const node = dialog.current,
      opener = document.activeElement;
    node?.showModal();
    return () => {
      node?.close();
      if (
        opener instanceof HTMLElement &&
        opener.isConnected &&
        !opener.matches(":disabled")
      )
        opener.focus({ preventScroll: true });
      else
        document
          .getElementById("shopify-heading")
          ?.focus({ preventScroll: true });
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      className={styles.dialog}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className={styles.dialogHeader}>
        <h2 id={titleId}>{title}</h2>
        <button
          className={styles.close}
          aria-label="Close review"
          onClick={onClose}
        >
          <Icon name="close" />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function Connections({ onboarding = false }: { onboarding?: boolean }) {
  const { controller, state, shopify } = useSession();
  const [shop, setShop] = useState<string | null>(null),
    [selected, setSelected] = useState<string[]>([]);
  const [confirmation, setConfirmation] = useState<
    { kind: "remove"; id: string } | { kind: "disconnect" } | null
  >(null);
  useEffect(() => {
    controller.shopifyVisible(true);
    return () => controller.shopifyVisible(false);
  }, [controller]);
  const status = shopify.status,
    busy = !!shopify.busy,
    connected = shopify.verified && status?.state === "connected",
    simulated = !!status?.simulated;
  const local = state.graph.products.filter((product) => !product.archived),
    active = status?.exports.filter((item) => item.state !== "removed") ?? [];
  const canConnect =
    shopify.available &&
    shopify.verified &&
    !busy &&
    status?.state !== "connected" &&
    !["cleanup_pending", "cleaning", "disconnecting", "cleaned"].includes(
      status?.state ?? "",
    );
  const canWrite = connected && status.currency === "USD" && !busy;
  const storeAddress = shop ?? (simulated ? "retailor-demo.myshopify.com" : "");
  const remaining = Math.max(0, 10 - (status?.createIntents ?? 0));
  const selectedIds = selected.filter(
    (id) =>
      local.some((product) => product.id === id) &&
      !active.some((item) => item.sourceProductId === id),
  );
  const finish = async () => {
    if (!confirmation) return;
    if (confirmation.kind === "remove")
      await controller.removeShopify(confirmation.id);
    else await controller.disconnectShopify();
    setConfirmation(null);
  };
  return (
    <div
      className={`${styles.connections} ${onboarding ? styles.onboarding : ""}`}
    >
      {onboarding && (
        <div className={styles.welcome}>
          <span className={styles.eyebrow}>One optional step</span>
          <h1>Your storefront is ready.</h1>
          <p>
            Try a Shopify test connection, or step straight into{" "}
            <strong>{state.acceptedDesign.name}</strong>.
          </p>
        </div>
      )}
      <section className={styles.card} aria-labelledby="shopify-heading">
        <div className={styles.header}>
          <div className={styles.identity}>
            <span className={styles.mark}>
              <Icon name="connections" size={28} />
            </span>
            <div>
              <h2 id="shopify-heading" tabIndex={-1}>
                Shopify
              </h2>
              <p>Test-store products</p>
            </div>
          </div>
          <span className={styles.badge} data-ready={connected}>
            {status
              ? !shopify.verified && status.state === "connected"
                ? "Needs verification"
                : states[status.state]
              : busy
                ? "Checking availability"
                : shopify.available === true
                  ? "Needs verification"
                  : "Unavailable"}
          </span>
        </div>
        {simulated && (
          <p className={styles.simulation}>
            <strong>Local simulation</strong> · No real Shopify account is
            contacted. Connection data resets with the backend.
          </p>
        )}
        <p>
          Connect an eligible Shopify test store to read its products and try
          reviewed draft exports. Sign in and approve access through Shopify.{" "}
          <strong>Connecting creates no products.</strong>
        </p>
        <p className={styles.fine}>
          Only reviewed garments are shared: title, description, category,
          photos, Colour/Size options, SKUs and USD prices. Retailor requests
          removal of its own products on Disconnect, Reset, or the original
          two-hour demo expiry. Lost access can require manual removal.
        </p>
        {status?.shop && (
          <dl className={styles.details}>
            <div>
              <dt>Store</dt>
              <dd>
                {status.name || status.shop}
                <small>{status.shop}</small>
              </dd>
            </div>
            <div>
              <dt>Currency</dt>
              <dd>{status.currency || "Not verified"}</dd>
            </div>
            <div>
              <dt>Demo products</dt>
              <dd>
                {status.productCount} known · {active.length} active or
                unresolved exports
              </dd>
            </div>
          </dl>
        )}
        {status?.currency && status.currency !== "USD" && (
          <p className={styles.warning}>
            This store uses {status.currency}. Reading is available; export
            requires a USD test store. EUR display settings do not convert
            export prices.
          </p>
        )}
        {!connected &&
          (!status ||
            ["disconnected", "authorizing", "needs_attention"].includes(
              status.state,
            )) && (
            <form
              className={styles.connectForm}
              onSubmit={(event) => {
                event.preventDefault();
                if (canConnect) void controller.connectShopify(storeAddress);
              }}
            >
              <label>
                Shopify test-store address
                <input
                  type="text"
                  inputMode="url"
                  autoCapitalize="none"
                  autoComplete="off"
                  spellCheck={false}
                  maxLength={100}
                  required
                  value={storeAddress}
                  onChange={(event) => setShop(event.target.value)}
                  placeholder="your-store.myshopify.com"
                  disabled={busy}
                />
              </label>
              <Button type="submit" disabled={!canConnect}>
                {simulated ? "Try simulated connection" : "Connect Shopify"}
                <Icon name="arrow" size={17} />
              </Button>
              <small>
                Use the store’s myshopify.com address. Installation depends on
                test-store eligibility.
              </small>
            </form>
          )}
        <div className={styles.actions}>
          {status && (
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => void controller.refreshShopify()}
            >
              Refresh connection
            </Button>
          )}
          {status?.shop && status.state !== "cleaned" && (
            <Button
              variant="quiet"
              disabled={busy}
              onClick={() => setConfirmation({ kind: "disconnect" })}
            >
              Disconnect and remove demo products
            </Button>
          )}
        </div>
        <div role="status" aria-live="polite" className={styles.notice}>
          {shopify.busy && (
            <span className={styles.pending}>
              <span className={styles.spinner} aria-hidden="true" />
              {shopify.busy}
            </span>
          )}
          {shopify.notice && <p>{shopify.notice}</p>}
          {shopify.reference && (
            <small>Request reference: {shopify.reference}</small>
          )}
        </div>
        {onboarding && (
          <div className={styles.continue}>
            <Button
              variant={connected ? "primary" : "secondary"}
              onClick={() => controller.continueFromConnection()}
            >
              {connected
                ? "Continue to storefront"
                : "Skip · continue without Shopify"}
              <Icon name="arrow" size={17} />
            </Button>
            <small>
              Manage Shopify later in Owner workspace → Connections.
            </small>
          </div>
        )}
      </section>
      {!onboarding && status && (
        <>
          <section className={styles.section} aria-labelledby="shopify-exports">
            <div className={styles.header}>
              <div>
                <span className={styles.eyebrow}>Explicit sharing</span>
                <h3 id="shopify-exports">Your demo drafts</h3>
              </div>
              <span className={styles.fine}>
                {status.createIntents} / 10 lifetime export intents
              </span>
            </div>
            <p>
              Local changes stay here until you review an Update. Change
              exported photos with Remove, then a fresh Export. Removed and
              uncertain intents count toward the lifetime limit.
            </p>
            {!!local.length && (
              <>
                <fieldset
                  className={styles.selection}
                  disabled={!canWrite || remaining === 0}
                >
                  <legend>Select local garments to review</legend>
                  {local.map((product) => {
                    const exported = active.some(
                        (item) => item.sourceProductId === product.id,
                      ),
                      photoReady = product.imageIds.every((id) =>
                        controller.photos.availableIds().has(id),
                      );
                    return (
                      <label key={product.id}>
                        <input
                          type="checkbox"
                          checked={selected.includes(product.id)}
                          disabled={
                            exported ||
                            !photoReady ||
                            (!selected.includes(product.id) &&
                              selectedIds.length >= remaining)
                          }
                          onChange={(event) =>
                            setSelected((current) =>
                              event.target.checked
                                ? [...current, product.id]
                                : current.filter((id) => id !== product.id),
                            )
                          }
                        />
                        <span>
                          {product.title}
                          <small>
                            {exported
                              ? "Already tracked below"
                              : !photoReady
                                ? "Photo repair needed"
                                : `${product.variants.filter((variant) => !variant.archived).length} variants · USD`}
                          </small>
                        </span>
                      </label>
                    );
                  })}
                </fieldset>
                <Button
                  disabled={!canWrite || !selectedIds.length || remaining === 0}
                  onClick={() => controller.reviewShopify(selectedIds)}
                >
                  Review draft export
                </Button>
              </>
            )}
            {!status.exports.length && (
              <p className={styles.empty}>
                No products have been exported in this demo.
              </p>
            )}
            <div className={styles.exports}>
              {status.exports.map((item) => {
                const source = local.find(
                    (product) => product.id === item.sourceProductId,
                  ),
                  href = adminLink(status.shop, item.remoteId);
                return (
                  <article className={styles.product} key={item.id}>
                    <strong>
                      {source?.title ??
                        "Garment removed from the local collection"}
                    </strong>
                    <p>{outcomes[item.state]}</p>
                    {item.state !== "removed" &&
                      item.revision !== state.graph.revision && (
                        <small>
                          The local collection changed after this export. This
                          draft keeps its last reviewed fields until an explicit
                          Update.
                        </small>
                      )}
                    {href && !simulated ? (
                      <a href={href} target="_blank" rel="noopener noreferrer">
                        Open owned product in Shopify ↗
                      </a>
                    ) : item.remoteId ? (
                      <small>
                        Simulated product · {item.remoteId.split("/").at(-1)}
                      </small>
                    ) : (
                      <small>
                        Uncertain exports remain tracked by their owned handle.
                      </small>
                    )}
                    {item.state !== "removed" && (
                      <div className={styles.actions}>
                        <Button
                          variant="secondary"
                          disabled={busy || !connected}
                          onClick={() => void controller.checkShopify(item.id)}
                        >
                          Check result
                        </Button>
                        {source && (
                          <Button
                            variant="secondary"
                            disabled={
                              !canWrite ||
                              [
                                "removal_pending",
                                "preparing",
                                "creating",
                              ].includes(item.state)
                            }
                            onClick={() =>
                              controller.reviewShopify([source.id], true)
                            }
                          >
                            Review update
                          </Button>
                        )}
                        <Button
                          variant="quiet"
                          disabled={busy || !connected}
                          onClick={() =>
                            setConfirmation({ kind: "remove", id: item.id })
                          }
                        >
                          Remove draft
                        </Button>
                      </div>
                    )}
                    {!source && item.state !== "removed" && (
                      <p className={styles.fine}>
                        Remove this exported draft explicitly, or keep it
                        tracked for end-of-session cleanup.
                      </p>
                    )}
                  </article>
                );
              })}
            </div>
            {status.state === "needs_attention" && (
              <div className={styles.warning}>
                <strong>Manual cleanup may be required.</strong>
                <p>
                  Inspect the exact owned product links above in Shopify. If
                  access was revoked, remove those demo products manually.
                  Reconnecting this same unexpired demo may restore cleanup
                  access; an ended session cannot export new products.
                </p>
                {status.exports
                  .filter((item) => !item.remoteId && item.state !== "removed")
                  .map((item) => (
                    <p key={item.id}>
                      Inspect demo handle: <code>{item.handle}</code>
                    </p>
                  ))}
              </div>
            )}
            {status.state === "disconnecting" && (
              <p className={styles.fine}>
                Product cleanup is complete; app access is still being checked.
              </p>
            )}
          </section>
          <section
            className={styles.section}
            aria-labelledby="shopify-catalogue"
          >
            <div className={styles.header}>
              <div>
                <span className={styles.eyebrow}>Read-only browse</span>
                <h3 id="shopify-catalogue">Products in Shopify</h3>
              </div>
              <Button
                variant="secondary"
                disabled={!connected || busy}
                onClick={() => void controller.readShopify()}
              >
                Read / refresh products
              </Button>
            </div>
            <p>
              Reading keeps your local garments, stock, bag and checkout
              unchanged.
            </p>
            {shopify.catalogue && (
              <>
                <div className={styles.catalogue}>
                  {shopify.catalogue.products.map((product) => (
                    <article className={styles.product} key={product.id}>
                      <span className={styles.badge}>
                        {product.owned
                          ? "This demo’s product"
                          : "Existing store product · read only"}
                      </span>
                      <h4>{product.title}</h4>
                      <p>{product.description || "No description"}</p>
                      <small>
                        {product.status} · {shopify.catalogue!.currency} ·{" "}
                        {product.images.length} shown images
                      </small>
                      <ul>
                        {product.variants.map((variant) => (
                          <li key={variant.id}>
                            {variant.title} · {variant.price}{" "}
                            {shopify.catalogue!.currency}
                            {variant.sku ? ` · ${variant.sku}` : ""}
                          </li>
                        ))}
                      </ul>
                      {(product.variantsTruncated ||
                        product.mediaTruncated) && (
                        <small>
                          Summary is truncated. Inspect the full product in
                          Shopify.
                        </small>
                      )}
                      {!!product.images.length && !simulated && (
                        <a
                          href={product.images[0]!.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          View Shopify image ↗
                        </a>
                      )}
                    </article>
                  ))}
                </div>
                {!shopify.catalogue.products.length && (
                  <p className={styles.empty}>
                    This store’s catalogue is empty.
                  </p>
                )}
                <div className={styles.actions}>
                  <span className={styles.fine}>
                    Page {shopify.catalogue.page} · up to five pages per browse
                  </span>
                  <Button
                    variant="secondary"
                    disabled={busy || !shopify.catalogue.nextCursor}
                    onClick={() => void controller.readShopify(true)}
                  >
                    Next page
                  </Button>
                </div>
                {shopify.catalogue.limited && (
                  <p className={styles.fine}>
                    Demo browse limit reached. Read / refresh starts a new
                    cycle.
                  </p>
                )}
              </>
            )}
          </section>
        </>
      )}
      {shopify.consent && (
        <ReviewDialog
          title="Simulated Shopify consent"
          onClose={() => void controller.simulateShopify(false)}
        >
          <p>
            This is a local test screen. No Shopify login or real account is
            contacted.
          </p>
          <p>
            Allow Retailor to read this simulated store and explicitly create,
            update and remove its own draft demo products? Connecting creates
            nothing.
          </p>
          <div className={styles.actions}>
            <Button
              disabled={busy}
              onClick={() => void controller.simulateShopify(true)}
            >
              Allow simulated connection
            </Button>
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => void controller.simulateShopify(false)}
            >
              Decline
            </Button>
          </div>
        </ReviewDialog>
      )}
      {shopify.review && (
        <ReviewDialog
          title={
            shopify.review.update
              ? "Review Shopify draft update"
              : "Review Shopify draft export"
          }
          onClose={() => controller.cancelShopifyReview()}
        >
          <p>
            Destination: <strong>{status?.name ?? status?.shop}</strong> ·{" "}
            {status?.shop}.
          </p>
          <p>
            Draft only. Share these reviewed fields and photos. Cleanup is
            requested at demo end; lost access can require manual removal.
          </p>
          {shopify.review.products.map((product) => (
            <article className={styles.reviewProduct} key={product.id}>
              <h3>Retailor demo — {product.title}</h3>
              <p>{product.description}</p>
              <small>
                {CATEGORY_LABELS[product.category]} · Colour / Size · USD
              </small>
              <div className={styles.photos}>
                {product.imageIds.map((id) => {
                  const photo = controller.photos.view(id);
                  return photo ? (
                    <Image
                      key={id}
                      src={photo.url}
                      unoptimized
                      width={80}
                      height={96}
                      alt="Reviewed garment photo"
                    />
                  ) : (
                    <span key={id}>Photo unavailable</span>
                  );
                })}
              </div>
              <ul>
                {product.variants
                  .filter((variant) => !variant.archived)
                  .map((variant) => (
                    <li key={variant.id}>
                      {variant.colour} / {variant.size} · {variant.sku} ·{" "}
                      {formatUsd(variant.price)}
                    </li>
                  ))}
              </ul>
            </article>
          ))}
          <p className={styles.fine}>
            Stock, costs, tax, discounts and checkout are not exported. Update
            keeps the current exported photos.
          </p>
          {!busy && shopify.notice && (
            <p role="alert">
              {shopify.notice}
              {shopify.reference
                ? ` Request reference: ${shopify.reference}`
                : ""}
            </p>
          )}
          <div className={styles.actions}>
            <Button
              disabled={busy || !shopify.verified}
              onClick={() => void controller.confirmShopify()}
            >
              {busy
                ? "Writing reviewed drafts…"
                : shopify.review.update
                  ? "Update owned draft"
                  : "Export as drafts"}
            </Button>
            <Button
              variant="secondary"
              onClick={() => controller.cancelShopifyReview()}
            >
              {busy ? "Close and check outcome later" : "Cancel review"}
            </Button>
          </div>
        </ReviewDialog>
      )}
      {confirmation && (
        <ReviewDialog
          title={
            confirmation.kind === "remove"
              ? "Remove this owned demo product?"
              : "Remove demo products and disconnect?"
          }
          onClose={() => setConfirmation(null)}
        >
          <p>
            {confirmation.kind === "remove"
              ? "Retailor will verify and remove only this session’s mapped product. Your connection and local garment stay available."
              : `Retailor will remove this session’s products and reconcile uncertain exports before uninstalling its app from ${status?.shop ?? "this store"}. Your local storefront stays available.`}
          </p>
          <p className={styles.fine}>
            Cleanup stays pending until verified. Lost access can require manual
            removal.
          </p>
          <div className={styles.actions}>
            <Button disabled={busy} onClick={() => void finish()}>
              {busy
                ? "Requesting cleanup…"
                : confirmation.kind === "remove"
                  ? "Remove owned draft"
                  : "Remove drafts and disconnect"}
            </Button>
            <Button variant="secondary" onClick={() => setConfirmation(null)}>
              Close
            </Button>
          </div>
        </ReviewDialog>
      )}
    </div>
  );
}
