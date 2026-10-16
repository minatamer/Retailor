import type { CSSProperties } from "react";
import type { Design } from "@retailor/contracts/design";
import { resolvedTemplates, THEME_LABELS } from "@retailor/contracts/design";

export interface Palette {
  label: string;
  mood: string;
  canvas: string;
  surface: string;
  text: string;
  muted: string;
  action: string;
  actionText: string;
  hover: string;
  selected: string;
  border: string;
  controlBorder: string;
  focus: string;
  image: string;
}
export const PALETTES: Record<Design["theme"], Palette> = {
  navy: {
    label: THEME_LABELS.navy,
    mood: "Deep navy with vivid lime actions",
    canvas: "#ffffff",
    surface: "#ffffff",
    text: "#242b60",
    muted: "#596176",
    action: "#d6f578",
    actionText: "#242b60",
    hover: "#e6ffa4",
    selected: "#d6f578",
    border: "#dce1e7",
    controlBorder: "#242b60",
    focus: "#242b60",
    image: "#ffffff",
  },
  ink: {
    label: THEME_LABELS.ink,
    mood: "Quiet confidence",
    canvas: "#f6f4ef",
    surface: "#ffffff",
    text: "#222421",
    muted: "#62655d",
    action: "#252823",
    actionText: "#ffffff",
    hover: "#42463c",
    selected: "#e4e8dd",
    border: "#d9dcd2",
    controlBorder: "#85897e",
    focus: "#494f3b",
    image: "#e9e5dc",
  },
  cobalt: {
    label: THEME_LABELS.cobalt,
    mood: "Fresh, forward, expressive",
    canvas: "#f0f3fc",
    surface: "#ffffff",
    text: "#172143",
    muted: "#566080",
    action: "#2843c7",
    actionText: "#ffffff",
    hover: "#1c3099",
    selected: "#dce4ff",
    border: "#d1d9ed",
    controlBorder: "#7887a9",
    focus: "#2843c7",
    image: "#e7e9ef",
  },
  oxblood: {
    label: THEME_LABELS.oxblood,
    mood: "Warm editorial character",
    canvas: "#faf0f0",
    surface: "#fffafb",
    text: "#392027",
    muted: "#795861",
    action: "#74283f",
    actionText: "#ffffff",
    hover: "#551c2e",
    selected: "#f0dce2",
    border: "#e4cdd4",
    controlBorder: "#a07986",
    focus: "#74283f",
    image: "#eee0de",
  },
  pine: {
    label: THEME_LABELS.pine,
    mood: "Grounded and considered",
    canvas: "#f5f1e6",
    surface: "#fffdf8",
    text: "#233b2e",
    muted: "#566658",
    action: "#28523d",
    actionText: "#ffffff",
    hover: "#1c3a2a",
    selected: "#dfe8d8",
    border: "#d4dccc",
    controlBorder: "#7d8c75",
    focus: "#28523d",
    image: "#e8e3d5",
  },
};
export const TYPOGRAPHIES: Record<
  Design["typography"],
  {
    label: string;
    heading: string;
    body: string;
    weight: number;
    tracking: string;
  }
> = {
  inter: {
    label: "Modern · Inter",
    heading: '"Retailor Inter", Arial, sans-serif',
    body: '"Retailor Inter", Arial, sans-serif',
    weight: 600,
    tracking: "-0.055em",
  },
  editorial: {
    label: "Editorial · DM Serif",
    heading: '"Retailor DM Serif", Georgia, serif',
    body: '"Retailor DM Sans", Arial, sans-serif',
    weight: 400,
    tracking: "-0.035em",
  },
  modern: {
    label: "Expressive · Manrope",
    heading: '"Retailor Manrope", Arial, sans-serif',
    body: '"Retailor DM Sans", Arial, sans-serif',
    weight: 700,
    tracking: "-0.055em",
  },
};
export const TEMPLATES: Record<
  Design["template"],
  { label: string; description: string }
> = {
  studio: {
    label: "Studio",
    description: "Editorial spread. Category rail. All-view product gallery.",
  },
  pulse: {
    label: "Pulse",
    description:
      "Photo triptych. Wide catalogue. Product stage and purchase dock.",
  },
  gallery: {
    label: "Gallery",
    description:
      "Asymmetric lookbook. Staggered collection. Image-led product view.",
  },
};
export function layoutLabel(
  design: Pick<Design, "template" | "pageTemplates">,
) {
  const pages = resolvedTemplates(design);
  return pages.home === pages.collection && pages.home === pages.product
    ? TEMPLATES[pages.home].label
    : `Home: ${TEMPLATES[pages.home].label} · Collection: ${TEMPLATES[pages.collection].label} · Product: ${TEMPLATES[pages.product].label}`;
}
export function merchantStyle(
  design: Pick<Design, "theme" | "typography">,
): CSSProperties {
  const palette = PALETTES[design.theme];
  const type = TYPOGRAPHIES[design.typography];
  return {
    "--store-canvas": palette.canvas,
    "--store-surface": palette.surface,
    "--store-text": palette.text,
    "--store-muted": palette.muted,
    "--store-action": palette.action,
    "--store-action-text": palette.actionText,
    "--store-hover": palette.hover,
    "--store-selected": palette.selected,
    "--store-border": palette.border,
    "--store-control-border": palette.controlBorder,
    "--store-focus": palette.focus,
    "--store-image": palette.image,
    "--store-error": "#922f38",
    "--store-error-surface": "#fff0f1",
    "--store-heading": type.heading,
    "--store-body": type.body,
    "--store-heading-weight": type.weight,
    "--store-tracking": type.tracking,
  } as CSSProperties;
}
