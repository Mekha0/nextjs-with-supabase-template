import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const WORKFLOW_URL =
  "https://serverless.roboflow.com/me995802-ucf-edu/workflows/yolo-gwc11-izfl6";
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

type Candidate = { name: string; confidence: number };

class RoboflowRequestError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = "RoboflowRequestError";
  }
}

function extractCandidates(value: unknown): Candidate[] {
  const candidates = new Map<string, Candidate>();
  const visited = new Set<object>();

  function visit(node: unknown) {
    if (!node || typeof node !== "object" || visited.has(node)) return;
    visited.add(node);

    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }

    const record = node as Record<string, unknown>;
    const rawName = typeof record.class === "string" ? record.class : record.name;
    const confidence = record.confidence;
    if (
      typeof rawName === "string" &&
      rawName.trim() &&
      typeof confidence === "number" &&
      Number.isFinite(confidence) &&
      confidence >= 0 &&
      confidence <= 1
    ) {
      const name = rawName.trim();
      const current = candidates.get(name);
      if (!current || confidence > current.confidence) {
        candidates.set(name, { name, confidence });
      }
    }

    Object.values(record).forEach(visit);
  }

  visit(value);
  return [...candidates.values()].sort((a, b) => b.confidence - a.confidence);
}

async function runWorkflow(image: File): Promise<unknown> {
  const apiKey = process.env.ROBOFLOW_API_KEY;
  if (!apiKey) throw new RoboflowRequestError("The server is missing ROBOFLOW_API_KEY.");

  const imageBase64 = Buffer.from(await image.arrayBuffer()).toString("base64");
  let lastError: unknown;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(WORKFLOW_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          inputs: { image: { type: "base64", value: imageBase64 } },
        }),
        signal: AbortSignal.timeout(30_000),
      });

      if (response.ok) return await response.json();

      const retryable = response.status === 429 || response.status >= 500;
      lastError = new RoboflowRequestError(
        retryable ? "Roboflow is temporarily unavailable." : "Roboflow rejected the scan request.",
        response.status,
      );
      if (!retryable) throw lastError;
    } catch (error) {
      if (
        error instanceof RoboflowRequestError &&
        error.status !== undefined &&
        error.status < 500 &&
        error.status !== 429
      ) {
        throw error;
      }
      lastError = error;
    }

    if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 400 * 2 ** attempt));
  }

  throw new RoboflowRequestError(
    lastError instanceof Error
      ? `Could not reach Roboflow after three attempts: ${lastError.message}`
      : "Could not reach Roboflow after three attempts.",
  );
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) {
    return NextResponse.json({ error: "Sign in before scanning." }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Send the image as multipart/form-data." }, { status: 400 });
  }

  const image = form.get("image");
  if (!(image instanceof File) || image.size === 0) {
    return NextResponse.json({ error: "An image file is required." }, { status: 400 });
  }
  if (!new Set(["image/jpeg", "image/png"]).has(image.type)) {
    return NextResponse.json({ error: "Image must be a JPEG or PNG file." }, { status: 400 });
  }
  if (image.size > MAX_IMAGE_BYTES) {
    return NextResponse.json({ error: "Image must be 10 MB or smaller." }, { status: 400 });
  }

  try {
    const workflowResult = await runWorkflow(image);
    return NextResponse.json({ candidates: extractCandidates(workflowResult) });
  } catch (error) {
    console.error(
      "Roboflow workflow request failed",
      error instanceof Error ? error.message : "Unknown error",
    );
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Image detection failed." },
      { status: 502 },
    );
  }
}
