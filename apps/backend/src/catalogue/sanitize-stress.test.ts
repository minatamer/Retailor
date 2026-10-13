import { createHash } from "node:crypto";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { prepareProviderImages } from "./sanitize.js";

// Native stress work gets its own isolated test worker so earlier fixture/decoder
// allocations cannot consume the production RSS budget before this case starts.
describe("native raster stress under the real memory guard", () => {
  it("fits a near-cap 24-image raster batch through sanitization with bounded provider bytes", async () => {
    const startRss = process.memoryUsage.rss();
    const raw = Buffer.alloc(1600 * 1600 * 3);
    let state = 12345;
    for (let i = 0; i < raw.length; i++) {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      raw[i] = state >>> 24;
    }
    const files = new Map<string, Uint8Array>(),
      manifest = [];
    for (let i = 0; i < 24; i++) {
      raw.fill(i * 10, 0, 1600 * 3);
      const bytes = await sharp(raw, {
        raw: { width: 1600, height: 1600, channels: 3 },
      })
        .jpeg({ quality: 35 })
        .toBuffer();
      const id = `cap${i}`;
      files.set(id, bytes);
      manifest.push({
        id,
        mime: "image/jpeg",
        width: 1600,
        height: 1600,
        bytes: bytes.length,
        hash: createHash("sha256").update(bytes).digest("hex"),
      });
    }
    const submittedBytes = [...files.values()].reduce(
      (sum, bytes) => sum + bytes.length,
      0,
    );
    expect(submittedBytes).toBeGreaterThan(17 * 1024 * 1024);
    const memory = {
      startRss,
      afterGenerationRss: process.memoryUsage.rss(),
      maxGateRss: 0,
    };
    const logMemory = () =>
      process.stdout.write(
        `RTL-025 near-cap real memory: ${JSON.stringify(memory)}\n`,
      );
    const started = performance.now(),
      output = await prepareProviderImages(
        manifest,
        files,
        new AbortController().signal,
        {
          rss: () => {
            const measured = process.memoryUsage.rss();
            memory.maxGateRss = Math.max(memory.maxGateRss, measured);
            return measured;
          },
        },
      ).catch((error: unknown) => {
        logMemory();
        throw error;
      });
    logMemory();
    const providerBytes = [...output.values()].reduce(
      (sum, bytes) => sum + bytes.length,
      0,
    );
    expect(output.size).toBe(24);
    expect(providerBytes).toBeLessThanOrEqual(18 * 1024 * 1024);
    expect(performance.now() - started).toBeLessThan(120_000);
    for (const bytes of output.values())
      expect(bytes.length).toBeLessThanOrEqual(768 * 1024);
    process.stdout.write(
      `RTL-006 local near-cap raster evidence: ${JSON.stringify({ submittedBytes, providerBytes, milliseconds: Math.round(performance.now() - started) })}\n`,
    );
  }, 90_000);
});
