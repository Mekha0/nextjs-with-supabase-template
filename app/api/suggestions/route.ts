import { NextResponse } from "next/server";
import { createClient, getBearerToken } from "@/lib/supabase/server";
import { generateSuggestion } from "@/lib/gemini/generate";

const DIFFICULTIES = ["beginner", "intermediate", "advanced", "any"];

const err = (status: number, code: string, message: string) =>
  NextResponse.json({ error: { code, message } }, { status });

// GET /api/suggestions
export async function GET(request: Request) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser(await getBearerToken());
  if (!user) {
    return err(401, "unauthorized", "Not logged in");
  }

  // query params: limit (default 5, max 10), difficulty (default any), allow_extra (default false)
  const params = new URL(request.url).searchParams;
  const limit = Number(params.get("limit") ?? 5);
  const difficulty = params.get("difficulty") ?? "any";
  const allowExtra = params.get("allow_extra") === "true";

  if (!Number.isInteger(limit) || limit < 1 || limit > 10) {
    return err(400, "validation_failed", "limit must be an integer from 1 to 10");
  }
  if (!DIFFICULTIES.includes(difficulty)) {
    return err(400, "validation_failed", "difficulty must be beginner, intermediate, advanced or any");
  }

  //check if user has items
  const { data: items, error } = await supabase.from("items").select("name").eq("user_id", user.id);
  if (error) {
    console.error("Failed to get items", error.message);
    return err(500, "db_error", "Could not load items.");
  }
  if (!items || items.length === 0) {
    return err(422, "empty_inventory", "Add at least one item to get suggestions.");
  }
  //get all item names
  const itemNames = items.map(item => item.name);

  //final error if suggestions cannot be retrieved for whatever reason (gemini error?)
  //llm provider failure: 502
  let results;
  try {
    results = await generateSuggestion(itemNames, limit, difficulty, allowExtra);
  } catch (e) {
    console.error("Failed to get suggestions", e);
    return err(502, "provider_error", "Could not get suggestions.");
  }

  // guardrail: materials the user doesn't own go to missing_materials (or drop the suggestion)
  const owned = itemNames.map(name => name.toLowerCase());
  const suggestions = [];
  for (const s of results) {
    const notOwned = s.required_materials.filter(m => !owned.includes(m.toLowerCase()));
    const missing = [...notOwned, ...s.missing_materials];
    if (missing.length > 0 && !allowExtra) continue;

    suggestions.push({
      title: s.title,
      description: s.description,
      link: s.link?.startsWith("https://") ? s.link : null,
      required_materials: s.required_materials.filter(m => owned.includes(m.toLowerCase())),
      required_tools: s.required_tools,
      missing_materials: missing,
      source: "llm",
    });
  }

  //get and return suggestions
  return NextResponse.json({ suggestions }, { status: 200 });
}
