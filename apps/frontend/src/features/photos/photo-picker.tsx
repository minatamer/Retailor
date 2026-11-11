"use client";
import { useId, useState, useSyncExternalStore } from "react";
import type { ReactNode, Ref } from "react";
import { Button } from "../../components/ui/button";
import { Icon } from "../../components/ui/icon";
import { LoadingState, PhotoSkeleton } from "../../components/ui/loading-state";
import type { PhotoController } from "./controller";
import { namedFiles } from "./named-files";
import { PhotoStack } from "./photo-stack";
import { PhotoEditor } from "./photo-editor";
export { namedFiles } from "./named-files";
import styles from "./photos.module.css";
export function PhotoPicker({
  controller,
  onProcess,
  canProcess = true,
  alternative,
  headingLevel = 2,
  selectionRef,
  sampleLoading = false,
  onCancelSample,
}: {
  controller: PhotoController;
  onProcess(): void;
  canProcess?: boolean;
  alternative?: ReactNode;
  headingLevel?: 1 | 2;
  selectionRef?: Ref<HTMLDivElement>;
  sampleLoading?: boolean;
  onCancelSample?(): void;
}) {
  const Heading = headingLevel === 1 ? "h1" : "h2";
  const state = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot,
  );
  const id = useId();
  const warning = state.noticeKind === "warning" ? state.notice : "";
  const [editing, setEditing] = useState<string | null>(null);
  const loading = sampleLoading || state.busy;
  const pending = state.busy
    ? Math.max(0, state.total - state.progress)
    : sampleLoading
      ? Math.max(0, 24 - state.items.length)
      : 0;
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
              disabled={loading}
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
      {(state.items.length > 0 || loading) && (
        <>
          <div className={styles.linkHeading} ref={selectionRef}>
            <div>
              <h2>Your photos</h2>
              <p>
                {loading
                  ? "Your collection is coming into view. Photos appear as they’re checked."
                  : "Check your selection. Open a photo for a closer look, or replace or remove it."}
              </p>
            </div>
          </div>
          {loading && (
            <LoadingState
              title={
                state.busy
                  ? "Checking your photos"
                  : "Bringing in the sample collection"
              }
              detail={
                state.busy
                  ? `${state.progress} of ${state.total} photos checked`
                  : "Preparing the original photos for your selection."
              }
              {...(state.busy
                ? { progress: { value: state.progress, total: state.total } }
                : {})}
              action={
                <Button
                  variant="quiet"
                  onClick={() =>
                    sampleLoading && onCancelSample
                      ? onCancelSample()
                      : controller.cancel()
                  }
                >
                  Cancel loading
                </Button>
              }
            />
          )}
          <ol className={styles.selectedGallery} aria-label="Selected photos">
            {state.items.map((item, index) => (
              <li className={styles.photoCard} key={item.photo.id}>
                <button
                  type="button"
                  className={styles.openPhoto}
                  onClick={() => setEditing(item.photo.id)}
                  aria-label={`Preview photo ${index + 1}: ${item.name}`}
                >
                  <PhotoStack
                    photos={[item]}
                    label={`Photo ${index + 1}`}
                    showCount={false}
                  />
                  <span className={styles.photoMeta}>
                    <strong>Photo {String(index + 1).padStart(2, "0")}</strong>
                    <small>{item.name} · Preview</small>
                  </span>
                </button>
              </li>
            ))}
            {Array.from({ length: Math.min(6, pending) }, (_, index) => (
              <li key={`pending-${index}`} aria-hidden="true">
                <PhotoSkeleton index={index} />
              </li>
            ))}
          </ol>
        </>
      )}
      {(warning || state.issues.length > 0) && (
        <ul
          className={styles.issues}
          aria-label="Photo selection notices"
          aria-live="polite"
        >
          {warning && (
            <li>
              <strong>Photo needs attention</strong>
              <span>{warning}</span>
            </li>
          )}
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
          <p className={styles.note}>
            We’ll identify garments and suggest matching views and colours. You
            can change the groups and product details in the draft review.
          </p>
          <Button
            disabled={loading || !state.items.length || !canProcess}
            onClick={onProcess}
          >
            Create product draft <Icon name="arrow" />
          </Button>
        </div>
      )}
      {editing && (
        <PhotoEditor
          controller={controller}
          photoId={editing}
          onClose={() => setEditing(null)}
        />
      )}
    </section>
  );
}
