import type { Design } from "@retailor/contracts/design";
import { heroPhotoCount, heroPhotoIds } from "@retailor/contracts/design";
import { Icon } from "../../components/ui/icon";
import type { StoreItem } from "./browse";
import { GarmentImage } from "./gallery";
import type { StorePhoto } from "./gallery";
import styles from "./storefront.module.css";

import { campaignPhotos } from "./campaign";

/** Compose real, distinct garments; a small catalogue never invents extra views. */
export function HomeCampaign({
  design,
  items,
  photos,
  select,
  explore,
  onFailure,
}: {
  design: Design;
  items: readonly StoreItem[];
  photos: ReadonlyMap<string, StorePhoto>;
  select(id: string): void;
  explore(): void;
  onFailure(id: string): void;
}) {
  const tiles = campaignPhotos(
    items,
    photos,
    heroPhotoIds(design).map((id) => (id ? photos.get(id) : undefined)),
    heroPhotoCount(design),
  );
  return (
    <section className={styles.campaign} data-tiles={tiles.length}>
      <div className={styles.campaignCaption} data-tailor-target="store-home">
        <div>
          <h1>{design.headline || "Made for your everyday."}</h1>
          <div className={styles.campaignMeta}>
            <span>{design.name} / The collection</span>
            <span>
              {String(items.length).padStart(2, "0")}{" "}
              {items.length === 1 ? "garment" : "garments"}
            </span>
          </div>
        </div>
        <button className={styles.primary} onClick={explore}>
          Shop the collection <Icon name="arrow" />
        </button>
      </div>
      {tiles.length ? (
        <div className={styles.campaignImages}>
          {tiles.map(({ photo, item, slot }) => (
            <figure key={photo.id} className={styles.campaignTile}>
              <button
                onClick={() => (item ? select(item.product.id) : explore())}
                onFocus={(event) => {
                  const strip =
                    event.currentTarget.parentElement?.parentElement;
                  if (strip && strip.scrollWidth > strip.clientWidth)
                    event.currentTarget.scrollIntoView({
                      behavior: "smooth",
                      block: "nearest",
                      inline: "start",
                    });
                }}
                aria-label={
                  item
                    ? `Discover ${item.product.title}`
                    : "Explore the collection"
                }
              >
                <GarmentImage
                  photo={photo}
                  title={
                    item?.product.title ??
                    `Supplied hero image for ${design.name}`
                  }
                  eager
                  onFailure={onFailure}
                />
                <span className={styles.campaignNumber}>0{slot + 1}</span>
              </button>
              <figcaption>
                <span>
                  {item?.product.title ?? "Your collection, your world"}
                </span>
                <Icon name="arrow" size={15} />
              </figcaption>
            </figure>
          ))}
        </div>
      ) : (
        <div className={styles.noPhoto}>
          <span>Your clothing photographs need repair.</span>
          <p>
            Reselect them in the owner workspace to bring this collection into
            view.
          </p>
        </div>
      )}
    </section>
  );
}
