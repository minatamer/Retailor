import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { developmentEnvironment } from "./development-mode.mjs";
const require = createRequire(resolve("package.json"));
const child = spawn(
  process.execPath,
  [require.resolve("tsx/cli"), "watch", "src/server.ts"],
  { stdio: "inherit", env: developmentEnvironment(process.env) },
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.once(signal, () => child.kill(signal));
child.once("exit", (code) => {
  process.exitCode = code ?? 1;
});
