"use client";
import { useState } from "react";
import { CategorySchema } from "@retailor/contracts/product";
import { Button } from "../../components/ui/button";
import { useSession } from "../session/context";
import { namedFiles } from "../photos/photo-picker";
import { GarmentImage } from "../storefront/gallery";
import { Field, SelectField } from "./fields";
import type { OwnerForm } from "./state";
import styles from "./operations.module.css";
export function ProductForm() {
  const [clothingConfirmed, setClothingConfirmed] = useState(false);
  const { controller, ownerForm, ownerPhotoBusy, ownerNotice, state } =
    useSession();
  if (!ownerForm) return null;
  const form = ownerForm,
    current = state.graph.products.find((p) => p.id === form.targetId);
  const patch = (
    id: string,
    key: keyof OwnerForm["variants"][number],
    value: string,
  ) =>
    controller.editOwnerRows(
      "variants",
      form.variants.map((v) => (v.id === id ? { ...v, [key]: value } : v)),
    );
  return (
    <>
      <label className={styles.upload}>
        <strong>Clothing photograph · required</strong>
        <span>
          Choose a photo you own or have permission to use. It is checked for
          valid raster bytes locally. Fabric and fit remain unconfirmed.
        </span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={ownerPhotoBusy || !clothingConfirmed}
          aria-describedby="owner-photo-guidance"
          onChange={(event) => {
            const file = namedFiles(event.target.files)[0];
            event.target.value = "";
            if (file) void controller.uploadOwnerPhoto(file);
          }}
        />
        {ownerPhotoBusy && <span role="status">Checking your photograph…</span>}
      </label>
      <label className={styles.check}>
        <input
          type="checkbox"
          checked={clothingConfirmed}
          onChange={(event) => setClothingConfirmed(event.target.checked)}
        />
        This upload shows clothing, rather than a logo or illustration.
      </label>
      <p id="owner-photo-guidance">
        JPEG, PNG or static WebP · 4 MiB per original. Upload adds a view;
        remove an old view to replace it. A missing photograph cannot unlock the
        review.
      </p>
      {!form.photoIds.length && (
        <p role="status">
          A clothing photograph is required before this garment can be reviewed.
        </p>
      )}
      {ownerNotice &&
        /photo|image|webp|jpeg|png|decode|format/i.test(ownerNotice) && (
          <p role="status">{ownerNotice}</p>
        )}
      <div className={styles.photos}>
        {form.photoIds.map((id) => {
          const photo = controller.photos.view(id);
          return (
            <figure key={id}>
              {photo ? (
                <GarmentImage
                  photo={{ ...photo, id }}
                  title="Selected clothing photo for this product draft"
                  onFailure={(id) => controller.photos.reportUnavailable(id)}
                />
              ) : (
                <p>Photo unavailable</p>
              )}
              <button
                type="button"
                onClick={() =>
                  controller.editOwnerRows(
                    "photoIds",
                    form.photoIds.filter((p) => p !== id),
                  )
                }
              >
                Remove photo
              </button>
            </figure>
          );
        })}
      </div>
      <details className={styles.acceptedPhotos}>
        <summary>Reuse an accepted clothing photo</summary>
        <p>
          Select deliberately from this workspace. Logo candidates are separate
          and never appear here.
        </p>
        <div className={styles.photoChoices}>
          {state.graph.photos
            .filter(
              (photo) =>
                state.graph.products.some((product) =>
                  product.imageIds.includes(photo.id),
                ) &&
                controller.photos.availableIds().has(photo.id) &&
                !form.photoIds.includes(photo.id),
            )
            .map((photo) => {
              const view = controller.photos.view(photo.id);
              const title =
                state.graph.products.find((p) => p.imageIds.includes(photo.id))
                  ?.title ?? "Accepted clothing photo";
              return view ? (
                <button
                  key={photo.id}
                  type="button"
                  disabled={form.photoIds.length >= 8 || ownerPhotoBusy}
                  onClick={() =>
                    controller.editOwnerRows("photoIds", [
                      ...form.photoIds,
                      photo.id,
                    ])
                  }
                >
                  <GarmentImage
                    photo={{ ...view, id: photo.id }}
                    title={title}
                    onFailure={(id) => controller.photos.reportUnavailable(id)}
                  />
                  <span>Use {title}</span>
                </button>
              ) : null;
            })}
        </div>
      </details>
      <SelectField
        name="productState"
        label="Storefront availability"
        choices={[
          { id: "active", label: "Offer this garment in the store" },
          { id: "archived", label: "Keep history; archive from shopping" },
        ]}
      />
      <Field name="title" label="Garment title" maxLength={100} />
      <SelectField
        name="category"
        label="Clothing category"
        choices={CategorySchema.options.map((id) => ({
          id,
          label: id.replaceAll("-", " "),
        }))}
      />
      <Field
        name="description"
        label="Description you can confirm"
        area
        maxLength={1000}
      />
      <p>
        Price, future unit cost, inventory and sizes are disclosed demo
        assumptions. Photographs do not establish measurements, fabric or fit.
      </p>
      <SelectField
        name="sizingSystemId"
        label="Named sizing convention"
        choices={[
          { id: "alpha-demo", label: "Demo alpha sizes" },
          { id: "waist-inseam-demo", label: "Demo waist / inseam" },
          { id: "regional-demo", label: "Demo regional labels" },
          { id: "chest-length-demo", label: "Demo chest / length" },
          { id: "one-size-demo", label: "Demo single option" },
          { id: "pending-demo", label: "Unconfirmed options" },
        ]}
      />
      <div className={styles.variants}>
        {form.variants.map((variant, index) => (
          <fieldset key={variant.id}>
            <legend>
              Option {index + 1}
              {variant.archived ? " · Archived" : ""}
            </legend>
            <div className={styles.group}>
              {(
                [
                  ["size", "Size label"],
                  ["colour", "Colour label"],
                  ["sku", "SKU"],
                  ["price", "Price · USD"],
                  ["cost", "Future unit cost · USD"],
                  [
                    "stock",
                    current?.variants.some((v) => v.id === variant.id)
                      ? "Original opening units (use Inventory to adjust)"
                      : "Starting demo units",
                  ],
                ] as const
              ).map(([key, label]) => (
                <label className={styles.field} key={key}>
                  <span>{label}</span>
                  <input
                    value={variant[key]}
                    maxLength={
                      key === "size"
                        ? 16
                        : key === "colour"
                          ? 32
                          : key === "sku"
                            ? 40
                            : 16
                    }
                    inputMode={
                      key === "price" || key === "cost"
                        ? "decimal"
                        : key === "stock"
                          ? "numeric"
                          : "text"
                    }
                    readOnly={
                      key === "stock" &&
                      !!current?.variants.some((v) => v.id === variant.id)
                    }
                    onChange={(event) =>
                      patch(variant.id, key, event.target.value)
                    }
                  />
                </label>
              ))}
            </div>
            <label className={styles.check}>
              <input
                type="checkbox"
                checked={variant.archived}
                onChange={(event) =>
                  controller.editOwnerRows(
                    "variants",
                    form.variants.map((v) =>
                      v.id === variant.id
                        ? { ...v, archived: event.target.checked }
                        : v,
                    ),
                  )
                }
              />
              Stop selling this option; preserve its history
            </label>
            <Button
              type="button"
              variant="quiet"
              disabled={form.variants.length < 2}
              onClick={() =>
                controller.editOwnerRows(
                  "variants",
                  form.variants.filter((v) => v.id !== variant.id),
                )
              }
            >
              Remove option
            </Button>
          </fieldset>
        ))}
      </div>
      <Button
        type="button"
        variant="secondary"
        disabled={form.variants.length >= 24}
        onClick={() => controller.addOwnerVariant()}
      >
        Add another option
      </Button>
    </>
  );
}
