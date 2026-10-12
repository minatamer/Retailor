import { LogoMetadataSchema } from "@retailor/contracts/brand";
import { inspectRaster } from "@retailor/contracts/raster";
import type { StoredLogo } from "../photos/cache";
async function verify(input: StoredLogo) {
  const metadata = LogoMetadataSchema.parse(input.metadata);
  if (
    !(input.blob instanceof Blob) ||
    input.blob.size !== metadata.bytes ||
    input.blob.type !== "image/png"
  )
    throw new Error("bytes");
  const bytes = await input.blob.arrayBuffer(),
    header = inspectRaster(new Uint8Array(bytes));
  const hash = Array.from(
    new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
    (b) => b.toString(16).padStart(2, "0"),
  ).join("");
  if (
    header.mime !== "image/png" ||
    header.privateMetadata ||
    header.width !== metadata.width ||
    header.height !== metadata.height ||
    hash !== metadata.hash
  )
    throw new Error("identity");
  let bitmap: ImageBitmap | undefined, canvas: OffscreenCanvas | undefined;
  try {
    bitmap = await createImageBitmap(input.blob);
    if (bitmap.width !== metadata.width || bitmap.height !== metadata.height)
      throw new Error("dimensions");
    canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("canvas");
    context.drawImage(bitmap, 0, 0);
    const pixels = context.getImageData(0, 0, bitmap.width, bitmap.height).data;
    let transparent = 0,
      visible = 0;
    for (let i = 3; i < pixels.length; i += 4) {
      if (pixels[i] === 0) transparent++;
      else visible++;
    }
    if (transparent < 64 || visible < 256) throw new Error("alpha");
    return { metadata, blob: input.blob };
  } finally {
    bitmap?.close();
    if (canvas) {
      canvas.width = 1;
      canvas.height = 1;
    }
  }
}
self.onmessage = (event: MessageEvent<StoredLogo>) => {
  void verify(event.data).then(
    (value) => self.postMessage(value),
    () =>
      self.postMessage({
        error: "That logo could not be validated. Your wordmark is ready.",
      }),
  );
};
