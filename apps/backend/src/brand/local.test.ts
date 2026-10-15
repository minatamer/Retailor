import { expect, it, vi } from "vitest";
import sharp from "sharp";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import fonts from "./fonts/provenance.json" with { type: "json" };
import { localLogos } from "./local.js";

it("ships the licensed exact storefront faces as reproducible static fonts", async () => {
  for (const face of Object.values(fonts.faces)) {
    const source = await readFile(
      new URL(`../../../../${face.source}`, import.meta.url),
    );
    const bytes = await readFile(
      new URL(`./fonts/${face.file}`, import.meta.url),
    );
    expect(createHash("sha256").update(source).digest("hex")).toBe(
      face.sourceSha256,
    );
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(face.sha256);
    expect(bytes.subarray(0, 4).toString("hex")).toBe("00010000");
    expect(bytes.length).toBeLessThan(150_000);
    expect(
      await readFile(
        new URL(`./fonts/${face.license}`, import.meta.url),
        "utf8",
      ),
    ).toContain("SIL OPEN FONT LICENSE Version 1.1");
  }
});

it("fits actual long-name pixels without clipping or covering the separate symbol", async () => {
  for (const name of [
    "The Considered Everyday Clothing Company",
    "W".repeat(40),
  ]) {
    const dispatch = vi.fn();
    const logos = await localLogos().generate(
      {
        name,
        theme: "oxblood",
        typography: "editorial",
        themeConfirmed: true,
        typographyConfirmed: true,
        designRevision: 0,
      },
      new AbortController().signal,
      { dispatch, recordUsage() {} },
    );
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(logos).toHaveLength(3);
    for (const logo of logos) {
      const { data, info } = await sharp(logo)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      expect([info.width, info.height, info.channels]).toEqual([1024, 1024, 4]);
      let wordmarkPixels = 0;
      let outsidePixels = 0;
      for (let y = 360; y < 660; y++) {
        for (let x = 225; x < 1024; x++) {
          const alpha = data[(y * 1024 + x) * 4 + 3]!;
          if ((x < 240 || x >= 920) && alpha > 0) outsidePixels++;
          else if (alpha > 0) wordmarkPixels++;
        }
      }
      expect(wordmarkPixels).toBeGreaterThan(1000);
      expect(outsidePixels).toBe(0);
    }
  }
});

it("refuses unsupported glyph substitution and cancelled work before dispatch", async () => {
  const context = {
    name: "متجر",
    theme: "navy" as const,
    typography: "editorial" as const,
    themeConfirmed: true as const,
    typographyConfirmed: true as const,
    designRevision: 0,
  };
  const dispatch = vi.fn();
  const provider = localLogos();
  await expect(
    provider.generate(context, new AbortController().signal, {
      dispatch,
      recordUsage() {},
    }),
  ).rejects.toThrow();
  const cancelled = new AbortController();
  cancelled.abort();
  await expect(
    provider.generate({ ...context, name: "Atelier" }, cancelled.signal, {
      dispatch,
      recordUsage() {},
    }),
  ).rejects.toThrow();
  expect(dispatch).not.toHaveBeenCalled();
});
