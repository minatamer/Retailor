import { PhotoSchema, PHOTO_LIMITS } from "@retailor/contracts/photos";
import { inspectRaster, RasterError } from "@retailor/contracts/raster";
import type { DecodeTask, ProcessedPhoto } from "./decode";

async function hash(data: ArrayBuffer) {
  return Array.from(
    new Uint8Array(await crypto.subtle.digest("SHA-256", data)),
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");
}
async function processPhoto(task: DecodeTask): Promise<ProcessedPhoto> {
  if (
    !(task.original instanceof Blob) ||
    task.original.size > PHOTO_LIMITS.original
  )
    throw new Error("size");
  const originalBuffer = await task.original.arrayBuffer();
  const source = inspectRaster(new Uint8Array(originalBuffer));
  const sourceHash = await hash(originalBuffer);
  let bitmap: ImageBitmap | undefined;
  let canvas: OffscreenCanvas | undefined;
  try {
    bitmap = await createImageBitmap(
      new Blob([originalBuffer], { type: source.mime }),
      { imageOrientation: "from-image" },
    );
    if (
      bitmap.width * bitmap.height > PHOTO_LIMITS.pixels ||
      Math.max(bitmap.width, bitmap.height) > PHOTO_LIMITS.side ||
      !(
        (bitmap.width === source.width && bitmap.height === source.height) ||
        (bitmap.width === source.height && bitmap.height === source.width)
      )
    )
      throw new RasterError("dimensions");
    if (task.existing) {
      const saved = PhotoSchema.parse(task.existing.photo);
      if (
        saved.id !== task.id ||
        saved.source.hash !== sourceHash ||
        saved.source.bytes !== task.original.size ||
        saved.source.mime !== source.mime ||
        saved.source.width !== source.width ||
        saved.source.height !== source.height
      )
        throw new Error("restore");
      if (
        !(task.existing.derivative instanceof Blob) ||
        task.existing.derivative.size !== saved.derivative.bytes
      )
        throw new Error("restore");
      const previewBuffer = await task.existing.derivative.arrayBuffer();
      const preview = inspectRaster(new Uint8Array(previewBuffer));
      if (
        preview.privateMetadata ||
        preview.mime !== saved.derivative.mime ||
        preview.width !== saved.derivative.width ||
        preview.height !== saved.derivative.height ||
        previewBuffer.byteLength !== saved.derivative.bytes ||
        (await hash(previewBuffer)) !== saved.derivative.hash
      )
        throw new Error("restore");
      const checked = await createImageBitmap(task.existing.derivative);
      try {
        if (
          checked.width !== preview.width ||
          checked.height !== preview.height
        )
          throw new Error("restore");
      } finally {
        checked.close();
      }
      return {
        photo: saved,
        original: task.original,
        derivative: task.existing.derivative,
      };
    }
    let scale = Math.min(
      1,
      PHOTO_LIMITS.derivativeSide / Math.max(bitmap.width, bitmap.height),
    );
    let derivative: Blob | undefined;
    for (let attempt = 0; attempt < 5; attempt++) {
      const width = Math.max(1, Math.round(bitmap.width * scale));
      const height = Math.max(1, Math.round(bitmap.height * scale));
      canvas = new OffscreenCanvas(width, height);
      const context = canvas.getContext("2d", { alpha: false });
      if (!context) throw new Error("canvas");
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, width, height);
      context.drawImage(bitmap, 0, 0, width, height);
      derivative = await canvas.convertToBlob({
        type: "image/webp",
        quality: attempt === 0 ? 0.88 : 0.76,
      });
      if (derivative.size <= PHOTO_LIMITS.derivative) break;
      canvas.width = 1;
      canvas.height = 1;
      scale *= 0.75;
    }
    if (!derivative || derivative.size > PHOTO_LIMITS.derivative)
      throw new Error("preview-size");
    const previewBuffer = await derivative.arrayBuffer();
    const preview = inspectRaster(new Uint8Array(previewBuffer));
    if (preview.privateMetadata) throw new Error("metadata");
    const photo = PhotoSchema.parse({
      id: task.id,
      source: {
        id: task.id,
        hash: sourceHash,
        mime: source.mime,
        width: source.width,
        height: source.height,
        bytes: originalBuffer.byteLength,
      },
      derivative: {
        id: task.id,
        hash: await hash(previewBuffer),
        mime: preview.mime,
        width: preview.width,
        height: preview.height,
        bytes: previewBuffer.byteLength,
      },
    });
    return { photo, original: task.original, derivative };
  } finally {
    bitmap?.close();
    if (canvas) {
      canvas.width = 1;
      canvas.height = 1;
    }
  }
}
self.onmessage = (event: MessageEvent<DecodeTask>) => {
  void processPhoto(event.data).then(
    (photo) => self.postMessage(photo),
    (error: unknown) =>
      self.postMessage({
        error:
          error instanceof RasterError
            ? error.message
            : "This photo could not be decoded or restored. Choose another valid copy.",
      }),
  );
};
