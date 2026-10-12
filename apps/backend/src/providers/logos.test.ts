import { expect, it, vi } from "vitest";
import { openAiLogos, LOGO_MODEL } from "./logos.js";
const context = {
  name: "West & Woven",
  theme: "ink",
  typography: "inter",
  designRevision: 0,
  themeConfirmed: true,
  typographyConfirmed: true,
} as const;
it("uses one fixed explicit three-image transparent batch and forwards only bounded usage", async () => {
  const fetcher = vi.fn<typeof fetch>(async (url, init) => {
    expect(String(url)).toBe("https://api.openai.com/v1/images/generations");
    expect(init?.redirect).toBe("error");
    expect(JSON.parse(String(init?.body))).toMatchObject({
      model: LOGO_MODEL,
      n: 3,
      background: "transparent",
      output_format: "png",
      quality: "medium",
      size: "1024x1024",
      stream: false,
    });
    return new Response(
      JSON.stringify({
        data: ["a", "b", "c"].map((value) => ({
          b64_json: Buffer.from(value).toString("base64"),
        })),
        usage: { input_tokens: 12, output_tokens: 90 },
      }),
    );
  });
  const dispatch = vi.fn(),
    recordUsage = vi.fn();
  const result = await openAiLogos("injected-key", fetcher).generate(
    context,
    new AbortController().signal,
    { dispatch, recordUsage },
  );
  expect(result).toHaveLength(3);
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(dispatch).toHaveBeenCalledTimes(1);
  expect(recordUsage).toHaveBeenCalledWith({ input: 12, output: 90 });
});
it("never retries errors or repairs partial, URL or noncanonical outputs", async () => {
  for (const data of [
    [{ b64_json: "YQ==" }],
    [
      { url: "https://other.example/logo" },
      { b64_json: "YQ==" },
      { b64_json: "Yg==" },
    ],
    [{ b64_json: "YQ" }, { b64_json: "Yg==" }, { b64_json: "Yw==" }],
  ]) {
    const fetcher = vi.fn<typeof fetch>(
      async () => new Response(JSON.stringify({ data })),
    );
    await expect(
      openAiLogos("injected-key", fetcher).generate(
        context,
        new AbortController().signal,
        { dispatch() {}, recordUsage() {} },
      ),
    ).rejects.toThrow();
    expect(fetcher).toHaveBeenCalledTimes(1);
  }
  const fetcher = vi.fn<typeof fetch>(
    async () =>
      new Response('{"error":{"message":"private detail"}}', { status: 500 }),
  );
  await expect(
    openAiLogos("injected-key", fetcher).generate(
      context,
      new AbortController().signal,
      { dispatch() {}, recordUsage() {} },
    ),
  ).rejects.toThrow();
  expect(fetcher).toHaveBeenCalledTimes(1);
});
