"use client";

import { useCallback, useEffect, useRef } from "react";
import type { MouseEvent } from "react";

const SECTIONS = [
  ["how-it-works", "How it works"],
  ["storefronts", "Storefronts"],
  ["owner-view", "Owner view"],
] as const;

/** One bounded animation: native smooth scrolling can be ignored by a browser. */
export function SectionNavigation() {
  const frame = useRef<number | null>(null);
  const cancel = useCallback(() => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
  }, []);

  useEffect(() => {
    const events = [
      "wheel",
      "touchstart",
      "pointerdown",
      "keydown",
      "popstate",
    ] as const;
    for (const event of events)
      window.addEventListener(event, cancel, { passive: true });
    return () => {
      cancel();
      for (const event of events) window.removeEventListener(event, cancel);
    };
  }, [cancel]);

  function navigate(event: MouseEvent<HTMLAnchorElement>, id: string) {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    const target = document.getElementById(id);
    if (!target) return;
    event.preventDefault();
    cancel();
    const hash = `#${id}`;
    if (window.location.hash !== hash) window.history.pushState(null, "", hash);
    const start = window.scrollY;
    const margin =
      Number.parseFloat(getComputedStyle(target).scrollMarginTop) || 0;
    const end = Math.max(
      0,
      Math.min(
        start + target.getBoundingClientRect().top - margin,
        document.documentElement.scrollHeight - window.innerHeight,
      ),
    );
    const distance = end - start;
    const duration = Math.min(900, Math.max(450, Math.abs(distance) * 0.24));
    let started: number | undefined;
    const step = (now: number) => {
      started ??= now;
      const progress = Math.min(1, Math.max(0, (now - started) / duration));
      const eased = 1 - (1 - progress) ** 3;
      window.scrollTo({ top: start + distance * eased, behavior: "instant" });
      if (progress < 1) frame.current = requestAnimationFrame(step);
      else {
        frame.current = null;
        target.focus({ preventScroll: true });
      }
    };
    frame.current = requestAnimationFrame(step);
  }

  return (
    <nav aria-label="Retailor navigation">
      {SECTIONS.map(([id, label]) => (
        <a key={id} href={`#${id}`} onClick={(event) => navigate(event, id)}>
          {label}
        </a>
      ))}
    </nav>
  );
}
