import { z } from "zod";
import { TimestampSchema } from "./commerce.js";
export const ScenarioPresetSchema = z.enum(["healthy", "breakeven", "loss"]);
export type ScenarioPreset = z.infer<typeof ScenarioPresetSchema>;
export const ScenarioInfoSchema = z.strictObject({
  preset: ScenarioPresetSchema,
  seed: z.literal("retailor-history-v1"),
  anchorAt: TimestampSchema,
  openingUnitsPerActiveVariant: z.literal(20),
});
export type ScenarioInfo = z.infer<typeof ScenarioInfoSchema>;
