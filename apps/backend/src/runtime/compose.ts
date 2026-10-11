import type { Capabilities } from "@retailor/contracts/api";
import type { Environment } from "../config/environment.js";
export interface Runtime {
  capabilities: Capabilities;
  ready: boolean;
  requestId(): string;
  revision: string;
  frontendOrigin: string;
}
export function composeRuntime(
  env: Environment,
  requestId: () => string,
): Runtime {
  const mode = env.FAKE_MODE ? "fake" : "live";
  const unavailable = {
    available: false,
    reason: env.FAKE_MODE
      ? "not-implemented"
      : env.PAID_DEMO_ENABLED
        ? "missing-prerequisites"
        : "paid-disabled",
  } as const;
  return {
    ready: env.FAKE_MODE,
    revision: env.APP_REVISION,
    frontendOrigin: env.FRONTEND_ORIGIN,
    requestId,
    capabilities: {
      schemaVersion: 1,
      mode,
      paidEnabled: false,
      vision: unavailable,
      tailor: unavailable,
      logos: unavailable,
      eur: { available: false, reason: "not-implemented" },
    },
  };
}
