"use client";
import { useId, useSyncExternalStore } from "react";
import Image from "next/image";
import { Button } from "../../components/ui/button";
import type { PhotoController } from "./controller";
import { namedFiles } from "./photo-picker";
import styles from "./photos.module.css";
/** Same native validated-photo field for owner forms and Tailor inline cards. */
export function MandatoryPhotoField({
  controller,
  ids,
  onChange,
}: {
  controller: PhotoController;
  ids: readonly string[];
  onChange(ids: string[]): void;
}) {
  const state = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot,
  );
  const id = useId();
  const view = ids[0] ? controller.view(ids[0]) : undefined;
  const available =
    ids.length > 0 &&
    ids.every((photoId) => controller.availableIds().has(photoId));
  return (
    <fieldset className={styles.mandatory}>
      <legend>
        Product photo <span>Required</span>
      </legend>
      {view && (
        <div className={styles.fieldPreview}>
          <Image
            src={view.url}
            alt="Validated product photo preview"
            width={view.photo.derivative.width}
            height={view.photo.derivative.height}
            unoptimized
          />
        </div>
      )}
      <label className={styles.replace} htmlFor={`${id}-photo`}>
        {available ? "Replace photo" : "Choose a photo"}
        <input
          id={`${id}-photo`}
          type="file"
          required={!available}
          accept="image/jpeg,image/png,image/webp"
          disabled={state.busy}
          onChange={(event) => {
            const files = namedFiles(event.target.files).slice(0, 1);
            event.target.value = "";
            void controller.add(files, undefined, false).then((accepted) => {
              if (accepted?.[0]) onChange([accepted[0], ...ids.slice(1)]);
            });
          }}
        />
      </label>
      {ids.length > 0 && (
        <Button
          variant="quiet"
          disabled={ids.length < 2 || state.busy}
          onClick={() => onChange(ids.slice(1))}
        >
          Remove this photo
        </Button>
      )}
      <p>
        {available
          ? "Photo validated and available. Keep at least one photo on this product."
          : "Choose a valid photo before creating this product. Selecting a file does not call AI."}
      </p>
    </fieldset>
  );
}
