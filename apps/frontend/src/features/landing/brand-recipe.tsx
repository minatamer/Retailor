"use client";

import { useEffect, useRef, useState } from "react";
import { PALETTES, TEMPLATES, TYPOGRAPHIES } from "../store-design/presets";
import styles from "./landing.module.css";

const CHOICES = [
  { label: "Layouts", count: Object.keys(TEMPLATES).length },
  { label: "Palettes", count: Object.keys(PALETTES).length },
  { label: "Type styles", count: Object.keys(TYPOGRAPHIES).length },
] as const;
const COUNT_DURATION_MS = 1250;
const COUNT_STAGGER_MS = 90;

export function BrandRecipe() {
  const section = useRef<HTMLElement>(null);
  const [entered, setEntered] = useState(false);
  const [counts, setCounts] = useState(() =>
    CHOICES.map((choice) => choice.count),
  );

  useEffect(() => {
    const node = section.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    let active = true;
    let started = false;
    let frame: number | null = null;
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          !active ||
          started ||
          !entries.some((entry) => entry.isIntersecting)
        )
          return;
        started = true;
        setEntered(true);
        setCounts(CHOICES.map(() => 0));
        observer.disconnect();
        let start: number | undefined;
        const tick = (now: number) => {
          if (!active) return;
          start ??= now;
          const elapsed = now - start;
          const next = CHOICES.map((choice, index) => {
            const progress = Math.max(
              0,
              Math.min(
                1,
                (elapsed - index * COUNT_STAGGER_MS) / COUNT_DURATION_MS,
              ),
            );
            return Math.floor(progress * choice.count);
          });
          setCounts((current) =>
            next.every((count, index) => count === current[index])
              ? current
              : next,
          );
          if (
            elapsed <
            COUNT_DURATION_MS + (CHOICES.length - 1) * COUNT_STAGGER_MS
          )
            frame = requestAnimationFrame(tick);
          else frame = null;
        };
        frame = requestAnimationFrame(tick);
      },
      { threshold: 0.2 },
    );
    observer.observe(node);
    return () => {
      active = false;
      observer.disconnect();
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <section
      ref={section}
      className={styles.recipe}
      id="storefronts"
      tabIndex={-1}
      aria-labelledby="family-title"
      data-entered={entered}
    >
      <div className={styles.recipeInner}>
        <div className={styles.recipeIntro}>
          <div className={styles.recipeEyebrow}>
            <p className={styles.eyebrow}>Personalize your store</p>
            <span className={styles.recipeTag} aria-hidden="true">
              Made by you
            </span>
          </div>
          <h2 id="family-title">
            Make it <em>yours.</em>
          </h2>
        </div>
        <div>
          <dl
            className={styles.recipeStats}
            aria-label="Personalization choices"
          >
            {CHOICES.map((choice, index) => (
              <div key={choice.label} className={styles.recipeStat}>
                <dt>
                  {choice.label}
                  <div className={styles.recipeIngredients} aria-hidden="true">
                    {index === 0 ? (
                      <span className={styles.recipeLayouts}>
                        <i />
                        <i />
                        <i />
                      </span>
                    ) : index === 1 ? (
                      <span className={styles.recipeSwatches}>
                        {Object.values(PALETTES).map((palette) => (
                          <i
                            key={palette.label}
                            style={{
                              background: `linear-gradient(135deg, ${palette.canvas} 50%, ${palette.action} 50%)`,
                            }}
                          />
                        ))}
                      </span>
                    ) : (
                      <span className={styles.recipeTypes}>
                        {Object.values(TYPOGRAPHIES).map((type) => (
                          <span
                            key={type.label}
                            style={{
                              fontFamily: type.heading,
                              fontWeight: type.weight,
                            }}
                          >
                            Aa
                          </span>
                        ))}
                      </span>
                    )}
                  </div>
                </dt>
                <dd>
                  <span aria-hidden="true">
                    {counts[index] ?? choice.count}
                  </span>
                  <span className={styles.srOnly}>{choice.count}</span>
                </dd>
              </div>
            ))}
          </dl>
          <p className={styles.recipeNote}>
            Add your name, headline, photos and optional logo.
          </p>
        </div>
      </div>
    </section>
  );
}
