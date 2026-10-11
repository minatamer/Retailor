export function developmentEnvironment(base) {
  return {
    ...base,
    APP_ENV: "development",
    FAKE_MODE: "true",
    PAID_DEMO_ENABLED: "false",
  };
}
