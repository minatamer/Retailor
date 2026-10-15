"use client";
import {
  heroPhotoCount,
  heroPhotoIds,
  pageTemplate,
} from "@retailor/contracts/design";
import type { HeroSlot } from "@retailor/contracts/design";
import { useSession } from "../session/context";
import { brandValues } from "../assistants/setup";
import { namedFiles } from "../photos/photo-picker";
import { campaignPhotos } from "../storefront/campaign";
import { storeItems } from "../storefront/browse";
import { GarmentImage } from "../storefront/gallery";
import type { StorePhoto } from "../storefront/photo";
import { TEMPLATES } from "./presets";
import styles from "./hero-photos.module.css";

export function HeroPhotos() {
  const { controller, state, heroBusy } = useSession();
  const design = state.previewDesign,
    family = pageTemplate(design, "home"),
    count = heroPhotoCount(design),
    draft = state.setup.brandDraft ?? brandValues(design),
    selected = heroPhotoIds(draft);
  const views = new Map<string, StorePhoto>();
  for (const id of controller.photos.availableIds()) {
    const view = controller.photos.view(id);
    if (view) views.set(id, { ...view, id });
  }
  const tiles = campaignPhotos(
    storeItems(state.graph, controller.photos.availableIds()),
    views,
    heroPhotoIds(design).map((id) => (id ? views.get(id) : undefined)),
    count,
  );
  const label = (id: string) => {
    const product = state.graph.products.find((item) =>
      item.imageIds.includes(id),
    );
    return product
      ? `${product.title} · Photo ${product.imageIds.indexOf(id) + 1}`
      : (views.get(id)?.name ?? "Supplied photo");
  };
  const positions =
    family === "studio"
      ? ["Left photo", "Right photo"]
      : family === "pulse"
        ? ["Left photo", "Centre photo", "Right photo"]
        : [
            "Featured photo",
            "Upper supporting photo",
            "Lower supporting photo",
          ];
  return (
    <section
      className={styles.heroes}
      aria-label="Home hero photos"
      data-hero-photos="true"
    >
      <header>
        <h3>{TEMPLATES[family].label} hero photos</h3>
        <p>
          Choose the {count} photos shown on your Home page. Automatic choices
          use your collection. Each chosen photo appears once.
        </p>
      </header>
      {positions.map((position, index) => {
        const slot = index as HeroSlot,
          id = selected[slot],
          tile = tiles.find((item) => item.slot === slot);
        return (
          <fieldset key={slot} className={styles.slot}>
            <legend>
              {String(slot + 1).padStart(2, "0")} · {position}
            </legend>
            <div className={styles.thumbnail}>
              {tile ? (
                <GarmentImage
                  photo={tile.photo}
                  title={`Hero photo ${slot + 1}: ${label(tile.photo.id)}`}
                  onFailure={(failed) =>
                    controller.photos.reportUnavailable(failed)
                  }
                />
              ) : (
                <span>Add a photo</span>
              )}
            </div>
            <label>
              Hero photo {slot + 1}
              <select
                aria-label={`Hero photo ${slot + 1}`}
                value={id ?? ""}
                onChange={(event) =>
                  controller.heroInput(slot, event.target.value || null)
                }
              >
                <option value="">Choose automatically</option>
                {id && !views.has(id) && (
                  <option value={id}>Photo unavailable · choose another</option>
                )}
                {[...views.keys()].map((photoId) => (
                  <option key={photoId} value={photoId}>
                    {label(photoId)}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.upload}>
              Upload photo {slot + 1}
              <input
                type="file"
                aria-label={`Upload hero photo ${slot + 1}`}
                disabled={heroBusy}
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => {
                  const file = namedFiles(event.target.files)[0];
                  event.target.value = "";
                  if (file) void controller.uploadHero(file, slot);
                }}
              />
            </label>
            <p className={styles.caption}>
              {tile
                ? `${id ? "Selected" : "Automatic"}: ${label(tile.photo.id)}`
                : "Only available photos appear in the preview. Choose or upload one for this position."}
            </p>
          </fieldset>
        );
      })}
      {heroBusy && <p role="status">Checking your hero photo…</p>}
      <p>
        Optional static JPEG, PNG or WebP · up to 4 MiB each. Hero uploads stay
        separate from product recognition.
      </p>
    </section>
  );
}
