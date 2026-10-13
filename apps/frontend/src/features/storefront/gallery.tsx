"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import type { StorePhoto } from "./photo";
export type { StorePhoto } from "./photo";
import styles from "./storefront.module.css";
export function GarmentImage({
  photo,
  title,
  eager = false,
  onFailure,
}: {
  photo: StorePhoto;
  title: string;
  eager?: boolean;
  onFailure(id: string): void;
}) {
  return (
    <Image
      src={photo.url}
      width={photo.photo.derivative.width}
      height={photo.photo.derivative.height}
      unoptimized
      alt={title}
      loading={eager ? "eager" : "lazy"}
      onError={() => onFailure(photo.id)}
    />
  );
}
/** One real image is a full gallery. Indices refer only to supplied available photos. */
export function GarmentGallery({
  photos,
  title,
  onFailure,
}: {
  photos: readonly StorePhoto[];
  title: string;
  onFailure(id: string): void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null),
    [zoom, setZoom] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null),
    opener = useRef<HTMLButtonElement>(null);
  const selected = photos.find((photo) => photo.id === selectedId) ?? photos[0];
  const index = selected ? photos.indexOf(selected) : 0;
  useEffect(() => {
    const node = dialog.current;
    if (zoom && selected && node && !node.open) node.showModal();
    if ((!zoom || !selected) && node?.open) node.close();
  }, [zoom, selected]);
  const close = () => setZoom(false);
  const move = (offset: number) =>
    setSelectedId(photos[(index + offset + photos.length) % photos.length]!.id);
  if (!selected)
    return (
      <div className={styles.noPhoto}>
        <span>Photo unavailable</span>
        <p>Reselect the original in the owner workspace.</p>
      </div>
    );
  return (
    <div className={styles.gallery}>
      <button
        className={styles.mainPhoto}
        ref={opener}
        aria-label={`Zoom ${title}`}
        onClick={() => setZoom(true)}
      >
        <GarmentImage
          photo={selected}
          title={title}
          eager
          onFailure={onFailure}
        />
        <span className={styles.zoomHint}>View closer +</span>
      </button>
      {photos.length > 1 && (
        <div className={styles.thumbnails} aria-label="Supplied garment views">
          {photos.map((photo, i) => (
            <button
              key={photo.id}
              aria-label={`View ${i + 1} of ${title}`}
              aria-pressed={photo.id === selected.id}
              onClick={() => setSelectedId(photo.id)}
            >
              <GarmentImage
                photo={photo}
                title={`${title}, supplied view ${i + 1}`}
                onFailure={onFailure}
              />
            </button>
          ))}
        </div>
      )}
      <p className={styles.caption}>
        {photos.length === 1
          ? "One supplied photograph. Zoom for a closer look."
          : `${index + 1} / ${photos.length} supplied views`}
      </p>
      <dialog
        ref={dialog}
        className={styles.zoom}
        aria-label={`Close-up of ${title}`}
        onClose={() => opener.current?.focus({ preventScroll: true })}
        onCancel={(event) => {
          event.preventDefault();
          close();
        }}
        onKeyDown={(event) => {
          if (
            photos.length > 1 &&
            ["ArrowLeft", "ArrowRight"].includes(event.key)
          ) {
            event.preventDefault();
            move(event.key === "ArrowLeft" ? -1 : 1);
          }
        }}
      >
        <div className={styles.zoomToolbar}>
          <span>{title}</span>
          <button autoFocus onClick={close}>
            Close ×
          </button>
        </div>
        <div className={styles.zoomImage}>
          <GarmentImage
            photo={selected}
            title={`${title}, close-up`}
            eager
            onFailure={onFailure}
          />
        </div>
        {photos.length > 1 && (
          <div className={styles.zoomActions}>
            <button onClick={() => move(-1)}>← Previous</button>
            <span>
              {index + 1} / {photos.length}
            </span>
            <button onClick={() => move(1)}>Next →</button>
          </div>
        )}
      </dialog>
    </div>
  );
}
