// suggestions.ts
import { request } from "./http";
import type { Difficulty, Suggestion } from "./types";

// Throws ApiError with code "empty_inventory" (422) if the user has no items.
export function getSuggestions(
  opts: { difficulty?: Difficulty; allowExtra?: boolean; limit?: number } = {},
) {
  const params = new URLSearchParams({
    limit: String(opts.limit ?? 5),
    difficulty: opts.difficulty ?? "any",
    allow_extra: String(opts.allowExtra ?? false),
  });
  return request<{ suggestions: Suggestion[] }>(
    `/api/suggestions?${params}`,
  ).then((r) => r.suggestions);
}