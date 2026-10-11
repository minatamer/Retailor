"use client";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "../../components/ui/button";
import { Icon } from "../../components/ui/icon";
import { Choice } from "../../components/ui/button";
import type { Design } from "@retailor/contracts/design";
import { PALETTES, merchantStyle } from "../store-design/presets";
import { BrowserPhotoCache } from "./cache";
import { PhotoController } from "./controller";
import { PhotoPicker } from "./photo-picker";
import { MandatoryPhotoField } from "./mandatory-photo-field";
import { loadSample, SAMPLE } from "./sample";
import styles from "./photos.module.css";
export function PhotoLab() {
  const [controller] = useState(() => {
    const workspace = `photos_${crypto.randomUUID()}`,
      owner = `tab_${crypto.randomUUID()}`,
      expires = Date.now() + 2 * 60 * 60 * 1000;
    return new PhotoController({
      cache: new BrowserPhotoCache(workspace, owner, expires),
      expires,
    });
  });
  const sampleRequest = useRef<AbortController | undefined>(undefined);
  const [loading, setLoading] = useState(false),
    [notice, setNotice] = useState("");
  const [fieldIds, setFieldIds] = useState<string[]>([]);
  const [photoTheme, setPhotoTheme] = useState<Design["theme"]>("ink");
  const state = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot,
  );
  useEffect(() => {
    controller.activate();
    return () => {
      sampleRequest.current?.abort();
      controller.dispose();
    };
  }, [controller]);
  async function chooseSample() {
    const request = new AbortController();
    sampleRequest.current = request;
    setLoading(true);
    try {
      const files = await loadSample(request.signal);
      if (!request.signal.aborted) await controller.add(files);
    } catch {
      if (!request.signal.aborted)
        setNotice(
          "The sample could not load. Your accepted photos are kept; try your own files.",
        );
    } finally {
      if (sampleRequest.current === request) {
        sampleRequest.current = undefined;
        setLoading(false);
      }
    }
  }
  return (
    <main className={styles.lab}>
      <header className={styles.header}>
        <Link href="/" className={styles.wordmark}>
          retailor <Icon name="sparkle" />
        </Link>
        <Link href="/design">
          Design collection <Icon name="arrow" size={16} />
        </Link>
      </header>
      <section className={styles.intro}>
        <p className={styles.eyebrow}>Clothing first. Possibilities next.</p>
        <h1>
          Bring your collection.
          <br />
          <em>We’ll bring the canvas.</em>
        </h1>
        <p>
          Fifteen original studio photos, or something entirely yours. A calm
          place to start.
        </p>
      </section>
      <div className={styles.layout}>
        <PhotoPicker
          controller={controller}
          onProcess={() =>
            setNotice(
              "Photos are ready. Live recognition and the workspace review connect in RTL-005/006; this reference makes no model calls.",
            )
          }
        />
        <aside
          className={styles.sample}
          style={merchantStyle({ theme: photoTheme, typography: "editorial" })}
        >
          <p className={styles.eyebrow}>Meet FORME</p>
          <h2>A good collection to begin with.</h2>
          <p>
            15 independent generated demo photographs. No prewritten
            catalogue—processing will interpret the actual images.
          </p>
          <div className={styles.sampleTeaser}>
            {SAMPLE.assets
              .filter((asset) => ["F01", "F07", "F12"].includes(asset.id))
              .map((asset) => (
                <Image
                  src={asset.path}
                  alt={`Generated clothing sample ${asset.id}`}
                  width={asset.image.width}
                  height={asset.image.height}
                  sizes="(max-width: 640px) 30vw, 120px"
                  key={asset.id}
                />
              ))}
          </div>
          <Button
            onClick={() => void chooseSample()}
            disabled={state.busy || loading}
          >
            {loading ? "Loading your sample…" : "Use the 15-photo sample"}
            <Icon name="arrow" />
          </Button>
          {loading && (
            <Button
              variant="quiet"
              onClick={() => {
                sampleRequest.current?.abort();
                controller.cancel();
                setLoading(false);
              }}
            >
              Cancel sample loading
            </Button>
          )}
          <details className={styles.contactSheet}>
            <summary>Look through all 15 photos</summary>
            <div>
              {SAMPLE.assets.map((asset) => (
                <figure key={asset.id}>
                  <Image
                    src={asset.path}
                    alt={`Original generated sample photograph ${asset.id}`}
                    width={asset.image.width}
                    height={asset.image.height}
                    sizes="(max-width: 640px) 44vw, 180px"
                  />
                  <figcaption>{asset.id} · Primary photograph</figcaption>
                </figure>
              ))}
            </div>
          </details>
          <div
            className={styles.themeProof}
            role="group"
            aria-label="Photo contrast theme"
          >
            <p>Inspect photography against each store theme</p>
            {Object.entries(PALETTES).map(([id, palette]) => (
              <Choice
                key={id}
                selected={photoTheme === id}
                onClick={() => setPhotoTheme(id as Design["theme"])}
              >
                {palette.label}
              </Choice>
            ))}
          </div>
        </aside>
      </div>
      <p className={styles.notice} role="status">
        {notice}
      </p>
      <section className={styles.formReference}>
        <div>
          <p className={styles.eyebrow}>Shared owner & Tailor field</p>
          <h2>A product starts with a photo.</h2>
          <p>
            This is the actual validated-photo control; product fields and
            reviewed saving connect in the owning commerce tickets.
          </p>
        </div>
        <MandatoryPhotoField
          controller={controller}
          ids={fieldIds}
          onChange={setFieldIds}
        />
      </section>
      <footer className={styles.footer}>
        <span>Development reference · Local photo handling · No AI calls</span>
        <Button
          variant="quiet"
          disabled={state.busy || loading}
          onClick={() =>
            void controller.recover(
              state.items.map((item) => item.photo.id),
              controller.descriptors(),
            )
          }
        >
          Recheck saved photos
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            sampleRequest.current?.abort();
            setLoading(false);
            setFieldIds([]);
            void controller.reset();
          }}
        >
          Clear these photos
        </Button>
      </footer>
    </main>
  );
}
