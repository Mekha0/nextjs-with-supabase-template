"use client";

import { useEffect, useState } from "react";
import { getMe } from "@/lib/api/auth";
import { errorMessage } from "@/lib/api/http";
import type { Me } from "@/lib/api/types";

export function useMe() {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getMe()
      .then((u) => !cancelled && setMe(u))
      .catch((e) => !cancelled && setError(errorMessage(e)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  return { me, loading, error };
}