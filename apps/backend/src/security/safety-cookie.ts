export const SAFETY_COOKIE = "retailor_safety";
export function safetyCookie(header: string | undefined) {
  if (!header || header.length > 4096) return undefined;
  const values = header
    .split(";")
    .map((value) => value.trim())
    .filter((value) => value.startsWith(`${SAFETY_COOKIE}=`));
  return values.length === 1 &&
    /^[A-Za-z0-9_-]+\.[a-f0-9]{64}$/u.test(
      values[0]!.slice(SAFETY_COOKIE.length + 1),
    )
    ? values[0]!.slice(SAFETY_COOKIE.length + 1)
    : undefined;
}
