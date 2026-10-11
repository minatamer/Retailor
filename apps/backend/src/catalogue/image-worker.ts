import { parentPort, workerData } from "node:worker_threads";
import sharp from "sharp";
import { PHOTO_LIMITS } from "@retailor/contracts/photos";
sharp.cache(false);
sharp.concurrency(1);
const task = workerData as { bytes: Uint8Array; width: number; height: number };
try {
  const worker = sharp(task.bytes, {
    limitInputPixels: PHOTO_LIMITS.derivativeSide ** 2,
    failOn: "warning",
    sequentialRead: true,
  }).timeout({ seconds: 9 });
  const metadata = await worker.metadata();
  if (
    metadata.width !== task.width ||
    metadata.height !== task.height ||
    (metadata.pages ?? 1) !== 1 ||
    metadata.exif ||
    metadata.xmp ||
    metadata.iptc
  )
    throw new Error("Invalid raster");
  let buffer = await worker.clone().rotate().webp({ quality: 85 }).toBuffer();
  if (buffer.length > PHOTO_LIMITS.derivative)
    buffer = await worker
      .clone()
      .rotate()
      .resize({
        width: 1024,
        height: 1024,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 60 })
      .toBuffer();
  if (buffer.length > PHOTO_LIMITS.derivative)
    buffer = await worker
      .clone()
      .rotate()
      .resize({
        width: 768,
        height: 768,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 55 })
      .toBuffer();
  if (buffer.length > PHOTO_LIMITS.derivative)
    throw new Error("Oversized raster");
  const bytes = new Uint8Array(buffer.length);
  bytes.set(buffer);
  parentPort!.postMessage({ ok: true, bytes }, [bytes.buffer]);
} catch {
  parentPort!.postMessage({ ok: false });
}
