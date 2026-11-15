import { NextResponse } from "next/server";
import { createCraft, listCrafts } from "@/lib/data/crafts";
import { craftStatusSchema, createCraftSchema } from "@/lib/validation/crafts";
import { createClient, getBearerToken } from "@/lib/supabase/server";

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

async function getUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser(await getBearerToken());
  return { supabase, user: error ? null : user };
}

export async function GET(request: Request) {
  const { supabase, user } = await getUser();
  if (!user) return errorResponse("unauthorized", "Not logged in", 401);

  const statusParam = new URL(request.url).searchParams.get("status");
  const parsedStatus = statusParam === null ? undefined : craftStatusSchema.safeParse(statusParam);
  if (parsedStatus && !parsedStatus.success) {
    return errorResponse("validation_failed", "status must be todo, in_progress, or complete", 400);
  }

  const { data, error } = await listCrafts(
    supabase,
    user.id,
    parsedStatus?.success ? parsedStatus.data : undefined,
  );
  if (error) {
    console.error("Failed to list crafts", error.message);
    return errorResponse("db_error", "Could not load crafts.", 500);
  }
  return NextResponse.json({ crafts: data });
}

export async function POST(request: Request) {
  const { supabase, user } = await getUser();
  if (!user) return errorResponse("unauthorized", "Not logged in", 401);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("invalid_json", "Body must be valid JSON", 400);
  }
  const parsed = createCraftSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("validation_failed", parsed.error.issues[0]?.message ?? "Invalid craft.", 400);
  }

  const { data, error } = await createCraft(supabase, user.id, parsed.data);
  if (error || !data) {
    console.error("Failed to create craft", error?.message ?? "No craft returned");
    return errorResponse("db_error", "Could not create the craft.", 500);
  }
  return NextResponse.json({ craft: data }, { status: 201 });
}
