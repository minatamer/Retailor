import { expect, it } from "vitest";
import express from "express";
import request from "supertest";
import type { Response } from "express";
import { ingress } from "./ingress.js";

it("rejects wrong media, compression and declared excess before body parsing", async () => {
  const app = express();
  let parsed = 0;
  app.use((_req, res, next) => {
    res.locals.requestId = "req_test";
    next();
  });
  app.use(ingress());
  app.use((_req, _res, next) => {
    parsed++;
    next();
  });
  app.post("/v1/admission", (_req, res) => res.json({ ok: true }));
  expect(
    (
      await request(app)
        .post("/v1/admission")
        .set("Content-Type", "text/plain")
        .send("{}")
    ).status,
  ).toBe(415);
  expect(
    (
      await request(app)
        .post("/v1/admission")
        .set("Content-Type", "application/json")
        .set("Content-Encoding", "gzip")
        .send("{}")
    ).status,
  ).toBe(415);
  expect(
    (
      await request(app)
        .post("/v1/admission")
        .set("Content-Type", "application/json")
        .set("Content-Length", "70000")
        .send("{}")
    ).status,
  ).toBe(413);
  expect(parsed).toBe(0);
});

it("caps active body handlers while health remains usable and releases each lease once", async () => {
  const app = express(),
    held: Response[] = [];
  let ready!: () => void;
  const allHeld = new Promise<void>((resolve) => {
    ready = resolve;
  });
  app.use((_req, res, next) => {
    res.locals.requestId = "req_test";
    next();
  });
  app.use(ingress());
  app.get("/v1/health", (_req, res) => res.json({ alive: true }));
  app.post("/v1/admission", (_req, res) => {
    held.push(res);
    if (held.length === 4) ready();
  });
  const running = Array.from({ length: 4 }, () =>
    request(app)
      .post("/v1/admission")
      .set("Content-Type", "application/json")
      .send({})
      .then((result) => result),
  );
  await allHeld;
  try {
    expect(
      (
        await request(app)
          .post("/v1/admission")
          .set("Content-Type", "application/json")
          .send({})
      ).status,
    ).toBe(429);
    expect((await request(app).get("/v1/health")).status).toBe(200);
  } finally {
    held.forEach((res) => res.json({ ok: true }));
    await Promise.all(running);
  }
  app.post("/v1/brand/logos", (_req, res) => res.json({ ok: true }));
  expect(
    (
      await request(app)
        .post("/v1/brand/logos")
        .set("Content-Type", "application/json")
        .send({})
    ).status,
  ).toBe(200);
});

it("bounds content-free ingress arrivals and expires the window", async () => {
  let now = 100000;
  const app = express();
  app.use((_req, res, next) => {
    res.locals.requestId = "req_test";
    next();
  });
  app.use(ingress(() => now));
  app.post("/v1/admission", (_req, res) => res.json({ ok: true }));
  for (let index = 0; index < 64; index++)
    expect(
      (
        await request(app)
          .post("/v1/admission")
          .set("Content-Type", "application/json")
          .send({})
      ).status,
    ).toBe(200);
  expect(
    (
      await request(app)
        .post("/v1/admission")
        .set("Content-Type", "application/json")
        .send({})
    ).status,
  ).toBe(429);
  now += 60000;
  expect(
    (
      await request(app)
        .post("/v1/admission")
        .set("Content-Type", "application/json")
        .send({})
    ).status,
  ).toBe(200);
});
