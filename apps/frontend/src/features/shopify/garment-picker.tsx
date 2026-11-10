"use client";
import { useState } from "react";
import type { Product } from "@retailor/contracts/product";
import { CATEGORY_LABELS } from "@retailor/contracts/product";
import { formatUsd } from "@retailor/commerce/money";
import { Button } from "../../components/ui/button";
import { useSession } from "../session/context";
import { GarmentGallery, GarmentImage } from "../storefront/gallery";
import { exportSelection } from "./selection";
import { ReviewDialog } from "./review-dialog";
import styles from "./connections.module.css";

export function GarmentPicker({
  products,
  tracked,
  remaining,
  enabled,
  selected,
  onSelect,
}: {
  products: readonly Product[];
  tracked: ReadonlySet<string>;
  remaining: number;
  enabled: boolean;
  selected: readonly string[];
  onSelect(ids: string[]): void;
}) {
  const { controller } = useSession();
  const [viewId, setViewId] = useState<string | null>(null);
  const available = controller.photos.availableIds(),
    all = exportSelection(products, tracked, available, remaining),
    chosen = exportSelection(products, tracked, available, remaining, selected),
    view = products.find((product) => product.id === viewId);
  const photos = (product: Product) =>
    product.imageIds.flatMap((id) => {
      const photo = controller.photos.view(id);
      return photo ? [{ ...photo, id }] : [];
    });
  const failure = (id: string) => controller.photos.reportUnavailable(id);
  return (
    <>
      <div className={styles.selectionToolbar}>
        <span className={styles.fine} aria-live="polite">
          {chosen.length} selected · {remaining} exports remaining
        </span>
        <div className={styles.selectionTools}>
          <Button
            variant="secondary"
            disabled={!enabled || all.length === 0}
            onClick={() => onSelect(all)}
          >
            Select all
            {products.length > remaining ? ` (up to ${remaining})` : ""}
          </Button>
          {chosen.length > 0 && (
            <Button variant="quiet" onClick={() => onSelect([])}>
              Clear
            </Button>
          )}
        </div>
      </div>
      <div
        className={styles.garmentGrid}
        role="group"
        aria-label="Retailor garments to export"
      >
        {products.map((product) => {
          const photo = photos(product)[0],
            exported = tracked.has(product.id),
            eligible =
              exportSelection([product], tracked, available, 1).length > 0,
            checked = chosen.includes(product.id),
            variants = product.variants.filter((variant) => !variant.archived),
            price = variants.length
              ? Math.min(...variants.map((variant) => variant.price))
              : null;
          return (
            <article
              className={styles.garmentCard}
              data-selected={checked}
              key={product.id}
            >
              <div className={styles.garmentPhoto}>
                {photo ? (
                  <GarmentImage
                    photo={photo}
                    title={product.title}
                    onFailure={failure}
                  />
                ) : (
                  <span>Photo unavailable</span>
                )}
                <label className={styles.garmentSelect}>
                  <input
                    type="checkbox"
                    aria-label={`Select ${product.title}`}
                    checked={checked}
                    disabled={
                      !enabled ||
                      !eligible ||
                      (!checked && chosen.length >= remaining)
                    }
                    onChange={(event) =>
                      onSelect(
                        event.target.checked
                          ? [...chosen, product.id]
                          : chosen.filter((id) => id !== product.id),
                      )
                    }
                  />
                </label>
              </div>
              <div className={styles.garmentInfo}>
                <span className={styles.fine}>
                  {CATEGORY_LABELS[product.category]}
                </span>
                <h4>{product.title}</h4>
                <p>
                  {price !== null
                    ? `From ${formatUsd(price)}`
                    : "No active variants"}
                  <span>{variants.length} variants</span>
                </p>
                <div className={styles.garmentBottom}>
                  <span className={styles.fine}>
                    {exported
                      ? "Export tracked below"
                      : !eligible
                        ? "Needs repair"
                        : `${product.imageIds.length} photo${product.imageIds.length === 1 ? "" : "s"}`}
                  </span>
                  <Button
                    variant="quiet"
                    onClick={() => setViewId(product.id)}
                    aria-label={`View ${product.title}`}
                  >
                    View <span aria-hidden="true">↗</span>
                  </Button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
      {view && (
        <ReviewDialog title={view.title} onClose={() => setViewId(null)}>
          <div className={styles.previewGallery}>
            <GarmentGallery
              photos={photos(view)}
              title={view.title}
              onFailure={failure}
            />
          </div>
          <div className={styles.previewDescription}>
            <span className={styles.eyebrow}>
              {CATEGORY_LABELS[view.category]}
            </span>
            <p>{view.description || "No description added."}</p>
            {view.attributes.some((attribute) => attribute.value) && (
              <dl className={styles.attributes}>
                {view.attributes
                  .filter((attribute) => attribute.value)
                  .map((attribute) => (
                    <div key={attribute.name}>
                      <dt>{attribute.name}</dt>
                      <dd>{attribute.value}</dd>
                    </div>
                  ))}
              </dl>
            )}
          </div>
          <div className={styles.variantTable}>
            <table>
              <caption>Sizes, colours & prices</caption>
              <thead>
                <tr>
                  <th>Variant</th>
                  <th>SKU</th>
                  <th>Price</th>
                </tr>
              </thead>
              <tbody>
                {view.variants
                  .filter((variant) => !variant.archived)
                  .map((variant) => (
                    <tr key={variant.id}>
                      <td>
                        {variant.colour} / {variant.size}
                      </td>
                      <td>{variant.sku}</td>
                      <td>{formatUsd(variant.price)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <p className={styles.fine}>
            Local Retailor product. Viewing does not export it.
          </p>
        </ReviewDialog>
      )}
    </>
  );
}
