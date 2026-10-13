import { expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { originGuard, ORIGIN_SEAL_HEADER } from "./origin-guard.server";
import { backendRequest } from "./backend.server";

const environment = {
  RETAILOR_ORIGIN_GUARD: "cloudflare",
  RETAILOR_ORIGIN_SECRET: "a".repeat(64),
};
const request = (path: string, seal?: string) =>
  new Request(`https://shop.example.com${path}`, {
    headers: seal ? { [ORIGIN_SEAL_HEADER]: seal } : {},
  });

it("keeps local mode unchanged and protects pages, static assets, RSC and fixed APIs without reading a body", async () => {
  expect(originGuard(request("/"), {})).toBeNull();
  for (const path of [
    "/",
    "/demo?_rsc=x",
    "/_next/static/test.js",
    "/fonts/test.woff2",
    "/sample/forme/F01.webp",
    "/api/retailor/v1/config",
    "/api/retailor/v1/catalogue/interpret",
  ]) {
    expect(
      originGuard(
        request(path, environment.RETAILOR_ORIGIN_SECRET),
        environment,
      ),
    ).toBeNull();
    const denied = originGuard(request(path), environment)!;
    expect(denied.status).toBe(403);
    expect(denied.headers.get("cache-control")).toBe("no-store");
    expect(await denied.text()).not.toContain(
      environment.RETAILOR_ORIGIN_SECRET,
    );
  }
});

it("rejects malformed, wrong or duplicated seals and fails closed on incomplete enabled configuration", () => {
  for (const seal of [
    "b".repeat(64),
    "a".repeat(63),
    "a".repeat(65),
    "A".repeat(64),
    `${"a".repeat(64)},${"a".repeat(64)}`,
  ])
    expect(originGuard(request("/", seal), environment)?.status).toBe(403);
  for (const env of [
    { RETAILOR_ORIGIN_GUARD: "cloudflare" },
    { ...environment, RETAILOR_ORIGIN_SECRET: "invalid" },
    { ...environment, RETAILOR_ORIGIN_GUARD: "typo" },
  ])
    expect(
      originGuard(request("/", environment.RETAILOR_ORIGIN_SECRET), env)
        ?.status,
    ).toBe(503);
});

it("denies the actual API entry before identity/fetch and leaves upload body untouched", async () => {
  vi.stubEnv("RETAILOR_ORIGIN_GUARD", "cloudflare");
  vi.stubEnv("RETAILOR_ORIGIN_SECRET", environment.RETAILOR_ORIGIN_SECRET);
  try {
    const upload = new Request(
      "https://shop.example.com/api/retailor/v1/catalogue/interpret",
      {
        method: "POST",
        body: "untouched",
        headers: { "Content-Type": "multipart/form-data; boundary=x" },
      },
    );
    const response = await backendRequest(upload, "catalogue/interpret");
    expect(response.status).toBe(403);
    expect(upload.bodyUsed).toBe(false);
    expect(await upload.text()).toBe("untouched");
    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect(await response.json()).toMatchObject({
      error: { code: "FORBIDDEN" },
    });
  } finally {
    vi.unstubAllEnvs();
  }
});
