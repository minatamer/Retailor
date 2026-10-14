import { describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import {
  boundedResponse,
  hostedAssetInventory,
  probeHosted,
} from "../scripts/release/hosted.mjs";
const off = {
  schemaVersion: 1,
  mode: "live",
  paidEnabled: false,
  admissionSiteKey: null,
  vision: { available: false, reason: "paid-disabled" },
  tailor: { available: false, reason: "paid-disabled" },
  logos: { available: false, reason: "paid-disabled" },
  eur: { available: true, reason: "ready" },
};
const error = {
  schemaVersion: 1,
  error: {
    code: "NOT_FOUND",
    message: "This operation was not found.",
    requestId: "req_fixture123",
    retry: "never",
  },
};
const headers = {
  "content-type": "text/html",
  "content-security-policy": "default-src 'self'; frame-ancestors 'none'",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
};
describe("bounded read-only hosted observations", () => {
  it("compares fixed GET delivery without serializing HTML/config content", async () => {
    const content = Buffer.from("public fixture asset"),
      asset = {
        path: "/sample/forme/F01.webp",
        bytes: content.length,
        sha256: createHash("sha256").update(content).digest("hex"),
      };
    const fetch = vi.fn(async (url, options) => {
      expect(options.method).toBe("GET");
      expect(options.credentials).toBe("omit");
      expect(options.redirect).toBe("error");
      expect(Object.keys(options.headers)).toEqual(["accept"]);
      const path = new URL(url).pathname;
      if (path === asset.path)
        return new Response(content, {
          headers: { "content-type": "image/webp" },
        });
      if (path.endsWith("/config")) return Response.json(off);
      if (path.endsWith("/not-an-operation"))
        return Response.json(error, { status: 404 });
      return new Response("private HTML must not be recorded", {
        status: path === "/design" ? 404 : 200,
        headers,
      });
    });
    const result = await probeHosted({
      origin: "https://shop.example.com",
      fetchImpl: fetch,
      assets: [asset],
    });
    expect(result.outcome).toBe("pass");
    expect(fetch).toHaveBeenCalledTimes(6);
    expect(result.paidRequests).toBe(0);
    expect(JSON.stringify(result)).not.toContain("private HTML");
    expect(JSON.stringify(result)).not.toContain("admissionSiteKey");
    expect(result.rows.at(-1).sha256).toBe(asset.sha256);
  });
  it("cancels byte-overflow and empty-chunk streams at finite envelopes", async () => {
    const canceled = vi.fn();
    const tooLarge = new Response(
      new ReadableStream({
        start(controller) {
          controller.enqueue(new Uint8Array(9));
        },
        cancel: canceled,
      }),
    );
    await expect(
      boundedResponse(tooLarge, 8, new AbortController().signal),
    ).rejects.toThrow("byte limit");
    expect(canceled).toHaveBeenCalledTimes(1);
    const emptyCanceled = vi.fn();
    let pulls = 0;
    const empty = new Response(
      new ReadableStream({
        pull(controller) {
          pulls++;
          controller.enqueue(new Uint8Array());
        },
        cancel: emptyCanceled,
      }),
    );
    await expect(
      boundedResponse(empty, 1, new AbortController().signal),
    ).rejects.toThrow("read count");
    expect(pulls).toBeLessThanOrEqual(6);
    expect(emptyCanceled).toHaveBeenCalledTimes(1);
  });
  it("aborts a stalled body and stops after one unknown outcome with no retry/logged exception", async () => {
    const canceled = vi.fn(),
      fetch = vi.fn(
        async () =>
          new Response(new ReadableStream({ cancel: canceled }), { headers }),
      );
    const result = await probeHosted({
      origin: "https://shop.example.com",
      assets: [],
      fetchImpl: fetch,
      timeoutMs: 10,
    });
    expect(result.outcome).toBe("unaccepted");
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(canceled).toHaveBeenCalledTimes(1);
    expect(result.rows[0].outcome).toBe("unknown");
    expect(JSON.stringify(result)).not.toContain("Error");
  });
  it("stops on wrong delivery/capability and rejects unsupported destination before fetching", async () => {
    const fetch = vi.fn(
      async () => new Response("do not follow", { status: 302, headers }),
    );
    const result = await probeHosted({
      origin: "https://shop.example.com",
      assets: [],
      fetchImpl: fetch,
    });
    expect(result.outcome).toBe("unaccepted");
    expect(fetch).toHaveBeenCalledTimes(1);
    const untouched = vi.fn();
    await expect(
      probeHosted({
        origin: "http://169.254.169.254",
        assets: [],
        fetchImpl: untouched,
      }),
    ).rejects.toThrow("configuration");
    expect(untouched).not.toHaveBeenCalled();
  });
  it("rejects an unexpected MIME or enabled capability even when HTTP succeeds", async () => {
    const wrongMime = vi.fn(
      async () =>
        new Response("HTML", {
          headers: { ...headers, "content-type": "image/png" },
        }),
    );
    expect(
      (
        await probeHosted({
          origin: "https://shop.example.com",
          assets: [],
          fetchImpl: wrongMime,
        })
      ).outcome,
    ).toBe("unaccepted");
    expect(wrongMime).toHaveBeenCalledTimes(1);
    const enabled = vi.fn(async (url) =>
      new URL(url).pathname.endsWith("/config")
        ? Response.json({
            ...off,
            paidEnabled: true,
            vision: { available: true, reason: "ready" },
          })
        : new Response("HTML", {
            headers,
            status: new URL(url).pathname === "/design" ? 404 : 200,
          }),
    );
    const result = await probeHosted({
      origin: "https://shop.example.com",
      assets: [],
      fetchImpl: enabled,
    });
    expect(result.outcome).toBe("unaccepted");
    expect(enabled).toHaveBeenCalledTimes(4);
    expect(result.rows.at(-1).capabilities.paidEnabled).toBe(true);
    expect(result.paidRequests).toBe(0);
  });
  it("loads precisely the approved shipped photos/fonts/licences without guest paths", async () => {
    const assets = await hostedAssetInventory();
    expect(assets).toHaveLength(30);
    expect(assets.filter(({ path }) => path.endsWith(".webp"))).toHaveLength(
      19,
    );
    expect(assets.filter(({ path }) => path.endsWith(".woff2"))).toHaveLength(
      5,
    );
    expect(assets.filter(({ path }) => path.endsWith("-OFL.txt"))).toHaveLength(
      4,
    );
  });
});
