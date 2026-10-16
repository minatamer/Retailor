"use client";
import { CATEGORY_LABELS } from "@retailor/contracts/product";
import { useState } from "react";
import { formatUsd } from "@retailor/commerce/money";
import { Button } from "../../components/ui/button";
import { Icon } from "../../components/ui/icon";
import { useSession } from "../session/context";
import { PhotoStack } from "../photos/photo-stack";
import { ProductEditor } from "./product-editor";
import styles from "../demo/workspace.module.css";
import photoStyles from "../photos/photos.module.css";

export function CatalogueReview() {
  const { controller, state, missingPhotoIds } = useSession();
  const [linking, setLinking] = useState(false),
    [chosen, setChosen] = useState<string[]>([]),
    [editing, setEditing] = useState<string | null>(null);
  const draft = state.draft;
  if (!draft) return null;
  const included = draft.items.filter((item) => item.included).length;
  const selected = chosen.filter((id) =>
    draft.items.some(
      (item) =>
        item.product.id === id && item.included && item.confirmedClothing,
    ),
  );
  const selectedPhotos = new Set(
    draft.items
      .filter((item) => selected.includes(item.product.id))
      .flatMap((item) => item.product.imageIds),
  );
  const edited = draft.items.find((item) => item.product.id === editing);
  return (
    <>
      <div className={styles.reviewHeading}>
        <div>
          <span className={styles.eyebrow}>Your collection, in focus</span>
          <h1>
            Review your <em>product draft.</em>
          </h1>
          <p>
            {included} garments included. Check the suggested groups, then edit
            each garment’s photos and details before personalizing your store.
          </p>
          <div className={styles.coverage}>
            <p role="status" aria-label="Photo status">
              {
                draft.dispositions.filter((item) => item.kind === "linked")
                  .length
              }{" "}
              linked ·{" "}
              {
                draft.dispositions.filter((item) => item.kind === "rejected")
                  .length
              }{" "}
              excluded ·{" "}
              {
                draft.dispositions.filter((item) => item.kind === "review")
                  .length
              }{" "}
              to review
            </p>
            {draft.dispositions
              .filter((item) => item.kind === "review")
              .map((item) => (
                <div key={item.photoId}>
                  <span>{item.reason}</span>
                  <Button
                    variant="secondary"
                    onClick={() => controller.excludeSource(item.photoId)}
                  >
                    Exclude this source
                  </Button>
                </div>
              ))}
          </div>
        </div>
        <span className={styles.count}>
          {String(included).padStart(2, "0")}
          <small>garments</small>
        </span>
      </div>
      <div className={`${styles.actionBar} ${styles.reviewActions}`}>
        <Button variant="quiet" onClick={() => controller.go("choose")}>
          Back to photos
        </Button>
        <Button
          disabled={
            !included ||
            missingPhotoIds.length > 0 ||
            draft.dispositions.some((item) => item.kind === "review")
          }
          onClick={() => controller.publish()}
        >
          Personalize store <Icon name="arrow" />
        </Button>
      </div>
      <div className={photoStyles.linkHeading}>
        <div>
          <h2>Matching photos, together.</h2>
          <p>
            Link cards showing the same garment. To separate a photo into its
            own draft garment, open its card and choose Separate photo.
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={() => {
            setLinking(!linking);
            setChosen([]);
          }}
        >
          {linking ? "Cancel linking" : "Link photos"}
        </Button>
      </div>
      {linking && (
        <div className={photoStyles.linkBar}>
          <p>
            {selectedPhotos.size
              ? `${selectedPhotos.size} photos selected`
              : "Select two or more cards of the same product."}
            {selectedPhotos.size > 0
              ? ". The first selected card keeps its product details."
              : ""}
            {selectedPhotos.size > 8
              ? " Keep up to 8 photos in one product."
              : ""}
          </p>
          <Button
            disabled={selected.length < 2 || selectedPhotos.size > 8}
            onClick={() => {
              if (controller.linkProducts(selected)) {
                setChosen([]);
                setLinking(false);
              }
            }}
          >
            Link {selectedPhotos.size || "selected"} photos
          </Button>
        </div>
      )}
      <div className={styles.catalogueGrid}>
        {draft.items.map((item) => {
          const product = item.product,
            photos = product.imageIds.flatMap(
              (id) => controller.photos.view(id) ?? [],
            ),
            checked = selected.includes(product.id);
          return (
            <article
              key={product.id}
              className={`${styles.reviewCard} ${!item.included ? styles.excluded : ""}`}
            >
              <button
                type="button"
                className={photoStyles.openPhoto}
                onClick={() => setEditing(product.id)}
                aria-label={`Edit ${product.title}${item.included ? "" : ", excluded from store"}`}
              >
                <span className={styles.reviewPhoto}>
                  <PhotoStack
                    photos={photos}
                    count={product.imageIds.length}
                    label={product.title}
                  />
                  {!item.included && (
                    <span className={styles.excludedCover}>
                      <span className={styles.excludedBadge}>
                        <Icon name="close" size={18} /> Excluded
                      </span>
                      <span className={styles.excludedCaption}>
                        Not in your store
                      </span>
                    </span>
                  )}
                </span>
                <span className={styles.cardBody}>
                  <small>
                    {CATEGORY_LABELS[product.category]} ·{" "}
                    {item.copyOrigin === "user_supplied"
                      ? "edited by you"
                      : "draft"}
                  </small>
                  <span
                    role="heading"
                    aria-level={2}
                    className={styles.productTitle}
                  >
                    {product.title}
                  </span>
                  <span>
                    {formatUsd(product.variants[0]!.price)} · Click to edit
                  </span>
                </span>
              </button>
              {linking && (
                <label className={photoStyles.reviewCheck}>
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={!item.included || !item.confirmedClothing}
                    aria-label={`Select ${product.title} photos to link`}
                    onChange={() =>
                      setChosen(
                        checked
                          ? selected.filter((id) => id !== product.id)
                          : [...selected, product.id],
                      )
                    }
                  />
                  <span>
                    {!item.included || !item.confirmedClothing
                      ? "Include and confirm this garment before linking"
                      : checked
                        ? "Selected"
                        : "Select photos"}
                  </span>
                </label>
              )}
              <div className={styles.cardMeta}>
                <span>
                  {product.imageIds.length > 1 &&
                  (item.linkOrigin === "recognition" ||
                    item.linkOrigin === "development-fixture")
                    ? item.included
                      ? "Suggested group · "
                      : "Review links · "
                    : ""}
                  {product.imageIds.length}{" "}
                  {product.imageIds.length === 1 ? "photo" : "linked photos"}
                  {(product.colourPhotos?.length ?? 0) > 1
                    ? ` · ${product.colourPhotos!.length} colours`
                    : ""}
                </span>
                <Button
                  variant={item.included ? "quiet" : "secondary"}
                  onClick={() => controller.include(product.id, !item.included)}
                >
                  {item.included ? "Exclude" : "Include garment"}
                </Button>
              </div>
            </article>
          );
        })}
      </div>
      {edited && (
        <ProductEditor
          key={edited.product.id}
          item={edited}
          onClose={() => setEditing(null)}
          onLink={() => {
            setEditing(null);
            setLinking(true);
            setChosen([edited.product.id]);
          }}
        />
      )}
    </>
  );
}
