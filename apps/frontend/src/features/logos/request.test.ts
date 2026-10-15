import { expect, it, vi } from "vitest";
import { LOGO_LIMITS, LogoResultSchema } from "@retailor/contracts/brand";
import { logoRequester, type LogoInput } from "./request";
const createdAt = new Date().toISOString();
const input: LogoInput = {
  mode: "fake",
  workspaceId: "workspace",
  operationId: "operation",
  createdAt,
  expiresAt: new Date(Date.parse(createdAt) + 7200000).toISOString(),
  context: {
    name: "West & Woven",
    theme: "cobalt",
    typography: "modern",
    designRevision: 7,
    themeConfirmed: true,
    typographyConfirmed: true,
  },
};
const config = {
  schemaVersion: 1,
  mode: "fake",
  paidEnabled: false,
  admissionSiteKey: null,
  vision: { available: false, reason: "paid-disabled" },
  tailor: { available: true, reason: "fixture" },
  logos: { available: true, reason: "fixture" },
  eur: { available: true, reason: "fixture" },
};
function result(value = input) {
  return LogoResultSchema.parse({
    schemaVersion: 1,
    mode: value.mode,
    workspaceId: value.workspaceId,
    operationId: value.operationId,
    context: value.context,
    candidates: [1, 2, 3].map((index) => ({
      id: `logo_${index}`,
      hash: String(index).repeat(64),
      mime: "image/png",
      bytes: 1,
      width: 10,
      height: 10,
      context: value.context,
      generatedAt: createdAt,
      mode: value.mode,
      data: "YQ==",
    })),
  });
}
it("sends finite fake context once and rejects partial, foreign and oversized envelopes without repair calls", async () => {
  const expected = result(),
    io = vi.fn<typeof fetch>(async (url, init) => {
      if (String(url).endsWith("config")) return Response.json(config);
      expect(String(url)).toBe("/api/retailor/v1/brand/logos");
      expect(init?.redirect).toBe("error");
      const body = JSON.parse(String(init?.body));
      expect(body.context).toEqual(input.context);
      expect(body.action).toBeNull();
      expect(body.grant).toBeNull();
      expect(Object.keys(body)).not.toContain("prompt");
      return Response.json(expected);
    }),
    dispatch = vi.fn(),
    proof = vi.fn();
  expect(
    await logoRequester(proof, io)(
      input,
      new AbortController().signal,
      dispatch,
    ),
  ).toEqual(expected);
  expect(io).toHaveBeenCalledTimes(2);
  expect(dispatch).toHaveBeenCalledTimes(1);
  expect(proof).not.toHaveBeenCalled();
  for (const body of [
    { ...expected, candidates: expected.candidates.slice(0, 2) },
    { ...expected, workspaceId: "foreign" },
    "x".repeat(LOGO_LIMITS.responseBytes + 1),
  ]) {
    const transport = vi.fn<typeof fetch>(async (url) =>
      String(url).endsWith("config")
        ? Response.json(config)
        : typeof body === "string"
          ? new Response(body)
          : Response.json(body),
    );
    await expect(
      logoRequester(undefined, transport)(
        input,
        new AbortController().signal,
        () => undefined,
      ),
    ).rejects.toThrow();
    expect(transport).toHaveBeenCalledTimes(2);
  }
});
it("unavailable logos reject before challenge; paid-off native admission binds the exact design policy", async () => {
  const live = { ...input, mode: "live" as const },
    proof = vi.fn(async () => "proof"),
    dispatch = vi.fn();
  const closed = vi.fn<typeof fetch>(async () =>
    Response.json({
      ...config,
      mode: "live",
      logos: { available: false, reason: "paid-disabled" },
    }),
  );
  await expect(
    logoRequester(proof, closed)(live, new AbortController().signal, dispatch),
  ).rejects.toThrow();
  expect(proof).not.toHaveBeenCalled();
  expect(dispatch).not.toHaveBeenCalled();
  expect(closed).toHaveBeenCalledTimes(1);
  const io = vi.fn<typeof fetch>(async (url, init) => {
    if (String(url).endsWith("config"))
      return Response.json({
        ...config,
        mode: "live",
        paidEnabled: false,
        admissionSiteKey: "public-test",
        logos: { available: true, reason: "ready" },
      });
    const body = JSON.parse(String(init?.body));
    expect(body.action).toMatchObject({
      count: 3,
      nameDigest: expect.stringMatching(/^[a-f0-9]{64}$/u),
      theme: live.context.theme,
      typography: live.context.typography,
      designRevision: 7,
      generatorPolicy: "local-fonts-v1",
      outputPolicy: "transparent-png-v1",
    });
    if (String(url).endsWith("admission"))
      return Response.json({
        schemaVersion: 1,
        operationId: input.operationId,
        grant: "injected-grant",
        expiresAt: new Date(Date.now() + 120000).toISOString(),
      });
    expect(body.grant).toBe("injected-grant");
    return Response.json(result(live));
  });
  await logoRequester(proof, io)(live, new AbortController().signal, dispatch);
  expect(io).toHaveBeenCalledTimes(3);
  expect(proof).toHaveBeenCalledTimes(1);
  expect(dispatch).toHaveBeenCalledTimes(1);
});
