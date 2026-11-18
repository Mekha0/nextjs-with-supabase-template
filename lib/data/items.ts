import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { z } from "zod";
import type { createItemSchema } from "@/lib/validation/items";

export type CreateItemInput = z.infer<typeof createItemSchema>;

export async function addSupply(
  supabase: SupabaseClient,
  input: CreateItemInput,
) {
  const { data, error } = await supabase.rpc("add_supply", {
    p_name: input.name,
    p_quantity: input.quantity,
    p_photo_url: input.photo_url,
  });
  if (error || !data) return { data: null, error };

  return {
    data: data as {
      item: Record<string, unknown>;
      user: { xp: number; level: number };
      created: boolean;
    },
    error: null,
  };
}
