import * as z from "zod";

// suggestion schema for gemini
export const Suggestion = z.object({
  title: z.string(),
  description: z.string(),
  link: z.string().nullable(),
  search_query: z.string(), // used to build a fallback link when link is null/invalid
  required_materials: z.array(z.string()),
  required_tools: z.array(z.string()),
  missing_materials: z.array(z.string()), // yes
});

export const Result = z.object({
  suggestions: z.array(Suggestion),
});
