import sharp from "sharp";
import { fileURLToPath } from "node:url";
import type { LogoProvider } from "./provider.js";
import { BRAND_PALETTE } from "./context.js";
import fonts from "./fonts/provenance.json" with { type: "json" };

const xml = (text: string) =>
  text.replace(
    /[&<>"']/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&apos;",
      })[char]!,
  );

function nameLines(name: string) {
  const characters = Array.from(name);
  if (characters.length <= 22) return name;
  // Prefer balanced words, with a hard split for an unbroken name.
  const middle = Math.ceil(characters.length / 2);
  const spaces = characters.flatMap((char, index) =>
    char === " " && index >= 8 && index <= characters.length - 8 ? [index] : [],
  );
  const split =
    spaces.sort((a, b) => Math.abs(a - middle) - Math.abs(b - middle))[0] ??
    middle;
  return `${characters.slice(0, split).join("")}\n${characters.slice(split).join("").trimStart()}`;
}

/** Authored local directions. Bundled storefront fonts; no model or host-font fallback. */
export function localLogos(): LogoProvider {
  return {
    async generate(context, signal, accounting) {
      signal.throwIfAborted();
      const face = fonts.faces[context.typography];
      // Refuse unsupported lettering before shaping can substitute another font.
      // The existing storefront wordmark remains available to the user.
      if (
        Array.from(context.name).some((char) => {
          const point = char.codePointAt(0)!;
          return !face.codepoints.some(
            ([start, end]) => point >= start! && point <= end!,
          );
        })
      )
        throw new Error("Local logo font does not cover this name");
      accounting.dispatch();
      accounting.recordUsage({ input: 0, output: 0 });
      const palette = BRAND_PALETTE[context.theme];
      const fontfile = fileURLToPath(
        new URL(`./fonts/${face.file}`, import.meta.url),
      );
      const text = async (
        value: string,
        colour: string,
        size: number,
        width: number,
        height: number,
      ) => {
        signal.throwIfAborted();
        const result = await sharp({
          text: {
            text: `<span foreground="${colour}" fallback="false">${xml(value)}</span>`,
            font: `${face.family} ${size}`,
            fontfile,
            rgba: true,
            dpi: 72,
            align: "left",
            spacing: 4,
          },
        })
          .timeout({ seconds: 10 })
          .resize({ width, height, fit: "inside" })
          .png()
          .toBuffer({ resolveWithObject: true });
        signal.throwIfAborted();
        return result;
      };
      const wordmark = await text(
        nameLines(context.name),
        palette.ink,
        104,
        680,
        context.name.length > 22 ? 128 : 84,
      );
      const initial = Array.from(context.name)[0]!;
      const lightInitial = await text(initial, palette.background, 88, 60, 70);
      const darkInitial = await text(initial, palette.ink, 88, 60, 70);
      const symbols = [
        // An atelier stamp, with a single accent stitch.
        `<rect x="96" y="460" width="104" height="104" rx="28" fill="${palette.ink}"/><path d="M127 551 H169" stroke="${palette.accent}" stroke-width="5" stroke-linecap="round"/>`,
        // An open circular monogram with a signature thread.
        `<path d="M185 479 A49 49 0 1 0 185 545" fill="none" stroke="${palette.ink}" stroke-width="5" stroke-linecap="round"/><path d="M188 490 L199 478 L210 490 L199 502 Z" fill="${palette.accent}"/>`,
        // A woven label with cut corners rather than a document/page icon.
        `<path d="M111 460 H185 L200 475 V549 L185 564 H111 L96 549 V475 Z" fill="none" stroke="${palette.ink}" stroke-width="4"/><path d="M108 484 V540 M188 484 V540" stroke="${palette.accent}" stroke-width="3" stroke-linecap="round"/>`,
      ];
      const rows: Uint8Array[] = [];
      for (let index = 0; index < 3; index++) {
        signal.throwIfAborted();
        const monogram = index === 0 ? lightInitial : darkInitial;
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024">${symbols[index]}</svg>`;
        rows.push(
          await sharp(Buffer.from(svg))
            .timeout({ seconds: 10 })
            .composite([
              {
                input: monogram.data,
                left: 148 - Math.floor(monogram.info.width / 2),
                top:
                  (index === 0 ? 505 : 512) -
                  Math.floor(monogram.info.height / 2),
              },
              {
                input: wordmark.data,
                left: 240,
                top: 512 - Math.floor(wordmark.info.height / 2),
              },
            ])
            .png({ compressionLevel: 9 })
            .toBuffer(),
        );
      }
      signal.throwIfAborted();
      return rows;
    },
  };
}
