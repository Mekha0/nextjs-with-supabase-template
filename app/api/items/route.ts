import { NextResponse } from "next/server";
import { addSupply } from "@/lib/data/items";
import { createItemSchema } from "@/lib/validation/items";
import { createClient, getBearerToken } from "@/lib/supabase/server";

const ITEM_COLUMNS = "id, name, quantity, photo_url, created_at, updated_at";

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

// GET /api/items
export async function GET() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser(await getBearerToken());
  if (!user) {
    return errorResponse("unauthorized", "Not logged in", 401);
  }

  const { data, error } = await supabase
    .from("items")
    .select(ITEM_COLUMNS)
    .eq("user_id", user.id);

  if (error) {
    console.error("Failed to list items", error.message);
    return errorResponse("db_error", "Could not load items.", 500);
  }

  return NextResponse.json({ items: data });
}

// POST /api/items
export async function POST(request: Request) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser(await getBearerToken());
  if (!user) {
    return errorResponse("unauthorized", "Not logged in", 401);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("invalid_json", "Body must be valid JSON", 400);
  }

  const parsed = createItemSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("validation_failed", parsed.error.issues[0]?.message ?? "Invalid item.", 400);
  }

  const { data, error } = await addSupply(supabase, parsed.data);
  if (error || !data) {
    console.error("Failed to add supply", error?.message ?? "No supply returned");
    return errorResponse("db_error", "Could not create the item.", 500);
  }
  return NextResponse.json(
    { item: data.item, user: data.user },
    { status: data.created ? 201 : 200 },
  );
}
