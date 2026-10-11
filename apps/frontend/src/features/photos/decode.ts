import { PhotoSchema, PHOTO_LIMITS } from "@retailor/contracts/photos";
import type { Photo } from "@retailor/contracts/photos";
export interface ProcessedPhoto {
  photo: Photo;
  original: Blob;
  derivative: Blob;
}
export interface DecodeTask {
  id: string;
  original: Blob;
  existing?: ProcessedPhoto;
}
export type PhotoDecoder = (
  task: DecodeTask,
  signal: AbortSignal,
) => Promise<ProcessedPhoto>;

/** A fresh owned worker gives each decode a hard, terminable ten-second envelope. */
export const decodePhoto: PhotoDecoder = (task, signal) => {
  if (signal.aborted) return Promise.reject(signal.reason);
  if (task.original.size < 1 || task.original.size > PHOTO_LIMITS.original)
    return Promise.reject(new Error("Each photo must be at most 4 MiB."));
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./photo.worker.ts", import.meta.url), {
      type: "module",
    });
    let settled = false;
    const finish = (error?: unknown, value?: ProcessedPhoto) => {
      if (settled) return;
      settled = true;
      clearTimeout(deadline);
      signal.removeEventListener("abort", abort);
      worker.terminate();
      if (error !== undefined) reject(error);
      else if (value) resolve(value);
    };
    const abort = () =>
      finish(signal.reason ?? new Error("Photo selection cancelled."));
    const deadline = setTimeout(
      () =>
        finish(
          new Error("This photo took too long to read. Try a smaller copy."),
        ),
      PHOTO_LIMITS.decodeMs,
    );
    signal.addEventListener("abort", abort, { once: true });
    worker.onerror = () =>
      finish(
        new Error(
          "Photo processing is unavailable in this browser. Try a current browser.",
        ),
      );
    worker.onmessage = (event: MessageEvent<unknown>) => {
      const data = event.data;
      if (!data || typeof data !== "object")
        return finish(new Error("Unable to read this photo."));
      if ("error" in data && typeof data.error === "string")
        return finish(new Error(data.error.slice(0, 240)));
      if (
        !("photo" in data) ||
        !("original" in data) ||
        !("derivative" in data)
      )
        return finish(new Error("Unable to read this photo."));
      const parsed = PhotoSchema.safeParse(data.photo);
      if (
        !parsed.success ||
        parsed.data.id !== task.id ||
        !(data.original instanceof Blob) ||
        !(data.derivative instanceof Blob) ||
        data.original.size !== parsed.data.source.bytes ||
        data.derivative.size !== parsed.data.derivative.bytes
      )
        return finish(new Error("Unable to validate this photo."));
      finish(undefined, {
        photo: parsed.data,
        original: data.original,
        derivative: data.derivative,
      });
    };
    worker.postMessage(task);
    if (signal.aborted) abort();
  });
};
