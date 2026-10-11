import { z } from "zod";
export const IdSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-zA-Z0-9_-]+$/u);
export const RevisionSchema = z.number().int().nonnegative().max(1_000_000);
export const MAX_MINOR_AMOUNT = 1_000_000_000;
export const MinorAmountSchema = z
  .number()
  .int()
  .nonnegative()
  .max(MAX_MINOR_AMOUNT);
export const ModeSchema = z.enum(["fake", "live"]);
export type Id = z.infer<typeof IdSchema>;
export type Mode = z.infer<typeof ModeSchema>;
export const ImageSchema = z
  .strictObject({
    id: IdSchema,
    hash: z.string().regex(/^[a-f0-9]{64}$/u),
    mime: z.enum(["image/jpeg", "image/png", "image/webp"]),
    width: z.number().int().min(1).max(10_000),
    height: z.number().int().min(1).max(10_000),
    bytes: z
      .number()
      .int()
      .min(1)
      .max(4 * 1024 * 1024),
  })
  .refine(
    (image) => image.width * image.height <= 24_000_000,
    "Image exceeds pixel limit",
  );
export type ImageDescriptor = z.infer<typeof ImageSchema>;
