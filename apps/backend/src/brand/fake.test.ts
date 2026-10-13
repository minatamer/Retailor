import { expect, it, vi } from "vitest";
import sharp from "sharp";
import { fixtureLogos } from "./fake.js";

it("fits actual long-name pixels without clipping or covering the separate symbol", async () => {
  for (const name of [
    "The Considered Everyday Clothing Company",
    "W".repeat(40),
  ]) {
    const dispatch = vi.fn();
    const logos = await fixtureLogos().generate(
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
          if ((x < 275 || x > 925) && alpha > 0) outsidePixels++;
          else if (alpha > 0) wordmarkPixels++;
        }
      }
      expect(wordmarkPixels).toBeGreaterThan(1000);
      expect(outsidePixels).toBe(0);
    }
  }
});
