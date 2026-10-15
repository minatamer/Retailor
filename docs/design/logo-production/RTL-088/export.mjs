import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

// Offline export using the repository's existing Sharp dependency.
const directory = new URL("./", import.meta.url);
const publicDirectory = new URL("../../../../apps/frontend/public/", directory);
const evidenceDirectory = new URL(
  "../../../../artifacts/local/RTL-088/",
  directory,
);
const require = createRequire(
  new URL("../../../../apps/backend/package.json", directory),
);
const sharp = require("sharp");
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const retainedPaths = ["brand/retailor-cart.svg", "brand/retailor-lockup.svg"];
const retained = new Map(
  await Promise.all(
    retainedPaths.map(async (path) => [
      path,
      await readFile(new URL(path, publicDirectory)),
    ]),
  ),
);
const source = retained.get("brand/retailor-cart.svg");
assert.equal(
  hash(source),
  "282197fe5c86160b94055cbea72fac54a9d558e2e1130c56ce042f3bb9e0a2e7",
);
const cart = source.toString("utf8");
let changed = 0;
const geometry = cart
  .slice(cart.indexOf(">") + 1, cart.lastIndexOf("</svg>"))
  .replace(/(fill|stroke)="(#242b60|white)"/gu, (_attribute, kind, color) => {
    changed++;
    return `${kind}="${color === "white" ? "#242b60" : "#ffffff"}"`;
  });
assert.equal(changed, 5);
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><rect width="128" height="128" rx="24" fill="#242b60"/>${geometry}</svg>\n`;
const tile = Buffer.from(svg);
await writeFile(new URL("favicon.svg", directory), tile);
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
const assets = new Map([
  ["favicon.ico", Buffer.concat([header, ...images])],
  ["favicon-96.png", await sharp(tile).resize(96, 96).png().toBuffer()],
  ["apple-touch-icon.png", await sharp(tile).resize(180, 180).png().toBuffer()],
]);
const records = [];
for (const [path, bytes] of assets) {
  await writeFile(new URL(path, publicDirectory), bytes);
  records.push({
    path: `apps/frontend/public/${path}`,
    bytes: bytes.length,
    sha256: hash(bytes),
  });
}
for (const [path, before] of retained)
  assert.deepEqual(await readFile(new URL(path, publicDirectory)), before);
await writeFile(
  new URL("provenance.json", directory),
  JSON.stringify(
    {
      direction: "RTL-088 owner instruction, 15 October 2026",
      colors: { background: "#242b60", cart: "#ffffff", letter: "#242b60" },
      geometry:
        "Exact RTL-039 outlined cart and Inter800 R; only five foreground color attributes reversed. Same 128px canvas and rounded tile.",
      websiteUnchanged: [...retained].map(([path, bytes]) => ({
        path: `apps/frontend/public/${path}`,
        sha256: hash(bytes),
      })),
      svgSha256: hash(tile),
      sharp: sharp.versions.sharp,
      assets: records,
    },
    null,
    2,
  ) + "\n",
);

// Review actual native sizes on light and dark surrounding surfaces; not shipped.
await mkdir(evidenceDirectory, { recursive: true });
const board = Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" width="768" height="240"><rect width="768" height="240" fill="#ffffff"/><rect x="384" width="384" height="240" fill="#202124"/><g font-family="sans-serif" font-size="14"><text x="24" y="34" fill="#242b60">Light surface · 16 / 32 / 48 / 96 px</text><text x="408" y="34" fill="#ffffff">Dark surface · 16 / 32 / 48 / 96 px</text></g></svg>',
);
const previews = await Promise.all(
  [16, 32, 48, 96].map(async (size) =>
    sharp(tile).resize(size, size).png().toBuffer(),
  ),
);
await sharp(board)
  .composite(
    previews.flatMap((input, index) =>
      [0, 384].map((shift) => ({
        input,
        left: shift + [24, 88, 160, 248][index],
        top: 96,
      })),
    ),
  )
  .png()
  .toFile(fileURLToPath(new URL("favicon-preview.png", evidenceDirectory)));
await sharp(tile)
  .resize(256, 256)
  .png()
  .toFile(fileURLToPath(new URL("icon-large.png", evidenceDirectory)));
process.stdout.write(
  "Exported three reversed browser/search/touch icons; website assets unchanged.\n",
);
