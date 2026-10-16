"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useSession } from "../session/context";
import type { SessionController, SessionSnapshot } from "../session/controller";
import type { StorePage } from "@retailor/contracts/design";
import { mountedTourTargets, TOUR_STEPS } from "./tour-targets";
import {
  sameTourLocation,
  sameTourRect,
  tourPanels,
  tourPlacement,
  tourSpotlight,
  tourTargetVisible,
  TOUR_FADE_MS,
  TOUR_SETTLE_MS,
} from "./tour-layout";
import type { TourRect, TourViewport } from "./tour-layout";
import styles from "./tour.module.css";

type Layout = {
  key: string;
  rect: ReturnType<typeof tourSpotlight> | null;
  viewport: TourViewport;
  card: { top: number; left: number; width: number; maxHeight: number };
  height: number;
  unavailable: boolean;
};
const typing = () =>
  document.activeElement?.matches("input,textarea,[contenteditable=true]");
const viewport = (): TourViewport => ({
  width: window.visualViewport?.width ?? window.innerWidth,
  height: window.visualViewport?.height ?? window.innerHeight,
  top: window.visualViewport?.offsetTop ?? 0,
  left: window.visualViewport?.offsetLeft ?? 0,
});
export function Tour() {
  const { tour, controller, state } = useSession();
  return tour ? (
    <TourGuide tour={tour} controller={controller} page={state.browse.page} />
  ) : null;
}
function TourGuide({
  tour,
  controller,
  page,
}: {
  tour: NonNullable<SessionSnapshot["tour"]>;
  controller: SessionController;
  page: StorePage;
}) {
  const card = useRef<HTMLDivElement>(null);
  const measuring = useRef<HTMLDivElement>(null);
  const seamless = useRef(false);
  const transitioning = useRef(false);
  const startTimer = useRef(0);
  const [started, setStarted] = useState(false);
  const [layout, setLayout] = useState<Layout | null>(null);
  const [view, setView] = useState<TourViewport>(viewport);
  const [pending, setPending] = useState<number | null>(null);
  const [leaving, setLeaving] = useState(false);
  const key = `${tour.role}:${tour.index}`;
  const steps = TOUR_STEPS[tour.role],
    step = steps[tour.index],
    from = tour.from ?? 0;
  // Measure next text invisibly before deciding whether its card and hole stay put.
  useLayoutEffect(() => {
    if (pending === null || !layout) return;
    const next = steps[pending],
      node = next && mountedTourTargets(document).get(next.target),
      bounds = node?.getBoundingClientRect(),
      height = measuring.current?.offsetHeight ?? 300,
      currentView = viewport();
    if (
      next &&
      (!next.page || next.page === page) &&
      bounds &&
      tourTargetVisible(bounds, currentView)
    ) {
      const rect = tourSpotlight(bounds, currentView),
        position = tourPlacement(
          {
            ...rect,
            right: rect.left + rect.width,
            bottom: rect.top + rect.height,
          },
          currentView,
          height,
        );
      if (
        sameTourLocation(
          {
            rect: layout.rect,
            card: { ...layout.card, height: layout.height },
          },
          { rect, card: { ...position, height } },
        )
      ) {
        seamless.current = true;
        setLayout({
          ...layout,
          key: `${tour.role}:${pending}`,
          height,
          card: {
            ...position,
            maxHeight: Math.max(1, currentView.height - 32),
          },
        });
        setPending(null);
        controller.tourStep(pending);
        return;
      }
    }
    setLeaving(true);
    const timer = window.setTimeout(() => {
      setLayout(null);
      setLeaving(false);
      setPending(null);
      controller.tourStep(pending);
    }, TOUR_FADE_MS);
    return () => window.clearTimeout(timer);
  }, [pending, controller, layout, page, steps, tour.role]);
  useLayoutEffect(() => {
    if (!started || !step) return;
    transitioning.current = false;
    let frame = 0,
      first = true,
      scrollAttempts = seamless.current ? 3 : 0,
      last: TourRect | null = null,
      stableSince = performance.now(),
      began = performance.now();
    if (!seamless.current) setLayout(null);
    let keep = seamless.current;
    let lastView = viewport();
    seamless.current = false;
    const measure = () => {
      frame = 0;
      if (transitioning.current) return;
      const currentView = viewport(),
        node = mountedTourTargets(document).get(step.target),
        bounds = node?.getBoundingClientRect(),
        now = performance.now(),
        height = Math.max(
          1,
          Math.min(
            measuring.current?.offsetHeight ?? 300,
            currentView.height - 32,
          ),
        ),
        placement = bounds ? tourPlacement(bounds, currentView, height) : null;
      const overlaps =
        bounds &&
        placement &&
        placement.left < bounds.right &&
        placement.left + placement.width > bounds.left &&
        placement.top < bounds.bottom &&
        placement.top + height > bounds.top;
      if (
        bounds &&
        (first ||
          (now - stableSince >= TOUR_SETTLE_MS &&
            scrollAttempts < 3 &&
            now - began < 3500))
      ) {
        first = false;
        if (!tourTargetVisible(bounds, currentView) && !typing()) {
          scrollAttempts++;
          node?.scrollIntoView({
            behavior: "smooth",
            block: "center",
            inline: "nearest",
          });
          stableSince = now;
        } else if (
          overlaps &&
          bounds.height + height + 64 < currentView.height &&
          scrollAttempts < 3 &&
          !typing()
        ) {
          scrollAttempts++;
          window.scrollBy({
            top: bounds.top - currentView.top - 24,
            behavior: "smooth",
          });
          stableSince = now;
        }
      }
      if (!bounds || !last || !sameTourRect(bounds, last)) stableSince = now;
      last = bounds ?? null;
      const ready =
          !!bounds &&
          tourTargetVisible(bounds, currentView) &&
          (keep || now - stableSince >= TOUR_SETTLE_MS),
        unavailable = !ready && now - began > 5000;
      keep = false;
      lastView = currentView;
      if (ready || unavailable) {
        const rect = ready ? tourSpotlight(bounds, currentView) : null;
        setLayout({
          key,
          rect,
          viewport: currentView,
          height,
          card: {
            ...tourPlacement(
              rect
                ? {
                    ...rect,
                    right: rect.left + rect.width,
                    bottom: rect.top + rect.height,
                  }
                : {
                    top: currentView.top,
                    left: currentView.left + 16,
                    right: currentView.left + 16,
                    bottom: currentView.top + 16,
                  },
              currentView,
              height,
            ),
            maxHeight: Math.max(1, currentView.height - 32),
          },
          unavailable,
        });
      } else frame = requestAnimationFrame(measure);
    };
    const queue = () => {
      if (transitioning.current) return;
      keep = false;
      stableSince = performance.now();
      began = stableSince;
      setLayout(null);
      if (!frame) frame = requestAnimationFrame(measure);
    };
    const resized = () => {
      first = true;
      scrollAttempts = 0;
      setView(viewport());
      queue();
    };
    const resize = new ResizeObserver(() => {
      const bounds = mountedTourTargets(document)
          .get(step.target)
          ?.getBoundingClientRect(),
        currentView = viewport();
      if (
        !last ||
        (bounds &&
          sameTourRect(bounds, last) &&
          (["width", "height", "top", "left"] as const).every(
            (part) => Math.abs(currentView[part] - lastView[part]) < 0.5,
          ))
      )
        return;
      resized();
    });
    resize.observe(document.documentElement);
    for (const node of mountedTourTargets(document).values())
      resize.observe(node);
    const mutations = new MutationObserver(() => {
      if (!frame) frame = requestAnimationFrame(measure);
    });
    mutations.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("resize", resized);
    window.addEventListener("scroll", queue, true);
    window.visualViewport?.addEventListener("resize", resized);
    window.visualViewport?.addEventListener("scroll", queue);
    frame = requestAnimationFrame(measure);
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      mutations.disconnect();
      window.removeEventListener("resize", resized);
      window.removeEventListener("scroll", queue, true);
      window.visualViewport?.removeEventListener("resize", resized);
      window.visualViewport?.removeEventListener("scroll", queue);
    };
  }, [key, started, step]);
  const current = started && layout?.key === key;
  const visibleKey = !started ? "welcome" : current ? key : null;
  useEffect(() => {
    if (visibleKey && !typing())
      card.current
        ?.querySelector<HTMLButtonElement>("[data-tour-forward]")
        ?.focus({ preventScroll: true });
  }, [visibleKey]);
  useEffect(() => {
    const opener =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        controller.finishTour();
      }
      if (event.key === "Tab" && card.current) {
        const buttons = [
            ...card.current.querySelectorAll<HTMLButtonElement>(
              "button:not(:disabled)",
            ),
          ],
          first = buttons[0],
          last = buttons.at(-1);
        if (
          !card.current.contains(document.activeElement) ||
          (event.shiftKey && document.activeElement === first) ||
          (!event.shiftKey && document.activeElement === last)
        ) {
          event.preventDefault();
          (event.shiftKey ? last : first)?.focus({ preventScroll: true });
        }
      }
    };
    window.addEventListener("keydown", keyboard);
    const resized = () => setView(viewport());
    window.addEventListener("resize", resized);
    window.visualViewport?.addEventListener("resize", resized);
    window.visualViewport?.addEventListener("scroll", resized);
    return () => {
      window.clearTimeout(startTimer.current);
      window.removeEventListener("keydown", keyboard);
      window.removeEventListener("resize", resized);
      window.visualViewport?.removeEventListener("resize", resized);
      window.visualViewport?.removeEventListener("scroll", resized);
      if (!typing()) {
        const fallback = document.querySelector<HTMLButtonElement>(
          '[data-tailor-target="tailor-panel"] button',
        );
        (opener?.isConnected ? opener : fallback)?.focus({
          preventScroll: true,
        });
      }
    };
  }, [controller]);
  if (!step) return null;
  const requestStep = (index: number) => {
    transitioning.current = true;
    setPending(index);
  };
  const content = (index: number, hidden = false) => {
    const selected = steps[index]!;
    return (
      <div
        ref={hidden ? measuring : card}
        className={`${styles.card} ${hidden ? styles.measuring : ""}`}
        style={
          hidden
            ? {
                width: Math.min(348, view.width - 32),
                maxHeight: Math.max(1, view.height - 32),
              }
            : layout?.card
        }
        inert={hidden || leaving}
        aria-hidden={hidden || undefined}
        role={hidden ? undefined : "dialog"}
        aria-modal={hidden ? undefined : true}
        aria-labelledby={hidden ? undefined : "tour-title"}
        aria-describedby={hidden ? undefined : "tour-description"}
        data-tour-card={hidden ? undefined : selected.target}
      >
        <small>
          YOUR STORE, WITH TAILOR · {index - from + 1} OF {steps.length - from}
        </small>
        <div className={styles.progress} aria-hidden="true">
          {steps.slice(from).map((_, progress) => (
            <span key={progress} data-current={progress + from <= index} />
          ))}
        </div>
        <h2 id={hidden ? undefined : "tour-title"}>{selected.title}</h2>
        <p id={hidden ? undefined : "tour-description"}>{selected.text}</p>
        <span className={styles.status} role={hidden ? undefined : "status"}>
          {!hidden && layout?.unavailable
            ? "This part is outside the view. You can scroll to it or continue."
            : ""}
        </span>
        <div className={styles.actions}>
          <button
            disabled={index === from || leaving}
            onClick={() => requestStep(index - 1)}
          >
            Back
          </button>
          <button
            className={styles.skip}
            onClick={() => controller.finishTour()}
          >
            Skip tour
          </button>
          <button
            data-tour-forward
            disabled={leaving || pending !== null}
            onClick={() =>
              index + 1 === steps.length
                ? controller.finishTour()
                : requestStep(index + 1)
            }
          >
            {index + 1 === steps.length ? "Done" : "Next →"}
          </button>
        </div>
      </div>
    );
  };
  return createPortal(
    <div className={styles.layer}>
      {started && content(pending ?? tour.index, true)}
      {!started ? (
        <div
          className={styles.presentation}
          data-tour-presentation="welcome"
          data-leaving={leaving}
        >
          {tourPanels(null, view).map((panel, index) => (
            <div
              key={index}
              className={styles.scrim}
              style={panel}
              aria-hidden="true"
            />
          ))}
          <div
            ref={card}
            className={`${styles.card} ${styles.welcome}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="tour-title"
            aria-describedby="tour-description"
            data-tour-welcome
            inert={leaving}
            style={{
              top: view.top + view.height / 2,
              left: view.left + view.width / 2,
              width: Math.min(348, view.width - 32),
              maxHeight: Math.max(1, view.height - 32),
            }}
          >
            <small>YOUR STORE, WITH TAILOR</small>
            <h2 id="tour-title">
              {tour.role === "owner"
                ? "Welcome to your dashboard."
                : "Welcome to your store."}
            </h2>
            <p id="tour-description">
              {tour.role === "owner"
                ? "Let’s take a quick look at your numbers, products and activity. You can explore at your own pace."
                : from > 0
                  ? "Your store is ready. Let’s find your bag, dashboard and the controls to make it yours."
                  : "Your clothes have a new home. Let’s explore your three pages, personalization and dashboard. You can skip or leave the tour whenever you like."}
            </p>
            <div className={`${styles.actions} ${styles.welcomeActions}`}>
              <button
                className={styles.skip}
                onClick={() => controller.finishTour()}
              >
                Skip tour
              </button>
              <button
                data-tour-forward
                disabled={leaving}
                onClick={() => {
                  setLeaving(true);
                  startTimer.current = window.setTimeout(() => {
                    setLeaving(false);
                    setStarted(true);
                    controller.tourStep(tour.index);
                  }, TOUR_FADE_MS);
                }}
              >
                Start tour →
              </button>
            </div>
          </div>
        </div>
      ) : (
        current && (
          <div
            className={styles.presentation}
            data-tour-presentation={tour.index}
            data-leaving={leaving}
          >
            {tourPanels(layout.rect, layout.viewport).map((panel, index) => (
              <div
                key={index}
                className={styles.scrim}
                style={panel}
                aria-hidden="true"
              />
            ))}
            {layout.rect && (
              <div
                className={styles.highlight}
                style={layout.rect}
                aria-hidden="true"
                data-tour-spotlight={step.target}
              />
            )}
            {content(tour.index)}
          </div>
        )
      )}
    </div>,
    document.body,
  );
}
