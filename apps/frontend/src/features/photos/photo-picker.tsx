"use client";
import { useId, useState, useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import { Button } from "../../components/ui/button";
import { Icon } from "../../components/ui/icon";
import type { PhotoController } from "./controller";
import { namedFiles } from "./named-files";
import { PhotoStack } from "./photo-stack";
import { PhotoEditor } from "./photo-editor";
import { photoGroups } from "./links";
export { namedFiles } from "./named-files";
import styles from "./photos.module.css";
export function PhotoPicker({
  controller,
  onProcess,
  canProcess = true,
  alternative,
  headingLevel = 2,
}: {
  controller: PhotoController;
  onProcess(): void;
  canProcess?: boolean;
  alternative?: ReactNode;
  headingLevel?: 1 | 2;
}) {
  const Heading = headingLevel === 1 ? "h1" : "h2";
  const state = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot,
  );
  const id = useId();
  const [linking, setLinking] = useState(false),
    [chosen, setChosen] = useState<string[]>([]),
    [editing, setEditing] = useState<string | null>(null);
  const groups = photoGroups(
    state.items.map((item) => item.photo.id),
    state.links,
  );
  const selected = chosen.filter((value) =>
    state.items.some((item) => item.photo.id === value),
  );
  const selectedPhotos = new Set(
    selected.flatMap(
      (value) => groups.find((group) => group.includes(value)) ?? [],
    ),
  );
  return (
    <section aria-labelledby={`${id}-heading`} className={styles.picker}>
      <div className={styles.selectionHeading}>
        <div>
          <p className={styles.eyebrow}>
            {alternative ? "Two ways to begin" : "Your starting point"}
          </p>
          <Heading id={`${id}-heading`}>
            {alternative
              ? "Choose your starting point."
              : "A collection, coming into focus."}
          </Heading>
        </div>
        <span>{state.items.length} / 24 photos</span>
      </div>
      <div className={alternative ? styles.sources : undefined}>
        <div>
          {alternative && (
            <h3 className={styles.sourceHeading}>Upload your clothes</h3>
          )}
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
        </div>
        {alternative}
      </div>
      <label className={styles.reviewCheck}>
        <input
          type="checkbox"
          checked={state.autoLink}
          disabled={state.busy}
          onChange={(event) => controller.setAutoLink(event.target.checked)}
        />
        <span>Auto-link matching angles and colours when processing</span>
      </label>
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
        <>
          <div className={styles.linkHeading}>
            <div>
              <h2>
                {groups.length} product {groups.length === 1 ? "card" : "cards"}
              </h2>
              <p>
                Different angles of the same product? Link their photos into one
                card.
              </p>
            </div>
            <Button
              variant="secondary"
              disabled={state.busy}
              onClick={() => {
                setLinking(!linking);
                setChosen([]);
              }}
            >
              {linking ? "Cancel linking" : "Link photos"}
            </Button>
          </div>
          {linking && (
            <div className={styles.linkBar}>
              <p>
                {selectedPhotos.size
                  ? `${selectedPhotos.size} photos selected`
                  : "Select the cards showing the same product."}
                {selectedPhotos.size > 8
                  ? " Keep up to 8 photos in one product."
                  : ""}
              </p>
              <Button
                disabled={
                  state.busy || selected.length < 2 || selectedPhotos.size > 8
                }
                onClick={() => {
                  if (controller.link(selected)) {
                    setChosen([]);
                    setLinking(false);
                  }
                }}
              >
                Link {selectedPhotos.size || "selected"} photos
              </Button>
            </div>
          )}
          <ol className={styles.selectedGallery}>
            {groups.map((group, index) => {
              const photos = group.flatMap(
                (value) =>
                  state.items.find((item) => item.photo.id === value) ?? [],
              );
              const cover = photos[0]!;
              const checked = selected.some((value) => group.includes(value));
              return (
                <li
                  className={styles.photoCard}
                  key={
                    state.items.find((item) => group.includes(item.photo.id))!
                      .photo.id
                  }
                >
                  <button
                    type="button"
                    className={styles.openPhoto}
                    onClick={() => setEditing(cover.photo.id)}
                    aria-label={`Edit photos for product ${index + 1}`}
                  >
                    <PhotoStack
                      photos={photos}
                      label={`Product ${index + 1} cover photo`}
                    />
                    <span className={styles.photoMeta}>
                      <strong>
                        Product {String(index + 1).padStart(2, "0")}
                      </strong>
                      <small>
                        {cover.name} · Click to edit
                        {group.length > 1 ? " all linked photos" : ""}
                      </small>
                    </span>
                  </button>
                  {linking && (
                    <label className={styles.linkCheck}>
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={state.busy}
                        aria-label={`Select product ${index + 1} photos to link`}
                        onChange={() =>
                          setChosen(
                            checked
                              ? selected.filter(
                                  (value) => !group.includes(value),
                                )
                              : [...selected, cover.photo.id],
                          )
                        }
                      />
                      <span>{checked ? "Selected" : "Select photos"}</span>
                    </label>
                  )}
                </li>
              );
            })}
          </ol>
        </>
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
      {(!alternative || state.items.length > 0) && (
        <div className={styles.processing}>
          <Button
            disabled={state.busy || !state.items.length || !canProcess}
            onClick={onProcess}
          >
            Review & process {state.items.length || "your"}{" "}
            {state.items.length === 1 ? "photo" : "photos"}{" "}
            <Icon name="arrow" />
          </Button>
        </div>
      )}
      {editing && (
        <PhotoEditor
          controller={controller}
          photoId={editing}
          onClose={() => setEditing(null)}
          onLink={(value) => {
            setEditing(null);
            setLinking(true);
            setChosen([value]);
          }}
        />
      )}
    </section>
  );
}
