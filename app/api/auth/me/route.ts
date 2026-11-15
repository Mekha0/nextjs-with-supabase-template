import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function integerValue(value: unknown, fallback: number, minimum: number): number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= minimum
    ? value
    : fallback;
}

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const metadata = data.user.user_metadata ?? {};
  const emailUsername = data.user.email?.split("@", 1)[0] ?? "";

  return NextResponse.json({
    user: {
      id: data.user.id,
      username: stringValue(metadata.username) ?? emailUsername,
      name: stringValue(metadata.name) ?? stringValue(metadata.first_name) ?? "",
      last_name: stringValue(metadata.last_name) ?? "",
      xp: integerValue(metadata.xp, 0, 0),
      level: integerValue(metadata.level, 1, 1),
    },
  });
}
