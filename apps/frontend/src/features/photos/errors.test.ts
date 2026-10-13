import { expect, it } from "vitest";
import { RasterError } from "@retailor/contracts/raster";
import { PhotoInputError, photoNotice, photoWorkerFailure } from "./errors";
it("keeps intentional photo validation while rejecting unknown technical text and worker messages", () => {
  expect(
    photoNotice(
      new PhotoInputError("Each photo must be at most 4 MiB."),
      "Fallback",
    ),
  ).toContain("4 MiB");
  expect(photoNotice(new RasterError("format"), "Fallback")).toContain("JPEG");
  expect(
    photoNotice(new TypeError("PRIVATE_MARKER stack"), "Choose another photo."),
  ).toBe("Choose another photo.");
  expect(photoWorkerFailure("dimensions").message).toBe(
    new RasterError("dimensions").message,
  );
  expect(photoWorkerFailure("PRIVATE_MARKER").message).not.toContain(
    "PRIVATE_MARKER",
  );
});
