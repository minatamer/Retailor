import { z } from "zod";
const bool = z.enum(["true", "false"]).transform((value) => value === "true");
const origin = z
  .string()
  .url()
  .refine((value) => {
    const url = new URL(value);
    return (
      url.origin === value &&
      !url.username &&
      !url.password &&
      ["http:", "https:"].includes(url.protocol)
    );
  }, "Use a canonical origin without a path");
const EnvironmentSchema = z
  .object({
    APP_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    PORT: z.coerce.number().int().min(1024).max(65535).default(4311),
    FRONTEND_ORIGIN: origin.default("http://127.0.0.1:4310"),
    APP_REVISION: z
      .string()
      .regex(/^[a-zA-Z0-9._-]{1,64}$/u)
      .default("local"),
    FAKE_MODE: bool.default(true),
    PAID_DEMO_ENABLED: bool.default(false),
    LIVE_POLICY_APPROVED: bool.default(false),
    LOGO_GENERATION_ENABLED: bool.default(false),
    LOGO_POLICY_APPROVED: bool.default(false),
    PROCESS_BUDGET_MICRO_USD: z.coerce
      .number()
      .int()
      .min(0)
      .max(100_000_000)
      .default(0),
    OPENAI_API_KEY: z.string().default(""),
    TURNSTILE_SECRET_KEY: z.string().default(""),
    TURNSTILE_SITE_KEY: z.string().max(256).default(""),
    GRANT_SIGNING_SECRET: z.string().default(""),
  })
  .superRefine((env, ctx) => {
    if (env.APP_ENV === "production" && env.FAKE_MODE)
      ctx.addIssue({
        code: "custom",
        path: ["FAKE_MODE"],
        message: "Production cannot use fake providers",
      });
    if (env.FAKE_MODE && env.PAID_DEMO_ENABLED)
      ctx.addIssue({
        code: "custom",
        path: ["PAID_DEMO_ENABLED"],
        message: "Fake mode cannot enable paid calls",
      });
    if (
      env.APP_ENV === "production" &&
      !env.FRONTEND_ORIGIN.startsWith("https://")
    )
      ctx.addIssue({
        code: "custom",
        path: ["FRONTEND_ORIGIN"],
        message: "Production requires HTTPS",
      });
  });
export type Environment = z.infer<typeof EnvironmentSchema>;
export function parseEnvironment(
  input: Record<string, string | undefined>,
): Environment {
  return EnvironmentSchema.parse(input);
}
