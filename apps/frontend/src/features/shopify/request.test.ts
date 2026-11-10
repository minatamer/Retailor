import { describe, expect, it, vi } from "vitest";
import { publicError } from "@retailor/contracts/api";
import { shopifyRequester } from "./request";

describe("fixed Shopify browser requests", () => {
  it("rejects arbitrary destinations before HTTP and sends only the fixed private bridge with tab proof", async () => {
    const fetcher = vi.fn<typeof fetch>(async () =>
      Response.json({
        schemaVersion: 1,
        authorizationUrl:
          "https://test.myshopify.com/admin/oauth/authorize?state=abc",
      }),
    );
    const port = shopifyRequester(fetcher),
      signal = new AbortController().signal;
    await expect(
      port.connect(
        {
          schemaVersion: 1,
          workspaceId: "workspace",
          shop: "https://evil.example",
          returnTo: "onboarding",
        },
        "a".repeat(64),
        signal,
      ),
    ).rejects.toBeDefined();
    expect(fetcher).not.toHaveBeenCalled();
    await port.connect(
      {
        schemaVersion: 1,
        workspaceId: "workspace",
        shop: "test.myshopify.com",
        returnTo: "connections",
      },
      "a".repeat(64),
      signal,
    );
    expect(fetcher.mock.calls[0]![0]).toBe("/api/retailor/v1/shopify/connect");
    const init = fetcher.mock.calls[0]![1]!;
    expect(init.credentials).toBe("same-origin");
    expect(init.redirect).toBe("error");
    expect(new Headers(init.headers).get("x-retailor-shopify-tab")).toBe(
      "a".repeat(64),
    );
    expect(JSON.parse(init.body as string)).not.toHaveProperty("url");
  });
  it("preserves safe code/reference and bounded Retry-After without trusting provider error copy", async () => {
    const payload = publicError("BUSY", "req_shopify_test");
    payload.error.message = "private_provider_error_marker";
    const fetcher = vi.fn<typeof fetch>(async () =>
      Response.json(payload, { status: 429, headers: { "Retry-After": "9" } }),
    );
    const result = shopifyRequester(fetcher).status(
      "workspace",
      "a".repeat(64),
      new AbortController().signal,
    );
    await expect(result).rejects.toMatchObject({
      code: "BUSY",
      requestId: "req_shopify_test",
      retryAfterMs: 9000,
    });
    await expect(result).rejects.not.toThrow("private_provider_error_marker");
  });
  it("owns a finite deadline and rejects malformed successful responses", async () => {
    vi.useFakeTimers();
    try {
      const fetcher = vi.fn<typeof fetch>(
        async (_url, init) =>
          new Promise((_resolve, reject) => {
            init!.signal!.addEventListener(
              "abort",
              () => reject(new Error("cancelled")),
              { once: true },
            );
          }),
      );
      const promise = shopifyRequester(fetcher).status(
        "workspace",
        "a".repeat(64),
        new AbortController().signal,
      );
      const failure = expect(promise).rejects.toMatchObject({
        code: "DEADLINE",
      });
      await vi.advanceTimersByTimeAsync(10000);
      await failure;
    } finally {
      vi.useRealTimers();
    }
    const malformed = shopifyRequester(
      vi.fn<typeof fetch>(async () =>
        Response.json({ schemaVersion: 1, exports: [] }),
      ),
    );
    await expect(
      malformed.status(
        "workspace",
        "a".repeat(64),
        new AbortController().signal,
      ),
    ).rejects.toBeDefined();
  });
});
