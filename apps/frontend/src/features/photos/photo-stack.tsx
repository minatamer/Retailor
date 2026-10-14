import Image from "next/image";
import type { PhotoView } from "./controller";
import styles from "./photo-stack.module.css";

export function PhotoStack({
  photos,
  count = photos.length,
  label,
  showCount = true,
  onFailure,
}: {
  photos: readonly PhotoView[];
  count?: number;
  label: string;
  showCount?: boolean;
  onFailure?(id: string): void;
}) {
  return (
    <span className={styles.stack} data-linked={count > 1}>
      {photos.length ? (
        photos.slice(0, 3).map((item, index) => (
          <span key={item.photo.id} className={styles.layer} data-layer={index}>
            <Image
              src={item.url}
              alt={index === 0 ? label : ""}
              width={item.photo.derivative.width}
              height={item.photo.derivative.height}
              unoptimized
              onError={() => onFailure?.(item.photo.id)}
            />
          </span>
        ))
      ) : (
        <span className={styles.missing}>Photo needs repair</span>
      )}
      {showCount && (
        <span className={styles.count}>
          {count} {count === 1 ? "photo" : "linked photos"}
        </span>
      )}
    </span>
  );
}
