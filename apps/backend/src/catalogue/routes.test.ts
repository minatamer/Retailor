import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import sharp from "sharp";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { createApp } from "../http/app.js";
import { composeRuntime } from "../runtime/compose.js";
import { parseEnvironment } from "../config/environment.js";
import { PaidAdmission } from "../security/admission.js";
import { action, observation } from "../../../../test/fixtures/recognition.js";
import { prepareProviderImages } from "./sanitize.js";
import type { SanitizerPorts } from "./sanitize.js";
import { ImageCapacity, IMAGE_WORKER_LIMITS } from "./image-capacity.js";
import { inspectRaster } from "@retailor/contracts/raster";
import { SampleManifestSchema } from "@retailor/contracts/photos";
import type { CatalogueAction } from "@retailor/contracts/recognition";
import { Readable } from "node:stream";
import type { Request } from "express";
import { receiveCatalogue } from "./multipart.js";
const origin = "http://127.0.0.1:4310";
async function image(id = "source", colour = "#123456") {
  const bytes = await sharp({
    create: { width: 24, height: 32, channels: 3, background: colour },
  })
    .jpeg()
    .toBuffer();
  const descriptor = {
    id,
    bytes: bytes.length,
    width: 24,
    height: 32,
    mime: "image/jpeg" as const,
    hash: createHash("sha256").update(bytes).digest("hex"),
  };
  return { bytes, photo: { id, source: descriptor, derivative: descriptor } };
}
function harness(sanitizer?: SanitizerPorts) {
  const gate = new PaidAdmission({
    secret: "s".repeat(32),
    budgetMicroUsd: 10_000_000,
    challenge: { verify: async (proof) => proof === "valid-proof" },
  });
  const provider = {
    interpret: vi.fn(
      async (
        value: CatalogueAction,
        images: ReadonlyMap<string, Uint8Array>,
        signal: AbortSignal,
      ) => {
        signal.throwIfAborted();
        expect(images.size).toBe(value.photos.length);
        for (const bytes of images.values())
          expect(inspectRaster(bytes).mime).toBe("image/webp");
        return observation(value.photos[0]!.id);
      },
    ),
  };
  const base = composeRuntime(parseEnvironment({}), () => "request_test");
  const app = createApp({
    ...base,
    recognition: {
      admission: gate,
      provider,
      ...(sanitizer ? { sanitizer } : {}),
    },
  });
  return { app, gate, provider };
}
async function admit(
  app: ReturnType<typeof createApp>,
  value: CatalogueAction,
) {
  const result = await request(app)
    .post("/v1/admission")
    .set("Origin", origin)
    .send({ action: value, challengeProof: "valid-proof" });
  expect(result.status).toBe(200);
  return {
    grant: result.body.grant as string,
    cookie: String(result.headers["set-cookie"]?.[0]).split(";")[0]!,
  };
}
describe("bounded admission and actual multipart recognition", () => {
  it("reports native capacity pressure safely before provider dispatch and releases its unspent reservation", async () => {
    const capacity = new ImageCapacity(),
      h = harness({ capacity, rss: () => IMAGE_WORKER_LIMITS.rssBytes }),
      input = await image();
    const value = { ...action(), photos: [input.photo] },
      approved = await admit(h.app, value);
    const result = await request(h.app)
      .post("/v1/catalogue/interpret")
      .set("Origin", origin)
      .set("Cookie", approved.cookie)
      .field(
        "manifest",
        JSON.stringify({ action: value, grant: approved.grant }),
      )
      .attach(input.photo.id, input.bytes, {
        filename: "preview",
        contentType: "image/jpeg",
      });
    expect(result.status).toBe(429);
    expect(result.body.error.code).toBe("BUSY");
    expect(h.provider.interpret).not.toHaveBeenCalled();
    expect(capacity.counters()).toEqual({ active: 0, waiting: 0 });
    expect(h.gate.counters()).toEqual({ active: 0, reservedMicroUsd: 0 });
  });
  it("does not release admission or dispatch the provider while a failed sibling still awaits native termination", async () => {
    const capacity = new ImageCapacity(),
      jobs: { signal: AbortSignal; reject(error: Error): void }[] = [];
    const h = harness({
      capacity,
      rss: () => 0,
      decode: (_bytes, _width, _height, signal) =>
        new Promise((_resolve, reject) => {
          jobs.push({ signal, reject });
        }),
    });
    const inputs = [await image("one"), await image("two", "#234567")],
      value = { ...action(), photos: inputs.map((input) => input.photo) },
      approved = await admit(h.app, value);
    const submit = request(h.app)
      .post("/v1/catalogue/interpret")
      .set("Origin", origin)
      .set("Cookie", approved.cookie)
      .field(
        "manifest",
        JSON.stringify({ action: value, grant: approved.grant }),
      );
    for (const input of inputs)
      submit.attach(input.photo.id, input.bytes, {
        filename: "preview",
        contentType: "image/jpeg",
      });
    const pending = submit.then((result) => result);
    await vi.waitFor(() => expect(jobs).toHaveLength(2));
    jobs[1]!.reject(new Error("invalid pixels"));
    await vi.waitFor(() => expect(jobs[0]!.signal.aborted).toBe(true));
    expect(capacity.counters()).toEqual({ active: 1, waiting: 0 });
    expect(h.gate.counters()).toEqual({ active: 1, reservedMicroUsd: 1000000 });
    expect(h.provider.interpret).not.toHaveBeenCalled();
    jobs[0]!.reject(new Error("termination finished"));
    expect((await pending).status).toBe(400);
    expect(capacity.counters()).toEqual({ active: 0, waiting: 0 });
    expect(h.gate.counters()).toEqual({ active: 0, reservedMicroUsd: 0 });
    expect(h.provider.interpret).not.toHaveBeenCalled();
  });
  it("accepts the exact 24-file plus one-manifest multipart boundary", async () => {
    const h = harness(),
      batch = await Promise.all(
        Array.from({ length: 24 }, (_, i) =>
          image(`image${i}`, `#${(0x123400 + i * 100).toString(16)}`),
        ),
      );
    h.provider.interpret.mockImplementation(async (value) => ({
      garments: [],
      dispositions: value.photos.map((photo) => ({
        sourceId: photo.id,
        kind: "rejected",
        garmentIndexes: [],
        reason: "Synthetic non-clothing raster.",
      })),
    }));
    const value = { ...action(), photos: batch.map((input) => input.photo) },
      approval = await admit(h.app, value);
    const submit = request(h.app)
      .post("/v1/catalogue/interpret")
      .set("Origin", origin)
      .set("Cookie", approval.cookie)
      .field(
        "manifest",
        JSON.stringify({ action: value, grant: approval.grant }),
      );
    for (const input of batch)
      submit.attach(input.photo.id, input.bytes, {
        filename: "preview",
        contentType: "image/jpeg",
      });
    const result = await submit;
    expect(result.status).toBe(200);
    expect(result.body.draft.dispositions).toHaveLength(24);
    expect(h.provider.interpret).toHaveBeenCalledTimes(1);
    const extra = harness(),
      extraGrant = await admit(extra.app, value);
    const invalid = request(extra.app)
      .post("/v1/catalogue/interpret")
      .set("Origin", origin)
      .set("Cookie", extraGrant.cookie)
      .field(
        "manifest",
        JSON.stringify({ action: value, grant: extraGrant.grant }),
      );
    for (const input of batch)
      invalid.attach(input.photo.id, input.bytes, {
        filename: "preview",
        contentType: "image/jpeg",
      });
    invalid.attach("extra", batch[0]!.bytes, {
      filename: "preview",
      contentType: "image/jpeg",
    });
    expect((await invalid).status).toBe(413);
    expect(extra.provider.interpret).not.toHaveBeenCalled();
  }, 30_000);
  it("counts a chunked stream with no Content-Length before allocating file buffers", async () => {
    const h = harness();
    const incoming = Readable.from(
      (function* () {
        for (let i = 0; i < 609; i++) yield Buffer.alloc(32768, 120);
      })(),
    );
    Object.assign(incoming, {
      headers: { "content-type": "multipart/form-data; boundary=bounded" },
    });
    await expect(
      receiveCatalogue(
        incoming as unknown as Request,
        h.gate,
        "identity",
        new AbortController().signal,
      ),
    ).rejects.toMatchObject({ code: "TOO_LARGE", status: 413 });
    incoming.destroy();
    expect(h.gate.counters()).toEqual({ active: 0, reservedMicroUsd: 0 });
  });
  it("caps streamed transport independently of declared length and limits each file", async () => {
    const h = harness(),
      input = await image(),
      value = { ...action(), photos: [input.photo] },
      grant = await admit(h.app, value);
    const giant = await request(h.app)
      .post("/v1/catalogue/interpret")
      .set("Origin", origin)
      .set("Cookie", grant.cookie)
      .set("Content-Type", "multipart/form-data; boundary=bounded")
      .send(Buffer.alloc(19 * 1024 * 1024 + 1, 120));
    expect(giant.status).toBe(413);
    const declared = {
        ...action("other"),
        photos: [
          {
            ...input.photo,
            derivative: { ...input.photo.derivative, bytes: 768 * 1024 },
          },
        ],
      },
      approved = await admit(h.app, declared);
    const largeFile = await request(h.app)
      .post("/v1/catalogue/interpret")
      .set("Origin", origin)
      .set("Cookie", approved.cookie)
      .field(
        "manifest",
        JSON.stringify({ action: declared, grant: approved.grant }),
      )
      .attach("source", Buffer.alloc(768 * 1024 + 1), {
        filename: "x",
        contentType: "image/jpeg",
      });
    expect(largeFile.status).toBe(413);
    expect(h.provider.interpret).not.toHaveBeenCalled();
    expect(h.gate.counters().active).toBe(0);
  });
  it("keeps the workspace lease during an in-flight model call and cancellation releases it", async () => {
    const h = harness(),
      input = await image(),
      value = { ...action(), photos: [input.photo] };
    const first = await admit(h.app, value),
      secondAction = { ...value, operationId: "second" };
    const safety = h.gate.safety(
      first.cookie.slice("retailor_safety=".length),
    ).identity;
    const second = await h.gate.admit(
      secondAction,
      "valid-proof",
      safety,
      new AbortController().signal,
    );
    let started!: () => void;
    const dispatched = new Promise<void>((resolve) => {
      started = resolve;
    });
    h.provider.interpret.mockImplementation(async (_value, _images, signal) => {
      started();
      return await new Promise<ReturnType<typeof observation>>(
        (_resolve, reject) =>
          signal.addEventListener(
            "abort",
            () => reject(new Error("cancelled")),
            { once: true },
          ),
      );
    });
    const ongoing = request(h.app)
      .post("/v1/catalogue/interpret")
      .set("Origin", origin)
      .set("Cookie", first.cookie)
      .field("manifest", JSON.stringify({ action: value, grant: first.grant }))
      .attach("source", input.bytes, {
        filename: "x",
        contentType: "image/jpeg",
      });
    const completion = ongoing.then(
      () => undefined,
      () => undefined,
    );
    await dispatched;
    expect(h.gate.counters().active).toBe(1);
    const busy = await request(h.app)
      .post("/v1/catalogue/interpret")
      .set("Origin", origin)
      .set("Cookie", first.cookie)
      .field(
        "manifest",
        JSON.stringify({ action: secondAction, grant: second.grant }),
      )
      .attach("source", input.bytes, {
        filename: "x",
        contentType: "image/jpeg",
      });
    expect(busy.status).toBe(429);
    expect(h.provider.interpret).toHaveBeenCalledTimes(1);
    ongoing.abort();
    await completion;
    await vi.waitFor(() =>
      expect(h.gate.counters()).toEqual({
        active: 0,
        reservedMicroUsd: 1_000_000,
      }),
    );
  });
  it("keeps absent-key fake/public capability paths closed without reading uploads", async () => {
    const app = createApp(
      composeRuntime(parseEnvironment({}), () => "request_test"),
    );
    for (const path of ["admission", "catalogue/interpret"]) {
      const result = await request(app)
        .post(`/v1/${path}`)
        .set("Origin", origin)
        .send({});
      expect(result.status).toBe(503);
      expect(result.body.error.code).toBe("UNAVAILABLE");
    }
  });
  it("executes one actual inspected image call and rejects grant replay", async () => {
    const h = harness(),
      input = await image(),
      value = { ...action(), photos: [input.photo] },
      grant = await admit(h.app, value);
    const submit = () =>
      request(h.app)
        .post("/v1/catalogue/interpret")
        .set("Origin", origin)
        .set("Cookie", grant.cookie)
        .field(
          "manifest",
          JSON.stringify({ action: value, grant: grant.grant }),
        )
        .attach("source", input.bytes, {
          filename: "not-authority.jpg",
          contentType: "image/jpeg",
        });
    const result = await submit();
    expect(result.status).toBe(200);
    expect(result.body.draft.photos).toEqual([input.photo]);
    expect(h.provider.interpret).toHaveBeenCalledTimes(1);
    expect(h.gate.counters().active).toBe(0);
    expect((await submit()).status).toBe(403);
    expect(h.provider.interpret).toHaveBeenCalledTimes(1);
  });
  it("rejects incorrect hashes, unknown parts, file-first ordering and missing coverage before dispatch", async () => {
    for (const fault of ["hash", "unknown", "file-first", "missing"]) {
      const h = harness(),
        input = await image(),
        value = { ...action(), photos: [input.photo] };
      if (fault === "hash")
        value.photos[0] = {
          ...input.photo,
          derivative: { ...input.photo.derivative, hash: "b".repeat(64) },
        };
      const grant = await admit(h.app, value),
        submit = request(h.app)
          .post("/v1/catalogue/interpret")
          .set("Origin", origin)
          .set("Cookie", grant.cookie);
      if (fault === "file-first")
        submit.attach("source", input.bytes, {
          filename: "x",
          contentType: "image/jpeg",
        });
      submit.field(
        "manifest",
        JSON.stringify({ action: value, grant: grant.grant }),
      );
      if (fault !== "file-first" && fault !== "missing")
        submit.attach(fault === "unknown" ? "foreign" : "source", input.bytes, {
          filename: "x",
          contentType: "image/jpeg",
        });
      const result = await submit;
      expect(result.status).toBe(400);
      expect(h.provider.interpret).not.toHaveBeenCalled();
      expect(h.gate.counters()).toEqual({ active: 0, reservedMicroUsd: 0 });
    }
  });
  it("rejects tampered action, proof and oversized metadata without provider work", async () => {
    const h = harness();
    const failed = await request(h.app)
      .post("/v1/admission")
      .set("Origin", origin)
      .send({ action: action(), challengeProof: "bad" });
    expect(failed.status).toBe(403);
    expect(
      (
        await request(h.app)
          .post("/v1/admission")
          .set("Origin", origin)
          .send({ extra: "x".repeat(65536) })
      ).status,
    ).toBe(413);
    const input = await image(),
      value = { ...action("other"), photos: [input.photo] },
      grant = await admit(h.app, value);
    const result = await request(h.app)
      .post("/v1/catalogue/interpret")
      .set("Origin", origin)
      .set("Cookie", grant.cookie)
      .field(
        "manifest",
        JSON.stringify({
          action: { ...value, inputRevision: 1 },
          grant: grant.grant,
        }),
      )
      .attach("source", input.bytes, {
        filename: "x",
        contentType: "image/jpeg",
      });
    expect(result.status).toBe(403);
    expect(h.provider.interpret).not.toHaveBeenCalled();
  });
  it("retains conservative dispatched reservation when provider result is unknown or invalid", async () => {
    const h = harness();
    h.provider.interpret.mockRejectedValue(
      new Error("PRIVATE_PROVIDER_PAYLOAD"),
    );
    const input = await image(),
      value = { ...action(), photos: [input.photo] },
      grant = await admit(h.app, value);
    const result = await request(h.app)
      .post("/v1/catalogue/interpret")
      .set("Origin", origin)
      .set("Cookie", grant.cookie)
      .field("manifest", JSON.stringify({ action: value, grant: grant.grant }))
      .attach("source", input.bytes, {
        filename: "x",
        contentType: "image/jpeg",
      });
    expect(result.status).toBe(500);
    expect(JSON.stringify(result.body)).not.toContain("PRIVATE");
    expect(h.gate.counters()).toEqual({
      active: 0,
      reservedMicroUsd: 1_000_000,
    });
  });
  it("sanitizes the real 15-photo sample and a distinct 24-image batch within the envelope", async () => {
    const root = new URL(
      "../../../../apps/frontend/public/sample/forme/",
      import.meta.url,
    );
    const sample = SampleManifestSchema.parse(
      JSON.parse(await readFile(new URL("manifest.json", root), "utf8")),
    );
    const files = new Map<string, Uint8Array>();
    for (const asset of sample.assets)
      files.set(asset.id, await readFile(new URL(`${asset.id}.webp`, root)));
    const prepared = await prepareProviderImages(
      sample.assets.map((asset) => asset.image),
      files,
      new AbortController().signal,
    );
    expect(prepared.size).toBe(15);
    for (const bytes of prepared.values())
      expect(inspectRaster(bytes).privateMetadata).toBe(false);
    const batch = await Promise.all(
      Array.from({ length: 24 }, (_, i) =>
        image(`image${i}`, `#${(0x123400 + i * 100).toString(16)}`),
      ),
    );
    const images = await prepareProviderImages(
      batch.map((input) => input.photo.derivative),
      new Map(batch.map((input) => [input.photo.id, input.bytes])),
      new AbortController().signal,
    );
    expect(images.size).toBe(24);
    expect(
      [...images.values()].reduce((sum, bytes) => sum + bytes.length, 0),
    ).toBeLessThan(18 * 1024 * 1024);
    await expect(
      prepareProviderImages(
        [batch[0]!.photo.derivative],
        new Map([[batch[0]!.photo.id, batch[0]!.bytes]]),
        AbortSignal.abort(),
      ),
    ).rejects.toThrow();
  }, 30_000);
  it("fits a near-cap 24-image raster batch through sanitization with bounded provider bytes", async () => {
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
    const started = performance.now(),
      output = await prepareProviderImages(
        manifest,
        files,
        new AbortController().signal,
      );
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
