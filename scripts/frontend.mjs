import { developmentEnvironment } from "./development-mode.mjs";
import { createServer } from "node:net";
import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { createRequire } from "node:module";
try {
  process.loadEnvFile(resolve(".env.local"));
} catch (error) {
  if (error.code !== "ENOENT")
    throw new Error("Unable to load frontend configuration", { cause: error });
}
const mode = process.argv[2];
if (!["dev", "dev-live", "start"].includes(mode))
  throw new Error("Select dev, dev-live or start");
const development = mode !== "start";
const port = Number(process.env.PORT ?? 4310);
if (!Number.isInteger(port) || port < 1024 || port > 65535)
  throw new Error("Invalid frontend port");
const runtimeEnv =
  mode === "dev" ? developmentEnvironment(process.env) : process.env;
const hostname =
  !development && runtimeEnv.APP_ENV === "production" ? "0.0.0.0" : "127.0.0.1";
const probe = createServer();
await new Promise((resolveProbe, reject) => {
  probe.once("error", () =>
    reject(
      new Error(
        `Retailor port ${port} is occupied; refusing to take over another service.`,
      ),
    ),
  );
  probe.listen(port, hostname, () => probe.close(resolveProbe));
});
const require = createRequire(resolve("package.json"));
const child = spawn(
  process.execPath,
  [
    require.resolve("next/dist/bin/next"),
    development ? "dev" : "start",
    "--hostname",
    hostname,
    "--port",
    String(port),
  ],
  {
    stdio: "inherit",
    env: { ...runtimeEnv, RETAILOR_DEV: mode === "dev" ? "true" : "false" },
  },
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.once(signal, () => child.kill(signal));
child.once("exit", (code) => {
  process.exitCode = code ?? 1;
});
