"use client";
import Image from "next/image";
import { Button } from "./button";
import styles from "./photo-dialog.module.css";

export interface EditorPhoto {
  id: string;
  name: string | undefined;
  image: { url: string; width: number; height: number } | undefined;
}

/** Selection is presentation only; the caller owns photo order and all edits. */
export function PhotoCarousel({
  photos,
  activeId,
  label,
  coverPhoto = true,
  onSelect,
}: {
  photos: EditorPhoto[];
  activeId: string | undefined;
  label: string;
  coverPhoto?: boolean;
  onSelect(id: string): void;
}) {
  const index = Math.max(
      0,
      photos.findIndex((photo) => photo.id === activeId),
    ),
    active = photos[index];
  if (!active) return <p className={styles.intro}>No photos are available.</p>;
  function select(offset: -1 | 1) {
    const next = photos[index + offset];
    if (next) onSelect(next.id);
  }
  return (
    <div
      className={styles.carousel}
      role="region"
      aria-roledescription="carousel"
      aria-label={`${label} photos`}
      onKeyDown={(event) => {
        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
        event.preventDefault();
        select(event.key === "ArrowLeft" ? -1 : 1);
      }}
    >
      <div className={styles.viewer} tabIndex={0} aria-label="Photo viewer">
        <figure key={active.id} className={styles.slide}>
          {active.image ? (
            <Image
              src={active.image.url}
              alt={`${label}, ${coverPhoto && index === 0 ? "cover" : `photo ${index + 1}`}`}
              width={active.image.width}
              height={active.image.height}
              unoptimized
            />
          ) : (
            <p>Photo needs repair</p>
          )}
          <figcaption>
            {coverPhoto && index === 0 ? "Cover photo" : `Photo ${index + 1}`}
          </figcaption>
        </figure>
        {photos.length > 1 && (
          <div className={styles.carouselNavigation}>
            <Button
              variant="secondary"
              aria-label="Previous photo"
              disabled={index === 0}
              onClick={() => select(-1)}
            >
              ←
            </Button>
            <span role="status" aria-live="polite">
              {index + 1} / {photos.length}
            </span>
            <Button
              variant="secondary"
              aria-label="Next photo"
              disabled={index === photos.length - 1}
              onClick={() => select(1)}
            >
              →
            </Button>
          </div>
        )}
      </div>
      {photos.length > 1 && (
        <div
          className={styles.thumbnails}
          role="group"
          aria-label="Choose a photo"
        >
          {photos.map((photo, position) => (
            <button
              key={photo.id}
              type="button"
              aria-label={`Show photo ${position + 1}${coverPhoto && position === 0 ? ", cover" : ""}`}
              aria-pressed={photo.id === active.id}
              onClick={() => onSelect(photo.id)}
            >
              {photo.image ? (
                <Image
                  src={photo.image.url}
                  alt=""
                  width={photo.image.width}
                  height={photo.image.height}
                  unoptimized
                />
              ) : (
                <span>Repair</span>
              )}
              <span>{position + 1}</span>
            </button>
          ))}
        </div>
      )}
      <p className={styles.photoName}>{active.name}</p>
    </div>
  );
}
