import { z } from "zod";
import {
  LogoMetadataSchema,
  type LogoContext,
} from "@retailor/contracts/brand";
export const LogoStateSchema = z
  .strictObject({
    candidates: z.array(LogoMetadataSchema).max(3),
    batches: z.number().int().min(0).max(2),
    reviewed: z.array(z.string().max(64)).max(3),
  })
  .refine(
    (state) =>
      [0, 3].includes(state.candidates.length) &&
      state.candidates.every(
        (c) =>
          c.mode === state.candidates[0]?.mode &&
          JSON.stringify(c.context) ===
            JSON.stringify(state.candidates[0]?.context),
      ) &&
      new Set(state.candidates.map((c) => c.id)).size ===
        state.candidates.length &&
      new Set(state.candidates.map((c) => c.hash)).size ===
        state.candidates.length &&
      new Set(state.reviewed).size === state.reviewed.length &&
      state.reviewed.every((id) => state.candidates.some((c) => c.id === id)),
  );
export type LogoState = z.infer<typeof LogoStateSchema>;
export const INITIAL_LOGOS: LogoState = {
  candidates: [],
  batches: 0,
  reviewed: [],
};
export function sameLogoContext(a: LogoContext, b: LogoContext) {
  return JSON.stringify(a) === JSON.stringify(b);
}
