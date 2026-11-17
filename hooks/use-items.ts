"use client";

import { useCallback, useEffect, useState } from "react";
import * as api from "@/lib/api/items";
import { errorMessage } from "@/lib/api/http";
import type { Item } from "@/lib/api/types";

export function useItems() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .listItems()
      .then((data) => !cancelled && setItems(data))
      .catch((e) => !cancelled && setError(errorMessage(e)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [version]);

  const refresh = useCallback(() => setVersion((v) => v + 1), []);

  // The server merges same-name items, so replace if the id already exists.
  const add = useCallback(async (input: Parameters<typeof api.createItem>[0]) => {
    const item = await api.createItem(input);
    setItems((prev) =>
      prev.some((i) => i.id === item.id)
        ? prev.map((i) => (i.id === item.id ? item : i))
        : [...prev, item],
    );
    return item;
  }, []);

  const update = useCallback(
    async (id: string, input: Parameters<typeof api.updateItem>[1]) => {
      const item = await api.updateItem(id, input);
      setItems((prev) => prev.map((i) => (i.id === id ? item : i)));
      return item;
    },
    [],
  );

  const remove = useCallback(async (id: string) => {
    await api.deleteItem(id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  return { items, loading, error, refresh, add, update, remove };
}