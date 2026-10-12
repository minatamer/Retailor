import { createHash } from "node:crypto";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import sharp from "sharp";
import {
  SampleManifestSchema,
  type RecognitionManifest,
} from "@retailor/contracts/photos";
import { prepareProviderImages } from "../src/catalogue/sanitize.js";
import { ImageCapacity } from "../src/catalogue/image-capacity.js";
process.env.FAKE_MODE = "true";
process.env.PAID_DEMO_ENABLED = "false";
globalThis.fetch = async () => {
  throw new Error("Benchmark prohibits networking.");
};
const root = new URL("../../../", import.meta.url);
const sampleRoot = new URL("apps/frontend/public/sample/forme/", root);
const sample = SampleManifestSchema.parse(
  JSON.parse(await readFile(new URL("manifest.json", sampleRoot), "utf8")),
);
const sampleFiles = new Map<string, Uint8Array>();
for (const asset of sample.assets)
  sampleFiles.set(
    asset.id,
    await readFile(new URL(`${asset.id}.webp`, sampleRoot)),
  );
const raw = Buffer.alloc(1600 * 1600 * 3);
let state = 0x12345678;
for (let index = 0; index < raw.length; index++) {
  state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
  raw[index] = state >>> 24;
}
const noiseFiles = new Map<string, Uint8Array>(),
  noiseManifest: RecognitionManifest = [];
for (let index = 0; index < 24; index++) {
  raw.fill(index * 10, 0, 1600 * 3);
  const bytes = await sharp(raw, {
      raw: { width: 1600, height: 1600, channels: 3 },
    })
      .jpeg({ quality: 35 })
      .toBuffer(),
    id = `noise_${index}`;
  noiseFiles.set(id, bytes);
  noiseManifest.push({
    id,
    mime: "image/jpeg",
    width: 1600,
    height: 1600,
    bytes: bytes.length,
    hash: createHash("sha256").update(bytes).digest("hex"),
  });
}
const cases = [
  {
    name: "fifteen-public-assets",
    manifest: sample.assets.map((asset) => asset.image),
    files: sampleFiles,
  },
  {
    name: "twenty-four-synthetic-noise",
    manifest: noiseManifest,
    files: noiseFiles,
  },
];
const trials = [];
for (const input of cases) {
  const fingerprints = new Set<string>();
  for (const slots of [1, 2, 2, 1]) {
    const capacity = new ImageCapacity(slots);
    let maxRss = process.memoryUsage.rss(),
      maxActive = 0,
      maxWaiting = 0;
    const observe = () => {
      const counts = capacity.counters();
      maxRss = Math.max(maxRss, process.memoryUsage.rss());
      maxActive = Math.max(maxActive, counts.active);
      maxWaiting = Math.max(maxWaiting, counts.waiting);
    };
    const interval = setInterval(observe, 20),
      started = performance.now();
    let result: Map<string, Uint8Array>;
    try {
      result = await prepareProviderImages(
        input.manifest,
        input.files,
        new AbortController().signal,
        { capacity },
      );
    } finally {
      clearInterval(interval);
      observe();
    }
    if (
      JSON.stringify([...result.keys()]) !==
      JSON.stringify(input.manifest.map((image) => image.id))
    )
      throw new Error("Benchmark output order mismatch.");
    const fingerprint = createHash("sha256");
    for (const bytes of result.values()) fingerprint.update(bytes);
    const outputHash = fingerprint.digest("hex");
    fingerprints.add(outputHash);
    const trial = {
      case: input.name,
      slots,
      milliseconds: Math.round(performance.now() - started),
      sampledMaxRss: maxRss,
      sampledMaxActive: maxActive,
      sampledMaxWaiting: maxWaiting,
      submittedBytes: [...input.files.values()].reduce(
        (sum, bytes) => sum + bytes.length,
        0,
      ),
      providerBytes: [...result.values()].reduce(
        (sum, bytes) => sum + bytes.length,
        0,
      ),
      outputHash,
      remaining: capacity.counters(),
    };
    trials.push(trial);
    process.stdout.write(`${JSON.stringify(trial)}\n`);
    result.clear();
  }
  if (fingerprints.size !== 1)
    throw new Error(
      "Identical source policy changed normalized bytes across trials.",
    );
}
const report = {
  recordedAt: new Date().toISOString(),
  platform: process.platform,
  node: process.version,
  conditions:
    "Same process and bytes; slot order 1,2,2,1; fresh terminable workers per image; 20-ms sampled process RSS, not guaranteed peak; other local apps remain running; no inference/network",
  trials,
};
const destination = new URL(
  "docs/validation/evidence/RTL-006-concurrency/worker-comparison.json",
  root,
);
await mkdir(new URL("./", destination), { recursive: true });
await writeFile(destination, JSON.stringify(report, null, 2) + "\n");
