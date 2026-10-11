import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PALETTES } from "./presets";
function luminance(hex: string): number {
  const channels = [1, 3, 5].map((offset) => {
    const channel = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return channel <= 0.04045
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return channels[0]! * 0.2126 + channels[1]! * 0.7152 + channels[2]! * 0.0722;
}
function ratio(a: string, b: string): number {
  const x = luminance(a),
    y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
describe("actual palette roles meet measured contrast targets", () => {
  for (const [name, palette] of Object.entries(PALETTES)) {
    it(`${name}: body, muted, action, hover, focus and controls`, () => {
      for (const background of [
        palette.canvas,
        palette.surface,
        palette.selected,
      ]) {
        expect(ratio(palette.text, background)).toBeGreaterThanOrEqual(4.5);
        expect(ratio(palette.muted, background)).toBeGreaterThanOrEqual(4.5);
        expect(ratio(palette.focus, background)).toBeGreaterThanOrEqual(3);
      }
      expect(ratio(palette.actionText, palette.action)).toBeGreaterThanOrEqual(
        4.5,
      );
      expect(ratio(palette.actionText, palette.hover)).toBeGreaterThanOrEqual(
        4.5,
      );
      expect(
        ratio(palette.controlBorder, palette.canvas),
      ).toBeGreaterThanOrEqual(3);
      expect(
        ratio(palette.controlBorder, palette.surface),
      ).toBeGreaterThanOrEqual(3);
    });
  }
  it("platform text, controls and semantic feedback use actual stylesheet values", () => {
    const css = readFileSync(
      new URL("../../styles/tokens.css", import.meta.url),
      "utf8",
    );
    const color = (name: string) => {
      const value = css.match(
        new RegExp(`--${name}: (#[a-f0-9]{6});`, "u"),
      )?.[1];
      if (!value) throw new Error(`Missing token ${name}`);
      return value;
    };
    for (const surface of [
      "platform-canvas",
      "platform-surface",
      "platform-soft",
      "platform-selected",
    ]) {
      expect(
        ratio(color("platform-text"), color(surface)),
      ).toBeGreaterThanOrEqual(4.5);
      expect(
        ratio(color("platform-muted"), color(surface)),
      ).toBeGreaterThanOrEqual(4.5);
      expect(
        ratio(color("platform-focus"), color(surface)),
      ).toBeGreaterThanOrEqual(3);
      expect(
        ratio(color("platform-control-line"), color(surface)),
      ).toBeGreaterThanOrEqual(3);
    }
    for (const state of ["error", "success", "attention"])
      expect(
        ratio(color(`feedback-${state}`), color(`feedback-${state}-surface`)),
      ).toBeGreaterThanOrEqual(4.5);
    expect(
      ratio(color("platform-action-text"), color("platform-action")),
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      ratio(color("platform-action-text"), color("platform-action-hover")),
    ).toBeGreaterThanOrEqual(4.5);
  });
});
