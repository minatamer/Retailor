import { createRequire } from "node:module";
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

// Review tooling only. Supply an existing Sharp package directory; no install.
const packageDirectory = process.argv[2];
if (!packageDirectory)
  throw new Error("Supply the existing Sharp package directory.");
const require = createRequire(
  `${packageDirectory.replaceAll("\\", "/")}/anchor.js`,
);
const sharp = require("sharp");
const directory = new URL("./", import.meta.url);
const ink = "#202321";
const cobalt = "#343bdd";
const paper = "#f5f4ef";
const muted = "#626760";

const concepts = [
  {
    id: "a-thread",
    letter: "A",
    name: "The thread",
    note: "A looping R inspired by tailoring thread.",
    detail: "Soft, confident, and connected to the name.",
    recommended: true,
    geometry: `<path d="M14 54V11h18c11 0 18 6 18 15S43 40 32 40H14m17 0c4 9 10 14 19 14" fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>`,
  },
  {
    id: "b-fold",
    letter: "B",
    name: "The fold",
    note: "An angular R shaped from folded fabric.",
    detail: "Sharper, bolder, more fashion-label energy.",
    recommended: false,
    geometry: `<path fill="currentColor" fill-rule="evenodd" d="M11 8h27l17 17v9L39 45l17 12H39L24 44v13H11V8Zm13 13v13h10l9-6-8-7H24Z"/>`,
  },
  {
    id: "c-label",
    letter: "C",
    name: "The label",
    note: "A clothing label with an R cut into it.",
    detail: "Directly clothing-led, compact and familiar.",
    recommended: false,
    geometry: `<path fill="currentColor" fill-rule="evenodd" d="M10 6h29l15 15v37H10V6Zm8 15h12c8 0 13 4 13 10 0 4.5-2.5 7-7 9l8 6h-9l-7-6h-5v7h-5V21Zm5 5v9h7c5 0 8-1 8-4s-3-5-8-5h-7Zm17-17v10h10L40 9Z"/>`,
  },
];

// Original lowercase lettering, outlined as vector paths; no font dependency.
const lettering = `<g fill="none" stroke="currentColor" stroke-width="8.5" stroke-linecap="round" stroke-linejoin="round">
  <path d="M5 58V23m0 15c0-11 7-17 19-17"/>
  <path transform="translate(34)" d="M5 38h31c0-10-5-17-15-17S4 29 4 39s7 19 19 19c5 0 10-2 14-5"/>
  <path transform="translate(81)" d="M12 8v39c0 8 3 11 10 11h5M2 23h25"/>
  <path transform="translate(121)" d="M35 23v35m0-19c0-11-6-18-16-18S3 29 3 39s6 19 16 19 16-8 16-19"/>
  <path transform="translate(168)" d="M5 23v35"/>
  <path transform="translate(190)" d="M5 6v52"/>
  <ellipse transform="translate(212)" cx="21" cy="39.5" rx="17" ry="18.5"/>
  <path transform="translate(260)" d="M5 58V23m0 15c0-11 7-17 19-17"/>
</g><circle cx="173" cy="7" r="4.7" fill="currentColor"/>`;

function svg(width, height, contents, title) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title"><title id="title">${title}</title>${contents}</svg>`;
}
function mark(concept, x, y, size, color) {
  return `<g transform="translate(${x} ${y}) scale(${size / 64})" style="color:${color}">${concept.geometry}</g>`;
}
function wordmark(x, y, scale, color) {
  return `<g transform="translate(${x} ${y}) scale(${scale})" style="color:${color}">${lettering}</g>`;
}
function text(
  x,
  y,
  contents,
  size = 16,
  color = ink,
  weight = 400,
  extra = "",
) {
  return `<text x="${x}" y="${y}" fill="${color}" font-family="Arial, sans-serif" font-size="${size}" font-weight="${weight}" ${extra}>${contents}</text>`;
}

for (const concept of concepts) {
  const icon = svg(
    64,
    64,
    mark(concept, 0, 0, 64, cobalt),
    `Retailor concept ${concept.letter}: ${concept.name}`,
  );
  const lockup = svg(
    414,
    82,
    mark(concept, 0, 5, 72, cobalt) + wordmark(93, 6, 1.08, ink),
    `Retailor ${concept.name} wordmark`,
  );
  await writeFile(new URL(`${concept.id}.svg`, directory), icon);
  await writeFile(new URL(`${concept.id}-lockup.svg`, directory), lockup);
  for (const size of [16, 32, 48]) {
    await sharp(Buffer.from(icon))
      .resize(size, size)
      .png()
      .toFile(fileURLToPath(new URL(`${concept.id}-${size}.png`, directory)));
  }
}

let board = `<rect width="1500" height="1100" fill="${paper}"/>`;
board += text(
  54,
  57,
  "RETAILOR / LOGO DIRECTIONS",
  13,
  muted,
  700,
  'letter-spacing="2"',
);
board += text(54, 116, "Retail, with a tailoring touch.", 43, ink, 700);
board += text(
  54,
  155,
  "Three original marks. The name stays Retailor. Nothing is installed yet.",
  18,
  muted,
);
for (let index = 0; index < concepts.length; index++) {
  const concept = concepts[index];
  const x = 54 + index * 470;
  board += `<rect x="${x}" y="199" width="452" height="736" rx="22" fill="#fff" stroke="${concept.recommended ? cobalt : "#d8dcd3"}" stroke-width="${concept.recommended ? 2 : 1}"/>`;
  board += text(
    x + 27,
    246,
    `${concept.letter} / ${concept.name}`,
    23,
    ink,
    700,
  );
  if (concept.recommended) {
    board += `<rect x="${x + 292}" y="225" width="136" height="30" rx="15" fill="#eeefff"/>`;
    board += text(
      x + 306,
      245,
      "RECOMMENDED",
      10,
      cobalt,
      700,
      'letter-spacing="0.7"',
    );
  }
  board += mark(concept, x + 142, 287, 170, cobalt);
  board +=
    mark(concept, x + 36, 493, 56, cobalt) + wordmark(x + 111, 490, 0.99, ink);
  board += `<path d="M${x + 27} 581h398" stroke="#d8dcd3"/>`;
  board += text(x + 27, 619, concept.note, 16, ink);
  board += text(x + 27, 647, concept.detail, 15, muted);
  board += text(
    x + 27,
    694,
    "ONE COLOUR",
    10,
    muted,
    700,
    'letter-spacing="1.4"',
  );
  board += mark(concept, x + 30, 715, 59, ink);
  board += `<rect x="${x + 111}" y="711" width="66" height="66" rx="14" fill="${ink}"/>`;
  board += mark(concept, x + 116, 716, 56, "#fff");
  board += `<path d="M${x + 27} 802h398" stroke="#d8dcd3"/>`;
  board += text(
    x + 27,
    837,
    "FAVICON SIZE",
    10,
    muted,
    700,
    'letter-spacing="1.4"',
  );
  for (const [offset, size] of [
    [30, 16],
    [147, 32],
    [269, 48],
  ]) {
    board += `<rect x="${x + offset - 10}" y="852" width="${size + 20}" height="64" rx="7" fill="${paper}"/>`;
    board += `<image x="${x + offset}" y="${864 + (48 - size) / 2}" width="${size}" height="${size}" href="data:image/png;base64,${await sharp(
      Buffer.from(
        svg(64, 64, mark(concept, 0, 0, 64, cobalt), "Favicon review"),
      ),
    )
      .resize(size, size)
      .png()
      .toBuffer()
      .then((buffer) => buffer.toString("base64"))}"/>`;
    board += text(x + offset + size + 18, 888, `${size}px`, 12, muted);
  }
}
board += text(54, 984, "Why A?", 19, ink, 700);
board += text(
  54,
  1016,
  "The loop suggests tailoring; the R anchors Retailor. It has a clear silhouette without a generic AI sparkle.",
  18,
  muted,
);
board += text(
  54,
  1064,
  "APPROVAL PREVIEW / 14 OCT 2026",
  11,
  muted,
  700,
  'letter-spacing="1.6"',
);
const output = svg(
  1500,
  1100,
  board,
  "Three Retailor logo concepts with wordmarks, monochrome and favicon previews",
);
await writeFile(new URL("comparison.svg", directory), output);
await sharp(Buffer.from(output))
  .png()
  .toFile(fileURLToPath(new URL("comparison.png", directory)));
process.stdout.write(
  "Rendered three SVG concepts, three lockups, nine favicon samples and the comparison board.\n",
);
