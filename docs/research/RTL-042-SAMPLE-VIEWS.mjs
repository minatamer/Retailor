import { createRequire } from "node:module";
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(new URL("../../apps/backend/package.json", import.meta.url));
const sharp = require("sharp");
const recordPath = new URL("./RTL-042-SAMPLE-VIEWS.json", import.meta.url);
const record = JSON.parse(await readFile(recordPath, "utf8"));
const directory = new URL("../../apps/frontend/public/sample/forme/", import.meta.url);
const manifestPath = new URL("manifest.json", directory);
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
manifest.assets = manifest.assets.filter((asset) => Number(asset.id.slice(1)) <= 15);
if (manifest.assets.length !== 15 || !process.argv[2]) throw new Error("Supply generated-image directory for the15 retained primary assets.");
for (const asset of record.assets) {
  const input = await readFile(resolve(process.argv[2], asset.generatedFile));
  const output = await sharp(input).rotate().resize({ width:1600, height:1600, fit:"inside", withoutEnlargement:true }).webp({ quality:86, effort:5 }).toBuffer();
  const meta = await sharp(output).metadata();
  const hash = createHash("sha256").update(output).digest("hex");
  await writeFile(new URL(asset.file, directory), output);
  manifest.assets.push({ id:asset.id, path:`/sample/forme/${asset.file}`, image:{id:asset.id,hash,mime:"image/webp",width:meta.width,height:meta.height,bytes:output.length},role:"alternate",relatedTo:asset.source,origin:"generated_demo" });
  asset.output = {path:`apps/frontend/public/sample/forme/${asset.file}`,hash,bytes:output.length,width:meta.width,height:meta.height};
  asset.sourceHash = createHash("sha256").update(input).digest("hex");
}
await writeFile(manifestPath, JSON.stringify(manifest,null,2)+"\n");
await writeFile(recordPath, JSON.stringify(record,null,2)+"\n");
process.stdout.write(`Encoded3 alternate views;18 sample photos saved at ${fileURLToPath(directory)}.\n`);
