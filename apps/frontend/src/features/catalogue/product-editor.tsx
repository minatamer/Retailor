"use client";
import { useState } from "react";
import Image from "next/image";
import { CategorySchema } from "@retailor/contracts/product";
import type { ProductInput } from "@retailor/contracts/product";
import {
  PhotoDialog,
  focusPhotoDialog,
} from "../../components/ui/photo-dialog";
import { PhotoCarousel } from "../../components/ui/photo-carousel";
import { Button } from "../../components/ui/button";
import { useSession } from "../session/context";
import type { DraftItem } from "./draft";
import { readCatalogueEdit, catalogueEditNotice } from "./edit-input";
import styles from "../../components/ui/photo-dialog.module.css";

function fieldsFor(product: ProductInput) {
  const fields: Record<string, string> = {
    title: product.title,
    category: product.category,
    description: product.description,
  };
  product.variants.forEach((variant, index) => {
    fields[`size_${index}`] = variant.size;
    fields[`colour_${index}`] = variant.colour;
    fields[`price_${index}`] = (variant.price / 100).toFixed(2);
    fields[`cost_${index}`] = (variant.unitCost / 100).toFixed(2);
    fields[`stock_${index}`] = String(variant.openingStock);
  });
  product.colourPhotos?.forEach((row, index) => {
    fields[`colourway_${index}`] = row.colour;
  });
  return fields;
}

export function ProductEditor({
  item,
  onClose,
  onLink,
}: {
  item: DraftItem;
  onClose(): void;
  onLink(): void;
}) {
  const { controller, state } = useSession(),
    product = item.product;
  const [fields, setFields] = useState(() => fieldsFor(product));
  const [order, setOrder] = useState(product.imageIds),
    [error, setError] = useState("");
  const [selected, setSelected] = useState(product.imageIds[0]);
  const images = order.filter((id) => product.imageIds.includes(id));
  const activeId = images.includes(selected ?? "") ? selected : images[0];
  const activeIndex = images.indexOf(activeId ?? "");
  const original = state.draft?.corrections.findLast(
    (correction) =>
      correction.before.imageIds.includes(activeId ?? "") &&
      correction.before.attributes.some((attribute) =>
        attribute.sourceIds.includes(activeId ?? ""),
      ),
  );
  const evidence = (
    product.attributes.some((attribute) =>
      attribute.sourceIds.includes(activeId ?? ""),
    )
      ? product
      : (original?.before ?? product)
  ).attributes.filter((attribute) =>
    attribute.sourceIds.includes(activeId ?? ""),
  );
  const input = (name: string) => ({
    name,
    value: fields[name] ?? "",
    onChange: (event: { target: { value: string } }) =>
      setFields((current) => ({ ...current, [name]: event.target.value })),
  });
  function move(id: string, direction: -1 | 1) {
    const next = [...images],
      index = next.indexOf(id),
      target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target]!, next[index]!];
    setOrder(next);
  }
  function save(form: HTMLFormElement, proceed: () => void) {
    setError("");
    if (!form.reportValidity()) return;
    try {
      const edited = readCatalogueEdit(
        { ...product, imageIds: images },
        new FormData(form),
      );
      if (
        JSON.stringify(edited) === JSON.stringify(product) ||
        controller.edit(product.id, edited)
      )
        proceed();
      else
        setError(
          "Keep a valid garment name, supported photos and distinct clothing options.",
        );
    } catch (failure) {
      setError(catalogueEditNotice(failure));
    }
  }
  return (
    <PhotoDialog title={"Edit " + product.title} onClose={onClose}>
      <form
        className={styles.editorLayout}
        onSubmit={(event) => {
          event.preventDefault();
          save(event.currentTarget, onClose);
        }}
      >
        <input type="hidden" name="primary" value={images[0]} />
        <section
          className={styles.galleryPane}
          aria-label="Product photos and photo controls"
          tabIndex={0}
        >
          <PhotoCarousel
            photos={images.map((id) => {
              const photo = controller.photos.view(id);
              return {
                id,
                name: photo?.name,
                image: photo
                  ? {
                      url: photo.url,
                      width: photo.photo.derivative.width,
                      height: photo.photo.derivative.height,
                    }
                  : undefined,
              };
            })}
            activeId={activeId}
            label={product.title}
            onSelect={setSelected}
          />
          {activeId && images.length > 1 && (
            <div className={styles.photoActions}>
              {activeIndex > 0 && (
                <Button
                  variant="secondary"
                  onClick={(event) => {
                    focusPhotoDialog(event.currentTarget);
                    setOrder([
                      activeId,
                      ...images.filter((id) => id !== activeId),
                    ]);
                  }}
                >
                  Make cover
                </Button>
              )}
              <Button
                variant="quiet"
                disabled={activeIndex === 0}
                onClick={() => move(activeId, -1)}
              >
                Move earlier
              </Button>
              <Button
                variant="quiet"
                disabled={activeIndex === images.length - 1}
                onClick={() => move(activeId, 1)}
              >
                Move later
              </Button>
              <Button
                variant="quiet"
                onClick={(event) => {
                  focusPhotoDialog(event.currentTarget);
                  controller.split(product.id, activeId);
                }}
              >
                Unlink photo
              </Button>
            </div>
          )}
          {evidence.length > 0 && (
            <ul className={styles.evidence}>
              {evidence.map((attribute) => (
                <li key={attribute.name}>
                  {attribute.name}: {attribute.value ?? "Unknown"} ·{" "}
                  {attribute.provenance.replaceAll("_", " ")} ·{" "}
                  {attribute.review}
                </li>
              ))}
            </ul>
          )}
        </section>
        <section
          className={styles.editPane}
          aria-label="Product details editor"
          tabIndex={0}
        >
          <h3 className={styles.paneHeading}>Product details</h3>
          <div className={styles.form}>
            {!!product.colourPhotos?.length && (
              <fieldset>
                <legend>Colour options</legend>
                {product.colourPhotos.map((row, colourIndex) => {
                  const photo = controller.photos.view(row.photoIds[0]!);
                  return (
                    <div className={styles.colourRow} key={colourIndex}>
                      <Button
                        variant="quiet"
                        className={styles.colourPreview}
                        aria-label={`Preview ${fields[`colourway_${colourIndex}`]} photos`}
                        onClick={() => setSelected(row.photoIds[0])}
                      >
                        {photo ? (
                          <Image
                            src={photo.url}
                            alt=""
                            width={photo.photo.derivative.width}
                            height={photo.photo.derivative.height}
                            unoptimized
                          />
                        ) : (
                          "Photo"
                        )}
                      </Button>
                      <label>
                        Colour {colourIndex + 1}
                        <input
                          name={`colourway_${colourIndex}`}
                          value={
                            fields[`colourway_${colourIndex}`] ?? row.colour
                          }
                          required
                          maxLength={32}
                          onChange={(event) => {
                            const value = event.target.value;
                            setFields((current) => ({
                              ...current,
                              [`colourway_${colourIndex}`]: value,
                              ...Object.fromEntries(
                                product.variants.flatMap((variant, index) =>
                                  variant.colour.toLowerCase() ===
                                  row.colour.toLowerCase()
                                    ? [[`colour_${index}`, value]]
                                    : [],
                                ),
                              ),
                            }));
                          }}
                        />
                      </label>
                    </div>
                  );
                })}
              </fieldset>
            )}
            <label>
              Garment name
              <input {...input("title")} required maxLength={100} />
            </label>
            <label>
              Clothing category
              <select {...input("category")}>
                {CategorySchema.options.map((category) => (
                  <option key={category} value={category}>
                    {category.replaceAll("-", " ")}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Product copy
              <textarea {...input("description")} maxLength={1000} rows={3} />
            </label>
            <p className={styles.intro}>
              One product, one set of options. Price, cost and opening stock
              below are editable demo defaults.
            </p>
            {product.variants.map((variant, option) => (
              <fieldset key={variant.id}>
                <legend>
                  {fields[`colour_${option}`]} · {fields[`size_${option}`]}
                </legend>
                <div className={styles.optionFields}>
                  <label>
                    Size
                    <input
                      {...input(`size_${option}`)}
                      required
                      maxLength={16}
                    />
                  </label>
                  {product.colourPhotos?.some(
                    (row) =>
                      row.colour.toLowerCase() === variant.colour.toLowerCase(),
                  ) ? (
                    <input type="hidden" {...input(`colour_${option}`)} />
                  ) : (
                    <label>
                      Colour
                      <input
                        {...input(`colour_${option}`)}
                        required
                        maxLength={32}
                      />
                    </label>
                  )}
                  <label>
                    Price · USD
                    <input
                      {...input(`price_${option}`)}
                      inputMode="decimal"
                      required
                    />
                  </label>
                  <label>
                    Unit cost · USD
                    <input
                      {...input(`cost_${option}`)}
                      inputMode="decimal"
                      required
                    />
                  </label>
                  <label>
                    Opening units
                    <input
                      {...input(`stock_${option}`)}
                      inputMode="numeric"
                      required
                    />
                  </label>
                </div>
              </fieldset>
            ))}
            {product.attributes.some(
              (attribute) => !attribute.sourceIds.length,
            ) && (
              <ul className={styles.evidence}>
                {product.attributes
                  .filter((attribute) => !attribute.sourceIds.length)
                  .map((attribute) => (
                    <li key={attribute.name}>
                      {attribute.name}: {attribute.value ?? "Unknown"} ·{" "}
                      {attribute.provenance.replaceAll("_", " ")} ·{" "}
                      {attribute.review}
                    </li>
                  ))}
              </ul>
            )}
          </div>
          {item.reviewReason && (
            <p className={styles.intro}>{item.reviewReason}</p>
          )}
          {error && (
            <p role="alert" className={styles.error}>
              {error}
            </p>
          )}
          <div className={styles.footer}>
            <Button
              variant="secondary"
              onClick={(event) => {
                if (event.currentTarget.form)
                  save(event.currentTarget.form, onLink);
              }}
            >
              Link more photos
            </Button>
            <Button variant="quiet" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Save changes</Button>
          </div>
        </section>
      </form>
    </PhotoDialog>
  );
}
