import { spawn } from "node:child_process";
import { once } from "node:events";
import { createHash } from "node:crypto";
import { mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { resolve } from "node:path";

// Offline authoring tool only. No browser, network, app dependency or guest input.
const [encoder, canvasModule] = process.argv.slice(2);
if (!encoder || !canvasModule)
  throw new Error(
    "Usage: node scripts/media/render-landing-hero.mjs <ffmpeg> <canvas-module>",
  );
const { createCanvas, loadImage } = await import(
  pathToFileURL(resolve(canvasModule)).href
);
const root = fileURLToPath(new URL("../../", import.meta.url));
const output = resolve(root, "apps/frontend/public/landing");
const scratch = resolve(root, "artifacts/local/RTL-105/render");
await mkdir(scratch, { recursive: true });
const width = 1440,
  height = 900,
  fps = 24,
  seconds = 16;
const canvas = createCanvas(width, height),
  context = canvas.getContext("2d");
const sheets = [
  { id: "F04", x: -125, y: -105, w: 500, angle: -0.17, phase: 0.4 },
  { id: "F07", x: 395, y: -490, w: 520, angle: 0.14, phase: 2.1 },
  { id: "F01", x: 1095, y: -130, w: 520, angle: 0.16, phase: 1.2 },
  { id: "F12", x: 1120, y: 575, w: 470, angle: -0.12, phase: 3.5 },
  { id: "F10", x: 400, y: 650, w: 520, angle: -0.13, phase: 4.6 },
  { id: "F06", x: -160, y: 625, w: 475, angle: 0.12, phase: 5.3 },
];
const sources = [];
for (const sheet of sheets) {
  const path = `apps/frontend/public/sample/forme/${sheet.id}.webp`;
  const bytes = await readFile(resolve(root, path));
  sheet.image = await loadImage(bytes);
  sources.push({
    path,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  });
}

function draw(frame) {
  const time = (frame / (fps * seconds)) * Math.PI * 2;
  const backdrop = context.createLinearGradient(0, 0, width, height);
  backdrop.addColorStop(0, "#9b9eaa");
  backdrop.addColorStop(0.48, "#c7c4bc");
  backdrop.addColorStop(1, "#9ba1af");
  context.fillStyle = backdrop;
  context.fillRect(0, 0, width, height);
  for (const sheet of sheets) {
    const h = sheet.w * 1.25;
    context.save();
    context.translate(
      sheet.x + sheet.w / 2 + Math.sin(time + sheet.phase) * 32,
      sheet.y + h / 2 + Math.cos(time + sheet.phase) * 22,
    );
    context.rotate(sheet.angle + Math.sin(time + sheet.phase) * 0.022);
    const scale = 1 + Math.sin(time + sheet.phase) * 0.018;
    context.scale(scale, scale);
    context.shadowColor = "#151b3d55";
    context.shadowBlur = 46;
    context.shadowOffsetY = 24;
    context.fillStyle = "#e8e4db";
    context.fillRect(-sheet.w / 2, -h / 2, sheet.w, h);
    context.shadowColor = "transparent";
    context.drawImage(sheet.image, -sheet.w / 2, -h / 2, sheet.w, h);
    context.restore();
  }
}

draw(0);
const poster = await canvas.encode("webp", 85);
const temporaryVideo = resolve(scratch, "hero-film.mp4");
const child = spawn(
  encoder,
  [
    "-y",
    "-hide_banner",
    "-loglevel",
    "error",
    "-f",
    "rawvideo",
    "-pixel_format",
    "rgba",
    "-video_size",
    `${width}x${height}`,
    "-framerate",
    String(fps),
    "-i",
    "pipe:0",
    "-an",
    "-c:v",
    "libx264",
    "-preset",
    "medium",
    "-crf",
    "25",
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    "-map_metadata",
    "-1",
    temporaryVideo,
  ],
  { windowsHide: true, timeout: 180000, stdio: ["pipe", "inherit", "inherit"] },
);
const completed = once(child, "close");
// Attach immediately, so encoder startup/input failure cannot go unhandled.
const inputFailure = new Promise((_, reject) =>
  child.stdin.on("error", reject),
);
async function frames() {
  for (let frame = 0; frame < fps * seconds; frame++) {
    draw(frame);
    if (!child.stdin.write(canvas.data())) await once(child.stdin, "drain");
  }
  child.stdin.end();
}
try {
  const result = Promise.all([frames(), completed]);
  const [, [code]] = await Promise.race([result, inputFailure]);
  if (code !== 0) throw new Error("Hero encoder failed");
} finally {
  if (child.exitCode === null) child.kill();
}
const size = (await stat(temporaryVideo)).size;
if (size > 4 * 1024 * 1024 || poster.length > 300000)
  throw new Error("Hero media exceeds its authored transfer budget");
await rename(temporaryVideo, resolve(output, "hero-film.mp4"));
await writeFile(resolve(output, "hero-poster.webp"), poster);
await writeFile(
  resolve(output, "hero-provenance.json"),
  JSON.stringify(
    {
      version: 1,
      description:
        "Original Retailor editorial clothing motion; generated demo photographs, no visitor assets, audio or external footage.",
      renderer: "scripts/media/render-landing-hero.mjs",
      width,
      height,
      fps,
      seconds,
      codec: "H.264 / yuv420p / faststart",
      videoBytes: size,
      posterBytes: poster.length,
      sources,
    },
    null,
    2,
  ) + "\n",
);
process.stdout.write(
  `Rendered ${seconds}s hero: ${size} video bytes, ${poster.length} poster bytes.\n`,
);
