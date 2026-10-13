import { RasterError } from "@retailor/contracts/raster";

/** Constructed only for source-controlled photo input/recovery copy. */
export class PhotoInputError extends Error {}
export function photoNotice(error: unknown, fallback: string): string {
  return error instanceof PhotoInputError || error instanceof RasterError
    ? error.message
    : fallback;
}
/** Worker errors carry a finite code, never an arbitrary exception message. */
export function photoWorkerFailure(code: unknown): Error {
  if (
    code === "format" ||
    code === "corrupt" ||
    code === "animated" ||
    code === "dimensions" ||
    code === "bytes"
  )
    return new RasterError(code);
  return new PhotoInputError(
    "This photo could not be decoded or restored. Choose another valid copy.",
  );
}
