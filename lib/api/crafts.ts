import type { z } from "zod";
import type { createCraftSchema, updateCraftSchema } from "@/lib/validation/crafts";
import { request, jsonInit } from "./http";
import type { Craft, CraftStatus, UserProgress } from "./types";

type CreateCraft = z.input<typeof createCraftSchema>;
type UpdateCraft = z.input<typeof updateCraftSchema>;

export const listCrafts = (status?: CraftStatus) =>
  request<{ crafts: Craft[] }>(
    status ? `/api/crafts?status=${status}` : "/api/crafts",
  ).then((r) => r.crafts);

export const createCraft = (input: CreateCraft) =>
  request<{ craft: Craft }>("/api/crafts", jsonInit("POST", input)).then(
    (r) => r.craft,
  );

// `user` is only present when the server awards XP.
export const updateCraft = (id: string, input: UpdateCraft) =>
  request<{ craft: Craft; user?: UserProgress }>(
    `/api/crafts/${id}`,
    jsonInit("PATCH", input),
  );

export const completeCraft = (id: string, photo_url?: string | null) =>
  updateCraft(id, {
    status: "complete",
    ...(photo_url !== undefined ? { photo_url } : {}),
  });

// "Add Completed Project": create as todo, then complete, so XP is awarded.
export async function addCompletedCraft(input: {
  title: string;
  description?: string | null;
  photo_url?: string | null;
  required_materials?: string[];
}) {
  const craft = await createCraft({ ...input, status: "todo" });
  return completeCraft(craft.id, input.photo_url);
}

export const deleteCraft = (id: string) =>
  request<void>(`/api/crafts/${id}`, { method: "DELETE" });
