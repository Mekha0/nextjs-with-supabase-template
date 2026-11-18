// scan.ts
import { request } from "./http";
import type { ScanCandidate } from "./types";

// The file must be JPEG or PNG, 10 MB max. Don't set Content-Type yourself.
export function scanImage(image: Blob) {
  const form = new FormData();
  form.append("image", image, "scan.jpg");
  return request<{ candidates: ScanCandidate[] }>("/api/scan", {
    method: "POST",
    body: form,
  }).then((r) => r.candidates);
}