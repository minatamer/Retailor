"use client";
import type { Product } from "@retailor/contracts/product";
import { colourImageIds } from "@retailor/contracts/product";
import { useSession } from "../session/context";
import { GarmentImage } from "../storefront/gallery";
import { Icon } from "../../components/ui/icon";
import styles from "./registers.module.css";
export function RecordPhoto({
  product,
  colour,
}: {
  product: Product | undefined;
  colour?: string | undefined;
}) {
  const { controller } = useSession();
  const id =
    product &&
    colourImageIds(product, colour).find((photoId) =>
      controller.photos.availableIds().has(photoId),
    );
  const photo = id ? controller.photos.view(id) : undefined;
  return (
    <div className={styles.thumbnail}>
      {photo && id && product ? (
        <GarmentImage
          photo={{ ...photo, id }}
          title={product.title}
          onFailure={(missing) => controller.photos.reportUnavailable(missing)}
        />
      ) : (
        <span role="img" aria-label="Photo unavailable">
          <Icon name="garment" />
        </span>
      )}
    </div>
  );
}
export function MetricStrip({
  items,
}: {
  items: readonly { label: string; value: string | number; note?: string }[];
}) {
  return (
    <div className={styles.metrics}>
      {items.map((item) => (
        <div key={item.label}>
          <span>{item.label}</span>
          <strong>{item.value}</strong>
          {item.note && <small>{item.note}</small>}
        </div>
      ))}
    </div>
  );
}
