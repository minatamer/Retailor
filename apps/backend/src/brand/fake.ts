import sharp from "sharp";
import type { LogoProvider } from "./provider.js";
import { BRAND_PALETTE } from "./context.js";
import { DEFAULT_THEME } from "@retailor/contracts/design";
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
  const lines: string[] = [];
  let characters = Array.from(name);
  while (characters.length > 20) {
    const space = characters.slice(0, 21).lastIndexOf(" ");
    const end = space >= 8 ? space : 20;
    lines.push(characters.slice(0, end).join(""));
    characters = characters.slice(end);
    if (characters[0] === " ") characters.shift();
  }
  lines.push(characters.join(""));
  return lines;
}
/** Authored development raster directions. No live generation, semantic quality claim or failure fallback. */
export function fixtureLogos(): LogoProvider {
  return {
    async generate(context, signal, accounting) {
      signal.throwIfAborted();
      accounting.dispatch();
      const palette = BRAND_PALETTE[context.theme];
      const highlight =
        context.theme === DEFAULT_THEME ? palette.accent : palette.background;
      const initial = xml(Array.from(context.name)[0]!);
      const font = context.typography === "editorial" ? "serif" : "sans-serif";
      const weight =
        context.typography === "modern"
          ? 700
          : context.typography === "inter"
            ? 500
            : 400;
      const letter = (colour: string, y = 539, size = 82) =>
        `<text x="155" y="${y}" text-anchor="middle" font-size="${size}" font-weight="${weight}" fill="${colour}">${initial}</text>`;
      const symbols = [
        `<circle cx="155" cy="512" r="64" fill="${palette.ink}"/><circle cx="155" cy="512" r="54" fill="none" stroke="${highlight}" stroke-width="3"/>${letter("#ffffff")}`,
        `<path d="M96 440 H182 L220 478 V580 H96 Z" fill="${palette.ink}"/><path d="M182 440 V478 H220" fill="none" stroke="${highlight}" stroke-width="4"/>${letter("#ffffff", 548, 76)}`,
        `<rect x="90" y="447" width="130" height="130" rx="18" fill="none" stroke="${palette.accent}" stroke-width="7"/><path d="M105 461 H205 V563 H105 Z" fill="none" stroke="${palette.ink}" stroke-width="2" stroke-dasharray="4 6"/>${letter(palette.ink)}`,
      ];
      const rows: Uint8Array[] = [];
      for (let index = 0; index < 3; index++) {
        signal.throwIfAborted();
        // Fit real raster bounds: librsvg does not implement SVG textLength.
        const textSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="4096" height="384"><text font-family="${font}" font-size="86" font-weight="${weight}" letter-spacing="${context.typography === "modern" ? 2 : 0}" fill="${palette.ink}">${nameLines(
          context.name,
        )
          .map(
            (line, row) =>
              `<tspan x="16" y="${112 + row * 103}">${xml(line)}</tspan>`,
          )
          .join("")}</text></svg>`;
        const wordmark = await sharp(Buffer.from(textSvg))
          .trim()
          .resize({ width: 650, height: 224, fit: "inside" })
          .png()
          .toBuffer({ resolveWithObject: true });
        signal.throwIfAborted();
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024"><g font-family="${font}">${symbols[index]}${index === 2 ? `<path d="M280 ${528 + Math.ceil(wordmark.info.height / 2)} H920" stroke="${palette.accent}" stroke-width="3"/>` : ""}</g></svg>`;
        rows.push(
          await sharp(Buffer.from(svg))
            .composite([
              {
                input: wordmark.data,
                left: 600 - Math.floor(wordmark.info.width / 2),
                top: 512 - Math.floor(wordmark.info.height / 2),
              },
            ])
            .png({ compressionLevel: 9 })
            .toBuffer(),
        );
      }
      return rows;
    },
  };
}
