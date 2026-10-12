import { LOGO_LIMITS } from "@retailor/contracts/brand";
import type { LogoProvider } from "../brand/provider.js";
import { logoPrompt } from "../brand/context.js";
import { imagesClient } from "./images-client.js";
import { deny } from "../security/errors.js";
export const LOGO_MODEL = "gpt-image-2.5-flare-2026-09-08";
export function openAiLogos(
  apiKey: string,
  fetcher: typeof fetch = fetch,
): LogoProvider {
  const client = imagesClient(apiKey, fetcher);
  return {
    async generate(context, signal, accounting) {
      signal.throwIfAborted();
      accounting.dispatch();
      const result = await client.images.generate(
        {
          model: LOGO_MODEL,
          prompt: logoPrompt(context),
          n: 3,
          size: "1024x1024",
          quality: "medium",
          background: "transparent",
          output_format: "png",
          moderation: "auto",
          stream: false,
        },
        { signal },
      );
      signal.throwIfAborted();
      if (result.usage)
        accounting.recordUsage({
          input: result.usage.input_tokens,
          output: result.usage.output_tokens,
        });
      if (result.data?.length !== 3) return deny("UPSTREAM_FAILED", 502);
      return result.data.map((item) => {
        if (
          item.url ||
          !item.b64_json ||
          item.b64_json.length > LOGO_LIMITS.base64Chars ||
          !/^[A-Za-z0-9+/]*={0,2}$/u.test(item.b64_json)
        )
          return deny("UPSTREAM_FAILED", 502);
        const bytes = Buffer.from(item.b64_json, "base64");
        if (
          !bytes.length ||
          bytes.length > LOGO_LIMITS.imageBytes ||
          bytes.toString("base64") !== item.b64_json
        )
          return deny("UPSTREAM_FAILED", 502);
        return bytes;
      });
    },
  };
}
