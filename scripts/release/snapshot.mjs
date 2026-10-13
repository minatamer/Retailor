import { createHash } from "node:crypto";
import { readdir, readFile, lstat } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolve, relative, sep } from "node:path";

const root = fileURLToPath(new URL("../../", import.meta.url));
const fixed = new Set([
  ".dockerignore",
  "package.json",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  "tsconfig.base.json",
  "apps/frontend/Dockerfile",
  "apps/backend/Dockerfile",
  "apps/frontend/next.config.mjs",
]);
/** Positive build-input inventory. Never open env, visitor or local output files. */
export function isBuildInput(path) {
  if (fixed.has(path)) return true;
  if (
    path
      .split("/")
      .some(
        (part) =>
          part.startsWith(".") || part === "node_modules" || part === "dist",
      )
  )
    return false;
  if (/\.(?:test\.[^/]+|tsbuildinfo|log)$/u.test(path)) return false;
  if (
    /^(?:apps\/(?:frontend|backend)|packages\/(?:contracts|commerce))\/(?:package\.json|tsconfig(?:\.build)?\.json)$/u.test(
      path,
    )
  )
    return true;
  if (
    /^(?:apps\/(?:frontend|backend)|packages\/(?:contracts|commerce))\/src\/.+\.(?:ts|tsx|css|json)$/u.test(
      path,
    )
  )
    return true;
  return /^apps\/frontend\/public\/(?:sample\/forme\/(?:F(?:0[1-9]|1[0-5])\.webp|manifest\.json)|fonts\/(?:[a-z0-9-]+\.woff2|[a-z0-9-]+-OFL\.txt|provenance\.json))$/u.test(
    path,
  );
}

export async function sourceSnapshot(workspace = root) {
  const paths = [...fixed];
  async function walk(path) {
    for (const entry of await readdir(resolve(workspace, path), {
      withFileTypes: true,
    })) {
      const child = `${path}/${entry.name}`;
      if (
        entry.isDirectory() &&
        !entry.name.startsWith(".") &&
        !["node_modules", "dist"].includes(entry.name)
      )
        await walk(child);
      else if (isBuildInput(child)) {
        if (!entry.isFile())
          throw new Error("Build input must be a regular file");
        paths.push(child);
      }
    }
  }
  for (const directory of [
    "apps/frontend",
    "apps/backend",
    "packages/contracts",
    "packages/commerce",
  ])
    await walk(directory);
  const files = [];
  for (const path of [...new Set(paths)].sort()) {
    const absolute = resolve(workspace, path);
    if (
      relative(workspace, absolute).split(sep).includes("..") ||
      !(await lstat(absolute)).isFile()
    )
      throw new Error("Unsafe build input");
    const bytes = await readFile(absolute);
    files.push({
      path,
      bytes: bytes.length,
      sha256: createHash("sha256").update(bytes).digest("hex"),
    });
  }
  return {
    schemaVersion: 1,
    gitRevision: execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: workspace,
      encoding: "utf8",
    }).trim(),
    dirty:
      execFileSync("git", ["status", "--porcelain"], {
        cwd: workspace,
        encoding: "utf8",
      }).trim().length > 0,
    fingerprint: createHash("sha256")
      .update(JSON.stringify(files))
      .digest("hex"),
    scope:
      "Positive application build inputs; no environment, visitor, documentation or local output content",
    files,
  };
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  if (process.argv.length !== 2)
    throw new Error("Usage: node scripts/release/snapshot.mjs");
  process.stdout.write(`${JSON.stringify(await sourceSnapshot(), null, 2)}\n`);
}
