"use client";
import { useState } from "react";
import Image from "next/image";
import { CategorySchema } from "@retailor/contracts/product";
import { formatUsd } from "@retailor/commerce/money";
import { Button } from "../../components/ui/button";
import { Icon } from "../../components/ui/icon";
import { useSession } from "../session/context";
import type { DraftItem } from "./draft";
import { readCatalogueEdit, catalogueEditNotice } from "./edit-input";
import styles from "../demo/workspace.module.css";
export function CatalogueReview() {
  const { controller, state, missingPhotoIds } = useSession(),
    [mergeIds, setMergeIds] = useState<string[]>([]);
  const draft = state.draft;
  if (!draft) return null;
  const included = draft.items.filter((item) => item.included).length;
  return (
    <>
      <div className={styles.reviewHeading}>
        <div>
          <span className={styles.eyebrow}>Your collection, in focus</span>
          <h1>
            Looking like <em>your store.</em>
          </h1>
          <p>
            {included} garments included. Open a card if you want to fine-tune
            anything.
          </p>
        </div>
        <span className={styles.count}>
          {String(included).padStart(2, "0")}
          <small>garments</small>
        </span>
      </div>
      <p className={styles.assumptions}>
        Titles and copy are drafts. Price, stock, costs and size options are
        disclosed demo defaults. Fabric, care and measurements stay unknown
        unless confirmed by you.
      </p>
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
          Make it my own <Icon name="arrow" />
        </Button>
      </div>
      {mergeIds.length > 0 && (
        <div className={styles.selectionBar}>
          <p>
            {mergeIds.length} selected · merge only when these photos show the
            same garment.
          </p>
          <Button
            disabled={mergeIds.length < 2}
            onClick={() => {
              controller.merge(mergeIds);
              setMergeIds([]);
            }}
          >
            Merge garment views
          </Button>
          <Button variant="quiet" onClick={() => setMergeIds([])}>
            Clear
          </Button>
        </div>
      )}
      <div className={styles.catalogueGrid}>
        {draft.items.map((item) => (
          <ReviewCard
            key={item.product.id}
            item={item}
            mergeSelected={mergeIds.includes(item.product.id)}
            onSelect={() =>
              setMergeIds((ids) =>
                ids.includes(item.product.id)
                  ? ids.filter((id) => id !== item.product.id)
                  : [...ids, item.product.id],
              )
            }
          />
        ))}
      </div>
      <div className={styles.coverage}>
        <h2>Every photo has a place.</h2>
        <p>
          {draft.dispositions.filter((item) => item.kind === "linked").length}{" "}
          linked ·{" "}
          {draft.dispositions.filter((item) => item.kind === "rejected").length}{" "}
          excluded ·{" "}
          {draft.dispositions.filter((item) => item.kind === "review").length}{" "}
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
    </>
  );
}
function ReviewCard({
  item,
  mergeSelected,
  onSelect,
}: {
  item: DraftItem;
  mergeSelected: boolean;
  onSelect(): void;
}) {
  const { controller } = useSession(),
    product = item.product,
    photo = controller.photos.view(product.imageIds[0]!);
  const [error, setError] = useState("");
  function save(form: FormData) {
    setError("");
    try {
      const edited = readCatalogueEdit(product, form);
      if (!controller.edit(product.id, edited))
        setError(
          "Keep a valid garment name, supported photo references and distinct clothing options.",
        );
    } catch (error) {
      setError(catalogueEditNotice(error));
    }
  }
  return (
    <article
      className={`${styles.reviewCard} ${!item.included ? styles.excluded : ""}`}
    >
      <div className={styles.cardPhoto}>
        {photo ? (
          <Image
            src={photo.url}
            alt={`Source photo for ${product.title}`}
            width={photo.photo.derivative.width}
            height={photo.photo.derivative.height}
            unoptimized
          />
        ) : (
          <span>Photo needs repair</span>
        )}
        <button
          className={styles.mergeCheck}
          type="button"
          aria-pressed={mergeSelected}
          aria-label={`Select ${product.title} for grouping`}
          onClick={onSelect}
        >
          {mergeSelected ? <Icon name="check" size={16} /> : "+"}
        </button>
        <span className={styles.photoCount}>
          {product.imageIds.length}{" "}
          {product.imageIds.length === 1 ? "photo" : "views"}
        </span>
      </div>
      <div className={styles.cardBody}>
        <small>
          {product.category.replaceAll("-", " ")} ·{" "}
          {item.copyOrigin === "user_supplied" ? "edited by you" : "draft"}
        </small>
        <h2>{product.title}</h2>
        <div className={styles.cardMeta}>
          <span>{formatUsd(product.variants[0]!.price)}</span>
          <Button
            variant="quiet"
            onClick={() => controller.include(product.id, !item.included)}
          >
            {item.included ? "Exclude" : "Include garment"}
          </Button>
        </div>
        <details>
          <summary>
            Fine-tune & sources <Icon name="arrow" size={16} />
          </summary>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              save(new FormData(event.currentTarget));
            }}
            className={styles.editForm}
          >
            <label>
              Garment name
              <input
                name="title"
                defaultValue={product.title}
                required
                maxLength={100}
              />
            </label>
            <label>
              Clothing category
              <select name="category" defaultValue={product.category}>
                {CategorySchema.options.map((category) => (
                  <option key={category} value={category}>
                    {category.replaceAll("-", " ")}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Draft copy
              <textarea
                name="description"
                defaultValue={product.description}
                maxLength={1000}
                rows={3}
              />
            </label>
            <label>
              Primary photo
              <select name="primary" defaultValue={product.imageIds[0]}>
                {product.imageIds.map((id, index) => (
                  <option key={id} value={id}>
                    Source photo {index + 1}
                  </option>
                ))}
              </select>
            </label>
            <p className={styles.finePrint}>
              {item.reviewReason || "Review only what matters to you."}
            </p>
            <p className={styles.finePrint}>
              Details without supported source evidence remain unknown. Options
              below are editable demo assumptions.
            </p>
            {product.variants.map((variant, index) => (
              <fieldset key={variant.id}>
                <legend>Demo option {index + 1}</legend>
                <div className={styles.optionFields}>
                  <label>
                    Size
                    <input
                      name={`size_${index}`}
                      defaultValue={variant.size}
                      required
                      maxLength={16}
                    />
                  </label>
                  <label>
                    Colour
                    <input
                      name={`colour_${index}`}
                      defaultValue={variant.colour}
                      required
                      maxLength={32}
                    />
                  </label>
                  <label>
                    Price · USD
                    <input
                      name={`price_${index}`}
                      defaultValue={(variant.price / 100).toFixed(2)}
                      inputMode="decimal"
                      required
                    />
                  </label>
                  <label>
                    Unit cost · USD
                    <input
                      name={`cost_${index}`}
                      defaultValue={(variant.unitCost / 100).toFixed(2)}
                      inputMode="decimal"
                      required
                    />
                  </label>
                  <label>
                    Opening units
                    <input
                      name={`stock_${index}`}
                      defaultValue={variant.openingStock}
                      inputMode="numeric"
                      required
                    />
                  </label>
                </div>
              </fieldset>
            ))}
            {product.attributes.length > 0 && (
              <ul className={styles.finePrint}>
                {product.attributes.map((attr) => (
                  <li key={attr.name}>
                    {attr.name}: {attr.value ?? "Unknown"} ·{" "}
                    {attr.provenance.replaceAll("_", " ")} · {attr.review}
                  </li>
                ))}
              </ul>
            )}
            {error && (
              <p role="alert" className={styles.error}>
                {error}
              </p>
            )}
            <Button type="submit">Save corrections</Button>
          </form>
          {product.imageIds.slice(1).map((id, index) => (
            <Button
              key={id}
              variant="quiet"
              onClick={() => controller.split(product.id, id)}
            >
              Split source photo {index + 2} into a new garment
            </Button>
          ))}
        </details>
      </div>
    </article>
  );
}
