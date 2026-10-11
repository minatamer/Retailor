import { z } from "zod";
import type { ChallengeVerifier } from "./admission.js";
import { boundedBytes } from "./bounded.js";

const Result = z.object({
  success: z.boolean(),
  hostname: z.string().max(253).optional(),
  action: z.string().max(32).optional(),
});
/** Constructed only in explicitly enabled runtime composition. No IP forwarding. */
export function turnstile(
  secret: string,
  frontendOrigin: string,
  fetcher: typeof fetch = fetch,
): ChallengeVerifier {
  const hostname = new URL(frontendOrigin).hostname;
  return {
    async verify(proof, action, signal) {
      const deadline = new AbortController(),
        timer = setTimeout(() => deadline.abort(), 6_000);
      const owned = AbortSignal.any([signal, deadline.signal]);
      try {
        const response = await fetcher(
          "https://challenges.cloudflare.com/turnstile/v0/siteverify",
          {
            method: "POST",
            redirect: "error",
            signal: owned,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ secret, response: proof }),
          },
        );
        if (!response.ok) return false;
        const bytes = await boundedBytes(response, 8192, owned);
        const result = Result.safeParse(
          JSON.parse(new TextDecoder().decode(bytes)),
        );
        return (
          result.success &&
          result.data.success &&
          result.data.hostname === hostname &&
          result.data.action === action
        );
      } catch {
        return false;
      } finally {
        clearTimeout(timer);
        deadline.abort();
      }
    },
  };
}
