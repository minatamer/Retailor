"use client";
import Image from "next/image";
import { useState } from "react";
import type { ShopifyProductSummary } from "@retailor/contracts/shopify";
import { COMMERCE_LIMITS } from "@retailor/contracts/commerce";
import { CATEGORY_LABELS, CategorySchema } from "@retailor/contracts/product";
import type { ProductInput } from "@retailor/contracts/product";
import { formatUsd } from "@retailor/commerce/money";
import { Button } from "../../components/ui/button";
import { useSession } from "../session/context";
import { GarmentImage } from "../storefront/gallery";
import { ReviewDialog } from "./review-dialog";
import { priceRange, shopifyPrice } from "./import-model";
import { SHOPIFY_IMPORT_PREPARING } from "./controller";
import styles from "./connections.module.css";

function ShopifyPhoto({
  image,
  title,
}: {
  image: ShopifyProductSummary["images"][number] | undefined;
  title: string;
}) {
  const [failed, setFailed] = useState(false);
  return image && !failed ? (
    <Image
      src={image.url}
      alt={image.alt || title}
      width={640}
      height={800}
      unoptimized
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  ) : (
    <div className={styles.photoFallback}>
      <svg
        width="34"
        height="34"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        aria-hidden="true"
      >
        <rect x="3" y="3" width="18" height="18" rx="3" />
        <path d="m4 17 5-5 4 4 3-3 5 5" />
        <circle cx="15" cy="8" r="1" />
      </svg>
      <span>{image ? "Photo unavailable" : "No photo preview"}</span>
    </div>
  );
}
function shopifyAdmin(shop: string | null, product: ShopifyProductSummary) {
  return shop && /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/u.test(shop)
    ? `https://${shop}/admin/products/${product.id.split("/").at(-1)}`
    : null;
}
function ImportReview({ onImported }: { onImported(): void }) {
  const { controller, shopify } = useSession();
  const review = shopify.importReview;
  const [stock, setStock] = useState("10"),
    [clothing, setClothing] = useState(false),
    [categories, setCategories] = useState<
      Record<string, ProductInput["category"]>
    >({});
  if (!review) return null;
  const quantity = Number(stock),
    validStock =
      stock.trim() !== "" &&
      Number.isSafeInteger(quantity) &&
      quantity >= 0 &&
      quantity <= 10000;
  return (
    <ReviewDialog
      title="Import into Retailor"
      onClose={() => controller.cancelShopifyImport()}
    >
      <p>
        {review.products.length} product
        {review.products.length === 1 ? "" : "s"}, with photos, descriptions,
        variants and USD prices.
      </p>
      <label className={styles.importStock}>
        Demo stock per variant
        <input
          type="number"
          min="0"
          max="10000"
          value={stock}
          onChange={(event) => setStock(event.target.value)}
        />
      </label>
      <p className={styles.fine}>
        Stock is for this demo. Shopify inventory stays unchanged; local unit
        costs start at $0.
      </p>
      {review.products.map((product) => (
        <article className={styles.reviewProduct} key={product.id}>
          <h3>{product.title}</h3>
          <p>{product.description || "No description added."}</p>
          <div className={styles.photos}>
            {product.imageIds.map((id) => {
              const photo = controller.photos.view(id);
              return photo ? (
                <GarmentImage
                  key={id}
                  photo={{ ...photo, id }}
                  title={product.title}
                  onFailure={(failed) =>
                    controller.photos.reportUnavailable(failed)
                  }
                />
              ) : null;
            })}
          </div>
          <label className={styles.importCategory}>
            Clothing category
            <select
              value={categories[product.id] ?? product.category}
              onChange={(event) =>
                setCategories({
                  ...categories,
                  [product.id]: CategorySchema.parse(event.target.value),
                })
              }
            >
              {CategorySchema.options.map((category) => (
                <option value={category} key={category}>
                  {CATEGORY_LABELS[category]}
                </option>
              ))}
            </select>
          </label>
          <ul>
            {product.variants.map((variant) => (
              <li key={variant.id}>
                {variant.colour} / {variant.size} · {variant.sku} ·{" "}
                {formatUsd(variant.price)}
              </li>
            ))}
          </ul>
        </article>
      ))}
      <label className={styles.clothingConfirm}>
        <input
          type="checkbox"
          checked={clothing}
          onChange={(event) => setClothing(event.target.checked)}
        />
        These are clothing products, and I have reviewed their details.
      </label>
      {shopify.notice && (
        <p role="status" className={styles.notice}>
          {shopify.notice}
        </p>
      )}
      <div className={styles.actions}>
        <Button
          disabled={!clothing || !validStock || !!shopify.busy}
          onClick={async () => {
            await controller.confirmShopifyImport(
              quantity,
              clothing,
              categories,
            );
            if (
              review.products.every((product) =>
                controller
                  .getSnapshot()
                  .state.graph.products.some(
                    (current) => current.id === product.id,
                  ),
              )
            )
              onImported();
          }}
        >
          Import {review.products.length} product
          {review.products.length === 1 ? "" : "s"}
        </Button>
        <Button
          variant="secondary"
          disabled={!!shopify.busy}
          onClick={() => controller.cancelShopifyImport()}
        >
          Cancel
        </Button>
      </div>
    </ReviewDialog>
  );
}
export function CatalogueBrowser() {
  const { controller, state, shopify } = useSession();
  const [selected, setSelected] = useState<string[]>([]),
    [photoRetry, setPhotoRetry] = useState(0),
    [search, setSearch] = useState(""),
    [view, setView] = useState<string | null>(null),
    [photoIndex, setPhotoIndex] = useState(0);
  const catalogue = shopify.catalogue,
    status = shopify.status,
    busy = !!shopify.busy,
    connected = shopify.verified && status?.state === "connected";
  const products = catalogue?.products ?? [],
    chosen = selected.filter((id) =>
      products.some((product) => product.id === id),
    );
  const visible = products.filter((product) =>
    `${product.title} ${product.description} ${product.variants.map((variant) => variant.sku ?? "").join(" ")}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  const capacity = Math.max(
    0,
    Math.min(
      COMMERCE_LIMITS.activeProducts -
        state.graph.products.filter((product) => !product.archived).length,
      COMMERCE_LIMITS.products - state.graph.products.length,
    ),
  );
  const eligible = visible.filter(
    (product) =>
      !product.giftCard &&
      (product.images.length > 0 || product.mediaTruncated),
  );
  const selectAllIds = [
    ...new Set([...chosen, ...eligible.map((product) => product.id)]),
  ];
  const detail = products.find((product) => product.id === view),
    currency = catalogue?.currency ?? status?.currency ?? "USD";
  const href =
    detail && !status?.simulated
      ? shopifyAdmin(status?.shop ?? null, detail)
      : null;
  const preparing = shopify.busy === SHOPIFY_IMPORT_PREPARING;
  return (
    <section className={styles.section} aria-labelledby="shopify-catalogue">
      <div className={styles.header}>
        <div>
          <span className={styles.eyebrow}>Your Shopify catalogue</span>
          <h3 id="shopify-catalogue">Import from Shopify</h3>
        </div>
        <Button
          variant="secondary"
          disabled={!connected || busy}
          onClick={() => {
            setSelected([]);
            setPhotoRetry((value) => value + 1);
            void controller.readShopify();
          }}
        >
          Refresh
        </Button>
      </div>
      <p>Bring products from your Shopify store into this Retailor demo.</p>
      <div className={styles.importToolbar} data-tailor-target="shopify-import">
        <label>
          Collection
          <select
            disabled={!connected || busy}
            value={shopify.collectionId ?? ""}
            onChange={(event) => {
              setSelected([]);
              setSearch("");
              void controller.chooseShopifyCollection(
                event.target.value || null,
              );
            }}
          >
            <option value="">All products</option>
            {shopify.collections?.items.map((collection) => (
              <option value={collection.id} key={collection.id}>
                {collection.title}
              </option>
            ))}
          </select>
        </label>
        <label>
          Search products
          <input
            type="search"
            placeholder="Name, description or SKU"
            value={search}
            maxLength={100}
            onChange={(event) => setSearch(event.target.value)}
            disabled={!catalogue}
          />
        </label>
      </div>
      {shopify.collections?.nextCursor && (
        <Button
          variant="quiet"
          disabled={busy}
          onClick={() => void controller.moreShopifyCollections()}
        >
          Load more collections
        </Button>
      )}
      {(shopify.collections?.items.length ?? 0) >= 100 && (
        <p className={styles.fine}>
          This demo shows up to 100 Shopify collections.
        </p>
      )}
      {!connected && (
        <p className={styles.empty}>
          Connect Shopify to choose a collection and preview its products.
        </p>
      )}
      {connected && !catalogue && (
        <p role="status" className={styles.empty}>
          {busy
            ? "Loading your Shopify products…"
            : "Your products could not be loaded. Use Refresh to try again."}
        </p>
      )}
      {catalogue && (
        <>
          <div className={styles.selectionToolbar}>
            <div>
              <strong className={styles.importCount}>
                {chosen.length} selected
              </strong>
              <span className={styles.fine}>
                {products.length} loaded · {capacity} spaces in Retailor
              </span>
            </div>
            <div className={styles.selectionTools}>
              <Button
                variant="secondary"
                disabled={busy || !eligible.length || selectAllIds.length > 20}
                onClick={() => setSelected(selectAllIds)}
              >
                Select all shown
              </Button>
              {chosen.length > 0 && (
                <Button variant="quiet" onClick={() => setSelected([])}>
                  Clear
                </Button>
              )}
            </div>
          </div>
          {currency !== "USD" && (
            <p className={styles.warning}>
              You can browse this store. Import currently supports USD products.
            </p>
          )}
          {chosen.length > capacity && (
            <p className={styles.warning}>
              This demo has room for {capacity} more product
              {capacity === 1 ? "" : "s"}. Choose fewer products, or archive
              existing garments first.
            </p>
          )}
          <div className={styles.importGrid}>
            {visible.map((product) => {
              const checked = chosen.includes(product.id),
                cannotSelect =
                  product.giftCard ||
                  (!product.images.length && !product.mediaTruncated);
              return (
                <article
                  className={styles.importCard}
                  data-selected={checked}
                  key={product.id}
                >
                  <div className={styles.importPhoto}>
                    <ShopifyPhoto
                      key={`${product.images[0]?.url ?? "none"}:${photoRetry}`}
                      image={product.images[0]}
                      title={product.title}
                    />
                    <label className={styles.garmentSelect}>
                      <input
                        type="checkbox"
                        checked={checked}
                        aria-label={`Select ${product.title} for import`}
                        disabled={
                          busy ||
                          !connected ||
                          currency !== "USD" ||
                          !!cannotSelect ||
                          (!checked && chosen.length >= 20)
                        }
                        onChange={(event) =>
                          setSelected(
                            event.target.checked
                              ? [...chosen, product.id]
                              : chosen.filter((id) => id !== product.id),
                          )
                        }
                      />
                    </label>
                  </div>
                  <div className={styles.importInfo}>
                    <span className={styles.importStatus}>
                      {product.status.toLowerCase()}
                      {product.owned ? " · Retailor draft" : ""}
                    </span>
                    <h4>{product.title}</h4>
                    <strong className={styles.importPrice}>
                      {priceRange(product, currency)}
                    </strong>
                    <p className={styles.importDescription}>
                      {product.description || "No description added."}
                    </p>
                    <span className={styles.fine}>
                      {product.variants.length}
                      {product.variantsTruncated ? "+" : ""}{" "}
                      {product.variants.length === 1 &&
                      !product.variantsTruncated
                        ? "variant"
                        : "variants"}{" "}
                      · {product.images.length}
                      {product.mediaTruncated ? "+" : ""}{" "}
                      {product.images.length === 1 && !product.mediaTruncated
                        ? "photo"
                        : "photos"}
                    </span>
                    <div className={styles.garmentBottom}>
                      <span className={styles.fine}>
                        {product.giftCard
                          ? "Gift cards cannot be imported"
                          : !product.images.length && !product.mediaTruncated
                            ? "Photo required"
                            : ""}
                      </span>
                      <Button
                        variant="quiet"
                        aria-label={`View Shopify product ${product.title}`}
                        onClick={() => {
                          setView(product.id);
                          setPhotoIndex(0);
                        }}
                      >
                        View details ↗
                      </Button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
          {!visible.length && (
            <p className={styles.empty}>
              {products.length
                ? "No products match your search."
                : "No products in this collection."}
            </p>
          )}
          <div className={styles.importFooter}>
            <div className={styles.selectionTools}>
              <Button
                disabled={
                  !connected ||
                  busy ||
                  currency !== "USD" ||
                  !chosen.length ||
                  chosen.length > capacity
                }
                onClick={() => void controller.prepareShopifyImport(chosen)}
              >
                Review import{chosen.length ? ` (${chosen.length})` : ""}
              </Button>
              {preparing && (
                <Button
                  variant="secondary"
                  onClick={() => controller.cancelShopifyImport()}
                >
                  Cancel
                </Button>
              )}
            </div>
            {catalogue.nextCursor && (
              <Button
                variant="secondary"
                disabled={busy}
                onClick={() => void controller.readShopify(true)}
              >
                Load more products
              </Button>
            )}
          </div>
          {catalogue.limited && (
            <p className={styles.fine}>
              This browse session has reached its 100-product limit. Select a
              smaller collection to continue.
            </p>
          )}
        </>
      )}
      {detail && (
        <ReviewDialog title={detail.title} onClose={() => setView(null)}>
          <div className={styles.remoteGallery}>
            <ShopifyPhoto
              key={detail.images[photoIndex]?.url ?? "none"}
              image={detail.images[photoIndex]}
              title={detail.title}
            />
          </div>
          {detail.images.length > 1 && (
            <div className={styles.remoteThumbnails}>
              {detail.images.map((image, index) => (
                <button
                  key={image.url}
                  aria-label={`Shopify photo ${index + 1}`}
                  aria-pressed={index === photoIndex}
                  onClick={() => setPhotoIndex(index)}
                >
                  <ShopifyPhoto
                    image={image}
                    title={`${detail.title}, photo ${index + 1}`}
                  />
                </button>
              ))}
            </div>
          )}
          <p className={styles.importPrice}>{priceRange(detail, currency)}</p>
          <p className={styles.fullDescription}>
            {detail.description || "No description added."}
          </p>
          <div className={styles.variantTable}>
            <table>
              <caption>Variants in this preview</caption>
              <thead>
                <tr>
                  <th>Variant</th>
                  <th>SKU</th>
                  <th>Price</th>
                </tr>
              </thead>
              <tbody>
                {detail.variants.map((variant) => (
                  <tr key={variant.id}>
                    <td>{variant.title}</td>
                    <td>{variant.sku || "—"}</td>
                    <td>{shopifyPrice(variant.price, currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {(detail.variantsTruncated || detail.mediaTruncated) && (
            <p className={styles.fine}>
              More variants or photos will be fetched when preparing the import.
            </p>
          )}
          {href && (
            <div className={styles.actions}>
              <a
                className={styles.adminLink}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open in Shopify ↗
              </a>
            </div>
          )}
        </ReviewDialog>
      )}
      {shopify.importReview && (
        <ImportReview
          onImported={() => setSelected([])}
          key={shopify.importReview.products
            .map((product) => product.id)
            .join("|")}
        />
      )}
    </section>
  );
}
