import { createHash } from "node:crypto";
import { LogoRequestSchema, parseLogoAction } from "@retailor/contracts/brand";
import { deny } from "../security/errors.js";
export function prepareLogoContext(input: unknown, now: string) {
  const parsed = LogoRequestSchema.safeParse(input);
  if (!parsed.success) return deny("INVALID_INPUT", 400);
  const request = parsed.data;
  if (
    Date.parse(request.expiresAt) - Date.parse(request.createdAt) !== 7200000 ||
    Date.parse(request.createdAt) > Date.parse(now) ||
    Date.parse(request.expiresAt) <= Date.parse(now)
  )
    return deny("STALE", 409);
  if (request.mode === "live") {
    let action;
    try {
      action = parseLogoAction(request.action);
    } catch {
      return deny("INVALID_INPUT", 400);
    }
    if (
      action.workspaceId !== request.workspaceId ||
      action.operationId !== request.operationId ||
      action.createdAt !== request.createdAt ||
      action.expiresAt !== request.expiresAt ||
      action.nameDigest !==
        createHash("sha256").update(request.context.name).digest("hex") ||
      action.theme !== request.context.theme ||
      action.typography !== request.context.typography ||
      action.designRevision !== request.context.designRevision
    )
      return deny("FORBIDDEN", 403);
  }
  return request;
}
export const BRAND_PALETTE = {
  navy: {
    ink: "#242b60",
    accent: "#d6f578",
    background: "#ffffff",
    character: "deep navy with vivid lime accents",
  },
  ink: {
    ink: "#222421",
    accent: "#252823",
    background: "#f6f4ef",
    character: "quiet confidence",
  },
  cobalt: {
    ink: "#172143",
    accent: "#2843c7",
    background: "#f0f3fc",
    character: "fresh expressive clarity",
  },
  oxblood: {
    ink: "#392027",
    accent: "#74283f",
    background: "#faf0f0",
    character: "warm editorial character",
  },
  pine: {
    ink: "#233b2e",
    accent: "#28523d",
    background: "#f5f1e6",
    character: "grounded considered simplicity",
  },
} as const;
