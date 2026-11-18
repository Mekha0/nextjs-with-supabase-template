import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/data/profiles";

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile, error: profileError } = await getProfile(supabase, data.user.id);
  if (profileError || !profile) {
    console.error("Failed to load user profile", profileError?.message ?? "Profile not found");
    return NextResponse.json({ error: "Could not load user profile." }, { status: 500 });
  }

  return NextResponse.json({
    user: {
      ...profile,
    },
  });
}
