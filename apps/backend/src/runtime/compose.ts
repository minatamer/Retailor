import type { Capabilities } from "@retailor/contracts/api";
import type { Environment } from "../config/environment.js";
import {
  PaidAdmission,
  CATALOGUE_RESERVE_MICRO_USD,
} from "../security/admission.js";
import { turnstile } from "../security/turnstile.js";
import { openAiCatalogue } from "../catalogue/provider.js";
import type { RecognitionRuntime } from "../catalogue/routes.js";
import { CurrencyService } from "../currency/service.js";
import { ecbCurrency, fixtureCurrency } from "../currency/provider.js";
export interface Runtime {
  capabilities: Capabilities;
  ready: boolean;
  requestId(): string;
  revision: string;
  frontendOrigin: string;
  recognition?: RecognitionRuntime;
  currency?: CurrencyService;
}
export function composeRuntime(
  env: Environment,
  requestId: () => string,
  recognitionFactory: (environment: Environment) => RecognitionRuntime = (
    environment,
  ) => ({
    admission: new PaidAdmission({
      secret: environment.GRANT_SIGNING_SECRET,
      budgetMicroUsd: environment.PROCESS_BUDGET_MICRO_USD,
      challenge: turnstile(
        environment.TURNSTILE_SECRET_KEY,
        environment.FRONTEND_ORIGIN,
      ),
    }),
    provider: openAiCatalogue(environment.OPENAI_API_KEY),
  }),
  currencyFactory: (environment: Environment) => CurrencyService = (
    environment,
  ) =>
    new CurrencyService(
      environment.FAKE_MODE ? fixtureCurrency() : ecbCurrency(),
      environment.FAKE_MODE,
    ),
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
  const enabled =
    !env.FAKE_MODE &&
    env.PAID_DEMO_ENABLED &&
    env.LIVE_POLICY_APPROVED &&
    env.PROCESS_BUDGET_MICRO_USD >= CATALOGUE_RESERVE_MICRO_USD &&
    env.GRANT_SIGNING_SECRET.length >= 32 &&
    !!env.OPENAI_API_KEY &&
    !!env.TURNSTILE_SECRET_KEY &&
    !!env.TURNSTILE_SITE_KEY;
  const recognition = enabled ? recognitionFactory(env) : undefined;
  const currency = currencyFactory(env);
  return {
    ready: env.FAKE_MODE || enabled,
    revision: env.APP_REVISION,
    frontendOrigin: env.FRONTEND_ORIGIN,
    requestId,
    currency,
    ...(recognition ? { recognition } : {}),
    get capabilities(): Capabilities {
      const available = enabled && !!recognition?.admission.hasBudget();
      return {
        schemaVersion: 1,
        mode,
        paidEnabled: enabled,
        admissionSiteKey: available ? env.TURNSTILE_SITE_KEY : null,
        vision: enabled
          ? { available, reason: available ? "ready" : "unavailable" }
          : env.FAKE_MODE
            ? { available: false, reason: "paid-disabled" }
            : unavailable,
        tailor: unavailable,
        logos: unavailable,
        eur: { available: true, reason: env.FAKE_MODE ? "fixture" : "ready" },
      };
    },
  };
}
