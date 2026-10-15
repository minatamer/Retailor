"use client";
import { useState, useSyncExternalStore } from "react";
import {
  PhotoDialog,
  focusPhotoDialog,
} from "../../components/ui/photo-dialog";
import { PhotoCarousel } from "../../components/ui/photo-carousel";
import { Button } from "../../components/ui/button";
import type { PhotoController } from "./controller";
import { namedFiles } from "./named-files";
import styles from "../../components/ui/photo-dialog.module.css";
import photoStyles from "./photos.module.css";

export function PhotoEditor({
  controller,
  photoId,
  onClose,
}: {
  controller: PhotoController;
  photoId: string;
  onClose(): void;
}) {
  const state = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot,
  );
  const [selected, setSelected] = useState(photoId);
  const item =
    state.items.find((photo) => photo.photo.id === selected) ?? state.items[0];
  const activeId = item?.photo.id;
  const index = state.items.findIndex((photo) => photo.photo.id === activeId);
  return (
    <PhotoDialog title="Preview your photos" onClose={onClose}>
      <div className={styles.editorLayout}>
        <section
          className={styles.galleryPane}
          aria-label="Selected photo previews"
          tabIndex={0}
        >
          <PhotoCarousel
            photos={state.items.map((photo) => ({
              id: photo.photo.id,
              name: photo.name,
              image: {
                url: photo.url,
                width: photo.photo.derivative.width,
                height: photo.photo.derivative.height,
              },
            }))}
            activeId={activeId}
            label="Selected"
            coverPhoto={false}
            onSelect={setSelected}
          />
        </section>
        <section
          className={styles.editPane}
          aria-label="Selected photo actions"
          tabIndex={0}
        >
          {item && activeId ? (
            <>
              <h3 className={styles.paneHeading}>Photo {index + 1}</h3>
              <p className={styles.photoName}>{item.name}</p>
              <p className={styles.intro}>
                These are your selected photos. Garments and matching views will
                be suggested when you create the product draft.
              </p>
              <div className={styles.photoActions}>
                <label className={photoStyles.replace}>
                  Replace photo
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    disabled={state.busy}
                    aria-label={"Replace photo " + (index + 1)}
                    onChange={(event) => {
                      const files = namedFiles(event.target.files);
                      event.target.value = "";
                      void controller.add(files, activeId);
                    }}
                  />
                </label>
                <Button
                  variant="quiet"
                  disabled={state.busy}
                  onClick={(event) => {
                    focusPhotoDialog(event.currentTarget);
                    void controller.remove(activeId);
                  }}
                >
                  Remove photo
                </Button>
              </div>
            </>
          ) : (
            <p className={styles.intro}>
              No photos remain. Close the preview to choose more photos.
            </p>
          )}
          <p role="status" className={styles.intro}>
            {state.notice}
          </p>
          <div className={styles.footer}>
            <Button onClick={onClose}>Done</Button>
          </div>
        </section>
      </div>
    </PhotoDialog>
  );
}
