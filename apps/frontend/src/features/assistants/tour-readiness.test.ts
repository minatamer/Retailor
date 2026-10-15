import { describe, expect, it, vi } from "vitest";
import { waitForTourPage } from "./tour-readiness";

function page() {
  let now = 0,
    next = 0;
  const frames = new Map<number, FrameRequestCallback>();
  const rect = { top: 0, left: 0, right: 1200, bottom: 1800 };
  const image = {
    complete: false,
    loading: "eager",
    getBoundingClientRect: () => ({
      top: 10,
      bottom: 400,
      width: 300,
      height: 390,
    }),
  };
  const root = {
    readyState: "loading",
    fonts: { status: "loading" },
    images: [image],
    documentElement: { getBoundingClientRect: () => ({ ...rect }) },
    defaultView: {
      innerHeight: 768,
      performance: { now: () => now },
      requestAnimationFrame: (callback: FrameRequestCallback) => {
        frames.set(++next, callback);
        return next;
      },
      cancelAnimationFrame: (id: number) => {
        frames.delete(id);
      },
    },
  };
  const ready = vi.fn();
  const cancel = waitForTourPage(root as unknown as Document, ready);
  return {
    root,
    image,
    rect,
    ready,
    cancel,
    frames,
    frame(time: number) {
      now = time;
      const callbacks = [...frames.values()];
      frames.clear();
      callbacks.forEach((callback) => callback(time));
    },
  };
}
describe("tour page readiness", () => {
  it("waits for document, visible pictures and fonts, then allows a full quiet second", () => {
    const p = page();
    p.frame(0);
    p.frame(1500);
    p.root.readyState = "complete";
    p.root.fonts.status = "loaded";
    p.frame(2000);
    expect(p.ready).not.toHaveBeenCalled();
    p.image.complete = true;
    p.frame(3000);
    p.frame(3999);
    expect(p.ready).not.toHaveBeenCalled();
    p.frame(4000);
    expect(p.ready).toHaveBeenCalledOnce();
    expect(p.frames.size).toBe(0);
  });
  it("restarts the quiet second after a layout shift and cancels all pending frames on skip/unmount", () => {
    const p = page();
    p.root.readyState = "complete";
    p.root.fonts.status = "loaded";
    p.image.complete = true;
    p.frame(0);
    p.frame(16);
    p.rect.bottom += 80;
    p.frame(500);
    p.frame(516);
    p.frame(1515);
    expect(p.ready).not.toHaveBeenCalled();
    p.frame(1516);
    expect(p.ready).toHaveBeenCalledOnce();
    const cancelled = page();
    cancelled.frame(0);
    cancelled.cancel();
    cancelled.frame(20_000);
    expect(cancelled.ready).not.toHaveBeenCalled();
    expect(cancelled.frames.size).toBe(0);
  });
  it("does not wait for an offscreen lazy photograph and bounds a stalled page", () => {
    const p = page();
    p.root.readyState = "complete";
    p.root.fonts.status = "loaded";
    p.image.loading = "lazy";
    p.image.getBoundingClientRect = () => ({
      top: 900,
      bottom: 1200,
      width: 300,
      height: 300,
    });
    p.frame(0);
    p.frame(16);
    p.frame(1016);
    expect(p.ready).toHaveBeenCalledOnce();
    const stalled = page();
    stalled.frame(0);
    stalled.frame(9999);
    expect(stalled.ready).not.toHaveBeenCalled();
    stalled.frame(10_000);
    stalled.frame(10_999);
    expect(stalled.ready).not.toHaveBeenCalled();
    stalled.frame(11_000);
    expect(stalled.ready).toHaveBeenCalledOnce();
    expect(stalled.frames.size).toBe(0);
  });
});
