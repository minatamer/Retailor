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
      "apps/frontend/public/sample/forme/F19.webp",
      "apps/frontend/public/fonts/inter-OFL.txt",
      "apps/frontend/public/landing/jeans-indigo.webp",
      "apps/frontend/public/landing/jeans-black.webp",
      "apps/frontend/public/landing/jeans-light.webp",
      "apps/frontend/public/landing/hero-film.mp4",
      "apps/frontend/public/landing/hero-poster.webp",
      "apps/frontend/public/landing/hero-provenance.json",
      "apps/frontend/public/brand/retailor-cart.svg",
      "apps/frontend/public/brand/retailor-lockup.svg",
      "apps/frontend/public/favicon.ico",
      "apps/frontend/public/favicon-96.png",
      "apps/frontend/public/apple-touch-icon.png",
      "apps/backend/src/brand/fonts/inter.ttf",
      "apps/backend/src/brand/fonts/editorial.ttf",
      "apps/backend/src/brand/fonts/modern.ttf",
      "apps/backend/src/brand/fonts/inter-OFL.txt",
      "apps/backend/scripts/copy-logo-fonts.mjs",
    ])
      expect(isBuildInput(path)).toBe(true);
    for (const path of [
      "apps/backend/.env.local",
      "apps/frontend/src/.env",
      "apps/frontend/src/../../.env.local",
      "apps/backend/src/server.test.ts",
      "apps/backend/dist/server.js",
      "apps/frontend/public/sample/forme/visitor.webp",
      "apps/frontend/public/sample/forme/F20.webp",
      "apps/frontend/public/design/reference-shirt.png",
      "apps/frontend/public/landing/visitor.webp",
      "apps/frontend/public/landing/visitor.mp4",
      "apps/frontend/public/landing/.env.local",
      "apps/frontend/public/brand/visitor.svg",
      "apps/frontend/public/brand/.env.local",
      "apps/frontend/public/favicon-visitor.png",
      "apps/backend/src/brand/fonts/visitor.ttf",
      "apps/backend/src/brand/fonts/visitor-OFL.txt",
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
    ).toHaveLength(19);
    expect(
      result.files.filter(({ path }) => path.endsWith(".woff2")),
    ).toHaveLength(5);
    expect(
      result.files.filter(
        ({ path }) =>
          path.startsWith("apps/frontend/") && path.endsWith("-OFL.txt"),
      ),
    ).toHaveLength(4);
    expect(
      result.files.filter(({ path }) => path.endsWith(".ttf")),
    ).toHaveLength(3);
    expect(
      result.files.filter(
        ({ path }) =>
          path.startsWith("apps/backend/") && path.endsWith("-OFL.txt"),
      ),
    ).toHaveLength(3);
    expect(
      result.files.filter(({ path }) =>
        path.startsWith("apps/frontend/public/landing/"),
      ),
    ).toHaveLength(6);
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
      "apps/frontend/public/landing",
      "apps/backend/src/brand/fonts",
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
    await writeFile(
      resolve(repository, "apps/backend/src/brand/fonts/inter.ttf"),
      binary,
    );
    await writeFile(
      resolve(repository, "apps/frontend/public/landing/jeans-light.webp"),
      binary,
    );
    await writeFile(
      resolve(repository, "apps/frontend/public/landing/hero-film.mp4"),
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
      expect(
        await readFile(
          resolve(checkout, "apps/backend/src/brand/fonts/inter.ttf"),
        ),
      ).toEqual(binary);
      expect(
        await readFile(
          resolve(checkout, "apps/frontend/public/landing/hero-film.mp4"),
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
    const beforeAssetEdit = await sourceSnapshot(changed);
    await writeFile(
      resolve(changed, "apps/frontend/public/landing/jeans-light.webp"),
      Buffer.concat([binary, Buffer.from("real thumbnail change")]),
    );
    expect((await sourceSnapshot(changed)).fingerprint).not.toBe(
      beforeAssetEdit.fingerprint,
    );
    const beforeVideoEdit = await sourceSnapshot(changed);
    await writeFile(
      resolve(changed, "apps/frontend/public/landing/hero-film.mp4"),
      Buffer.concat([binary, Buffer.from("real video change")]),
    );
    expect((await sourceSnapshot(changed)).fingerprint).not.toBe(
      beforeVideoEdit.fingerprint,
    );
    const beforeFontEdit = await sourceSnapshot(changed);
    await writeFile(
      resolve(changed, "apps/backend/src/brand/fonts/inter.ttf"),
      Buffer.concat([binary, Buffer.from("real font change")]),
    );
    expect((await sourceSnapshot(changed)).fingerprint).not.toBe(
      beforeFontEdit.fingerprint,
    );
  });
});
