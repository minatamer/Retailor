"use client";
import { useEffect, useRef, useState } from "react";
import { TEMPLATES } from "../store-design/presets";
import { RUNWAY_LOOKS } from "./illustration";
import { StoreIllustration } from "./runway";
import styles from "./landing.module.css";

const PAGES = ["home", "collection", "product"] as const;
export function StoreFamilies() {
  const [selected, setSelected] = useState(0);
  const [page, setPage] = useState<(typeof PAGES)[number]>("home");
  const viewport = useRef<HTMLDivElement>(null);
  const look = RUNWAY_LOOKS[selected]!;
  useEffect(() => {
    viewport.current?.scrollTo({ top: 0, left: 0 });
  }, [selected, page]);
  return (
    <div>
      <div
        className={styles.familyChoices}
        role="group"
        aria-label="Choose a starting look"
      >
        {RUNWAY_LOOKS.map((choice, index) => (
          <button
            key={choice.name}
            type="button"
            aria-pressed={selected === index}
            aria-controls="family-preview"
            onClick={() => setSelected(index)}
          >
            <span>0{index + 1}</span>
            <strong>{choice.name}</strong>
            <small>{TEMPLATES[choice.design.template].description}</small>
          </button>
        ))}
      </div>
      <figure className={styles.familyShowcase}>
        <figcaption className={styles.familyToolbar}>
          <div>
            <h3>{look.name}</h3>
            <p>{look.detail}</p>
          </div>
          <div
            className={styles.familyPages}
            role="group"
            aria-label="Choose a preview page"
          >
            {PAGES.map((choice) => (
              <button
                key={choice}
                type="button"
                aria-pressed={page === choice}
                aria-controls="family-preview"
                onClick={() => setPage(choice)}
              >
                {choice === "home"
                  ? "Home"
                  : choice === "collection"
                    ? "Collection"
                    : "Product"}
              </button>
            ))}
          </div>
        </figcaption>
        <div
          className={styles.familyViewport}
          id="family-preview"
          role="region"
          aria-label={`${look.name} ${page} store preview. Scroll to explore.`}
          tabIndex={0}
          ref={viewport}
        >
          <StoreIllustration
            design={look.design}
            page={page}
            presentation="full"
          />
        </div>
      </figure>
      <p className={styles.caption}>
        Illustrative FORME collection. Choose a starting look and page, then
        scroll to explore. Personalize layouts, colours, type and branding in
        your demo.
      </p>
    </div>
  );
}
