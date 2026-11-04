import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const MAX_POSTGRES_INTEGER = 2_147_483_647;

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getClaims();
  const userId = authData?.claims?.sub;
  if (authError || typeof userId !== "string") {
    return NextResponse.json({ error: "Sign in to create an item." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Request body must be an object." }, { status: 400 });
  }

  const input = body as Record<string, unknown>;
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const quantity = input.quantity === undefined ? 1 : input.quantity;
  const photoUrl = input.photo_url === undefined ? null : input.photo_url;

  if (name.length < 1 || name.length > 64) {
    return NextResponse.json({ error: "Name must be between 1 and 64 characters." }, { status: 400 });
  }
  if (
    typeof quantity !== "number" ||
    !Number.isInteger(quantity) ||
    quantity < 1 ||
    quantity > MAX_POSTGRES_INTEGER
  ) {
    return NextResponse.json({ error: "Quantity must be a positive integer." }, { status: 400 });
  }
  if (photoUrl !== null && typeof photoUrl !== "string") {
    return NextResponse.json({ error: "photo_url must be a string or null." }, { status: 400 });
  }

  const { data: item, error: insertError } = await supabase
    .from("items")
    .insert({
      user_id: userId,
      name,
      quantity,
      photo_url: photoUrl,
    })
    .select("id, name, quantity, photo_url, created_at, updated_at")
    .single();

  if (insertError || !item) {
    console.error("Failed to create item", insertError?.message ?? "No item returned");
    return NextResponse.json({ error: "Could not create the item." }, { status: 500 });
  }

  return NextResponse.json({ item }, { status: 201 });
}
