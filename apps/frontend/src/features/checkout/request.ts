import { CapabilitiesSchema } from "@retailor/contracts/api";
import {
  CHECKOUT_LIMITS,
  CheckoutStartSchema,
  CheckoutResultSchema,
  CheckoutControlSchema,
  CheckoutIdentityResultSchema,
} from "@retailor/contracts/checkout";
import type {
  CheckoutStart,
  CheckoutResult,
} from "@retailor/contracts/checkout";
import { readApiJson } from "../../http/response";
import { ApiRequestError } from "../../http/api-error";

export interface CheckoutRequester {
  available(signal: AbortSignal): Promise<boolean>;
  start(input: CheckoutStart, signal: AbortSignal): Promise<CheckoutResult>;
  status(
    attemptId: string,
    cancel: boolean,
    signal: AbortSignal,
  ): Promise<CheckoutResult>;
}
export function checkoutRequester(
  fetcher: typeof fetch = fetch,
): CheckoutRequester {
  const json = async (path: string, signal: AbortSignal, body?: unknown) => {
    const response = await fetcher(`/api/retailor/v1/${path}`, {
      method: body ? "POST" : "GET",
      credentials: "same-origin",
      cache: "no-store",
      redirect: "error",
      signal,
      ...(body
        ? {
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          }
        : {}),
    });
    return readApiJson(response, CHECKOUT_LIMITS.responseBytes, signal, true);
  };
  const identity = async (signal: AbortSignal) => {
    const config = CapabilitiesSchema.parse(await json("config", signal));
    if (!config.checkout.available) throw new ApiRequestError("UNAVAILABLE");
    CheckoutIdentityResultSchema.parse(
      await json("checkout/identity", signal, { schemaVersion: 1 }),
    );
  };
  return {
    async available(signal) {
      return CapabilitiesSchema.parse(await json("config", signal)).checkout
        .available;
    },
    async start(input, signal) {
      await identity(signal);
      const body = CheckoutStartSchema.parse(input);
      if (
        new TextEncoder().encode(JSON.stringify(body)).length >
        CHECKOUT_LIMITS.bodyBytes
      )
        throw new ApiRequestError("TOO_LARGE");
      return CheckoutResultSchema.parse(
        await json("checkout/start", signal, body),
      );
    },
    async status(attemptId, cancel, signal) {
      await identity(signal);
      return CheckoutResultSchema.parse(
        await json(
          `checkout/${cancel ? "cancel" : "status"}`,
          signal,
          CheckoutControlSchema.parse({ schemaVersion: 1, attemptId }),
        ),
      );
    },
  };
}
export async function checkoutBase64(blob: Blob, signal: AbortSignal) {
  if (blob.size > 768 * 1024) throw new ApiRequestError("TOO_LARGE");
  const bytes = new Uint8Array(await blob.arrayBuffer());
  signal.throwIfAborted();
  let text = "";
  for (let index = 0; index < bytes.length; index += 8192)
    text += String.fromCharCode(...bytes.subarray(index, index + 8192));
  return btoa(text);
}
