"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useSession } from "../session/context";
import { mountedTourTargets, TOUR_STEPS } from "./tour-targets";
import { tourPlacement } from "./tour-layout";
import styles from "./tour.module.css";
export function Tour() {
  const { tour, controller } = useSession(),
    card = useRef<HTMLDivElement>(null);
  const focusAfterStep = useRef(false);
  const returnFocusOnFinish = useRef(false);
  const [layout, setLayout] = useState<{
    rect: { top: number; left: number; width: number; height: number };
    card: { top: number; left: number; width: number; maxHeight: number };
    indices: number[];
  } | null>(null);
  const tourRole = tour?.role;
  useLayoutEffect(() => {
    if (!tour) return;
    let frame = 0,
      firstMeasure = true;
    const steps = TOUR_STEPS[tour.role];
    const measure = () => {
      frame = 0;
      const targets = mountedTourTargets(document),
        indices = steps.flatMap((s, i) => (targets.has(s.target) ? [i] : []));
      if (!indices.length) {
        controller.finishTour();
        return;
      }
      const index = indices.includes(tour.index)
        ? tour.index
        : (indices.find((i) => i > tour.index) ?? indices.at(-1)!);
      if (index !== tour.index) {
        controller.tourStep(index);
        return;
      }
      const node = targets.get(steps[index]!.target)!,
        rect = node.getBoundingClientRect(),
        vv = window.visualViewport;
      const viewport = {
        width: vv?.width ?? window.innerWidth,
        height: vv?.height ?? window.innerHeight,
        top: vv?.offsetTop ?? 0,
        left: vv?.offsetLeft ?? 0,
      };
      if (firstMeasure) {
        firstMeasure = false;
        if (
          (rect.bottom <= viewport.top ||
            rect.top >= viewport.top + viewport.height) &&
          !document.activeElement?.matches(
            "input,textarea,[contenteditable=true]",
          )
        )
          node.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      const clipped = {
        top: Math.max(viewport.top + 8, rect.top),
        left: Math.max(viewport.left + 8, rect.left),
        width: Math.max(
          0,
          Math.min(rect.right, viewport.left + viewport.width - 8) -
            Math.max(viewport.left + 8, rect.left),
        ),
        height: Math.max(
          0,
          Math.min(rect.bottom, viewport.top + viewport.height - 8) -
            Math.max(viewport.top + 8, rect.top),
        ),
      };
      setLayout({
        rect: clipped,
        card: {
          ...tourPlacement(
            rect,
            viewport,
            Math.min(card.current?.offsetHeight ?? 220, viewport.height - 32),
          ),
          maxHeight: Math.max(1, viewport.height - 32),
        },
        indices,
      });
    };
    const queue = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    const resized = () => {
      firstMeasure = true;
      queue();
    };
    const resize = new ResizeObserver(resized);
    resize.observe(document.documentElement);
    for (const target of mountedTourTargets(document).values())
      resize.observe(target);
    const mutations = new MutationObserver(queue);
    mutations.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("resize", resized);
    window.addEventListener("scroll", queue, true);
    window.visualViewport?.addEventListener("resize", resized);
    window.visualViewport?.addEventListener("scroll", queue);
    measure();
    if (focusAfterStep.current) {
      focusAfterStep.current = false;
      if (
        !document.activeElement?.matches(
          "input,textarea,[contenteditable=true]",
        )
      )
        card.current
          ?.querySelector<HTMLButtonElement>("[data-tour-forward]")
          ?.focus({ preventScroll: true });
    }
    return () => {
      if (frame) cancelAnimationFrame(frame);
      resize.disconnect();
      mutations.disconnect();
      window.removeEventListener("resize", resized);
      window.removeEventListener("scroll", queue, true);
      window.visualViewport?.removeEventListener("resize", resized);
      window.visualViewport?.removeEventListener("scroll", queue);
    };
  }, [tour, controller]);
  useEffect(() => {
    if (!tourRole) return;
    const opener =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    let ownedCard = card.current;
    const frame = requestAnimationFrame(() => {
      ownedCard = card.current;
      if (
        !document.activeElement?.matches(
          "input,textarea,[contenteditable=true]",
        )
      )
        card.current
          ?.querySelector<HTMLButtonElement>("button:not(:disabled)")
          ?.focus({ preventScroll: true });
    });
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        returnFocusOnFinish.current = !!card.current?.contains(
          document.activeElement,
        );
        controller.finishTour();
      }
    };
    window.addEventListener("keydown", escape);
    return () => {
      cancelAnimationFrame(frame);
      focusAfterStep.current = false;
      window.removeEventListener("keydown", escape);
      if (
        (returnFocusOnFinish.current ||
          ownedCard?.contains(document.activeElement)) &&
        opener?.isConnected &&
        !document.activeElement?.matches(
          "input,textarea,[contenteditable=true]",
        )
      )
        opener.focus({ preventScroll: true });
      returnFocusOnFinish.current = false;
    };
  }, [tourRole, controller]);
  if (!tour || !layout) return null;
  const step = TOUR_STEPS[tour.role][tour.index];
  if (!step) return null;
  const position = layout.indices.indexOf(tour.index),
    next = layout.indices[position + 1],
    back = layout.indices[position - 1];
  const move = (index: number) => {
    focusAfterStep.current = !!card.current?.contains(document.activeElement);
    controller.tourStep(index);
    const node = mountedTourTargets(document).get(
      TOUR_STEPS[tour.role][index]!.target,
    );
    const typing = document.activeElement?.matches(
      "input,textarea,[contenteditable=true]",
    );
    if (!typing) node?.scrollIntoView({ behavior: "smooth", block: "center" });
  };
  const finish = () => {
    returnFocusOnFinish.current = !!card.current?.contains(
      document.activeElement,
    );
    controller.finishTour();
  };
  return (
    <>
      <div
        className={styles.highlight}
        style={layout.rect}
        aria-hidden="true"
      />
      <div
        ref={card}
        className={styles.card}
        role="dialog"
        aria-modal="false"
        aria-labelledby="tour-title"
        style={layout.card}
      >
        <small>
          Tailor tour · {position + 1} / {layout.indices.length}
        </small>
        <h2 id="tour-title">{step.title}</h2>
        <p>{step.text}</p>
        <div>
          <button
            disabled={back === undefined}
            onClick={() => back !== undefined && move(back)}
          >
            Back
          </button>
          <button onClick={finish}>Finish</button>
          <button
            data-tour-forward
            onClick={() => (next === undefined ? finish() : move(next))}
          >
            {next === undefined ? "Done" : "Next →"}
          </button>
        </div>
      </div>
    </>
  );
}
