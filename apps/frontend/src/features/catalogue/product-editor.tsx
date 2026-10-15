"use client";
import { CATEGORY_LABELS } from "@retailor/contracts/product";
import { useRef, useState } from "react";
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
import { sizeOptionFields, suggestSizeOption } from "./size-options";
import styles from "../../components/ui/photo-dialog.module.css";

function fieldsFor(product: ProductInput) {
  const fields: Record<string, string> = {
    title: product.title,
    category: product.category,
    description: product.description,
  };
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
  const reviewReason =
    item.linkOrigin === "development-fixture" &&
    item.reviewReason ===
      "Automatic linking simulation; review the matching views and colour options."
      ? ""
      : item.reviewReason;
  const [fields, setFields] = useState(() => fieldsFor(product));
  const [optionRows, setOptions] = useState(() =>
    product.variants.map((variant) => ({
      original: variant,
      fields: sizeOptionFields(variant),
    })),
  );
  const [originalOptionIds] = useState(
    () => new Set(product.variants.map((row) => row.id)),
  );
  const options = optionRows.filter(
    (row) =>
      product.variants.some((variant) => variant.id === row.original.id) ||
      (!originalOptionIds.has(row.original.id) &&
        product.variants.some(
          (variant) =>
            variant.colour.toLowerCase() === row.original.colour.toLowerCase(),
        )),
  );
  const focusOption = useRef<string | null>(null);
  const [optionNotice, setOptionNotice] = useState("");
  const optionLimit = Math.min(
    24,
    288 -
      (state.draft?.items
        .filter((row) => row.product.id !== product.id)
        .reduce((total, row) => total + row.product.variants.length, 0) ?? 0),
  );
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
  const optionInput = (
    index: number,
    name: "size" | "colour" | "price" | "cost" | "stock",
  ) => ({
    name: `${name}_${index}`,
    value: options[index]!.fields[name],
    onChange: (event: { target: { value: string } }) =>
      setOptions((current) =>
        current.map((row) =>
          row.original.id === options[index]!.original.id
            ? { ...row, fields: { ...row.fields, [name]: event.target.value } }
            : row,
        ),
      ),
  });
  function addSize(afterId: string) {
    if (options.length >= optionLimit) return;
    const next = suggestSizeOption(
      options.map((row) => row.fields),
      afterId,
      product.sizingSystemId,
      crypto.randomUUID(),
    );
    const index = options.findIndex((row) => row.original.id === afterId);
    if (!next || index < 0) return;
    const source = options[index]!.original;
    focusOption.current = next.id;
    setOptions([
      ...options.slice(0, index + 1),
      { original: { ...source, id: next.id, sku: next.sku }, fields: next },
      ...options.slice(index + 1),
    ]);
    setOptionNotice(
      next.size
        ? "Next size suggested. Price, unit cost and opening units copied; review before saving."
        : "Enter the new size. Price, unit cost and opening units copied; review before saving.",
    );
  }
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
        {
          ...product,
          imageIds: images,
          variants: options.map((row) => row.original),
        },
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
                  const form = event.currentTarget.form;
                  if (form)
                    save(form, () => {
                      if (controller.split(product.id, activeId)) onClose();
                      else
                        setError(
                          (state.draft?.items.length ?? 0) >= 20
                            ? "This draft has reached 20 garments. Link matching cards before separating another photo."
                            : "This photo could not be separated. Your saved edits are kept; review the current draft and try again.",
                        );
                    });
                }}
              >
                Separate photo
              </Button>
            </div>
          )}
          {images.length > 1 && (
            <p className={styles.intro}>
              Separating creates another draft garment. Review and include it
              before continuing.
            </p>
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
                            }));
                            setOptions((current) =>
                              current.map((option) =>
                                option.original.colour.toLowerCase() ===
                                row.colour.toLowerCase()
                                  ? {
                                      ...option,
                                      fields: {
                                        ...option.fields,
                                        colour: value,
                                      },
                                    }
                                  : option,
                              ),
                            );
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
                    {CATEGORY_LABELS[category]}
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
            {options.map(
              ({ original: variant, fields: optionFields }, option) => (
                <fieldset key={variant.id}>
                  <legend>
                    {optionFields.colour} · {optionFields.size || "New size"}
                  </legend>
                  <div className={styles.optionFields}>
                    <label>
                      Size
                      <input
                        {...optionInput(option, "size")}
                        ref={(element) => {
                          if (element && focusOption.current === variant.id) {
                            element.focus();
                            focusOption.current = null;
                          }
                        }}
                        required
                        maxLength={16}
                      />
                    </label>
                    {product.colourPhotos?.some(
                      (row) =>
                        row.colour.toLowerCase() ===
                        variant.colour.toLowerCase(),
                    ) ? (
                      <input type="hidden" {...optionInput(option, "colour")} />
                    ) : (
                      <label>
                        Colour
                        <input
                          {...optionInput(option, "colour")}
                          required
                          maxLength={32}
                        />
                      </label>
                    )}
                    <label>
                      Price · USD
                      <input
                        {...optionInput(option, "price")}
                        inputMode="decimal"
                        required
                      />
                    </label>
                    <label>
                      Unit cost · USD
                      <input
                        {...optionInput(option, "cost")}
                        inputMode="decimal"
                        required
                      />
                    </label>
                    <label>
                      Opening units
                      <input
                        {...optionInput(option, "stock")}
                        inputMode="numeric"
                        required
                      />
                    </label>
                  </div>
                  <div className={styles.optionActions}>
                    {!optionFields.archived &&
                      !options
                        .slice(option + 1)
                        .some(
                          (row) =>
                            !row.fields.archived &&
                            row.fields.colour.trim().toLowerCase() ===
                              optionFields.colour.trim().toLowerCase(),
                        ) && (
                        <Button
                          variant="secondary"
                          disabled={options.length >= optionLimit}
                          aria-label={`Add size for ${optionFields.colour}`}
                          onClick={() => addSize(variant.id)}
                        >
                          Add size
                        </Button>
                      )}
                    {!product.variants.some((row) => row.id === variant.id) && (
                      <Button
                        variant="quiet"
                        aria-label={`Remove added size ${optionFields.size || "option"} for ${optionFields.colour}`}
                        onClick={(event) => {
                          focusPhotoDialog(event.currentTarget);
                          setOptions((current) =>
                            current.filter(
                              (row) => row.original.id !== variant.id,
                            ),
                          );
                          setOptionNotice(
                            "Added size removed. Other edits are kept.",
                          );
                        }}
                      >
                        Remove size
                      </Button>
                    )}
                  </div>
                </fieldset>
              ),
            )}
            {(options.length >= optionLimit || optionNotice) && (
              <p role="status" className={styles.intro}>
                {options.length >= optionLimit
                  ? optionLimit === 24
                    ? "This garment has the maximum of 24 size and colour options."
                    : "This draft has reached its size and colour option limit."
                  : optionNotice}
              </p>
            )}
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
          {reviewReason && <p className={styles.intro}>{reviewReason}</p>}
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
