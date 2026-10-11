import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { resolve, basename } from "node:path";
import { inspectRaster } from "../packages/contracts/dist/raster.js";
import { SampleManifestSchema } from "../packages/contracts/dist/photos.js";

// Offline encoding only. Never calls a generator/provider or writes guest data.
const require = createRequire(resolve("apps/backend/package.json"));
const sharp = require("sharp");
const recordsPath = process.argv[2];
if (!recordsPath)
  throw new Error("Pass the reviewed local generation records.");
const records = JSON.parse(await readFile(recordsPath, "utf8"));
if (
  !Array.isArray(records) ||
  records.length !== 15 ||
  new Set(records.map((record) => record.id)).size !== 15
)
  throw new Error("Exactly fifteen independent records are required.");
const target = resolve("apps/frontend/public/sample/forme");
await mkdir(target, { recursive: true });
await mkdir("docs/research", { recursive: true });
const assets = [],
  provenance = [];
for (const record of records.sort((a, b) => a.id.localeCompare(b.id))) {
  if (
    !/^F(?:0[1-9]|1[0-5])$/u.test(record.id) ||
    typeof record.prompt !== "string" ||
    typeof record.review !== "string"
  )
    throw new Error("Invalid reviewed source record.");
  const original = await readFile(record.path);
  const header = inspectRaster(original);
  const { data, info } = await sharp(original, {
    limitInputPixels: 24_000_000,
    failOn: "warning",
  })
    .autoOrient()
    .resize({
      width: 1600,
      height: 1600,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 86, effort: 5 })
    .toBuffer({ resolveWithObject: true });
  const file = `${record.id}.webp`;
  await writeFile(resolve(target, file), data);
  const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
  assets.push({
    id: record.id,
    path: `/sample/forme/${file}`,
    image: {
      id: record.id,
      hash: digest(data),
      mime: "image/webp",
      width: info.width,
      height: info.height,
      bytes: data.length,
    },
    role: "primary",
    origin: "generated_demo",
  });
  provenance.push({
    id: record.id,
    file,
    sourceRecord: basename(record.path),
    sourceHash: digest(original),
    sourceBytes: original.length,
    sourceWidth: header.width,
    sourceHeight: header.height,
    outputHash: digest(data),
    outputBytes: data.length,
    prompt: record.prompt,
    review: record.review,
    origin: "Codex built-in image_gen; original offline generation",
    generatedDate: "2026-10-11",
    usageBasis:
      "Original generated assets requested for this fictional clothing demo; no third-party merchant imagery reused.",
    encoding: `Sharp ${sharp.versions.sharp}; auto-orient, fit inside 1600px without enlargement, metadata stripped, WebP quality 86 effort 5`,
  });
}
const manifest = SampleManifestSchema.parse({ version: 1, assets });
await writeFile(
  resolve(target, "manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
);
await writeFile(
  "docs/research/FORME-GENERATION.json",
  `${JSON.stringify(provenance, null, 2)}\n`,
);
console.log(
  JSON.stringify({
    assets: assets.length,
    shippedBytes: assets.reduce((sum, asset) => sum + asset.image.bytes, 0),
    sourceBytes: provenance.reduce((sum, asset) => sum + asset.sourceBytes, 0),
    maximumShippedBytes: Math.max(...assets.map((asset) => asset.image.bytes)),
  }),
);
