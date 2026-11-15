import { GoogleGenAI } from "@google/genai";
import "server-only";
import z from "zod";
import { generatePrompt } from "./prompt";
import { Result } from "./schema";

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

    //call model w/prompt +json
    const prompt = generatePrompt(itemNames, limit, difficulty, allowExtra);

    const response = await client.interactions.create({
        model: "gemini-3.5-flash-lite",
        input: prompt,
        // tools: [{ type: "google_search" }], //let the model search for real links, NOT WORKING dont use
        response_format: {
            type: "text",
            mime_type: "application/json",
            schema: z.toJSONSchema(Result)
        },

    }, { timeout_ms: 60000 }); //give up after 60s (502)
    
    //json parse, result parse

    const result = Result.parse(JSON.parse(response.output_text ?? ""));
    //check if result not vali json or doesnt match schema
    if (!result || !result.suggestions) { //coudl delete
        throw new Error("Invalid response from Gemini API");
    }

    //return suggestions
    return result.suggestions;

}