import { NextResponse } from "next/server";
import { deleteCraft, updateCraft } from "@/lib/data/crafts";
import { craftIdSchema, updateCraftSchema } from "@/lib/validation/crafts";
import { createClient, getBearerToken } from "@/lib/supabase/server";

type RouteContext = { params: Promise<{ id: string }> };

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

async function getUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser(await getBearerToken());
  return { supabase, user: error ? null : user };
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const { supabase, user } = await getUser();
  if (!user) return errorResponse("unauthorized", "Not logged in", 401);
  const { id } = await params;
  if (!craftIdSchema.safeParse(id).success) return errorResponse("not_found", "Craft not found.", 404);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("invalid_json", "Body must be valid JSON", 400);
  }
  const parsed = updateCraftSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("validation_failed", parsed.error.issues[0]?.message ?? "Invalid craft.", 400);
  }

  const { data, error } = await updateCraft(supabase, user.id, id, parsed.data);
  if (error) {
    console.error("Failed to update craft", error.message);
    return errorResponse("db_error", "Could not update the craft.", 500);
  }
  if (!data) return errorResponse("not_found", "Craft not found.", 404);

  return NextResponse.json({ craft: data.craft, ...(data.user ? { user: data.user } : {}) });
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const { supabase, user } = await getUser();
  if (!user) return errorResponse("unauthorized", "Not logged in", 401);
  const { id } = await params;
  if (!craftIdSchema.safeParse(id).success) return errorResponse("not_found", "Craft not found.", 404);

  const { data, error } = await deleteCraft(supabase, user.id, id);
  if (error) {
    console.error("Failed to delete craft", error.message);
    return errorResponse("db_error", "Could not delete the craft.", 500);
  }
  if (!data) return errorResponse("not_found", "Craft not found.", 404);
  return new Response(null, { status: 204 });
}
