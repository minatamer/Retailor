import { deny } from "../security/errors.js";
export const IMAGE_WORKER_LIMITS = Object.freeze({
  active: 2,
  waiting: 2,
  rssBytes: 640 * 1024 * 1024,
});
/** Inert process resource ownership, separate from admission and request bodies. */
export class ImageCapacity {
  private active = 0;
  private readonly waiting: {
    signal: AbortSignal;
    abort(): void;
    resolve(release: () => void): void;
  }[] = [];
  constructor(private readonly maximum: number = IMAGE_WORKER_LIMITS.active) {
    if (![1, 2].includes(maximum))
      throw new Error("Use one or two image worker slots.");
  }
  async enter(signal: AbortSignal): Promise<() => void> {
    signal.throwIfAborted();
    if (!this.waiting.length && this.active < this.maximum) {
      this.active++;
      return this.release();
    }
    if (this.waiting.length >= IMAGE_WORKER_LIMITS.waiting)
      return deny("BUSY", 429);
    return new Promise((resolve, reject) => {
      const waiter = {
        signal,
        resolve,
        abort: () => {
          const index = this.waiting.indexOf(waiter);
          if (index >= 0) this.waiting.splice(index, 1);
          signal.removeEventListener("abort", waiter.abort);
          reject(signal.reason ?? new Error("Image operation cancelled"));
          this.drain();
        },
      };
      this.waiting.push(waiter);
      signal.addEventListener("abort", waiter.abort, { once: true });
      if (signal.aborted) waiter.abort();
    });
  }
  counters() {
    return Object.freeze({ active: this.active, waiting: this.waiting.length });
  }
  private release() {
    let released = false;
    return () => {
      if (released) return;
      released = true;
      this.active--;
      this.drain();
    };
  }
  private drain() {
    while (this.active < this.maximum && this.waiting.length) {
      const next = this.waiting.shift()!;
      next.signal.removeEventListener("abort", next.abort);
      if (!next.signal.aborted) {
        this.active++;
        next.resolve(this.release());
      }
    }
  }
}
