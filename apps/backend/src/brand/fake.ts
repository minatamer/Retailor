import sharp from "sharp";
import type { LogoProvider } from "./provider.js";
import { BRAND_PALETTE } from "./context.js";
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
      const symbols = [
        `<circle cx="155" cy="512" r="58" fill="none" stroke="${palette.accent}" stroke-width="6"/><text x="155" y="541" text-anchor="middle" font-size="82" fill="${palette.ink}">${xml(Array.from(context.name)[0]!)}</text>`,
        `<path d="M98 470 L155 425 L212 470 L155 590 Z M98 470 L155 510 L212 470" fill="none" stroke="${palette.accent}" stroke-width="7" stroke-linejoin="round"/>`,
        `<path d="M96 556 Q155 400 214 556 M110 534 H200" fill="none" stroke="${palette.accent}" stroke-width="8" stroke-linecap="round"/>`,
      ];
      const rows: Uint8Array[] = [];
      for (let index = 0; index < 3; index++) {
        signal.throwIfAborted();
        const font =
          context.typography === "editorial" ? "serif" : "sans-serif";
        // Fit real raster bounds: librsvg does not implement SVG textLength.
        const textSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="4096" height="384"><text font-family="${font}" font-size="86" font-weight="${index === 1 ? 600 : 400}" fill="${palette.ink}">${nameLines(
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
