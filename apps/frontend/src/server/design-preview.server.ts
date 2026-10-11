import "server-only";
export function designPreviewAllowed() {
  return (
    process.env.RETAILOR_DEV === "true" && process.env.APP_ENV !== "production"
  );
}
