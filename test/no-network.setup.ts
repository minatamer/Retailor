import { beforeEach, vi } from "vitest";
import http from "node:http";
import https from "node:https";
import net from "node:net";
process.env.APP_ENV = "test";
process.env.FAKE_MODE = "true";
process.env.PAID_DEMO_ENABLED = "false";
process.env.STRIPE_API_KEY = "";
process.env.OPENAI_API_KEY = "";
process.env.TURNSTILE_SECRET_KEY = "";
process.env.GRANT_SIGNING_SECRET = "";
const original = http.request;
const originalConnect = net.Socket.prototype.connect;
function installNetworkGuard() {
  vi.spyOn(net.Socket.prototype, "connect").mockImplementation(function (
    this: net.Socket,
    ...args: Parameters<net.Socket["connect"]>
  ) {
    const first: unknown = args[0];
    const options = Array.isArray(first) ? first[0] : first;
    const host =
      typeof options === "object" && options !== null && "host" in options
        ? options.host
        : typeof args[1] === "string"
          ? args[1]
          : "localhost";
    if (!["localhost", "127.0.0.1", "::1"].includes(String(host)))
      throw new Error("External sockets are prohibited in unpaid tests");
    return originalConnect.apply(this, args);
  });
  vi.stubGlobal(
    "fetch",
    vi.fn(() => {
      throw new Error("Unexpected network is prohibited in unpaid tests");
    }),
  );
  vi.spyOn(https, "get").mockImplementation(() => {
    throw new Error("HTTPS GET is prohibited in unpaid tests");
  });
  vi.spyOn(http, "get").mockImplementation(() => {
    throw new Error(
      "HTTP GET is prohibited in unpaid tests; use injected ports",
    );
  });
  vi.spyOn(https, "request").mockImplementation(() => {
    throw new Error("HTTPS is prohibited in unpaid tests");
  });
  vi.spyOn(http, "request").mockImplementation(
    (...args: Parameters<typeof http.request>) => {
      const options = args[0];
      const hostname =
        typeof options === "string"
          ? new URL(options).hostname
          : options instanceof URL
            ? options.hostname
            : (options?.hostname ?? options?.host);
      if (!["localhost", "127.0.0.1", "::1"].includes(String(hostname)))
        throw new Error("External HTTP is prohibited in unpaid tests");
      return original(...args);
    },
  );
}
installNetworkGuard();
beforeEach(installNetworkGuard);
