import { GoogleGenAI } from "@google/genai";
import "server-only";
import z from "zod";
import { generatePrompt } from "./prompt";
import { Result, Suggestion } from "./schema";

//in-memory cache: same inventory + settings => reuse result for 1h (resets on server restart)
const CACHE_TTL_MS = 60 * 60 * 1000;
type Cached = Omit<z.infer<typeof Suggestion>, "search_query">[];
const cache = new Map<string, { at: number; data: Cached }>();

export async function generateSuggestion(itemNames: string[],
    limit: number, difficulty: string, allowExtra: boolean, refresh = false
    ) {
    //check api key exists
    if (!process.env.GEMINI_API_KEY) {
        throw new Error("Missing GEMINI_API_KEY");
    }

    //cache hit? (sorted + lowercased so item order/case doesn't matter)
    const key = JSON.stringify([[...itemNames].map((n) => n.toLowerCase()).sort(), limit, difficulty, allowExtra]);
    const hit = cache.get(key);
    if (!refresh && hit && Date.now() - hit.at < CACHE_TTL_MS) {
        console.log("[suggestions] cache hit");
        return hit.data;
    }

    //create client
    const client = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
    });

    //call model w/prompt +json
    const prompt = generatePrompt(itemNames, limit, difficulty, allowExtra);

    const response = await client.interactions.create({
        model: "gemini-3.1-flash-lite", //gemini-3.5-flash-lite
        input: prompt,
        //tools: [{ type: "google_search" }], //let the model search for real links, NOT WORKING dont use
        response_format: {
            type: "text",
            mime_type: "application/json",
            schema: z.toJSONSchema(Result)
        },

    }, { timeout_ms: 30000 }); //give up after 30s (502)
    
    //json parse, result parse

    const result = Result.parse(JSON.parse(response.output_text ?? ""));
    //check if result not vali json or doesnt match schema
    if (!result || !result.suggestions) { //coudl delete
        throw new Error("Invalid response from Gemini API");
    }

    //check all links in parallel; unusable/missing ones fall back to a youtube search; drop search_query from the output
    const suggestions = await Promise.all(result.suggestions.map(async ({ search_query, ...s }) => ({
        ...s,
        link: s.link && await isUsable(s.link)
            ? s.link
            : `https://www.youtube.com/results?search_query=${encodeURIComponent(search_query || s.title)}`,
    })));

    cache.set(key, { at: Date.now(), data: suggestions }); //only successful results get cached
    return suggestions;

}

//true if the link is https, not a specific youtube video (model guesses ids), and not a 404/410/unreachable
async function isUsable(url: string): Promise<boolean> {
    if (!/^https:\/\//.test(url)) return false;
    if (/youtu\.be\/|youtube\.com\/(watch|shorts)/.test(url)) return false;
    try {
        if (new URL(url).pathname === "/") return false; //homepage only, not a real tutorial
        const r = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(2000) });
        r.body?.cancel(); //we only need the status, don't download the page
        return r.status !== 404 && r.status !== 410;
    } catch {
        return false; //timeout / dns failure
    }
}