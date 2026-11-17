import { z } from "zod";

export const craftStatusSchema = z.enum(["todo", "in_progress", "complete"]);

const nullableText = (maximum: number) =>
  z.string().max(maximum).nullable();

export const createCraftSchema = z.object({
  title: z.string().trim().min(1).max(128),
  description: nullableText(2000).optional(),
  status: craftStatusSchema.optional().default("todo"),
  photo_url: z.string().nullable().optional(),
}).strict();

export const updateCraftSchema = z.object({
  title: z.string().trim().min(1).max(128).optional(),
  description: nullableText(2000).optional(),
  status: craftStatusSchema.optional(),
  photo_url: z.string().nullable().optional(),
}).strict().refine((value) => Object.keys(value).length > 0, {
  message: "At least one field must be provided.",
});

export const craftIdSchema = z.string().uuid();
