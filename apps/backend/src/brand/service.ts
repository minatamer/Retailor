import { createHash } from "node:crypto";
import sharp from "sharp";
import { inspectRaster } from "@retailor/contracts/raster";
import { LOGO_LIMITS, LogoResultSchema } from "@retailor/contracts/brand";
import type { LogoRequest, LogoResult } from "@retailor/contracts/brand";
import type { LogoAccounting, LogoProvider } from "./provider.js";
import { deny, OperationFailure } from "../security/errors.js";
/** Header inspection precedes bounded pixel decode. Alpha bounds crop only empty padding; never recolour a mark. */
export async function validateLogo(bytes: Uint8Array, signal: AbortSignal) {
  signal.throwIfAborted();
  if (!bytes.length || bytes.length > LOGO_LIMITS.imageBytes)
    return deny("TOO_LARGE", 413);
  const header = inspectRaster(bytes);
  if (
    header.mime !== "image/png" ||
    header.width > LOGO_LIMITS.side ||
    header.height > LOGO_LIMITS.side
  )
    return deny("UPSTREAM_FAILED", 502);
  const { data, info } = await sharp(bytes, {
    limitInputPixels: LOGO_LIMITS.side ** 2,
    failOn: "warning",
  })
    .timeout({ seconds: 10 })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  signal.throwIfAborted();
  let transparent = 0,
    visible = 0,
    left = info.width,
    top = info.height,
    right = -1,
    bottom = -1;
  for (let y = 0; y < info.height; y++)
    for (let x = 0; x < info.width; x++) {
      const alpha =
        data[(y * info.width + x) * info.channels + info.channels - 1]!;
      if (alpha === 0) transparent++;
      if (alpha > 0) {
        visible++;
        left = Math.min(left, x);
        top = Math.min(top, y);
        right = Math.max(right, x);
        bottom = Math.max(bottom, y);
      }
    }
  if (transparent < 64 || visible < 256) return deny("UPSTREAM_FAILED", 502);
  left = Math.max(0, left - 12);
  top = Math.max(0, top - 12);
  right = Math.min(info.width - 1, right + 12);
  bottom = Math.min(info.height - 1, bottom + 12);
  const width = right - left + 1,
    height = bottom - top + 1;
  const normalized = await sharp(data, {
    raw: { width: info.width, height: info.height, channels: info.channels },
  })
    .timeout({ seconds: 10 })
    .extract({ left, top, width, height })
    .png({ compressionLevel: 9 })
    .toBuffer();
  signal.throwIfAborted();
  if (normalized.length > LOGO_LIMITS.imageBytes) return deny("TOO_LARGE", 413);
  return {
    bytes: normalized,
    hash: createHash("sha256").update(normalized).digest("hex"),
    width,
    height,
  };
}
export async function generateLogos(
  request: LogoRequest,
  provider: LogoProvider,
  signal: AbortSignal,
  accounting: LogoAccounting,
  id: () => string,
  now: () => string,
): Promise<LogoResult> {
  signal.throwIfAborted();
  const deadline = new AbortController();
  const owned = AbortSignal.any([signal, deadline.signal]);
  const timer = setTimeout(() => deadline.abort(), LOGO_LIMITS.providerMs);
  let detach: () => void = () => undefined;
  const cancelled = new Promise<never>((_resolve, reject) => {
    const stop = () => reject(new Error("Logo operation aborted"));
    owned.addEventListener("abort", stop, { once: true });
    detach = () => owned.removeEventListener("abort", stop);
    if (owned.aborted) stop();
  });
  void cancelled.catch(() => undefined);
  let closed = false,
    dispatched = false;
  try {
    const inputs = await Promise.race([
      provider.generate(request.context, owned, {
        dispatch: () => {
          if (closed || owned.aborted) return deny("DEADLINE", 504);
          if (dispatched) return deny("FORBIDDEN", 403);
          dispatched = true;
          accounting.dispatch();
        },
        recordUsage: (usage) => {
          if (!closed) accounting.recordUsage(usage);
        },
      }),
      cancelled,
    ]);
    clearTimeout(timer);
    if (!dispatched || inputs.length !== 3) return deny("UPSTREAM_FAILED", 502);
    const candidates: LogoResult["candidates"][number][] = [];
    for (const input of inputs) {
      const validated = await Promise.race([
        validateLogo(input, owned),
        cancelled,
      ]);
      candidates.push({
        id: id(),
        hash: validated.hash,
        mime: "image/png",
        bytes: validated.bytes.length,
        width: validated.width,
        height: validated.height,
        context: request.context,
        generatedAt: now(),
        mode: request.mode,
        data: validated.bytes.toString("base64"),
      });
    }
    return LogoResultSchema.parse({
      schemaVersion: 1,
      mode: request.mode,
      workspaceId: request.workspaceId,
      operationId: request.operationId,
      context: request.context,
      candidates,
    });
  } catch (error) {
    if (owned.aborted) return deny("DEADLINE", 504);
    if (error instanceof OperationFailure) throw error;
    return deny("UPSTREAM_FAILED", 502);
  } finally {
    closed = true;
    detach();
    clearTimeout(timer);
    deadline.abort();
  }
}
