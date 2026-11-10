import { describe, expect, it, vi } from "vitest";
import request from "supertest";
import { parseEnvironment } from "./environment.js";
import { composeRuntime } from "../runtime/compose.js";
import { createApp } from "../http/app.js";
import { GcsShopifyStore, LocalShopifyStore } from "../shopify/storage.js";
import { configuredShopify } from "./shopify.js";
import { SHOPIFY_APP } from "./shopify-app.js";
import type { Environment } from "./environment.js";

const credentials = {
  SHOPIFY_CLIENT_SECRET: "test-only-secret",
  SHOPIFY_ENCRYPTION_KEY: "a".repeat(64),
};
const appConfig = {
  ...SHOPIFY_APP,
  clientId: "test-app",
  developmentInstallUrl:
    "https://admin.shopify.com/?organization_id=1&no_redirect=true&redirect=/oauth/redirect_from_developer_dashboard?client_id%3Dtest-app",
};
const runtimeWith = (env: Environment, app = appConfig) =>
  composeRuntime(
    env,
    () => "req_config",
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    (environment) => configuredShopify(environment, app),
  );
describe("inert Shopify runtime configuration", () => {
  it("allows explicit keyless simulation, exercises consent without Shopify HTTP, and rejects it in production", async () => {
    const fixtureConfig = { ...appConfig, provider: "fixture" as const };
    expect(
      configuredShopify(
        parseEnvironment({
          APP_ENV: "production",
          FAKE_MODE: "false",
          FRONTEND_ORIGIN: "https://retailor.example",
        }),
        fixtureConfig,
      ),
    ).toBeUndefined();
    const runtime = runtimeWith(parseEnvironment({}), fixtureConfig);
    const app = createApp(runtime, () => {});
    const post = (operation: string, body: object, cookie = "", proof = "") =>
      request(app)
        .post(`/v1/shopify/${operation}`)
        .set("Origin", "http://127.0.0.1:4310")
        .set("Cookie", cookie)
        .set("x-retailor-shopify-tab", proof)
        .send(body);
    try {
      const initial = await post("session", {
        schemaVersion: 1,
        workspaceId: "fixture_workspace",
        createdAt: Date.now(),
      });
      const cookie = (
        initial.headers["set-cookie"] as unknown as string[]
      )[0]!.split(";")[0]!;
      const proof = initial.body.tabProof as string,
        control = { schemaVersion: 1, workspaceId: "fixture_workspace" };
      const connect = () =>
        post(
          "connect",
          {
            ...control,
            returnTo: "connections",
          },
          cookie,
          proof,
        );
      expect((await connect()).status).toBe(200);
      expect(
        (await post("simulate", { ...control, approved: false }, cookie, proof))
          .body.outcome,
      ).toBe("cancelled");
      expect((await post("status", control, cookie, proof)).body.state).toBe(
        "disconnected",
      );
      await connect();
      expect(
        (
          await post(
            "simulate",
            { ...control, approved: true },
            cookie,
            "a".repeat(64),
          )
        ).status,
      ).toBe(403);
      expect(
        (await post("simulate", { ...control, approved: true }, cookie, proof))
          .body.outcome,
      ).toBe("connected");
      const status = (await post("status", control, cookie, proof)).body;
      expect(status.simulated).toBe(true);
      expect(status.exports).toEqual([]);
      const products = (
        await post("products", { ...control, cursor: null }, cookie, proof)
      ).body;
      expect(products.products[0]?.owned).toBe(false);
      expect(fetch).not.toHaveBeenCalled();
    } finally {
      await runtime.shopify?.close();
    }
  });
  it("ignores obsolete environment selection and never simulates a keyless normal runtime", () => {
    const runtime = composeRuntime(
      parseEnvironment({
        SHOPIFY_PROVIDER: "fixture",
        SHOPIFY_CLIENT_ID: "old-app",
      }),
      () => "req_default",
    );
    expect(runtime.shopify).toBeUndefined();
    expect(runtime.capabilities.shopify.available).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each([
    { env: {}, app: appConfig },
    {
      env: credentials,
      app: { ...appConfig, storageProject: "incomplete-project" },
    },
    {
      env: credentials,
      app: { ...appConfig, storageBucket: "incomplete-bucket" },
    },
    { env: credentials, app: { ...appConfig, clientId: "" } },
    { env: credentials, app: { ...appConfig, developmentInstallUrl: "" } },
    {
      env: credentials,
      app: { ...appConfig, developmentInstallUrl: "https://evil.example" },
    },
    { env: credentials, app: { ...appConfig, clientId: "different-app" } },
    { env: { ...credentials, SHOPIFY_ENCRYPTION_KEY: "bad" }, app: appConfig },
    {
      env: credentials,
      app: {
        ...appConfig,
        storageProject: "test-project",
        storageBucket: "retailor-511714-checkout-photos",
      },
    },
    { env: credentials, app: { ...appConfig, clientId: "a".repeat(201) } },
    {
      env: credentials,
      app: { ...appConfig, storageProject: "a".repeat(101) },
    },
    { env: credentials, app: { ...appConfig, storageBucket: "a".repeat(201) } },
  ])(
    "keeps missing or unsafe prerequisites unavailable without changing fake/paid defaults",
    ({ env, app }) => {
      const runtime = runtimeWith(parseEnvironment(env), app);
      expect(runtime.shopify).toBeUndefined();
      expect(runtime.capabilities.shopify.available).toBe(false);
      expect(runtime.capabilities.paidEnabled).toBe(false);
      expect(fetch).not.toHaveBeenCalled();
    },
  );
  it("constructs configured local/hosted adapters without opening state, resolving credentials or calling providers from health/config", async () => {
    const local = vi.spyOn(LocalShopifyStore.prototype, "read"),
      gcs = vi.spyOn(GcsShopifyStore.prototype, "read");
    for (const [env, configuredApp] of [
      [credentials, appConfig],
      [
        credentials,
        {
          ...appConfig,
          storageProject: "test-project",
          storageBucket: "test-integration-bucket",
        },
      ],
    ] as const) {
      const runtime = runtimeWith(parseEnvironment(env), configuredApp);
      expect(runtime.shopify).toBeDefined();
      expect(runtime.capabilities.shopify.available).toBe(true);
      const app = createApp(runtime);
      expect((await request(app).get("/v1/health")).status).toBe(200);
      const config = await request(app).get("/v1/config");
      expect(config.status).toBe(200);
      expect(JSON.stringify(config.body)).not.toContain("test-only-secret");
      await runtime.shopify!.close();
    }
    expect(local).not.toHaveBeenCalled();
    expect(gcs).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });
  it("does not accept process-local persistence in production", () => {
    const runtime = runtimeWith(
      parseEnvironment({
        ...credentials,
        APP_ENV: "production",
        FAKE_MODE: "false",
        FRONTEND_ORIGIN: "https://retailor.example",
      }),
    );
    expect(runtime.shopify).toBeUndefined();
    expect(fetch).not.toHaveBeenCalled();
  });
  it("never exposes the organization-bound development entry in production, even with durable hosted storage", () => {
    expect(
      configuredShopify(
        parseEnvironment({
          ...credentials,
          APP_ENV: "production",
          FAKE_MODE: "false",
          FRONTEND_ORIGIN: "https://retailor.example",
        }),
        {
          ...appConfig,
          storageProject: "test-project",
          storageBucket: "test-integration-bucket",
        },
      ),
    ).toBeUndefined();
    expect(fetch).not.toHaveBeenCalled();
  });
});
