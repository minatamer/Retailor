"use client";
import Image from "next/image";
import { useEffect, useState } from "react";
import {
  ShopifyShopSchema,
  ShopifyProductIdSchema,
} from "@retailor/contracts/shopify";
import { formatUsd } from "@retailor/commerce/money";
import { CATEGORY_LABELS } from "@retailor/contracts/product";
import { Button } from "../../components/ui/button";
import { Icon } from "../../components/ui/icon";
import { useSession } from "../session/context";
import { ReviewDialog } from "./review-dialog";
import { CatalogueBrowser } from "./catalogue-browser";
import { GarmentPicker } from "./garment-picker";
import { exportSelection } from "./selection";
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
export function Connections({ onboarding = false }: { onboarding?: boolean }) {
  const { controller, state, shopify } = useSession();
  const [selected, setSelected] = useState<string[]>([]);
  const [confirmation, setConfirmation] = useState<
    { kind: "remove"; id: string } | { kind: "disconnect" } | null
  >(null);
  useEffect(() => {
    controller.shopifyVisible(true, !onboarding);
    return () => controller.shopifyVisible(false);
  }, [controller, onboarding]);
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
  const onboardingComplete = onboarding && connected;
  const canRefresh =
    !!status &&
    !connected &&
    (status.state !== "disconnected" || !shopify.verified);
  const canDisconnect = !!status?.shop && status.state !== "cleaned";
  const remaining = Math.max(0, 10 - (status?.createIntents ?? 0));
  const tracked = new Set(active.map((item) => item.sourceProductId));
  const selectedIds = exportSelection(
    local,
    tracked,
    controller.photos.availableIds(),
    remaining,
    selected,
  );
  const finish = async () => {
    if (!confirmation) return;
    if (confirmation.kind === "remove")
      await controller.removeShopify(confirmation.id);
    else await controller.disconnectShopify();
    setConfirmation(null);
  };
  const demoDetails = (
    <details className={styles.disclosure}>
      <summary>
        <Icon name="info" size={15} />
        <span>About this demo</span>
      </summary>
      <p>
        Sign in and approve access through Shopify. Connecting creates no
        products; exports happen only after your review. Installation depends on
        test-store eligibility.
      </p>
      <p>
        Shared fields: title, description, category, photos, Colour/Size
        options, SKUs and USD prices. Existing Shopify products are never
        edited.
      </p>
      <p>
        Retailor requests removal of its own exports and collection on
        Disconnect, Reset or the original two-hour demo expiry. Lost access can
        require manual removal. You can connect later in Owner workspace →
        Connections.
      </p>
      {simulated && <p>Simulated connection data resets with the backend.</p>}
    </details>
  );
  return (
    <div
      className={`${styles.connections} ${onboarding ? styles.onboarding : ""}`}
    >
      {onboarding && (
        <div className={styles.welcome}>
          <span className={styles.eyebrow}>One optional step</span>
          <h1>Your storefront is ready.</h1>
          <p>Connect your test store, or continue without Shopify.</p>
        </div>
      )}
      <section className={styles.card} aria-labelledby="shopify-heading">
        <div className={styles.header} data-tailor-target="shopify-connect">
          <div className={styles.identity}>
            <h2 id="shopify-heading" tabIndex={-1}>
              <a
                href="https://www.shopify.com"
                target="_blank"
                rel="noreferrer"
                aria-label="Shopify website (opens in a new tab)"
              >
                <Image
                  src="/integrations/shopify-logo.svg"
                  alt="Shopify"
                  width={140}
                  height={40}
                  unoptimized
                />
              </a>
            </h2>
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
            <strong>Local simulation</strong> · No Shopify account is contacted.
          </p>
        )}
        <p>Import products or export drafts with your Shopify test store.</p>
        {status?.shop && (
          <dl className={styles.details}>
            <div>
              <dt>Store</dt>
              <dd>
                {status.name || status.shop}
                {status.name && status.name !== status.shop && (
                  <small>{status.shop}</small>
                )}
              </dd>
            </div>
            <div>
              <dt>Currency</dt>
              <dd>{status.currency || "Not verified"}</dd>
            </div>
            <div>
              <dt>Retailor exports</dt>
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
            <div className={styles.connectForm}>
              <Button
                disabled={!canConnect}
                onClick={() => void controller.connectShopify()}
              >
                {simulated ? "Try simulated connection" : "Connect Shopify"}
                <Icon name="arrow" size={17} />
              </Button>
            </div>
          )}
        {!onboardingComplete &&
          (canRefresh || canDisconnect || !onboarding) && (
            <div
              className={onboarding ? styles.actions : styles.footer}
              data-tailor-target={onboarding ? undefined : "shopify-cleanup"}
            >
              {canRefresh && (
                <Button
                  variant="secondary"
                  disabled={busy}
                  onClick={() => void controller.refreshShopify()}
                >
                  Refresh connection
                </Button>
              )}
              {canDisconnect && (
                <Button
                  variant="primary"
                  disabled={busy}
                  onClick={() => setConfirmation({ kind: "disconnect" })}
                >
                  Disconnect and remove demo products
                  <Icon name="arrow" size={17} />
                </Button>
              )}
              {!onboarding && demoDetails}
            </div>
          )}
        {!onboardingComplete && (
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
        )}
        {onboarding && (
          <div className={styles.footer}>
            <Button
              variant={connected ? "primary" : "secondary"}
              onClick={() => controller.continueFromConnection()}
            >
              {connected ? "Continue to storefront" : "Skip for now"}
              <Icon name="arrow" size={17} />
            </Button>
            {demoDetails}
          </div>
        )}
      </section>
      {!onboarding && (
        <>
          <section className={styles.section} aria-labelledby="shopify-exports">
            <div className={styles.header} data-tailor-target="shopify-export">
              <div>
                <span className={styles.eyebrow}>Explicit sharing</span>
                <h3 id="shopify-exports">Your Retailor products</h3>
              </div>
              <span className={styles.fine}>
                {status?.createIntents ?? 0} / 10 lifetime export intents
              </span>
            </div>
            <p>
              Choose products to export with their photos to the Retailor
              collection in Shopify. You will review everything before creating
              drafts.
            </p>
            {!!local.length && (
              <>
                <GarmentPicker
                  products={local}
                  tracked={tracked}
                  remaining={remaining}
                  enabled={canWrite}
                  selected={selectedIds}
                  onSelect={setSelected}
                />
                <Button
                  disabled={!canWrite || !selectedIds.length || remaining === 0}
                  onClick={() => controller.reviewShopify(selectedIds)}
                >
                  Review draft export
                </Button>
              </>
            )}
            {!status?.exports.length && (
              <p className={styles.empty}>
                No products have been exported in this demo.
              </p>
            )}
            <div className={styles.exports}>
              {status?.exports.map((item) => {
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
            {status?.state === "needs_attention" && (
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
            {status?.state === "disconnecting" && (
              <p className={styles.fine}>
                Product cleanup is complete; app access is still being checked.
              </p>
            )}
          </section>
          <CatalogueBrowser />
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
            Draft only. Export these fields and photos to the Retailor
            collection. Cleanup is requested at demo end; lost access can
            require manual removal.
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
