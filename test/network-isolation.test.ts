import { it, expect } from "vitest";
import http from "node:http";
import https from "node:https";
import net from "node:net";
import tls from "node:tls";
it.each([1, 2])("retains external network denial after mock resets: %i", () => {
  expect(() => http.get("http://external.invalid")).toThrow();
  expect(() => https.get("https://external.invalid")).toThrow();
  expect(() => https.request("https://external.invalid")).toThrow();
  expect(() => fetch("https://external.invalid")).toThrow();
  expect(() => net.connect({ host: "external.invalid", port: 80 })).toThrow();
  expect(() => tls.connect({ host: "external.invalid", port: 443 })).toThrow();
  expect(process.env.FAKE_MODE).toBe("true");
  expect(process.env.PAID_DEMO_ENABLED).toBe("false");
  expect(process.env.OPENAI_API_KEY).toBe("");
});
