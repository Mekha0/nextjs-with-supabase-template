import { NextResponse } from "next/server";
import { createClient, getBearerToken } from "@/lib/supabase/server";

const MAX_POSTGRES_INTEGER = 2_147_483_647;
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

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return errorResponse("validation_failed", "Body must be an object", 400);
  }

  const input = body as Record<string, unknown>;
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const quantity = input.quantity === undefined ? 1 : input.quantity;
  const photoUrl = input.photo_url === undefined ? null : input.photo_url;

  if (name.length < 1 || name.length > 64) {
    return errorResponse("validation_failed", "name is required (1-64 chars)", 400);
  }
  if (
    typeof quantity !== "number" ||
    !Number.isInteger(quantity) ||
    quantity < 1 ||
    quantity > MAX_POSTGRES_INTEGER
  ) {
    return errorResponse("validation_failed", "quantity must be an integer >= 1", 400);
  }
  if (photoUrl !== null && typeof photoUrl !== "string") {
    return errorResponse("validation_failed", "photo_url must be a string or null", 400);
  }

  // same name (case-insensitive) already exists:add quantity instead of new row
  const { data: existing, error: findError } = await supabase
    .from("items")
    .select("id, quantity")
    .eq("user_id", user.id)
    .ilike("name", name.replace(/[\\%_]/g, "\\$&"))
    .order("created_at")
    .limit(1)
    .maybeSingle();

  if (findError) {
    console.error("Failed to look up item", findError.message);
    return errorResponse("db_error", "Could not create the item.", 500);
  }

  if (existing) {
    const merged = existing.quantity + quantity;
    if (merged > MAX_POSTGRES_INTEGER) {
      return errorResponse("validation_failed", "quantity would exceed the maximum", 400);
    }
    const { data: updated, error: updateError } = await supabase
      .from("items")
      .update({ quantity: merged, updated_at: new Date().toISOString() })
      .eq("id", existing.id)
      .eq("user_id", user.id)
      .select(ITEM_COLUMNS)
      .maybeSingle();

    if (updateError || !updated) {
      console.error("Failed to merge item", updateError?.message ?? "No item returned");
      return errorResponse("db_error", "Could not update the item.", 500);
    }
    return NextResponse.json({ item: updated }, { status: 200 });
  }

  const { data: item, error } = await supabase
    .from("items")
    .insert({ user_id: user.id, name, quantity, photo_url: photoUrl })
    .select(ITEM_COLUMNS)
    .single();

  if (error || !item) {
    console.error("Failed to create item", error?.message ?? "No item returned");
    return errorResponse("db_error", "Could not create the item.", 500);
  }

  return NextResponse.json({ item }, { status: 201 });
}
