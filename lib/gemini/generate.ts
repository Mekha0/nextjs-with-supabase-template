import { GoogleGenAI } from "@google/genai";
import "server-only";
import z from "zod";
import { generatePrompt } from "./prompt";
import { Result } from "./schema";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

type Suggestion = z.infer<typeof Result>["suggestions"][number];

const LINK_CACHE = new Map<string, { valid: boolean; expiresAt: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000;

function isPrivateAddress(address: string): boolean {
  const ip = address.toLowerCase();
  if (ip === "::1" || ip.startsWith("fc") || ip.startsWith("fd") || ip.startsWith("fe80:")) {
    return true;
  }
  if (ip.startsWith("127.") || ip.startsWith("10.") || ip.startsWith("169.254.") || ip.startsWith("0.")) {
    return true;
  }
  if (ip.startsWith("192.168.")) return true;
  if (ip.startsWith("172.")) {
    const secondOctet = Number(ip.split(".")[1]);
    if (secondOctet >= 16 && secondOctet <= 31) return true;
  }
  return false;
}

async function isPublicHttpsUrl(rawUrl: string): Promise<boolean> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return false;
  }

  if (url.protocol !== "https:" || url.username || url.password) return false;
  if (!url.hostname || url.hostname.endsWith(".localhost")) return false;

  const hostname = url.hostname.replace(/^\[|\]$/g, "");
  if (isIP(hostname)) return !isPrivateAddress(hostname);

  try {
    const addresses = await lookup(hostname, { all: true });
    return addresses.length > 0 && addresses.every(({ address }) => !isPrivateAddress(address));
  } catch {
    return false;
  }
}

async function checkLiveUrl(rawUrl: string): Promise<boolean> {
  if (!await isPublicHttpsUrl(rawUrl)) return false;

  const cached = LINK_CACHE.get(rawUrl);
  if (cached && cached.expiresAt > Date.now()) return cached.valid;

  let valid = false;
  let currentUrl = rawUrl;

  try {
    for (let redirectCount = 0; redirectCount < 5; redirectCount++) {
      if (!await isPublicHttpsUrl(currentUrl)) break;

      let response = await fetch(currentUrl, {
        method: "HEAD",
        redirect: "manual",
        signal: AbortSignal.timeout(5000),
        headers: { "User-Agent": "CraftStash-link-check/1.0" },
      });

      if ([405, 501].includes(response.status)) {
        response = await fetch(currentUrl, {
          method: "GET",
          redirect: "manual",
          signal: AbortSignal.timeout(7000),
          headers: {
            "User-Agent": "CraftStash-link-check/1.0",
            "Range": "bytes=0-2047",
          },
        });
      }

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        if (!location) break;
        try {
          currentUrl = new URL(location, currentUrl).toString();
          continue;
        } catch {
          break;
        }
      }

      valid = response.status >= 200 && response.status < 400;
      break;
    }
  } catch {
    valid = false;
  }

  LINK_CACHE.set(rawUrl, { valid, expiresAt: Date.now() + CACHE_TTL_MS });
  return valid;
}

async function verifySuggestionLinks(suggestions: Suggestion[]): Promise<Suggestion[]> {
  const checked = await Promise.all(
    suggestions.map(async (suggestion) => {
      if (!suggestion.link) return null;
      return await checkLiveUrl(suggestion.link) ? suggestion : null;
    }),
  );
  return checked.filter((suggestion): suggestion is Suggestion => suggestion !== null);
}

export async function generateSuggestion(itemNames: string[], 
    limit: number, difficulty: string, allowExtra: boolean
    ) {
    //check api key exists
    if (!process.env.GEMINI_API_KEY) {
        throw new Error("Missing GEMINI_API_KEY");
    }
    
    //create client
    const client = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
    });

    const targetCount = Math.max(3, limit);
    const maxAttempts = 5;
    const suggestions: Suggestion[] = [];
    const seenLinks = new Set<string>();
    const seenTitles = new Set<string>();

    for (let attempt = 0; attempt < maxAttempts && suggestions.length < targetCount; attempt++) {
        const remaining = targetCount - suggestions.length;
        // Request extra candidates because the prompt and live-link check may reject some.
        const requestCount = Math.max(remaining, remaining * 2);
        const prompt = generatePrompt(itemNames, requestCount, difficulty, allowExtra);

        const response = await client.interactions.create({
            model: "gemini-3.5-flash-lite",
            input: prompt,
            // tools: [{ type: "google_search" }], //paid/limited grounding is not used
            response_format: {
                type: "text",
                mime_type: "application/json",
                schema: z.toJSONSchema(Result)
            },

        }, { timeout_ms: 60000 }); //give up after 60s (502)

        const result = Result.parse(JSON.parse(response.output_text ?? ""));
        if (!result || !result.suggestions) {
            throw new Error("Invalid response from Gemini API");
        }

        // Live-check URLs without any paid search or grounding API.
        const validSuggestions = await verifySuggestionLinks(result.suggestions);

        for (const suggestion of validSuggestions) {
            if (!suggestion.link) continue;

            const linkKey = suggestion.link.toLowerCase();
            const titleKey = suggestion.title.trim().toLowerCase();
            if (seenLinks.has(linkKey) || seenTitles.has(titleKey)) continue;

            seenLinks.add(linkKey);
            seenTitles.add(titleKey);
            suggestions.push(suggestion);

            if (suggestions.length === targetCount) break;
        }
    }

    return suggestions;

}