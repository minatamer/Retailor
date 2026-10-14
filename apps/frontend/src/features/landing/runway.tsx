"use client";
import { useEffect, useRef, useState } from "react";
import { Storefront } from "../storefront/storefront";
import { INITIAL_BROWSE } from "../storefront/browse";
import { GarmentImage } from "../storefront/gallery";
import type { Design } from "@retailor/contracts/design";
import {
  ILLUSTRATED_CLOTHES,
  ILLUSTRATED_ITEMS,
  ILLUSTRATED_PHOTOS,
  RUNWAY_LOOKS,
  RUNWAY_SCENES,
} from "./illustration";
import { scheduleScene } from "./choreography";
import styles from "./landing.module.css";

export function StoreIllustration({
  design,
  page = "home",
  onFailure,
  missingIds,
  presentation = "compact",
}: {
  design: Design;
  page?: "home" | "collection" | "product";
  onFailure?: (id: string) => void;
  missingIds?: ReadonlySet<string>;
  presentation?: "compact" | "full";
}) {
  const [missing, setMissing] = useState<ReadonlySet<string>>(() => new Set());
  const photos = new Map(
    [...ILLUSTRATED_PHOTOS].filter(
      ([id]) => !missing.has(id) && !missingIds?.has(id),
    ),
  );
  return (
    <div
      className={
        presentation === "full"
          ? styles.fullIllustration
          : styles.storeIllustration
      }
      inert
      aria-hidden="true"
    >
      <Storefront
        input={{
          illustration: presentation,
          design,
          items: ILLUSTRATED_ITEMS,
          photos,
          preview: true,
          browse: {
            ...INITIAL_BROWSE,
            page,
            productId: ILLUSTRATED_ITEMS[0]!.product.id,
          },
        }}
        actions={{
          browse: () => undefined,
          owner: () => undefined,
          photoFailed: (id) => {
            if (ILLUSTRATED_PHOTOS.has(id)) {
              setMissing((current) =>
                current.has(id) ? current : new Set([...current, id]),
              );
              onFailure?.(id);
            }
          },
        }}
      />
    </div>
  );
}
export function Runway() {
  const [cursor, setCursor] = useState({ index: 0 }),
    [inView, setInView] = useState(true),
    [failedPhotos, setFailedPhotos] = useState<ReadonlySet<string>>(
      () => new Set(),
    ),
    [manualNotice, setManualNotice] = useState("");
  const index = cursor.index;
  const failed = failedPhotos.size > 0;
  const rememberFailure = (id: string) => {
    if (ILLUSTRATED_PHOTOS.has(id))
      setFailedPhotos((current) =>
        current.has(id) ? current : new Set([...current, id]),
      );
  };
  const element = useRef<HTMLElement>(null);
  useEffect(() => {
    const node = element.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    let active = true;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (active) setInView(Boolean(entry?.isIntersecting));
      },
      { threshold: 0.05 },
    );
    observer.observe(node);
    return () => {
      active = false;
      observer.disconnect();
    };
  }, []);
  useEffect(() => {
    if (!inView) return;
    return scheduleScene(cursor.index, (next) => setCursor({ index: next }));
  }, [cursor, inView]);
  const scene = RUNWAY_SCENES[index]!,
    look = RUNWAY_LOOKS[scene.look]!;
  return (
    <figure
      ref={element}
      className={styles.runway}
      aria-label="The same illustrative clothing collection changes through three storefront looks, collection and product detail."
    >
      <div
        className={styles.previewFrame}
        id="storefront-runway"
        data-scene={index}
      >
        <div className={styles.previewBar}>
          <span>
            <i />
            <i />
            <i />
          </span>
          <span>FORME / a store, taking shape</span>
          <span aria-hidden="true">↗</span>
        </div>
        <div className={styles.scene} key={index}>
          {scene.kind === "photos" ? (
            <div className={styles.sourceScene} aria-hidden="true">
              <div>
                <span>Your starting point</span>
                <strong>
                  The clothes
                  <br />
                  you believe in.
                </strong>
              </div>
              <div className={styles.sourcePhotos}>
                {ILLUSTRATED_CLOTHES.map((clothing) => (
                  <div key={clothing.id}>
                    {failedPhotos.has(clothing.id) ? (
                      <span>Photo unavailable</span>
                    ) : (
                      <GarmentImage
                        photo={ILLUSTRATED_PHOTOS.get(clothing.id)!}
                        title={clothing.title}
                        eager
                        onFailure={rememberFailure}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <StoreIllustration
              design={look.design}
              page={scene.page}
              missingIds={failedPhotos}
              onFailure={rememberFailure}
            />
          )}
        </div>
        {failed && (
          <div className={styles.assetNotice}>
            A preview photo is unavailable. You can bring your own in the demo.
          </div>
        )}
      </div>
      <div
        className={styles.sceneControls}
        aria-label="Choose an illustrative storefront look"
      >
        {RUNWAY_LOOKS.map((item, choice) => (
          <button
            key={item.label}
            type="button"
            aria-pressed={scene.kind === "store" && scene.look === choice}
            aria-controls="storefront-runway"
            onClick={() => {
              setCursor({ index: choice + 1 });
              setManualNotice(
                `${item.label} look selected. The same collection continues through its matching pages.`,
              );
            }}
          >
            <span aria-hidden="true" />
            {item.label}
          </button>
        ))}
      </div>
      <figcaption>
        <span>{scene.label}</span>
        <small>Illustrative collection · Your draft starts in the demo</small>
      </figcaption>
      <span className={styles.srOnly} role="status">
        {manualNotice}
      </span>
    </figure>
  );
}
