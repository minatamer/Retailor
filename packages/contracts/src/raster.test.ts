import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { inspectRaster } from "./raster.js";
import {
  PHOTO_LIMITS,
  PhotoSchema,
  RecognitionManifestSchema,
  requireAvailablePhotos,
} from "./photos.js";
const png = new Uint8Array(
  readFileSync(
    new URL(
      "../../../apps/frontend/public/design/reference-shirt.png",
      import.meta.url,
    ),
  ),
);
function chunk(type: string, payload: Uint8Array) {
  const result = new Uint8Array(payload.length + 12);
  new DataView(result.buffer).setUint32(0, payload.length);
  result.set(new TextEncoder().encode(type), 4);
  result.set(payload, 8);
  return result;
}
describe("bounded raster inspection before decode", () => {
  it("reads actual PNG and shipped WebP dimensions without trusting extension", () => {
    expect(inspectRaster(png)).toMatchObject({
      mime: "image/png",
      width: 1122,
      height: 1402,
    });
    const webp = new Uint8Array(
      readFileSync(
        new URL(
          "../../../apps/frontend/public/sample/forme/F01.webp",
          import.meta.url,
        ),
      ),
    );
    expect(inspectRaster(webp)).toMatchObject({
      mime: "image/webp",
      width: 1122,
      height: 1402,
    });
  });
  it("rejects truncation, renamed SVG/HEIC and oversized bytes", () => {
    for (const count of [0, 1, 7, 15, 32, png.length - 2])
      expect(() => inspectRaster(png.subarray(0, count))).toThrow();
    expect(() =>
      inspectRaster(
        new TextEncoder().encode('<svg width="300" height="300"/>'),
      ),
    ).toThrow("JPEG");
    expect(() =>
      inspectRaster(new TextEncoder().encode("0000ftypheic0123456789")),
    ).toThrow("HEIC");
    expect(() =>
      inspectRaster(new Uint8Array(PHOTO_LIMITS.original + 1)),
    ).toThrow("4 MiB");
  });
  it("rejects oversized dimensions before pixel allocation and explicit APNG chunks", () => {
    const bomb = Uint8Array.from(png);
    new DataView(bomb.buffer).setUint32(16, 10_000);
    new DataView(bomb.buffer).setUint32(20, 10_000);
    expect(() => inspectRaster(bomb)).toThrow("24 megapixels");
    const animation = chunk("acTL", new Uint8Array(8));
    const animated = new Uint8Array(png.length + animation.length);
    animated.set(png.subarray(0, 33));
    animated.set(animation, 33);
    animated.set(png.subarray(33), 33 + animation.length);
    expect(() => inspectRaster(animated)).toThrow("Animated");
  });
  it("rejects WebP animation flags and inconsistent RIFF length", () => {
    const data = new Uint8Array(30);
    data.set(new TextEncoder().encode("RIFF"));
    new DataView(data.buffer).setUint32(4, 22, true);
    data.set(new TextEncoder().encode("WEBPVP8X"), 8);
    new DataView(data.buffer).setUint32(16, 10, true);
    data[20] = 2;
    expect(() => inspectRaster(data)).toThrow("Animated");
    data[4] = 0;
    expect(() => inspectRaster(data)).toThrow("could not be read");
  });
});
const image = {
  id: "photo",
  hash: "a".repeat(64),
  mime: "image/jpeg",
  width: 100,
  height: 100,
  bytes: 100,
};
it("requires bounded unique derivative identity and available bytes for products", () => {
  expect(
    RecognitionManifestSchema.safeParse(Array(25).fill(image)).success,
  ).toBe(false);
  expect(
    RecognitionManifestSchema.safeParse([image, { ...image, id: "second" }])
      .success,
  ).toBe(false);
  expect(
    RecognitionManifestSchema.safeParse([{ ...image, width: 1601 }]).success,
  ).toBe(false);
  expect(
    PhotoSchema.safeParse({ id: "other", source: image, derivative: image })
      .success,
  ).toBe(false);
  expect(() => requireAvailablePhotos([], new Set())).toThrow();
  expect(() => requireAvailablePhotos(["photo"], new Set())).toThrow();
  expect(() =>
    requireAvailablePhotos(["photo"], new Set(["photo"])),
  ).not.toThrow();
});
