import { it, expect } from "vitest";
import { developmentEnvironment } from "../scripts/development-mode.mjs";
import { parseEnvironment } from "../apps/backend/src/config/environment.js";
import { composeRuntime } from "../apps/backend/src/runtime/compose.js";
it("development remains fake/paid-off under inherited live settings without mutating the parent", () => {
  const inherited = {
    APP_ENV: "production",
    FAKE_MODE: "false",
    PAID_DEMO_ENABLED: "true",
    OPENAI_API_KEY: "private_key_sentinel",
  };
  const runtime = composeRuntime(
    parseEnvironment(developmentEnvironment(inherited)),
    () => "req_test",
  );
  expect(runtime.ready).toBe(true);
  expect(runtime.capabilities.mode).toBe("fake");
  expect(runtime.capabilities.paidEnabled).toBe(false);
  expect(runtime.capabilities.vision.available).toBe(false);
  expect(inherited.FAKE_MODE).toBe("false");
  expect(inherited.PAID_DEMO_ENABLED).toBe("true");
});
