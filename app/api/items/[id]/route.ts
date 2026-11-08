import { NextResponse } from "next/server";
import { createClient, getBearerToken } from "@/lib/supabase/server";

type Ctx = { params: Promise<{ id: string }> };

const MAX_POSTGRES_INTEGER = 2_147_483_647;
const ITEM_COLUMNS = "id, name, quantity, photo_url, created_at, updated_at";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const err = (status: number, code: string, message: string) =>
  NextResponse.json({ error: { code, message } }, { status });

// GET /api/items/:id (for single item)
export async function GET(_request: Request, { params }: Ctx) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser(await getBearerToken());
  if (!user) return err(401, "unauthorized", "Not logged in");
  if (!UUID.test(id)) return err(404, "not_found", "Item not found");

  const { data: item, error } = await supabase
    .from("items")
    .select(ITEM_COLUMNS)
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("Failed to load item", error.message);
    return err(500, "db_error", "Could not load the item.");
  }
  if (!item) return err(404, "not_found", "Item not found");

  return NextResponse.json({ item });
}

// PATCH /api/items/:id
export async function PATCH(request: Request, { params }: Ctx) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser(await getBearerToken());
  if (!user) return err(401, "unauthorized", "Not logged in");
  if (!UUID.test(id)) return err(404, "not_found", "Item not found");

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return err(400, "invalid_json", "Body must be valid JSON");
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return err(400, "validation_failed", "Body must be an object");
  }

  const input = body as Record<string, unknown>;

  // build an update with only the fields that were sent
  const update: Record<string, unknown> = {};

  if (input.name !== undefined) {
    const name = typeof input.name === "string" ? input.name.trim() : "";
    if (name.length < 1 || name.length > 64)
      return err(400, "validation_failed", "name is required (1-64 chars)");
    update.name = name;
  }
  if (input.quantity !== undefined) {
    if (
      typeof input.quantity !== "number" ||
      !Number.isInteger(input.quantity) ||
      input.quantity < 1 ||
      input.quantity > MAX_POSTGRES_INTEGER
    )
      return err(400, "validation_failed", "quantity must be an integer >= 1");
    update.quantity = input.quantity;
  }
  if (input.photo_url !== undefined) {
    if (input.photo_url !== null && typeof input.photo_url !== "string")
      return err(400, "validation_failed", "photo_url must be a string or null");
    update.photo_url = input.photo_url;
  }
  if (Object.keys(update).length === 0)
    return err(400, "validation_failed", "Provide at least one field to update");

  // no DB trigger bumps updated_at on update, so set it here
  update.updated_at = new Date().toISOString();

  // user_id filter = ownership check; no match -> 404
  const { data: item, error } = await supabase
    .from("items")
    .update(update)
    .eq("id", id)
    .eq("user_id", user.id)
    .select(ITEM_COLUMNS)
    .maybeSingle();

  if (error) {
    console.error("Failed to update item", error.message);
    return err(500, "db_error", "Could not update the item.");
  }
  if (!item) return err(404, "not_found", "Item not found");

  return NextResponse.json({ item });
}

// DELETE /api/items/:id
export async function DELETE(_request: Request, { params }: Ctx) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser(await getBearerToken());
  if (!user) return err(401, "unauthorized", "Not logged in");
  if (!UUID.test(id)) return err(404, "not_found", "Item not found");

  const { data, error } = await supabase
    .from("items")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id");

  if (error) {
    console.error("Failed to delete item", error.message);
    return err(500, "db_error", "Could not delete the item.");
  }
  if (!data || data.length === 0) return err(404, "not_found", "Item not found");

  return new NextResponse(null, { status: 204 });
}
