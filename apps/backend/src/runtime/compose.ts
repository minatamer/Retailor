import type { Capabilities } from "@retailor/contracts/api";
import type { Environment } from "../config/environment.js";
import { PaidAdmission } from "../security/admission.js";
import { turnstile } from "../security/turnstile.js";
import { openAiCatalogue } from "../catalogue/provider.js";
import type { RecognitionRuntime } from "../catalogue/routes.js";
import { CurrencyService } from "../currency/service.js";
import { ecbCurrency, fixtureCurrency } from "../currency/provider.js";
import type { AssistantRuntime } from "../assistants/routes.js";
import type { AssistantProvider } from "../assistants/provider.js";
import { fixtureAssistant } from "../assistants/fake.js";
import { openAiAssistant } from "../providers/assistant.js";
import type { LogoRuntime } from "../brand/routes.js";
import type { LogoProvider } from "../brand/provider.js";
import { fixtureLogos } from "../brand/fake.js";
import { openAiLogos } from "../providers/logos.js";
export interface Runtime {
  capabilities: Capabilities;
  ready: boolean;
  requestId(): string;
  frontendOrigin: string;
  recognition?: RecognitionRuntime;
  currency?: CurrencyService;
  assistant?: AssistantRuntime;
  logos?: LogoRuntime;
}
export function composeRuntime(
  env: Environment,
  requestId: () => string,
  recognitionFactory: (environment: Environment) => RecognitionRuntime = (
    environment,
  ) => ({
    admission: new PaidAdmission({
      secret: environment.GRANT_SIGNING_SECRET,
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
  assistantFactory: (environment: Environment) => AssistantProvider = (
    environment,
  ) =>
    environment.FAKE_MODE
      ? fixtureAssistant()
      : openAiAssistant(environment.OPENAI_API_KEY),
  logoFactory: (environment: Environment) => LogoProvider = (environment) =>
    environment.FAKE_MODE
      ? fixtureLogos()
      : openAiLogos(environment.OPENAI_API_KEY),
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
    env.GRANT_SIGNING_SECRET.length >= 32 &&
    !!env.OPENAI_API_KEY &&
    !!env.TURNSTILE_SECRET_KEY &&
    !!env.TURNSTILE_SITE_KEY;
  const recognition = enabled ? recognitionFactory(env) : undefined;
  const currency = currencyFactory(env);
  const assistant: AssistantRuntime | undefined =
    env.FAKE_MODE || recognition
      ? {
          mode,
          provider: assistantFactory(env),
          ...(recognition ? { admission: recognition.admission } : {}),
        }
      : undefined;
  const logos: LogoRuntime | undefined =
    env.FAKE_MODE || recognition
      ? {
          mode,
          provider: logoFactory(env),
          ...(recognition ? { admission: recognition.admission } : {}),
        }
      : undefined;
  return {
    ready: env.FAKE_MODE || enabled,
    frontendOrigin: env.FRONTEND_ORIGIN,
    requestId,
    currency,
    ...(recognition ? { recognition } : {}),
    ...(assistant ? { assistant } : {}),
    ...(logos ? { logos } : {}),
    capabilities: {
      schemaVersion: 1,
      mode,
      paidEnabled: enabled,
      admissionSiteKey: enabled ? env.TURNSTILE_SITE_KEY : null,
      vision: enabled
        ? { available: true, reason: "ready" }
        : env.FAKE_MODE
          ? { available: false, reason: "paid-disabled" }
          : unavailable,
      tailor: env.FAKE_MODE
        ? { available: true, reason: "fixture" }
        : enabled
          ? { available: true, reason: "ready" }
          : unavailable,
      logos: env.FAKE_MODE
        ? { available: true, reason: "fixture" }
        : logos
          ? {
              available: true,
              reason: "ready",
            }
          : unavailable,
      eur: { available: true, reason: env.FAKE_MODE ? "fixture" : "ready" },
    },
  };
}
