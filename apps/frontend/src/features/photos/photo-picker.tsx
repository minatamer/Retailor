"use client";
import { useId, useSyncExternalStore } from "react";
import Image from "next/image";
import { Button } from "../../components/ui/button";
import { Icon } from "../../components/ui/icon";
import type { PhotoController, NamedPhoto } from "./controller";
import styles from "./photos.module.css";
export function namedFiles(files: FileList | null): NamedPhoto[] {
  const result: NamedPhoto[] = [];
  if (files)
    for (let i = 0; i < Math.min(files.length, 25); i++) {
      const file = files.item(i);
      if (file) result.push({ name: file.name, blob: file });
    }
  return result;
}
export function PhotoPicker({
  controller,
  onProcess,
}: {
  controller: PhotoController;
  onProcess(): void;
}) {
  const state = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot,
  );
  const id = useId();
  return (
    <section aria-labelledby={`${id}-heading`} className={styles.picker}>
      <div className={styles.selectionHeading}>
        <div>
          <p className={styles.eyebrow}>Your starting point</p>
          <h2 id={`${id}-heading`}>A collection, coming into focus.</h2>
        </div>
        <span>{state.items.length} / 24 photos</span>
      </div>
      <label className={styles.upload} htmlFor={`${id}-files`}>
        <Icon name="upload" size={28} />
        <strong>Choose your clothing photos</strong>
        <span>Static JPEG, PNG or WebP · Up to 4 MiB each</span>
        <input
          id={`${id}-files`}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          disabled={state.busy}
          onChange={(event) => {
            const files = namedFiles(event.target.files);
            event.target.value = "";
            void controller.add(files);
          }}
        />
      </label>
      <p className={styles.note}>
        Up to 24 photos, 40 MiB of originals, and 24 megapixels per photo.
        Selection and preview stay local.
      </p>
      {state.busy && (
        <div className={styles.progress} role="status">
          <span className={styles.spinner} />
          Checking your photos · {state.progress} of {state.total} checked
          <Button variant="quiet" onClick={() => controller.cancel()}>
            Cancel
          </Button>
        </div>
      )}
      <p className={styles.notice} role="status">
        {state.notice}
      </p>
      {state.items.length > 0 && (
        <ol className={styles.selectedGallery}>
          {state.items.map((item, index) => (
            <li className={styles.photoCard} key={item.photo.id}>
              <div className={styles.image}>
                <Image
                  src={item.url}
                  alt={`Selected local clothing photo ${index + 1}`}
                  width={item.photo.derivative.width}
                  height={item.photo.derivative.height}
                  unoptimized
                />
                <span>{String(index + 1).padStart(2, "0")}</span>
              </div>
              <div className={styles.photoMeta}>
                <strong>{item.name}</strong>
                <small>
                  {item.photo.source.width} × {item.photo.source.height} ·{" "}
                  {Math.ceil(item.photo.derivative.bytes / 1024)} KiB preview
                </small>
              </div>
              <div className={styles.photoActions}>
                <Button
                  variant="quiet"
                  disabled={state.busy || index === 0}
                  aria-label={`Move photo ${index + 1} earlier`}
                  onClick={() => controller.move(item.photo.id, -1)}
                >
                  ←
                </Button>
                <Button
                  variant="quiet"
                  disabled={state.busy || index === state.items.length - 1}
                  aria-label={`Move photo ${index + 1} later`}
                  onClick={() => controller.move(item.photo.id, 1)}
                >
                  →
                </Button>
                <label className={styles.replace}>
                  Replace
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    aria-label={`Replace photo ${index + 1}`}
                    disabled={state.busy}
                    onChange={(event) => {
                      const files = namedFiles(event.target.files);
                      event.target.value = "";
                      void controller.add(files, item.photo.id);
                    }}
                  />
                </label>
                <Button
                  variant="quiet"
                  disabled={state.busy}
                  aria-label={`Remove photo ${index + 1}`}
                  onClick={() => void controller.remove(item.photo.id)}
                >
                  Remove
                </Button>
              </div>
            </li>
          ))}
        </ol>
      )}
      {state.issues.length > 0 && (
        <ul className={styles.issues} aria-label="Photo selection notices">
          {state.issues.map((issue, index) => (
            <li key={index}>
              <strong>{issue.name}</strong>
              <span>{issue.message}</span>
            </li>
          ))}
        </ul>
      )}
      <div className={styles.processing}>
        <p>
          Use photos you own or have permission to use. Processing sends
          inspected previews to OpenAI to draft your catalogue. Your demo
          workspace is temporary.
        </p>
        <Button
          disabled={state.busy || !state.items.length}
          onClick={onProcess}
        >
          Review & process {state.items.length || "your"}{" "}
          {state.items.length === 1 ? "photo" : "photos"} <Icon name="arrow" />
        </Button>
      </div>
    </section>
  );
}
