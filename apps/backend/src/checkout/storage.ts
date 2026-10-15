import { Storage } from "@google-cloud/storage";
import { IdSchema } from "@retailor/contracts/core";
import { randomUUID } from "node:crypto";

export interface CheckoutImages {
  put(
    attempt: string,
    photo: string,
    bytes: Uint8Array,
    expires: number,
    signal: AbortSignal,
  ): Promise<string>;
  remove(attempt: string, photos: readonly string[]): Promise<void>;
}
/** Construction is inert. ADC is resolved only when a deliberate checkout uses this adapter. */
export function checkoutImages(
  projectId: string,
  bucketName: string,
): CheckoutImages {
  // A restarted process must never clean up an earlier process's objects when
  // an untrusted attempt/photo ID is reused.
  const namespace = randomUUID();
  const storage = new Storage({
    projectId,
    timeout: 15_000,
    clientOptions: { transporterOptions: { timeout: 10_000, retry: false } },
    retryOptions: { autoRetry: false, maxRetries: 0 },
  });
  const file = (attempt: string, photo: string) => {
    IdSchema.parse(attempt);
    IdSchema.parse(photo);
    return storage
      .bucket(bucketName, { userProject: projectId })
      .file(`checkout/${namespace}/${attempt}/${photo}.webp`);
  };
  return {
    async put(attempt, photo, bytes, expires, signal) {
      signal.throwIfAborted();
      const object = file(attempt, photo);
      await object.save(Buffer.from(bytes), {
        resumable: false,
        validation: "crc32c",
        timeout: 15_000,
        preconditionOpts: { ifGenerationMatch: 0 },
        metadata: {
          contentType: "image/webp",
          cacheControl: "private,no-store,max-age=0",
        },
      });
      signal.throwIfAborted();
      const [url] = await object.getSignedUrl({
        version: "v4",
        action: "read",
        expires,
      });
      signal.throwIfAborted();
      return url;
    },
    async remove(attempt, photos) {
      const results = await Promise.allSettled(
        photos.map((id) => file(attempt, id).delete({ ignoreNotFound: true })),
      );
      if (results.some((result) => result.status === "rejected"))
        throw new Error("Checkout image cleanup failed");
    },
  };
}
