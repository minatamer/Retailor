import { describe, expect, it, vi } from "vitest";
import sharp from "sharp";
import { createHash } from "node:crypto";
import { LOGO_LIMITS } from "@retailor/contracts/brand";
import type { LogoRequest } from "@retailor/contracts/brand";
import { localLogos } from "./local.js";
import { generateLogos, validateLogo } from "./service.js";
import { prepareLogoContext, BRAND_PALETTE } from "./context.js";
import { ThemeSchema, DEFAULT_THEME } from "@retailor/contracts/design";
const now = "2026-10-12T18:00:00.000Z";
const request: LogoRequest = {
  schemaVersion: 1,
  mode: "fake",
  workspaceId: "workspace",
  operationId: "logos",
  createdAt: now,
  expiresAt: "2026-10-12T20:00:00.000Z",
  context: {
    name: "FORME",
    theme: "ink",
    typography: "editorial",
    designRevision: 1,
    themeConfirmed: true,
    typographyConfirmed: true,
  },
  action: null,
  grant: null,
};
const accounting = () => ({ dispatch: vi.fn(), recordUsage: vi.fn() });
describe("bounded separate transparent logo batches", () => {
  it("resolves all five actual merchant contexts into the constrained prompt and real bounded transparent raster sets", async () => {
    for (const theme of ThemeSchema.options) {
      const context = { ...request.context, theme };
      const palette = BRAND_PALETTE[theme];
      let sequence = 0;
      const result = await generateLogos(
        { ...request, context },
        localLogos(),
        new AbortController().signal,
        accounting(),
        () => `theme_${++sequence}`,
        () => now,
      );
      expect(result.context.theme).toBe(theme);
      expect(new Set(result.candidates.map((row) => row.hash)).size).toBe(3);
      for (const candidate of result.candidates) {
        const { data, info } = await sharp(
          Buffer.from(candidate.data, "base64"),
        )
          .ensureAlpha()
          .raw()
          .toBuffer({ resolveWithObject: true });
        const expected = parseInt(palette.ink.slice(1), 16);
        let found = false;
        for (let offset = 0; offset < data.length; offset += info.channels)
          if (
            data[offset + 3] === 255 &&
            ((data[offset]! << 16) |
              (data[offset + 1]! << 8) |
              data[offset + 2]!) ===
              expected
          ) {
            found = true;
            break;
          }
        expect(found).toBe(true);
      }
    }
    expect(BRAND_PALETTE[DEFAULT_THEME]).toMatchObject({
      ink: "#242b60",
      accent: "#d6f578",
      background: "#ffffff",
    });
  });
  it("makes all three actual monograms responsive to the name initial, palette and type, escaping literal name text", async () => {
    const provider = localLogos();
    const make = (patch: Partial<LogoRequest["context"]>) =>
      provider.generate(
        { ...request.context, ...patch },
        new AbortController().signal,
        accounting(),
      );
    const [alpha, zeta, lime, modern, inter, literal] = await Promise.all([
      make({ name: "Alpha" }),
      make({ name: "Zlpha" }),
      make({ name: "Alpha", theme: "cobalt" }),
      make({ name: "Alpha", typography: "modern" }),
      make({ name: "Alpha", typography: "inter" }),
      make({ name: "A & <B>" }),
    ]);
    const mark = async (bytes: Uint8Array) =>
      createHash("sha256")
        .update(
          await sharp(bytes)
            .extract({ left: 80, top: 420, width: 160, height: 180 })
            .png()
            .toBuffer(),
        )
        .digest("hex");
    for (let index = 0; index < 3; index++) {
      const original = await mark(alpha[index]!);
      expect(await mark(zeta[index]!)).not.toBe(original);
      expect(await mark(lime[index]!)).not.toBe(original);
      expect(await mark(modern[index]!)).not.toBe(original);
      expect(await mark(inter[index]!)).not.toBe(await mark(modern[index]!));
      expect(
        (await validateLogo(literal[index]!, new AbortController().signal))
          .bytes.length,
      ).toBeLessThanOrEqual(LOGO_LIMITS.imageBytes);
    }
  });
  it("decodes three distinct real alpha PNGs, strips empty padding and preserves exact owned metadata", async () => {
    const account = accounting();
    let sequence = 0;
    const result = await generateLogos(
      request,
      localLogos(),
      new AbortController().signal,
      account,
      () => `logo_${++sequence}`,
      () => now,
    );
    expect(account.dispatch).toHaveBeenCalledTimes(1);
    expect(result.candidates).toHaveLength(3);
    expect(new Set(result.candidates.map((c) => c.hash)).size).toBe(3);
    for (const candidate of result.candidates) {
      const bytes = Buffer.from(candidate.data, "base64"),
        meta = await sharp(bytes).metadata();
      expect(bytes.length).toBe(candidate.bytes);
      expect(bytes.length).toBeLessThanOrEqual(LOGO_LIMITS.imageBytes);
      expect(createHash("sha256").update(bytes).digest("hex")).toBe(
        candidate.hash,
      );
      expect(meta).toMatchObject({
        format: "png",
        width: candidate.width,
        height: candidate.height,
        hasAlpha: true,
      });
      expect(candidate.height).toBeLessThan(1024);
      expect(meta.exif).toBeUndefined();
      expect(candidate.context.name).toBe("FORME");
    }
  });
  it("rejects partial, duplicate, opaque, blank and non-raster output with no repair request", async () => {
    const source = await localLogos().generate(
      request.context,
      new AbortController().signal,
      accounting(),
    );
    for (const outputs of [
      source.slice(0, 2),
      [source[0]!, source[0]!, source[0]!],
    ]) {
      const generate = vi.fn(
        async (_context, _signal, account: ReturnType<typeof accounting>) => {
          account.dispatch();
          return outputs;
        },
      );
      await expect(
        generateLogos(
          request,
          { generate },
          new AbortController().signal,
          accounting(),
          () => crypto.randomUUID(),
          () => now,
        ),
      ).rejects.toThrow("UPSTREAM_FAILED");
      expect(generate).toHaveBeenCalledTimes(1);
    }
    for (const bytes of [
      await sharp({
        create: {
          width: 100,
          height: 100,
          channels: 4,
          background: { r: 10, g: 20, b: 30, alpha: 1 },
        },
      })
        .png()
        .toBuffer(),
      await sharp({
        create: {
          width: 100,
          height: 100,
          channels: 4,
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        },
      })
        .png()
        .toBuffer(),
      Buffer.from("<svg/>"),
    ]) {
      await expect(
        validateLogo(bytes, new AbortController().signal),
      ).rejects.toThrow();
    }
  });
  it("binds the exact native logo name, style and signed operation context", () => {
    const action = {
      schemaVersion: 1,
      action: "logos",
      mode: "live",
      workspaceId: request.workspaceId,
      operationId: request.operationId,
      createdAt: request.createdAt,
      expiresAt: request.expiresAt,
      theme: request.context.theme,
      typography: request.context.typography,
      designRevision: 1,
      nameDigest: createHash("sha256").update("FORME").digest("hex"),
      count: 3,
      generatorPolicy: "local-fonts-v1",
      outputPolicy: "transparent-png-v1",
    };
    expect(
      prepareLogoContext(
        { ...request, mode: "live", action, grant: "grant" },
        now,
      ).context.name,
    ).toBe("FORME");
    expect(() =>
      prepareLogoContext(
        {
          ...request,
          mode: "live",
          action,
          grant: "grant",
          context: { ...request.context, name: "Different" },
        },
        now,
      ),
    ).toThrow("FORBIDDEN");
    expect(() =>
      prepareLogoContext(
        { ...request, context: { ...request.context, themeConfirmed: false } },
        now,
      ),
    ).toThrow("INVALID_INPUT");
    expect(() =>
      prepareLogoContext(
        { ...request, context: { ...request.context, prompt: "extra" } },
        now,
      ),
    ).toThrow("INVALID_INPUT");
  });
  it("does not enter an aborted provider or accept repeated dispatch from an injected port", async () => {
    const abort = new AbortController();
    abort.abort();
    const generate = vi.fn(async () => []);
    await expect(
      generateLogos(
        request,
        { generate },
        abort.signal,
        accounting(),
        () => "logo",
        () => now,
      ),
    ).rejects.toThrow();
    expect(generate).not.toHaveBeenCalled();
    const account = accounting();
    await expect(
      generateLogos(
        request,
        {
          async generate(_context, _signal, owned) {
            owned.dispatch();
            owned.dispatch();
            return [];
          },
        },
        new AbortController().signal,
        account,
        () => "logo",
        () => now,
      ),
    ).rejects.toThrow("FORBIDDEN");
    expect(account.dispatch).toHaveBeenCalledTimes(1);
  });
});
