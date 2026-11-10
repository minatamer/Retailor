import { createHash, randomUUID } from "node:crypto";
import { PHOTO_LIMITS } from "@retailor/contracts/photos";
import { inspectRaster } from "@retailor/contracts/raster";
import { prepareProviderImages } from "../catalogue/sanitize.js";
import { boundedBytes } from "../security/bounded.js";
import { deny } from "../security/errors.js";
import type { ProductContext, RemoteProduct } from "./product-provider.js";

/** Only URLs freshly returned by the authenticated fixed product query enter here. */
export async function importPhotos(
  context: ProductContext,
  product: RemoteProduct,
  http: typeof fetch,
) {
  const media = product.media.nodes.filter(
    (item) => item.mediaContentType === "IMAGE",
  );
  if (!media.length || media.length > 8 || product.media.pageInfo.hasNextPage)
    return deny("INVALID_INPUT", 400);
  const photos = [];
  for (const photo of media) {
    context.signal.throwIfAborted();
    if (
      photo.mediaContentType !== "IMAGE" ||
      photo.status !== "READY" ||
      !photo.image
    )
      return deny("INVALID_INPUT", 400);
    const url = new URL(photo.image.url);
    if (
      url.protocol !== "https:" ||
      url.hostname !== "cdn.shopify.com" ||
      url.port ||
      url.username ||
      url.password ||
      url.hash
    )
      return deny("FORBIDDEN", 403);
    await context.admit();
    context.signal.throwIfAborted();
    const signal = AbortSignal.any([
      context.signal,
      AbortSignal.timeout(15000),
    ]);
    const response = await http(url, {
      signal,
      redirect: "error",
      credentials: "omit",
      referrerPolicy: "no-referrer",
    });
    if (!response.ok) {
      await response.body?.cancel();
      return deny("UPSTREAM_FAILED", 502);
    }
    const bytes = await boundedBytes(response, PHOTO_LIMITS.derivative, signal);
    const shape = inspectRaster(bytes),
      id = `shopify_${randomUUID()}`;
    const image = {
      id,
      hash: createHash("sha256").update(bytes).digest("hex"),
      mime: shape.mime,
      width: shape.width,
      height: shape.height,
      bytes: bytes.length,
    };
    const sanitized = await prepareProviderImages(
      [image],
      new Map([[id, bytes]]),
      signal,
      { stripMetadata: true },
    );
    const clean = sanitized.get(id)!;
    const cleanShape = inspectRaster(clean);
    photos.push({
      image: {
        ...image,
        hash: createHash("sha256").update(clean).digest("hex"),
        width: cleanShape.width,
        height: cleanShape.height,
        mime: cleanShape.mime,
        bytes: clean.length,
      },
      base64: Buffer.from(clean).toString("base64"),
    });
  }
  return photos;
}
