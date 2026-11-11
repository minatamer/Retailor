import { generateKeyPairSync, sign } from "node:crypto";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { OAuth2Client } from "google-auth-library";
import request from "supertest";
import { SHOPIFY_HOSTED } from "../config/shopify-app.js";
import { parseEnvironment } from "../config/environment.js";
import { composeRuntime } from "../runtime/compose.js";
import { createApp } from "../http/app.js";
import {
  googleCleanupVerifier,
  MAINTENANCE,
  ShopifyMaintenance,
} from "./maintenance.js";

const authorization = "Bearer test.identity.signature";
const result = { claimed: true, calls: 0, visited: 0 };
afterEach(() => vi.useRealTimers());
function setup(allowed = true) {
  const sweep = vi.fn(async (_signal: AbortSignal) => result),
    verify = vi.fn(async (_token: string, _signal: AbortSignal) => allowed),
    diagnostic = vi.fn(),
    maintenance = new ShopifyMaintenance({ sweep }, verify, diagnostic),
    runtime = composeRuntime(parseEnvironment({}), () => "req_maintenance");
  runtime.shopifyMaintenance = maintenance;
  return { sweep, verify, diagnostic, maintenance, app: createApp(runtime) };
}

describe("private scheduled Shopify cleanup", () => {
  it("requires verified identity and keeps normal browser routes behind their origin guard", async () => {
    const h = setup(false);
    expect((await request(h.app).post(MAINTENANCE.path)).status).toBe(403);
    expect(
      (
        await request(h.app)
          .post(MAINTENANCE.path)
          .set("Authorization", authorization)
          .set("X-CloudScheduler", "true")
          .set("Origin", SHOPIFY_HOSTED.origin)
      ).status,
    ).toBe(403);
    expect(
      (await request(h.app).post("/v1/shopify/status").send({})).status,
    ).toBe(403);
    expect(h.sweep).not.toHaveBeenCalled();
  });
  it("runs the existing bounded sweep only for a verified bodyless private request", async () => {
    const h = setup();
    const response = await request(h.app)
      .post(MAINTENANCE.path)
      .set("Authorization", authorization);
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ schemaVersion: 1, ...result });
    expect(h.sweep).toHaveBeenCalledTimes(1);
    expect(h.diagnostic).toHaveBeenCalledWith("completed", 0, 0);
    expect(h.sweep.mock.calls[0]![0].aborted).toBe(true);
  });
  it("rejects bodies, query targets and oversized credentials before verification", async () => {
    const h = setup();
    expect(
      (
        await request(h.app)
          .post(MAINTENANCE.path)
          .set("Authorization", authorization)
          .send({})
      ).status,
    ).toBe(400);
    expect(
      (
        await request(h.app)
          .post(`${MAINTENANCE.path}?shop=foreign`)
          .set("Authorization", authorization)
      ).status,
    ).toBe(400);
    expect(
      (
        await request(h.app)
          .post(MAINTENANCE.path)
          .set("Authorization", `Bearer ${"a".repeat(MAINTENANCE.tokenBytes)}`)
      ).status,
    ).toBe(403);
    expect(h.verify).not.toHaveBeenCalled();
    expect(h.sweep).not.toHaveBeenCalled();
  });
  it("bounds uncooperative verification, fences a late success and allows no overlapping work", async () => {
    const h = setup();
    vi.useFakeTimers();
    let finish!: (value: boolean) => void;
    h.verify.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const pending = h.maintenance.run(
      authorization,
      new AbortController().signal,
    );
    const outcome = expect(pending).rejects.toMatchObject({ code: "DEADLINE" });
    await expect(
      h.maintenance.run(authorization, new AbortController().signal),
    ).rejects.toMatchObject({ code: "BUSY" });
    await vi.advanceTimersByTimeAsync(MAINTENANCE.authMs);
    await outcome;
    finish(true);
    await Promise.resolve();
    expect(h.sweep).not.toHaveBeenCalled();
  });
  it("limits arrivals independently of the existing durable sweep lease", async () => {
    const h = setup();
    await h.maintenance.run(authorization, new AbortController().signal);
    await h.maintenance.run(authorization, new AbortController().signal);
    await expect(
      h.maintenance.run(authorization, new AbortController().signal),
    ).rejects.toMatchObject({ code: "BUSY" });
    expect(h.sweep).toHaveBeenCalledTimes(2);
  });
});

describe("Google cleanup identity verification", () => {
  let keys: ReturnType<typeof generateKeyPairSync>;
  beforeAll(() => {
    keys = generateKeyPairSync("rsa", { modulusLength: 2048 });
  });
  beforeEach(() => {
    vi.spyOn(
      OAuth2Client.prototype,
      "getFederatedSignonCertsAsync",
    ).mockResolvedValue({
      certs: {
        local: keys.publicKey
          .export({ type: "spki", format: "pem" })
          .toString(),
      },
      format: "PEM" as Awaited<
        ReturnType<OAuth2Client["getFederatedSignonCertsAsync"]>
      >["format"],
    });
  });
  function token(override: Record<string, unknown> = {}) {
    const now = Math.floor(Date.now() / 1000),
      head = Buffer.from(
        JSON.stringify({ alg: "RS256", kid: "local" }),
      ).toString("base64url"),
      body = Buffer.from(
        JSON.stringify({
          iss: "https://accounts.google.com",
          sub: "synthetic-scheduler-identity",
          aud: SHOPIFY_HOSTED.maintenanceAudience,
          email: SHOPIFY_HOSTED.maintenanceIdentity,
          email_verified: true,
          iat: now - 1,
          exp: now + 300,
          ...override,
        }),
      ).toString("base64url"),
      input = `${head}.${body}`;
    return `${input}.${sign("RSA-SHA256", Buffer.from(input), keys.privateKey).toString("base64url")}`;
  }
  it("verifies a real signature for only the selected audience and scheduler identity", async () => {
    expect(
      await googleCleanupVerifier()(token(), new AbortController().signal),
    ).toBe(true);
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each([
    { aud: "https://foreign.example" },
    { email: "retailor-frontend@retailor-511714.iam.gserviceaccount.com" },
    { email_verified: false },
    { iss: "https://foreign.example" },
    { exp: 1 },
  ])("rejects correctly signed but unauthorized claims: %j", async (claims) => {
    expect(
      await googleCleanupVerifier()(
        token(claims),
        new AbortController().signal,
      ),
    ).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("rejects a forged signature and an aborted request without granting cleanup authority", async () => {
    const valid = token(),
      forged = `${valid.slice(0, valid.lastIndexOf(".") + 1)}${"a".repeat(342)}`,
      owner = new AbortController();
    expect(await googleCleanupVerifier()(forged, owner.signal)).toBe(false);
    owner.abort();
    expect(await googleCleanupVerifier()(valid, owner.signal)).toBe(false);
  });
});
