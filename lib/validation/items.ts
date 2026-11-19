import { z } from "zod";

export const createItemSchema = z.object({
  name: z.string().trim().min(1).max(64),
  quantity: z.number().int().min(1).max(2_147_483_647).optional().default(1),
  photo_url: z.string().nullable().optional().default(null),
}).strict();
