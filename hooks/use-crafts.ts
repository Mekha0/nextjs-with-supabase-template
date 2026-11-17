"use client";

import { useCallback, useEffect, useState } from "react";
import * as api from "@/lib/api/crafts";
import { errorMessage } from "@/lib/api/http";
import type { Craft, CraftStatus } from "@/lib/api/types";

export function useCrafts(status?: CraftStatus) {
  const [crafts, setCrafts] = useState<Craft[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .listCrafts(status)
      .then((data) => !cancelled && setCrafts(data))
      .catch((e) => !cancelled && setError(errorMessage(e)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [status, version]);

  const refresh = useCallback(() => setVersion((v) => v + 1), []);

  const add = useCallback(
    async (input: Parameters<typeof api.createCraft>[0]) => {
      const craft = await api.createCraft(input);
      if (!status || craft.status === status) setCrafts((prev) => [craft, ...prev]);
      return craft;
    },
    [status],
  );

  const remove = useCallback(async (id: string) => {
    await api.deleteCraft(id);
    setCrafts((prev) => prev.filter((c) => c.id !== id));
  }, []);

  // Returns { craft, user? }. `user` (new xp/level) is only present when XP was awarded.
  const complete = useCallback(
    async (id: string, photo_url?: string | null) => {
      const result = await api.completeCraft(id, photo_url);
      setCrafts((prev) =>
        status && status !== "complete"
          ? prev.filter((c) => c.id !== id) // leaves this list
          : prev.map((c) => (c.id === id ? { ...c, ...result.craft } : c)),
      );
      return result;
    },
    [status],
  );

  return { crafts, loading, error, refresh, add, remove, complete };
}