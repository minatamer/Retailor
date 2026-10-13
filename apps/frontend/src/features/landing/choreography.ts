import { RUNWAY_SCENES } from "./illustration";
export function nextScene(index: number) {
  if (!Number.isInteger(index) || index < 0 || index >= RUNWAY_SCENES.length)
    throw new Error("Unknown runway scene");
  return (index + 1) % RUNWAY_SCENES.length;
}
interface RunwayClock {
  set(callback: () => void, delay: number): ReturnType<typeof setTimeout>;
  clear(timer: ReturnType<typeof setTimeout>): void;
}
/** One scheduled frame; a queued callback cannot overwrite a later manual choice. */
export function scheduleScene(
  index: number,
  advance: (index: number) => void,
  clock: RunwayClock = {
    set: (callback, delay) => setTimeout(callback, delay),
    clear: (timer) => clearTimeout(timer),
  },
) {
  const next = nextScene(index);
  let cancelled = false;
  const timer = clock.set(
    () => {
      if (!cancelled) advance(next);
    },
    index === 0 ? 2600 : 5600,
  );
  return () => {
    cancelled = true;
    clock.clear(timer);
  };
}
