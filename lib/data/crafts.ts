import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { z } from "zod";
import type { createCraftSchema, updateCraftSchema } from "@/lib/validation/crafts";

const CRAFT_COLUMNS =
  "id, title, description, status, photo_url, completed_at, created_at, updated_at";

export type CreateCraftInput = z.infer<typeof createCraftSchema>;
export type UpdateCraftInput = z.infer<typeof updateCraftSchema>;

export async function listCrafts(
  supabase: SupabaseClient,
  userId: string,
  status?: "todo" | "in_progress" | "complete",
) {
  let query = supabase
    .from("crafts")
    .select(CRAFT_COLUMNS)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (status) query = query.eq("status", status);
  return query;
}

export async function createCraft(
  supabase: SupabaseClient,
  userId: string,
  input: CreateCraftInput,
) {
  return supabase
    .from("crafts")
    .insert({
      user_id: userId,
      ...input,
      completed_at: input.status === "complete" ? new Date().toISOString() : null,
    })
    .select(CRAFT_COLUMNS)
    .single();
}

export async function updateCraft(
  supabase: SupabaseClient,
  userId: string,
  id: string,
  input: UpdateCraftInput,
) {
  if (input.status === "complete") {
    const changes = { ...input };
    delete changes.status;
    if (Object.keys(changes).length > 0) {
      const { data: updated, error: updateError } = await supabase
        .from("crafts")
        .update({ ...changes, updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("user_id", userId)
        .select("id")
        .maybeSingle();
      if (updateError) return { data: null, error: updateError };
      if (!updated) return { data: null, error: null };
    }

    const { data, error } = await supabase.rpc("complete_craft", { p_craft_id: id });
    if (error) return { data: null, error };
    if (!data) return { data: null, error: null };
    return {
      data: data as {
        craft: Record<string, unknown>;
        user: { xp: number; level: number };
      },
      error: null,
    };
  }

  const { data, error } = await supabase
    .from("crafts")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userId)
    .select(CRAFT_COLUMNS)
    .maybeSingle();
  return { data: data ? { craft: data, user: undefined } : null, error };
}

export async function deleteCraft(supabase: SupabaseClient, userId: string, id: string) {
  return supabase
    .from("crafts")
    .delete()
    .eq("id", id)
    .eq("user_id", userId)
    .select("id")
    .maybeSingle();
}
