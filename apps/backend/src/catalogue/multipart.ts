import busboy from "busboy";
import type { Request } from "express";
import {
  RecognitionRequestSchema,
  RECOGNITION_LIMITS,
} from "@retailor/contracts/recognition";
import { PHOTO_LIMITS } from "@retailor/contracts/photos";
import type { PaidAdmission } from "../security/admission.js";
import { OperationFailure } from "../security/errors.js";

export type AdmissionLease = ReturnType<PaidAdmission["begin"]>;
/** The first field must be the action/grant. No image buffer exists before reservation. */
export function receiveCatalogue(
  req: Request,
  admission: PaidAdmission,
  safety: string,
  signal: AbortSignal,
): Promise<{ lease: AdmissionLease; files: Map<string, Uint8Array> }> {
  return new Promise((resolve, reject) => {
    let parser: ReturnType<typeof busboy>;
    try {
      parser = busboy({
        headers: req.headers,
        limits: {
          fields: 1,
          files: 24,
          // Busboy emits partsLimit when the last allowed part completes.
          // Permit the sentinel 26th part so exactly 1 field + 24 files succeeds;
          // field/file limits and this event reject any additional application part.
          parts: 26,
          fieldSize: RECOGNITION_LIMITS.metadata,
          fileSize: PHOTO_LIMITS.derivative,
          headerPairs: 32,
        },
      });
    } catch {
      reject(new OperationFailure("INVALID_INPUT", 400));
      return;
    }
    let lease: AdmissionLease | undefined,
      ended = false,
      transport = 0,
      aggregate = 0;
    const files = new Map<string, Uint8Array>(),
      seen = new Set<string>();
    const cleanup = () => {
      signal.removeEventListener("abort", abort);
      req.removeListener("data", data);
      req.removeListener("end", end);
      req.removeListener("error", fail);
      req.removeListener("aborted", abort);
      parser.removeListener("drain", drain);
    };
    const fail = (error: unknown) => {
      if (ended) return;
      ended = true;
      cleanup();
      lease?.finish();
      files.clear();
      queueMicrotask(() => parser.destroy());
      req.pause();
      reject(
        error instanceof OperationFailure
          ? error
          : new OperationFailure("INVALID_INPUT", 400),
      );
    };
    const abort = () => fail(new OperationFailure("DEADLINE", 504));
    const drain = () => {
      if (!ended) req.resume();
    };
    const data = (chunk: Buffer) => {
      transport += chunk.length;
      if (transport > RECOGNITION_LIMITS.transport) {
        fail(new OperationFailure("TOO_LARGE", 413));
        return;
      }
      if (!ended && !parser.write(chunk)) req.pause();
    };
    const end = () => {
      if (!ended) parser.end();
    };
    parser.on("error", fail);
    parser.on("drain", drain);
    parser.on("fieldsLimit", () =>
      fail(new OperationFailure("TOO_LARGE", 413)),
    );
    parser.on("filesLimit", () => fail(new OperationFailure("TOO_LARGE", 413)));
    parser.on("partsLimit", () => fail(new OperationFailure("TOO_LARGE", 413)));
    parser.on("field", (name, value, info) => {
      if (ended) return;
      try {
        if (
          name !== "manifest" ||
          lease ||
          info.valueTruncated ||
          info.nameTruncated ||
          Buffer.byteLength(value) > RECOGNITION_LIMITS.metadata
        )
          throw new OperationFailure("INVALID_INPUT", 400);
        const request = RecognitionRequestSchema.parse(JSON.parse(value));
        lease = admission.begin(request.action, request.grant, safety);
      } catch (error) {
        fail(error);
      }
    });
    parser.on("file", (name, stream, info) => {
      stream.on("error", fail);
      if (ended) {
        stream.resume();
        return;
      }
      const expected = lease?.action.photos.find(
        (photo) => photo.id === name,
      )?.derivative;
      if (!expected || seen.has(name) || info.mimeType !== expected.mime) {
        stream.resume();
        fail(new OperationFailure("INVALID_INPUT", 400));
        return;
      }
      seen.add(name);
      // Bound retained storage by admitted bytes, independently of transport fragmentation.
      const bytes = Buffer.alloc(expected.bytes);
      let count = 0;
      stream.on("limit", () => fail(new OperationFailure("TOO_LARGE", 413)));
      stream.on("data", (chunk: Buffer) => {
        if (ended) return;
        count += chunk.length;
        aggregate += chunk.length;
        if (count > expected.bytes || aggregate > PHOTO_LIMITS.derivatives) {
          fail(new OperationFailure("TOO_LARGE", 413));
          return;
        }
        bytes.set(chunk, count - chunk.length);
      });
      stream.on("end", () => {
        if (ended) return;
        if (stream.truncated || count !== expected.bytes) {
          fail(new OperationFailure("INVALID_INPUT", 400));
          return;
        }
        files.set(name, bytes);
      });
    });
    parser.on("close", () => {
      if (ended) return;
      if (!lease || files.size !== lease.action.photos.length) {
        fail(new OperationFailure("INVALID_INPUT", 400));
        return;
      }
      ended = true;
      cleanup();
      resolve({ lease, files });
    });
    signal.addEventListener("abort", abort, { once: true });
    req.on("aborted", abort);
    req.on("error", fail);
    req.on("data", data);
    req.on("end", end);
    if (signal.aborted) abort();
  });
}
