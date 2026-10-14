import { createRequire } from "node:module";
import { copyFile, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

// Local, network-free SVG rasterisation using an existing Sharp installation.
const packageDirectory = process.argv[2];
if (!packageDirectory)
  throw new Error(
    "Supply an existing Node package directory containing Sharp.",
  );
const require = createRequire(
  `${packageDirectory.replaceAll("\\", "/")}/anchor.js`,
);
const sharp = require("sharp");
const directory = new URL("./", import.meta.url);
const fontfile = fileURLToPath(
  new URL(
    "../../../../apps/frontend/public/fonts/inter-latin-wght-normal.woff2",
    import.meta.url,
  ),
);

// Pango registers the exact local font for this process. librsvg does not load
// embedded browser @font-face rules, so its family alias uses the font's real name.
await sharp({
  text: { text: "Retailor R", font: "Inter Heavy", fontfile, rgba: true },
})
  .png()
  .toBuffer();
const input = async (file) =>
  Buffer.from(
    (await readFile(new URL(file, directory), "utf8")).replaceAll(
      "RetailorInter",
      "Inter",
    ),
  );
for (const board of ["comparison", "updated-four", "new-three"])
  await sharp(await input(`${board}.svg`))
    .png()
    .toFile(fileURLToPath(new URL(`${board}.png`, directory)));
for (const name of [
  "a-cart",
  "b-wallet",
  "c-card",
  "d-barcode",
  "e-hanger",
  "f-storefront",
  "g-receipt",
]) {
  const svg = await input(`${name}.svg`);
  for (const size of [16, 32, 48])
    await sharp(svg)
      .resize(size, size)
      .png()
      .toFile(fileURLToPath(new URL(`${name}-${size}.png`, directory)));
}
await copyFile(
  new URL(
    "../../../../apps/frontend/public/fonts/inter-OFL.txt",
    import.meta.url,
  ),
  new URL("FONT-LICENSE.txt", directory),
);
process.stdout.write(
  "Rendered three navy/white review boards and 21 transparent native-size PNG studies with the local Inter font.\n",
);
