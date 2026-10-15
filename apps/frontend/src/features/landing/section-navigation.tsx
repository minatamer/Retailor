"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MouseEvent, ReactNode } from "react";

const SECTIONS = [
  ["how-it-works", "How it works"],
  ["storefronts", "Personalize"],
  ["questions", "FAQs"],
] as const;

/** One bounded animation: native smooth scrolling can be ignored by a browser. */
export function LandingNavigation({
  className,
  children,
}: {
  className: string | undefined;
  children: ReactNode;
}) {
  const root = useRef<HTMLDivElement>(null);
  const [pastHero, setPastHero] = useState(false);
  const frame = useRef<number | null>(null);
  const cancel = useCallback(() => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
  }, []);

  useEffect(() => {
    const hero = root.current?.querySelector("[data-landing-hero]");
    const header = root.current?.querySelector("header");
    if (!hero || !header) return;
    let measurement: number | null = null;
    const measure = () => {
      measurement = null;
      setPastHero(
        hero.getBoundingClientRect().bottom <=
          header.getBoundingClientRect().bottom + 1,
      );
    };
    const schedule = () => {
      measurement ??= requestAnimationFrame(measure);
    };
    measure();
    const observer = new ResizeObserver(schedule);
    observer.observe(hero);
    observer.observe(header);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });
    window.addEventListener("pageshow", schedule);
    return () => {
      if (measurement !== null) cancelAnimationFrame(measurement);
      observer.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("pageshow", schedule);
    };
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

  function navigate(event: MouseEvent<HTMLDivElement>) {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    const anchor =
      event.target instanceof Element ? event.target.closest("a") : null;
    if (
      !(anchor instanceof HTMLAnchorElement) ||
      !event.currentTarget.contains(anchor) ||
      anchor.hasAttribute("download") ||
      (anchor.target && anchor.target.toLowerCase() !== "_self")
    )
      return;
    const href = anchor.getAttribute("href");
    if (!href?.startsWith("#")) return;
    const id = href.slice(1);
    if (id !== "hero-title" && !SECTIONS.some(([section]) => section === id))
      return;
    const target = document.getElementById(id);
    if (!target) return;
    event.preventDefault();
    cancel();
    if (window.location.hash)
      window.history.replaceState(
        window.history.state,
        "",
        window.location.pathname + window.location.search,
      );
    const start = window.scrollY;
    const margin =
      Number.parseFloat(getComputedStyle(target).scrollMarginTop) || 0;
    const end =
      id === "hero-title"
        ? 0
        : Math.max(
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
    <div
      ref={root}
      className={className}
      data-header-theme={pastHero ? "solid" : "overlay"}
      onClick={navigate}
    >
      {children}
    </div>
  );
}

export function SectionNavigation() {
  return (
    <nav aria-label="Retailor navigation">
      {SECTIONS.map(([id, label]) => (
        <a key={id} href={`#${id}`}>
          {label}
        </a>
      ))}
    </nav>
  );
}
