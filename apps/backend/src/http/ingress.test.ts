import { expect, it } from "vitest";
import express from "express";
import request from "supertest";
import type { Response } from "express";
import { ingress } from "./ingress.js";
import { PaidAdmission } from "../security/admission.js";

function sessions(clock: () => number = Date.now) {
  const gate = new PaidAdmission({
    secret: "ingress-test-only-secret".repeat(2),
    budgetMicroUsd: 0,
    challenge: { verify: async () => true },
    clock,
  });
  const cookie = () => `retailor_safety=${gate.safety(undefined).cookie}`;
  return {
    gate,
    cookie,
    verify: (value: string | undefined) => gate.verifiedSafety(value),
  };
}

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
  const signed = sessions();
  let ready!: () => void;
  const allHeld = new Promise<void>((resolve) => {
    ready = resolve;
  });
  app.use((_req, res, next) => {
    res.locals.requestId = "req_test";
    next();
  });
  app.use(ingress(Date.now, signed.verify));
  app.get("/v1/health", (_req, res) => res.json({ alive: true }));
  app.post("/v1/admission", (_req, res) => {
    held.push(res);
    if (held.length === 4) ready();
  });
  const running = Array.from({ length: 4 }, (_, index) =>
    request(app)
      .post("/v1/admission")
      .set("Content-Type", "application/json")
      .set("Cookie", index < 2 ? "" : signed.cookie())
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

it("bounds unknown arrivals and expires the window", async () => {
  let now = 100000;
  const app = express();
  app.use((_req, res, next) => {
    res.locals.requestId = "req_test";
    next();
  });
  app.use(ingress(() => now));
  app.post("/v1/admission", (_req, res) => res.json({ ok: true }));
  for (let index = 0; index < 16; index++)
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

it("cheap invalid media cannot consume minute allowance", async () => {
  const app = express();
  app.use((_req, res, next) => {
    res.locals.requestId = "req_test";
    next();
  });
  app.use(ingress());
  app.post("/v1/admission", (_req, res) => res.json({ ok: true }));
  for (let index = 0; index < 64; index++)
    expect(
      (
        await request(app)
          .post("/v1/admission")
          .set("Content-Type", "text/plain")
          .send("{}")
      ).status,
    ).toBe(415);
  expect((await request(app).post("/v1/admission").send({})).status).toBe(200);
});

it("malformed unknown bodies and forged cookies cannot starve issued sessions", async () => {
  let now = 100000;
  const signed = sessions(() => now),
    app = express();
  const realCookie = signed.cookie();
  app.use((_req, res, next) => {
    res.locals.requestId = "req_test";
    next();
  });
  app.use(ingress(() => now, signed.verify));
  app.use(express.json());
  app.post("/v1/admission", (_req, res) => res.json({ ok: true }));
  for (let index = 0; index < 16; index++)
    expect(
      (
        await request(app)
          .post("/v1/admission")
          .set("Cookie", `${realCookie.slice(0, -1)}x`)
          .set("Content-Type", "application/json")
          .send("{")
      ).status,
    ).toBe(400);
  expect((await request(app).post("/v1/admission").send({})).status).toBe(429);
  for (let index = 0; index < 24; index++)
    expect(
      (
        await request(app)
          .post("/v1/admission")
          .set("Cookie", realCookie)
          .send({})
      ).status,
    ).toBe(200);
  expect(
    (
      await request(app)
        .post("/v1/admission")
        .set("Cookie", realCookie)
        .send({})
    ).status,
  ).toBe(429);
  const other = signed.cookie();
  for (let index = 0; index < 24; index++)
    expect(
      (await request(app).post("/v1/admission").set("Cookie", other).send({}))
        .status,
    ).toBe(200);
  expect(
    (
      await request(app)
        .post("/v1/admission")
        .set("Cookie", signed.cookie())
        .send({})
    ).status,
  ).toBe(429);
  now += 60000;
  expect(
    (
      await request(app)
        .post("/v1/admission")
        .set("Cookie", realCookie)
        .send({})
    ).status,
  ).toBe(200);
  expect((await request(app).post("/v1/admission").send({})).status).toBe(200);
});

it("two stalled unknown bodies leave active capacity for verified sessions", async () => {
  const app = express(),
    held: Response[] = [],
    signed = sessions();
  let holding = true;
  let ready!: () => void;
  const pending = new Promise<void>((resolve) => {
    ready = resolve;
  });
  app.use((_req, res, next) => {
    res.locals.requestId = "req_test";
    next();
  });
  app.use(ingress(Date.now, signed.verify));
  app.post("/v1/admission", (req, res) => {
    if (req.headers.cookie || !holding) return void res.json({ ok: true });
    held.push(res);
    if (held.length === 2) ready();
  });
  const running = Array.from({ length: 2 }, () =>
    request(app)
      .post("/v1/admission")
      .send({})
      .then((result) => result),
  );
  await pending;
  try {
    expect((await request(app).post("/v1/admission").send({})).status).toBe(
      429,
    );
    expect(
      (
        await request(app)
          .post("/v1/admission")
          .set("Cookie", signed.cookie())
          .send({})
      ).status,
    ).toBe(200);
  } finally {
    for (const res of held) {
      res.json({ ok: true });
      res.emit("close");
    }
    await Promise.all(running);
    holding = false;
  }
  expect((await request(app).post("/v1/admission").send({})).status).toBe(200);
});

it("one issued identity cannot occupy all handlers across arrival-window expiry", async () => {
  let now = 100000,
    holding = true;
  const signed = sessions(() => now),
    app = express(),
    held: Response[] = [];
  const cookie = signed.cookie();
  let ready!: () => void;
  const pending = new Promise<void>((resolve) => {
    ready = resolve;
  });
  app.use((_req, res, next) => {
    res.locals.requestId = "req_test";
    next();
  });
  app.use(ingress(() => now, signed.verify));
  app.post("/v1/admission", (req, res) => {
    if (!holding || req.headers.cookie !== cookie)
      return void res.json({ ok: true });
    held.push(res);
    if (held.length === 2) ready();
  });
  const running = Array.from({ length: 2 }, () =>
    request(app)
      .post("/v1/admission")
      .set("Cookie", cookie)
      .send({})
      .then((result) => result),
  );
  await pending;
  try {
    now += 60000;
    expect(
      (await request(app).post("/v1/admission").set("Cookie", cookie).send({}))
        .status,
    ).toBe(429);
    expect(
      (
        await request(app)
          .post("/v1/admission")
          .set("Cookie", signed.cookie())
          .send({})
      ).status,
    ).toBe(200);
    expect((await request(app).post("/v1/admission").send({})).status).toBe(
      200,
    );
  } finally {
    holding = false;
    held.forEach((res) => {
      res.json({ ok: true });
      res.emit("close");
    });
    await Promise.all(running);
  }
  expect(
    (await request(app).post("/v1/admission").set("Cookie", cookie).send({}))
      .status,
  ).toBe(200);
});
