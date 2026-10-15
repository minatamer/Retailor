import { randomBytes } from "node:crypto";
import { CheckoutService } from "../checkout/service.js";
import { stripeSandbox } from "../checkout/provider.js";
import { checkoutImages } from "../checkout/storage.js";
import type { CheckoutRuntime } from "../checkout/routes.js";
import type { Capabilities } from "@retailor/contracts/api";
import type { Environment } from "../config/environment.js";
import { SANDBOX_CHECKOUT } from "../config/checkout.js";
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
import { localLogos } from "../brand/local.js";
export interface Runtime {
  capabilities: Capabilities;
  ready: boolean;
  requestId(): string;
  frontendOrigin: string;
  recognition?: RecognitionRuntime;
  currency?: CurrencyService;
  assistant?: AssistantRuntime;
  logos?: LogoRuntime;
  checkout?: CheckoutRuntime;
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
  logoFactory: (environment: Environment) => LogoProvider = () => localLogos(),
  checkoutFactory: (
    environment: Environment,
    admission: PaidAdmission,
  ) => CheckoutRuntime = (environment, admission) => ({
    admission,
    service: new CheckoutService(
      stripeSandbox(environment.STRIPE_API_KEY, environment.FRONTEND_ORIGIN),
      checkoutImages(SANDBOX_CHECKOUT.projectId, SANDBOX_CHECKOUT.bucketName),
      environment.FAKE_MODE,
    ),
  }),
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
  const protectedLogos =
    env.GRANT_SIGNING_SECRET.length >= 32 &&
    !!env.TURNSTILE_SECRET_KEY &&
    !!env.TURNSTILE_SITE_KEY;
  const currency = currencyFactory(env);
  const assistant: AssistantRuntime | undefined =
    env.FAKE_MODE || recognition
      ? {
          mode,
          provider: assistantFactory(env),
          ...(recognition ? { admission: recognition.admission } : {}),
        }
      : undefined;
  const admission =
    recognition?.admission ??
    new PaidAdmission({
      secret:
        env.GRANT_SIGNING_SECRET.length >= 32
          ? env.GRANT_SIGNING_SECRET
          : randomBytes(32).toString("hex"),
      challenge:
        !env.FAKE_MODE && protectedLogos
          ? turnstile(env.TURNSTILE_SECRET_KEY, env.FRONTEND_ORIGIN)
          : {
              async verify() {
                return false;
              },
            },
    });
  const logos: LogoRuntime | undefined =
    env.FAKE_MODE || protectedLogos
      ? {
          mode,
          provider: logoFactory(env),
          admission,
        }
      : undefined;
  const checkout =
    SANDBOX_CHECKOUT.enabled && env.STRIPE_API_KEY
      ? checkoutFactory(env, admission)
      : undefined;
  return {
    ...(checkout ? { checkout } : {}),
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
      admissionSiteKey:
        !env.FAKE_MODE && (enabled || protectedLogos)
          ? env.TURNSTILE_SITE_KEY
          : null,
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
      logos: logos
        ? { available: true, reason: "ready" }
        : { available: false, reason: "missing-prerequisites" },
      eur: { available: true, reason: env.FAKE_MODE ? "fixture" : "ready" },
      checkout: {
        available: !!checkout,
        reason: checkout ? "ready" : "not-implemented",
      },
    },
  };
}
