import { copyFile, mkdir, rm } from "node:fs/promises";

// tsc does not prune deleted sources. Remove only these retired local outputs
// so an incremental portable package cannot retain an AI image adapter.
for (const stem of [
  "providers/logos",
  "providers/images-client",
  "brand/fake",
  "security/paid-action",
])
  for (const suffix of [".js", ".js.map", ".d.ts"])
    await rm(new URL(`../dist/${stem}${suffix}`, import.meta.url), {
      force: true,
    });

// An explicit inventory keeps portable deployment independent of frontend files.
const files = [
  "inter.ttf",
  "editorial.ttf",
  "modern.ttf",
  "inter-OFL.txt",
  "dm-serif-display-OFL.txt",
  "manrope-OFL.txt",
  "provenance.json",
];
await mkdir(new URL("../dist/brand/fonts/", import.meta.url), {
  recursive: true,
});
for (const file of files)
  await copyFile(
    new URL(`../src/brand/fonts/${file}`, import.meta.url),
    new URL(`../dist/brand/fonts/${file}`, import.meta.url),
  );
