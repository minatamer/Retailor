import { PHOTO_LIMITS } from "./photos.js";
export type RasterMime = "image/jpeg" | "image/png" | "image/webp";
export interface RasterHeader {
  mime: RasterMime;
  width: number;
  height: number;
  privateMetadata: boolean;
}
export class RasterError extends Error {
  constructor(
    public readonly code:
      "format" | "corrupt" | "animated" | "dimensions" | "bytes",
  ) {
    super(
      {
        format:
          "Choose a static JPEG, PNG or WebP photo. HEIC, SVG, GIF and video are unsupported.",
        corrupt:
          "This image could not be read. Choose another copy of the photo.",
        animated: "Animated images are unsupported. Choose a still photo.",
        dimensions:
          "Use a photo under 24 megapixels and 10,000 pixels per side.",
        bytes: "Each original photo must be at most 4 MiB.",
      }[code],
    );
  }
}
function bad(): never {
  throw new RasterError("corrupt");
}
function ascii(data: Uint8Array, offset: number, count: number): string {
  return String.fromCharCode(...data.subarray(offset, offset + count));
}
/** Bounded structural inspection before pixel allocation; decoding must follow. */
export function inspectRaster(data: Uint8Array): RasterHeader {
  if (!data.length || data.length > PHOTO_LIMITS.original)
    throw new RasterError("bytes");
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  let result: RasterHeader;
  if (
    data.length >= 8 &&
    [137, 80, 78, 71, 13, 10, 26, 10].every((byte, i) => data[i] === byte)
  ) {
    let offset = 8;
    let width = 0,
      height = 0,
      ended = false,
      pixels = false,
      privateMetadata = false;
    while (offset + 12 <= data.length) {
      const size = view.getUint32(offset);
      const type = ascii(data, offset + 4, 4);
      if (size > data.length - offset - 12) bad();
      if (offset === 8 && (type !== "IHDR" || size !== 13)) bad();
      if (type === "IHDR") {
        if (width || offset !== 8) bad();
        width = view.getUint32(offset + 8);
        height = view.getUint32(offset + 12);
      }
      if (["acTL", "fcTL", "fdAT"].includes(type))
        throw new RasterError("animated");
      if (["eXIf", "tEXt", "zTXt", "iTXt"].includes(type))
        privateMetadata = true;
      if (type === "IDAT") pixels = true;
      offset += size + 12;
      if (type === "IEND") {
        if (size !== 0 || offset !== data.length || !pixels) bad();
        ended = true;
        break;
      }
    }
    if (!ended) bad();
    result = { mime: "image/png", width, height, privateMetadata };
  } else if (data[0] === 255 && data[1] === 216 && data[2] === 255) {
    if (data[data.length - 2] !== 255 || data[data.length - 1] !== 217) bad();
    let offset = 2,
      width = 0,
      height = 0,
      privateMetadata = false,
      scan = false;
    while (offset + 4 <= data.length) {
      if (data[offset++] !== 255) bad();
      while (data[offset] === 255) offset++;
      const marker = data[offset++];
      if (marker === undefined) bad();
      if (marker === 1 || (marker >= 208 && marker <= 215)) continue;
      if (offset + 2 > data.length) bad();
      const size = view.getUint16(offset);
      if (size < 2 || offset + size > data.length) bad();
      if ([225, 237].includes(marker)) privateMetadata = true;
      if (
        [
          192, 193, 194, 195, 197, 198, 199, 201, 202, 203, 205, 206, 207,
        ].includes(marker)
      ) {
        if (size < 8 || width) bad();
        height = view.getUint16(offset + 3);
        width = view.getUint16(offset + 5);
      }
      if (marker === 218) {
        scan = true;
        break;
      }
      offset += size;
    }
    if (!scan) bad();
    result = { mime: "image/jpeg", width, height, privateMetadata };
  } else if (
    data.length >= 20 &&
    ascii(data, 0, 4) === "RIFF" &&
    ascii(data, 8, 4) === "WEBP"
  ) {
    if (view.getUint32(4, true) + 8 !== data.length) bad();
    let offset = 12,
      width = 0,
      height = 0,
      privateMetadata = false,
      pixels = false;
    const uint24 = (start: number) =>
      data[start]! | (data[start + 1]! << 8) | (data[start + 2]! << 16);
    while (offset + 8 <= data.length) {
      const type = ascii(data, offset, 4);
      const size = view.getUint32(offset + 4, true);
      const start = offset + 8;
      if (size > data.length - start) bad();
      if (["ANIM", "ANMF"].includes(type)) throw new RasterError("animated");
      if (["EXIF", "XMP "].includes(type)) privateMetadata = true;
      if (type === "VP8X") {
        if (size !== 10 || width) bad();
        if (data[start]! & 2) throw new RasterError("animated");
        width = uint24(start + 4) + 1;
        height = uint24(start + 7) + 1;
      } else if (type === "VP8 ") {
        if (size < 10 || ascii(data, start + 3, 3) !== "\x9d\x01\x2a" || pixels)
          bad();
        const w = view.getUint16(start + 6, true) & 16383;
        const h = view.getUint16(start + 8, true) & 16383;
        if (width && (width !== w || height !== h)) bad();
        width = w;
        height = h;
        pixels = true;
      } else if (type === "VP8L") {
        if (size < 5 || data[start] !== 47 || pixels) bad();
        const bits = view.getUint32(start + 1, true);
        const w = (bits & 16383) + 1;
        const h = ((bits >>> 14) & 16383) + 1;
        if (width && (width !== w || height !== h)) bad();
        width = w;
        height = h;
        pixels = true;
      }
      offset = start + size + (size % 2);
    }
    if (offset !== data.length || !pixels) bad();
    result = { mime: "image/webp", width, height, privateMetadata };
  } else throw new RasterError("format");
  if (
    result.width < 1 ||
    result.height < 1 ||
    Math.max(result.width, result.height) > PHOTO_LIMITS.side ||
    result.width * result.height > PHOTO_LIMITS.pixels
  )
    throw new RasterError("dimensions");
  return result;
}
