import { GoogleGenAI } from "@google/genai";
import "server-only";
import * as z from "zod";

const Detection = z.object({
  items: z.array(z.object({ name: z.string(), quantity: z.number().int().min(1) })),
});

const PROMPT =
  "List every distinct craft supply, material or tool visible in this photo (e.g. yarn, scissors, " +
  "paint, beads, fabric, glue). Use short, singular, lowercase generic names, with no brands or colors. " +
  "Give how many of each you can count. Return an empty list if there are none.";

// same shape as the roboflow path; gemini has no real confidence so it is 0 (UI hides it)
export async function detectItems(image: File) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("Missing GEMINI_API_KEY");
  }

  const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const data = Buffer.from(await image.arrayBuffer()).toString("base64");

  const response = await client.models.generateContent({
    model: "gemini-3.1-flash-lite",
    contents: [{ role: "user", parts: [{ inlineData: { mimeType: image.type, data } }, { text: PROMPT }] }],
    config: {
      responseMimeType: "application/json",
      responseJsonSchema: z.toJSONSchema(Detection),
      abortSignal: AbortSignal.timeout(30_000),
    },
  });

  const result = Detection.parse(JSON.parse(response.text ?? ""));

  // merge duplicate names (case-insensitive) so the list matches what Roboflow returns
  const merged = new Map<string, { name: string; confidence: number; quantity: number }>();
  for (const { name, quantity } of result.items) {
    const key = name.trim().toLowerCase();
    if (!key) continue;
    const cur = merged.get(key);
    merged.set(key, { name: key, confidence: 0, quantity: (cur?.quantity ?? 0) + quantity });
  }
  return [...merged.values()];
}
