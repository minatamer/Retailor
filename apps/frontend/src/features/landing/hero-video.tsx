"use client";

import { useState } from "react";
import styles from "./landing.module.css";

/** Decorative, local motion: the real heading and links remain ordinary HTML. */
export function HeroVideo() {
  const [unavailable, setUnavailable] = useState(false);

  return (
    <div className={styles.heroMedia} aria-hidden="true">
      <video
        width={1440}
        height={900}
        src="/landing/hero-film.mp4"
        poster="/landing/hero-poster.webp"
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        onError={() => setUnavailable(true)}
        hidden={unavailable}
        tabIndex={-1}
      />
    </div>
  );
}
