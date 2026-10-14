"use client";
import { useState, useSyncExternalStore } from "react";
import {
  PhotoDialog,
  focusPhotoDialog,
} from "../../components/ui/photo-dialog";
import { PhotoCarousel } from "../../components/ui/photo-carousel";
import { Button } from "../../components/ui/button";
import type { PhotoController } from "./controller";
import { photoGroups } from "./links";
import { namedFiles } from "./named-files";
import styles from "../../components/ui/photo-dialog.module.css";
import photoStyles from "./photos.module.css";

export function PhotoEditor({
  controller,
  photoId,
  onClose,
  onLink,
}: {
  controller: PhotoController;
  photoId: string;
  onClose(): void;
  onLink(id: string): void;
}) {
  const state = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot,
  );
  const groups = photoGroups(
    state.items.map((item) => item.photo.id),
    state.links,
  );
  const [original] = useState(
    () => groups.find((group) => group.includes(photoId)) ?? [photoId],
  );
  const anchor = original.find((id) =>
    state.items.some((item) => item.photo.id === id),
  );
  const group = groups.find((row) => row.includes(anchor ?? "")) ?? [];
  const [selected, setSelected] = useState(photoId);
  const activeId = group.includes(selected) ? selected : group[0];
  const index = group.indexOf(activeId ?? "");
  const item = state.items.find((photo) => photo.photo.id === activeId);
  return (
    <PhotoDialog
      title={group.length > 1 ? "Edit linked photos" : "Edit photo"}
      onClose={onClose}
    >
      <div className={styles.editorLayout}>
        <section
          className={styles.galleryPane}
          aria-label="Linked photo carousel"
          tabIndex={0}
        >
          <PhotoCarousel
            photos={group.map((id) => {
              const photo = state.items.find((row) => row.photo.id === id)!;
              return {
                id,
                name: photo.name,
                image: {
                  url: photo.url,
                  width: photo.photo.derivative.width,
                  height: photo.photo.derivative.height,
                },
              };
            })}
            activeId={activeId}
            label="Product"
            onSelect={setSelected}
          />
        </section>
        <section
          className={styles.editPane}
          aria-label="Selected photo editor"
          tabIndex={0}
        >
          {item && activeId ? (
            <>
              <h3 className={styles.paneHeading}>
                {index === 0 ? "Cover photo" : "Photo " + (index + 1)}
              </h3>
              <p className={styles.photoName}>{item.name}</p>
              <div className={styles.photoActions}>
                {index > 0 && (
                  <Button
                    variant="secondary"
                    disabled={state.busy}
                    onClick={(event) => {
                      focusPhotoDialog(event.currentTarget);
                      controller.cover(activeId);
                    }}
                  >
                    Make cover
                  </Button>
                )}
                <label className={photoStyles.replace}>
                  Replace photo
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    disabled={state.busy}
                    aria-label={`Replace photo ${index + 1}`}
                    onChange={(event) => {
                      const files = namedFiles(event.target.files);
                      event.target.value = "";
                      void controller.add(files, activeId);
                    }}
                  />
                </label>
                {group.length > 1 && (
                  <Button
                    variant="quiet"
                    disabled={state.busy}
                    onClick={(event) => {
                      focusPhotoDialog(event.currentTarget);
                      controller.unlink(activeId);
                    }}
                  >
                    Unlink photo
                  </Button>
                )}
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
              {group.length > 1 && (
                <div className={styles.photoActions}>
                  <Button
                    variant="quiet"
                    disabled={state.busy || index === 0}
                    onClick={() => controller.moveLinked(activeId, -1)}
                  >
                    Move earlier
                  </Button>
                  <Button
                    variant="quiet"
                    disabled={state.busy || index === group.length - 1}
                    onClick={() => controller.moveLinked(activeId, 1)}
                  >
                    Move later
                  </Button>
                </div>
              )}
              {group.length === 1 && (
                <div className={styles.photoActions}>
                  <Button
                    variant="quiet"
                    onClick={() => controller.move(activeId, -1)}
                    disabled={
                      state.busy || state.items[0]?.photo.id === activeId
                    }
                  >
                    Move earlier
                  </Button>
                  <Button
                    variant="quiet"
                    onClick={() => controller.move(activeId, 1)}
                    disabled={
                      state.busy || state.items.at(-1)?.photo.id === activeId
                    }
                  >
                    Move later
                  </Button>
                </div>
              )}
            </>
          ) : (
            <p className={styles.intro}>
              This photo was removed. Close the editor to return to your
              collection.
            </p>
          )}
          <p role="status" className={styles.intro}>
            {state.notice}
          </p>
          <div className={styles.footer}>
            {anchor && (
              <Button
                variant="secondary"
                disabled={state.busy}
                onClick={() => onLink(anchor)}
              >
                Link more photos
              </Button>
            )}
            <Button onClick={onClose}>Done</Button>
          </div>
        </section>
      </div>
    </PhotoDialog>
  );
}
