import { describe, expect, it, onTestFinished } from "vitest";
import { isBuildInput, sourceSnapshot } from "../scripts/release/snapshot.mjs";
import { execFileSync } from "node:child_process";
import {
  mkdtemp,
  mkdir,
  readFile,
  writeFile,
  realpath,
  rm,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve, relative, sep } from "node:path";

describe("release input privacy", () => {
  it("selects shipped sources/assets and refuses secrets, traversal and local outputs", () => {
    for (const path of [
      "apps/backend/src/server.ts",
      "packages/commerce/src/ledger.ts",
      "apps/frontend/public/sample/forme/F15.webp",
      "apps/frontend/public/fonts/inter-OFL.txt",
    ])
      expect(isBuildInput(path)).toBe(true);
    for (const path of [
      "apps/backend/.env.local",
      "apps/frontend/src/.env",
      "apps/frontend/src/../../.env.local",
      "apps/backend/src/server.test.ts",
      "apps/backend/dist/server.js",
      "apps/frontend/public/sample/forme/visitor.webp",
      "apps/frontend/public/design/reference-shirt.png",
      "artifacts/local/guest.json",
      ".git/config",
    ])
      expect(isBuildInput(path)).toBe(false);
  });
  it("fingerprints only regular build inputs without reading ignored files", async () => {
    const result = await sourceSnapshot();
    expect(result.fingerprint).toMatch(/^[a-f0-9]{64}$/u);
    expect(result.files.every(({ path }) => isBuildInput(path))).toBe(true);
    expect(
      result.files.filter(({ path }) => /F\d\d\.webp$/u.test(path)),
    ).toHaveLength(15);
    expect(
      result.files.filter(({ path }) => path.endsWith(".woff2")),
    ).toHaveLength(5);
    expect(
      result.files.filter(({ path }) => path.endsWith("-OFL.txt")),
    ).toHaveLength(4);
  });
  it("keeps exact text and binary hashes equal across fresh Git checkouts while detecting real edits", async () => {
    const temporaryRoot = await realpath(tmpdir());
    const fixture = await mkdtemp(resolve(temporaryRoot, "retailor-eol-"));
    onTestFinished(async () => {
      const target = await realpath(fixture);
      const inside = relative(temporaryRoot, target);
      if (
        inside.startsWith(`..${sep}`) ||
        inside === ".." ||
        !inside.startsWith("retailor-eol-")
      )
        throw new Error("Refusing to remove an unowned checkout fixture");
      await rm(target, { recursive: true, force: true });
    });
    const git = (cwd, args) =>
      execFileSync("git", args, {
        cwd,
        encoding: "utf8",
        windowsHide: true,
        timeout: 10000,
        stdio: ["ignore", "pipe", "pipe"],
      });
    const repository = resolve(fixture, "repository");
    await mkdir(repository);
    for (const directory of [
      "apps/frontend/public/fonts",
      "apps/backend",
      "packages/contracts",
      "packages/commerce",
    ])
      await mkdir(resolve(repository, directory), { recursive: true });
    // All fixed build inputs exist; their content is a fingerprint fixture only.
    for (const path of [
      ".dockerignore",
      "package.json",
      "pnpm-lock.yaml",
      "pnpm-workspace.yaml",
      "tsconfig.base.json",
      "apps/frontend/Dockerfile",
      "apps/backend/Dockerfile",
      "apps/frontend/next.config.mjs",
      "packages/contracts/package.json",
      "packages/commerce/package.json",
    ])
      await writeFile(resolve(repository, path), "first line\nsecond line\n");
    await writeFile(
      resolve(repository, ".gitattributes"),
      await readFile(new URL("../.gitattributes", import.meta.url)),
    );
    // No NUL byte: explicit -text must protect even binary-looking text.
    const binary = Buffer.from("font bytes\r\nkeep these exact\r\n");
    await writeFile(
      resolve(repository, "apps/frontend/public/fonts/test.woff2"),
      binary,
    );
    git(repository, ["init", "--quiet"]);
    git(repository, ["config", "core.autocrlf", "false"]);
    git(repository, ["add", "."]);
    git(repository, [
      "-c",
      "user.name=Retailor fixture",
      "-c",
      "user.email=fixture@example.invalid",
      "-c",
      "commit.gpgsign=false",
      "commit",
      "--quiet",
      "-m",
      "Checkout fixture",
    ]);
    const checkouts = [];
    for (const autocrlf of ["true", "false"]) {
      const checkout = resolve(fixture, `checkout-${autocrlf}`);
      git(fixture, [
        "clone",
        "--quiet",
        "--no-hardlinks",
        "-c",
        `core.autocrlf=${autocrlf}`,
        repository,
        checkout,
      ]);
      expect(
        await readFile(resolve(checkout, "pnpm-workspace.yaml"), "utf8"),
      ).toBe("first line\nsecond line\n");
      expect(
        await readFile(
          resolve(checkout, "apps/frontend/public/fonts/test.woff2"),
        ),
      ).toEqual(binary);
      checkouts.push(await sourceSnapshot(checkout));
    }
    expect(checkouts[0].files).toEqual(checkouts[1].files);
    expect(checkouts[0].fingerprint).toBe(checkouts[1].fingerprint);
    const changed = resolve(fixture, "checkout-false");
    await writeFile(
      resolve(changed, "pnpm-workspace.yaml"),
      "real source change\n",
    );
    expect((await sourceSnapshot(changed)).fingerprint).not.toBe(
      checkouts[1].fingerprint,
    );
  });
});
