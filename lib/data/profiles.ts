import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export function getProfile(supabase: SupabaseClient, userId: string) {
  return supabase
    .from("profiles")
    .select("id, username, name, last_name, xp, level")
    .eq("id", userId)
    .maybeSingle();
}
