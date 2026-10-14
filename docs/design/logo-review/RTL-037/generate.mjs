import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";

// Review-only originals. Embeds the existing licensed site font; no network/install.
const directory = new URL("./", import.meta.url);
const fontPath = new URL(
  "../../../../apps/frontend/public/fonts/inter-latin-wght-normal.woff2",
  import.meta.url,
);
const font = await readFile(fontPath);
const navy = "#242b60";
const muted = "#596176";
const line = "#dce1e7";
const fontStyle = `@font-face{font-family:RetailorInter;src:url(data:font/woff2;base64,${font.toString("base64")}) format('woff2');font-weight:100 900;font-style:normal}text{font-family:RetailorInter,Arial,sans-serif}`;
const letter = (x, y, size, fill = navy, extra = "") =>
  `<text x="${x}" y="${y}" font-size="${size}" font-weight="800" fill="${fill}" ${extra}>R</text>`;

const concepts = [
  {
    id: "a-cart",
    code: "A",
    name: "The cart",
    tag: "A store, ready to move.",
    note: "The R sits on a solid navy shopping basket.",
    tradeoff: "Clear shopping cue; more detail at very small sizes.",
    geometry: `<path d="M9 18h15l13 70h68" fill="none" stroke="${navy}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/><path d="M29 31h88l-12 45H37Z" fill="${navy}"/>${letter(52, 70, 48, "white")}<circle cx="46" cy="105" r="9" fill="${navy}"/><circle cx="96" cy="105" r="9" fill="${navy}"/>`,
  },
  {
    id: "b-wallet",
    code: "B",
    name: "The wallet",
    tag: "Compact. Confident. Ready for business.",
    note: "A white R on a navy wallet, with a contrasting clasp.",
    tradeoff: "A strong letter; can suggest a finance product.",
    geometry: `<path d="M19 38V26q0-8 9-9l65-7q9-1 9 8v26Z" fill="${navy}"/><rect x="13" y="31" width="101" height="76" rx="13" fill="${navy}"/><path d="M25 34h74" stroke="white" stroke-width="3" stroke-linecap="round"/>${letter(32, 92, 62, "white")}<path d="M96 54h20v31H96q-10 0-10-10V64q0-10 10-10Z" fill="white"/><circle cx="101" cy="70" r="4" fill="${navy}"/>`,
  },
  {
    id: "c-card",
    code: "C",
    name: "The card",
    tag: "A bold little piece of commerce.",
    note: "A navy card, white R and a simple chip make a bold badge.",
    tradeoff: "Reads as payments before it reads as a storefront.",
    geometry: `<rect x="12" y="14" width="104" height="78" rx="10" fill="white" stroke="${navy}" stroke-width="4" transform="rotate(-9 64 64)"/><rect x="9" y="30" width="110" height="79" rx="11" fill="${navy}"/><rect x="22" y="45" width="17" height="14" rx="3" fill="white"/><path d="M27 45v14m6-14v14m-11-7h17" stroke="${navy}" stroke-width="1.3"/>${letter(57, 93, 65, "white")}<path d="M23 84h14m-14 7h21" stroke="white" stroke-width="4" stroke-linecap="round"/>`,
  },
  {
    id: "d-barcode",
    code: "D",
    name: "The barcode",
    tag: "Retail, written into the mark.",
    note: "An oversized R interrupts a field of navy retail stripes.",
    tradeoff: "Most retail-specific of A–D; busier at 16px.",
    geometry: `<g fill="${navy}"><path d="M10 23h6v82h-6zm12 0h3v82h-3zm9 0h8v82h-8zm14 0h4v82h-4zm11 0h9v82h-9zm15 0h3v82h-3zm10 0h7v82h-7zm13 0h4v82h-4zm11 0h5v82h-5zm10 0h3v82h-3z"/></g>${letter(32, 96, 88, navy, 'stroke="white" stroke-width="9" paint-order="stroke fill" stroke-linejoin="round"')}<path d="M35 109h56" stroke="${navy}" stroke-width="5"/>`,
  },
  {
    id: "e-hanger",
    code: "E",
    name: "The hanger",
    tag: "For the clothes you believe in.",
    note: "A clothing hanger frames the R in the foreground.",
    tradeoff: "Strongest clothing link; avoid reading as a laundry service.",
    geometry: `<path d="M57 25c0-17 23-18 23-3 0 8-15 10-15 20" fill="none" stroke="${navy}" stroke-width="8" stroke-linecap="round"/><path d="M64 40 12 89q-8 10 7 10h91q15 0 7-10L64 40Z" fill="white" stroke="${navy}" stroke-width="7" stroke-linejoin="round"/>${letter(39, 105, 76, navy, 'stroke="white" stroke-width="5" paint-order="stroke fill"')}`,
  },
  {
    id: "f-storefront",
    code: "F",
    name: "The storefront",
    tag: "Your idea. Open for business.",
    note: "A striped awning sits above a bold R on the shop front.",
    tradeoff: "Best fit for the store-building promise; not only clothing.",
    geometry: `<rect x="18" y="61" width="92" height="55" rx="4" fill="${navy}"/><path d="M15 26h98l10 28H5Z" fill="${navy}"/><path d="M34 26h15l-3 28H25Zm44 0h15l10 28H82Z" fill="white"/>${letter(43, 111, 64, "white")}`,
  },
  {
    id: "g-receipt",
    code: "G",
    name: "The receipt",
    tag: "Every sale. The whole picture.",
    note: "A large white R lives on a simple tear-edge receipt.",
    tradeoff: "Connects shopping and owner records; can feel accounting-led.",
    geometry: `<path d="M26 9h77v109l-10-7-10 7-10-7-10 7-10-7-10 7-10-7-7 7V9Z" fill="${navy}"/><path d="M39 21h39m-39 7h26" stroke="white" stroke-width="3" stroke-linecap="round"/>${letter(37, 91, 78, "white")}<path d="M39 100h43" stroke="white" stroke-width="4" stroke-linecap="round"/>`,
  },
];

function svg(width, height, body, title) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img"><title>${title}</title><style>${fontStyle}</style>${body}</svg>`;
}
const mark = (concept, x, y, size) =>
  `<g transform="translate(${x} ${y}) scale(${size / 128})">${concept.geometry}</g>`;
const wordmark = (x, y, size = 44) =>
  `<text x="${x}" y="${y}" font-size="${size}" font-weight="800" letter-spacing="-${size * 0.045}" fill="${navy}">retailor</text>`;

function panel(concept, x, y) {
  const sizes = [16, 32, 48];
  return `<g transform="translate(${x} ${y})">
    <rect width="570" height="440" rx="22" fill="white" stroke="${line}"/>
    <text x="28" y="44" font-size="23" font-weight="750" fill="${navy}">${concept.code} / ${concept.name}</text>
    <text x="28" y="70" font-size="13" fill="${muted}">${concept.tag}</text>
    ${mark(concept, 59, 102, 138)}
    ${mark(concept, 238, 143, 58)}${wordmark(308, 188, 45)}
    <text x="28" y="277" font-size="13" fill="${navy}">${concept.note}</text>
    <text x="28" y="301" font-size="12" fill="${muted}">${concept.tradeoff}</text>
    <path d="M28 324h514" stroke="${line}"/>
    <text x="28" y="351" font-size="10" font-weight="700" letter-spacing="1.4" fill="${muted}">SMALL ICON STUDIES</text>
    ${sizes.map((size, index) => `<g transform="translate(${28 + index * 170} 368)">${mark(concept, 0, (48 - size) / 2, size)}<text x="${size + 12}" y="29" font-size="11" fill="${muted}">${size}px</text></g>`).join("")}
  </g>`;
}

await mkdir(directory, { recursive: true });
for (const concept of concepts) {
  await writeFile(
    new URL(`${concept.id}.svg`, directory),
    svg(128, 128, concept.geometry, `Retailor ${concept.name} concept`),
  );
  await writeFile(
    new URL(`${concept.id}-lockup.svg`, directory),
    svg(
      400,
      100,
      mark(concept, 6, 10, 80) + wordmark(106, 67, 60),
      `Retailor ${concept.name} wordmark`,
    ),
  );
}
const board = svg(
  1280,
  2080,
  `
  <rect width="1280" height="2080" fill="white"/>
  <text x="58" y="48" font-size="11" font-weight="700" letter-spacing="2" fill="${muted}">RETAILOR / OBJECT LOGO DIRECTIONS</text>
  <text x="58" y="107" font-size="42" font-weight="800" letter-spacing="-1.7" fill="${navy}">One R. Seven different objects.</text>
  <text x="58" y="143" font-size="16" fill="${muted}">Our Inter lettering. Navy and white only. Four revised concepts, three new ideas.</text>
  ${concepts.map((concept, index) => panel(concept, index % 2 ? 652 : 58, 186 + Math.floor(index / 2) * 464)).join("")}
  <text x="680" y="1640" font-size="24" font-weight="800" fill="${navy}">Three new lenses</text>
  <text x="680" y="1692" font-size="18" font-weight="700" fill="${navy}">E / The clothes</text>
  <text x="680" y="1720" font-size="14" fill="${muted}">The hanger anchors the clothing side of Retailor.</text>
  <text x="680" y="1780" font-size="18" font-weight="700" fill="${navy}">F / Your store, ready</text>
  <text x="680" y="1808" font-size="14" fill="${muted}">The storefront expresses the product's main result.</text>
  <text x="680" y="1868" font-size="18" font-weight="700" fill="${navy}">G / The connected business</text>
  <text x="680" y="1896" font-size="14" fill="${muted}">The receipt links shopping with owner records.</text>
  <text x="680" y="1975" font-size="12" fill="${muted}">Review only. No direction selected or installed.</text>
  <text x="58" y="2053" font-size="12" fill="${muted}">Concept review · Nothing applied to the website or favicon · 14 October 2026</text>
`,
  "Seven navy and white Retailor object-logo concepts for owner review",
);
await writeFile(new URL("comparison.svg", directory), board);
const updatedFour = svg(
  1280,
  1150,
  `
  <rect width="1280" height="1150" fill="white"/>
  <text x="58" y="48" font-size="11" font-weight="700" letter-spacing="2" fill="${muted}">RETAILOR / REVISED OBJECT MARKS</text>
  <text x="58" y="107" font-size="42" font-weight="800" letter-spacing="-1.7" fill="${navy}">The same four. Navy and white.</text>
  <text x="58" y="143" font-size="16" fill="${muted}">All marks, wordmarks and small-icon studies updated. No green.</text>
  ${concepts
    .slice(0, 4)
    .map((concept, index) =>
      panel(concept, index % 2 ? 652 : 58, 186 + Math.floor(index / 2) * 464),
    )
    .join("")}
  <text x="58" y="1123" font-size="12" fill="${muted}">Concept review · Nothing installed · 14 October 2026</text>
`,
  "Four revised navy and white Retailor logo concepts",
);
await writeFile(new URL("updated-four.svg", directory), updatedFour);
const newThree = svg(
  1500,
  720,
  `
  <rect width="1500" height="720" fill="white"/>
  <text x="48" y="47" font-size="11" font-weight="700" letter-spacing="2" fill="${muted}">RETAILOR / THREE NEW OBJECT DIRECTIONS</text>
  <text x="48" y="107" font-size="42" font-weight="800" letter-spacing="-1.7" fill="${navy}">The clothes. The store. The whole business.</text>
  <text x="48" y="143" font-size="16" fill="${muted}">Original R marks in Retailor Inter. Navy and white only.</text>
  ${concepts
    .slice(4)
    .map(
      (concept, index) => `<g transform="translate(${48 + index * 488} 180)">
    <rect width="430" height="470" rx="22" fill="white" stroke="${line}"/>
    <text x="25" y="42" font-size="23" font-weight="750" fill="${navy}">${concept.code} / ${concept.name}</text>
    <text x="25" y="68" font-size="12" fill="${muted}">${concept.tag}</text>
    ${mark(concept, 147, 87, 136)}
    ${mark(concept, 90, 243, 44)}${wordmark(148, 278, 40)}
    <text x="25" y="326" font-size="11.5" fill="${navy}">${concept.note}</text>
    <text x="25" y="349" font-size="10.5" fill="${muted}">${concept.tradeoff}</text>
    <path d="M25 373h380" stroke="${line}"/>
    <text x="25" y="396" font-size="9" font-weight="700" letter-spacing="1.2" fill="${muted}">SMALL ICON STUDIES</text>
    ${[16, 32, 48].map((size, i) => `${mark(concept, 25 + i * 130, 410 + (48 - size) / 2, size)}<text x="${25 + i * 130 + size + 9}" y="440" font-size="10" fill="${muted}">${size}px</text>`).join("")}
  </g>`,
    )
    .join("")}
  <text x="48" y="693" font-size="12" fill="${muted}">Review only · Research and rationale in LOGO-RESEARCH.md · Nothing installed</text>
`,
  "Three new navy and white Retailor logos: hanger, storefront and receipt",
);
await writeFile(new URL("new-three.svg", directory), newThree);
await writeFile(
  new URL("review.html", directory),
  `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Retailor object logo review</title><style>html,body{margin:0;background:white}body>svg{display:block;width:100%;max-width:1280px;height:auto;margin:auto}</style>${board}</html>`,
);
await writeFile(
  new URL("provenance.json", directory),
  JSON.stringify(
    {
      ticket: "RTL-037",
      purpose: "Owner review only; not approved application branding",
      geometry:
        "Seven original locally authored SVG object silhouettes. No Shopify paths/bag/lettering copied.",
      font: {
        file: "apps/frontend/public/fonts/inter-latin-wght-normal.woff2",
        weight: 800,
        sha256: createHash("sha256").update(font).digest("hex"),
        license:
          "SIL Open Font License 1.1; apps/frontend/public/fonts/inter-OFL.txt",
        provenance: "apps/frontend/public/fonts/provenance.json",
        delivery:
          "Unmodified local WOFF2 embedded in SVG review masters; editable text, not outlined paths",
      },
      colors: { navy, white: "#ffffff" },
      concepts: concepts.map(({ id, name, tradeoff }) => ({
        id,
        name,
        tradeoff,
      })),
    },
    null,
    2,
  ) + "\n",
);
process.stdout.write(
  "Generated seven navy/white SVG marks/lockups and three review boards. Rendering and visual inspection required.\n",
);
