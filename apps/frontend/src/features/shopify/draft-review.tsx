"use client";
import Image from "next/image";
import { CATEGORY_LABELS } from "@retailor/contracts/product";
import type { ShopifyStatus } from "@retailor/contracts/shopify";
import { formatUsd } from "@retailor/commerce/money";
import { Button } from "../../components/ui/button";
import { Icon } from "../../components/ui/icon";
import { LoadingMark } from "../../components/ui/loading-state";
import { GarmentGallery } from "../storefront/gallery";
import type { StorePhoto } from "../storefront/gallery";
import type { ShopifyReview } from "./controller";
import { ReviewDialog } from "./review-dialog";
import styles from "./draft-review.module.css";

export function DraftReview({
  review,
  destination,
  busy,
  verified,
  notice,
  reference,
  photo,
  onPhotoFailure,
  onClose,
  onConfirm,
}: {
  review: ShopifyReview;
  destination: Pick<ShopifyStatus, "name" | "shop"> | null;
  busy: boolean;
  verified: boolean;
  notice: string | null;
  reference: string | null;
  photo(id: string): StorePhoto | undefined;
  onPhotoFailure(id: string): void;
  onClose(): void;
  onConfirm(): void;
}) {
  const count = review.products.length,
    variantCount = review.products.reduce(
      (total, product) =>
        total + product.variants.filter((variant) => !variant.archived).length,
      0,
    );
  return (
    <ReviewDialog
      title={review.update ? "Review draft update" : "Review draft export"}
      eyebrow="Shopify connection"
      onClose={onClose}
      footer={
        <>
          {!busy && notice && (
            <p className={styles.error} role="alert">
              {notice}
              {reference ? ` Request reference: ${reference}` : ""}
            </p>
          )}
          <div className={styles.footer}>
            <div className={styles.summary}>
              <strong>
                {count} {count === 1 ? "garment" : "garments"} ready to{" "}
                {review.update ? "update" : "export"}
              </strong>
              <span>
                {variantCount} {variantCount === 1 ? "variant" : "variants"} ·{" "}
                {review.update
                  ? "Exported photos stay unchanged"
                  : "Photos included"}
              </span>
            </div>
            <div className={styles.actions}>
              <Button variant="secondary" onClick={onClose}>
                {busy ? "Close and check outcome later" : "Cancel review"}
              </Button>
              <Button
                disabled={busy || !verified}
                aria-busy={busy}
                onClick={onConfirm}
              >
                {busy
                  ? "Writing reviewed drafts…"
                  : review.update
                    ? "Update owned draft"
                    : "Export as drafts"}
                {busy ? <LoadingMark /> : <Icon name="arrow" size={17} />}
              </Button>
            </div>
          </div>
        </>
      }
    >
      <div className={styles.destination}>
        <div className={styles.store}>
          <div className={styles.shopify}>
            <Image
              src="/integrations/shopify-logo.svg"
              alt="Shopify"
              width={100}
              height={30}
            />
          </div>
          <div>
            <span className={styles.label}>Destination store</span>
            <strong>
              {destination?.name ?? destination?.shop ?? "Connected store"}
            </strong>
            <span className={styles.domain}>{destination?.shop}</span>
          </div>
        </div>
        <span className={styles.draftBadge}>
          <span />
          Draft only
        </span>
      </div>
      <div className={styles.collection}>
        <Icon name="garment" size={18} />
        <p>
          {review.update
            ? "Update your reviewed fields in the"
            : "Add these garments to the"}{" "}
          <strong>Retailor</strong> collection.
        </p>
        <span>
          {count} {count === 1 ? "product" : "products"}
        </span>
      </div>
      <div className={styles.products}>
        {review.products.map((product, index) => {
          const variants = product.variants.filter(
              (variant) => !variant.archived,
            ),
            photos = product.imageIds.flatMap((id) => {
              const value = photo(id);
              return value ? [value] : [];
            });
          return (
            <article className={styles.product} key={product.id}>
              <div className={styles.gallery}>
                <GarmentGallery
                  photos={photos}
                  title={product.title}
                  onFailure={onPhotoFailure}
                />
                {photos.length < product.imageIds.length && (
                  <p className={styles.missingPhoto}>
                    A reviewed photo is unavailable. Repair it before exporting.
                  </p>
                )}
              </div>
              <div className={styles.productDetails}>
                <div className={styles.productHeading}>
                  <span className={styles.label}>
                    {CATEGORY_LABELS[product.category]}
                  </span>
                  <span className={styles.index}>
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>
                <h3>Retailor demo — {product.title}</h3>
                <p className={styles.description}>
                  {product.description || "No description added."}
                </p>
                <div className={styles.variantHeading}>
                  <h4>Variants & pricing</h4>
                  <span>
                    {variants.length}{" "}
                    {variants.length === 1 ? "variant" : "variants"} · USD
                  </span>
                </div>
                <div className={styles.variants}>
                  <table>
                    <caption className={styles.srOnly}>
                      Reviewed variants for {product.title}
                    </caption>
                    <thead>
                      <tr>
                        <th scope="col">Colour / size</th>
                        <th scope="col">SKU</th>
                        <th scope="col">Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {variants.map((variant) => (
                        <tr key={variant.id}>
                          <td>
                            <strong>{variant.colour}</strong>
                            <span>{variant.size}</span>
                          </td>
                          <td>
                            <code>{variant.sku}</code>
                          </td>
                          <td>{formatUsd(variant.price)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </article>
          );
        })}
      </div>
      <div className={styles.note}>
        <Icon name="info" size={17} />
        <div>
          <p>
            Stock, costs, tax, discounts and checkout stay in Retailor.
            {review.update
              ? " Update keeps the current exported photos."
              : " Only the reviewed fields and photos are shared."}
          </p>
          <p>
            Cleanup is requested at demo end. Lost access can require manual
            removal.
          </p>
        </div>
      </div>
    </ReviewDialog>
  );
}
