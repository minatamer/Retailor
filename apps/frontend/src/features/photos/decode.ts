import { PhotoSchema, PHOTO_LIMITS } from "@retailor/contracts/photos";
import type { Photo } from "@retailor/contracts/photos";
import { inspectRaster } from "@retailor/contracts/raster";
import { DecodeCapacity } from "./decode-capacity";
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

const capacity = new DecodeCapacity();
function sourcePixels(blob: Blob, signal: AbortSignal): Promise<number> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (error?: unknown, pixels?: number) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal.removeEventListener("abort", abort);
      if (error) reject(error);
      else resolve(pixels!);
    };
    const abort = () => finish(new Error("Photo selection cancelled."));
    const timer = setTimeout(
      () =>
        finish(
          new Error("This photo took too long to read. Try a smaller copy."),
        ),
      PHOTO_LIMITS.decodeMs,
    );
    signal.addEventListener("abort", abort, { once: true });
    if (signal.aborted) {
      abort();
      return;
    }
    void Promise.resolve()
      .then(() => blob.arrayBuffer())
      .then((bytes) => {
        if (settled) return;
        const header = inspectRaster(new Uint8Array(bytes)),
          pixels = header.width * header.height;
        if (
          pixels > PHOTO_LIMITS.pixels ||
          Math.max(header.width, header.height) > PHOTO_LIMITS.side
        )
          throw new Error(
            "This photo exceeds the 24-megapixel or 10,000-pixel limit.",
          );
        finish(undefined, pixels);
      })
      .catch(finish);
  });
}
/** Two owned workers at most; large originals share a 24-MP bitmap budget. */
export const decodePhoto: PhotoDecoder = async (task, signal) => {
  signal.throwIfAborted();
  if (task.original.size < 1 || task.original.size > PHOTO_LIMITS.original)
    throw new Error("Each photo must be at most 4 MiB.");
  const pixels = await sourcePixels(task.original, signal),
    release = await capacity.enter(pixels, signal);
  try {
    signal.throwIfAborted();
    return await workerDecode(task, signal);
  } finally {
    release();
  }
};
/** A fresh owned worker gives each active decode a hard, terminable ten-second envelope. */
const workerDecode: PhotoDecoder = (task, signal) => {
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
    try {
      worker.postMessage(task);
    } catch (error) {
      finish(error);
    }
    if (signal.aborted) abort();
  });
};
