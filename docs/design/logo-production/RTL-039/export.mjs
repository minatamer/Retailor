import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir, copyFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

// Offline export. Pass an existing package directory containing Sharp.
const require = createRequire(
  `${process.argv[2].replaceAll("\\", "/")}/anchor.js`,
);
const sharp = require("sharp");
const directory = new URL("./", import.meta.url);
const publicDirectory = new URL("../../../../apps/frontend/public/", directory);
const outline = JSON.parse(
  await readFile(new URL("r-outline.json", directory), "utf8"),
);
const scale = 48 / outline.unitsPerEm;
const geometry = `<path d="M9 18h15l13 70h68" fill="none" stroke="#242b60" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/><path d="M29 31h88l-12 45H37Z" fill="#242b60"/><path d="${outline.path}" transform="translate(52 70) scale(${scale} ${-scale})" fill="white"/><circle cx="46" cy="105" r="9" fill="#242b60"/><circle cx="96" cy="105" r="9" fill="#242b60"/>`;
const svg = (background = "") =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">${background}${geometry}</svg>\n`;
await mkdir(new URL("brand/", publicDirectory), { recursive: true });
const assets = new Map([["brand/retailor-cart.svg", Buffer.from(svg())]]);
// A white tile preserves contrast on both light and dark browser chrome.
const tile = Buffer.from(
  svg('<rect width="128" height="128" rx="24" fill="white"/>'),
);
for (const [name, size] of [
  ["favicon-96.png", 96],
  ["apple-touch-icon.png", 180],
])
  assets.set(name, await sharp(tile).resize(size, size).png().toBuffer());
const sizes = [16, 32, 48];
const images = await Promise.all(
  sizes.map((size) => sharp(tile).resize(size, size).png().toBuffer()),
);
const header = Buffer.alloc(6 + 16 * sizes.length);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(sizes.length, 4);
let offset = header.length;
for (let index = 0; index < sizes.length; index++) {
  const entry = 6 + index * 16;
  header[entry] = sizes[index];
  header[entry + 1] = sizes[index];
  header.writeUInt16LE(1, entry + 4);
  header.writeUInt16LE(32, entry + 6);
  header.writeUInt32LE(images[index].length, entry + 8);
  header.writeUInt32LE(offset, entry + 12);
  offset += images[index].length;
}
assets.set("favicon.ico", Buffer.concat([header, ...images]));
const records = [];
for (const [name, bytes] of assets) {
  await writeFile(new URL(name, publicDirectory), bytes);
  records.push({
    path: `apps/frontend/public/${name}`,
    bytes: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  });
}
await copyFile(
  new URL("fonts/inter-OFL.txt", publicDirectory),
  new URL("FONT-LICENSE.txt", directory),
);
await writeFile(
  new URL("provenance.json", directory),
  JSON.stringify(
    {
      approved: "RTL-037 draft03 option A, owner selected 14 October 2026",
      colors: ["#242b60", "#ffffff"],
      letter:
        "Unmodified local Inter variable font instantiated at wght800, outlined with fontTools4.60.1",
      fontSha256: createHash("sha256")
        .update(
          await readFile(
            new URL("fonts/inter-latin-wght-normal.woff2", publicDirectory),
          ),
        )
        .digest("hex"),
      geometry:
        "Original approved128px cart; identical coordinates, R52/70 at48px. White rounded tile only on favicon/touch exports.",
      assets: records,
    },
    null,
    2,
  ) + "\n",
);
// Actual native-size exports beside context for optical review (not shipped).
const board = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="760" height="260"><rect width="760" height="260" fill="#ffffff"/><rect x="380" width="380" height="260" fill="#242b60"/><g transform="translate(34 40)">${geometry}</g><g transform="translate(166 75) scale(.375)">${geometry}</g><g transform="translate(240 91) scale(.25)">${geometry}</g><g transform="translate(300 99) scale(.125)">${geometry}</g></svg>`,
);
const boardBase = await sharp(board).png().toBuffer();
await sharp(boardBase)
  .composite(
    await Promise.all(
      [16, 32, 48, 96].map(async (size, index) => ({
        input: await sharp(tile).resize(size, size).png().toBuffer(),
        left: 410 + index * 72,
        top: 90,
      })),
    ),
  )
  .png()
  .toFile(fileURLToPath(new URL("production-preview.png", directory)));
process.stdout.write(
  `Exported ${assets.size} approved Retailor identity files.\n`,
);
