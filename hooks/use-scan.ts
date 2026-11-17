"use client";

import { useCallback, useState } from "react";
import { scanImage } from "@/lib/api/scan";
import { errorMessage } from "@/lib/api/http";
import { downscaleImage } from "@/lib/storage/photos";
import type { ScanCandidate } from "@/lib/api/types";

type Status = "idle" | "scanning" | "done" | "error";

export function useScan() {
  const [status, setStatus] = useState<Status>("idle");
  const [candidates, setCandidates] = useState<ScanCandidate[]>([]);
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);

  const scan = useCallback(async (image: Blob) => {
    setStatus("scanning");
    setError(null);
    setCandidates([]);
    try {
      const small = await downscaleImage(image); // JPEG, well under the 10 MB cap
      setPhoto(small);
      const result = await scanImage(small);
      setCandidates(result);
      setStatus("done");
    } catch (e) {
      setError(errorMessage(e));
      setStatus("error");
    }
  }, []);

  const reset = useCallback(() => {
    setStatus("idle");
    setCandidates([]);
    setPhoto(null);
    setError(null);
  }, []);

  return {
    status,
    scanning: status === "scanning",
    candidates,
    top: candidates[0] ?? null, // highest confidence, for autofilling Add Item
    photo, // reuse as the item's photo
    error,
    scan,
    reset,
  };
}