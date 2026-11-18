"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import { getSuggestions } from "@/lib/api/suggestions";
import { ApiError, errorMessage } from "@/lib/api/http";
import type { Difficulty, Suggestion } from "@/lib/api/types";

type LoadOptions = {
  difficulty?: Difficulty;
  allowExtra?: boolean;
  limit?: number;
};

type Value = {
  suggestions: Suggestion[] | null; // null = never loaded
  loading: boolean;
  error: string | null;
  emptyInventory: boolean;
  selected: Suggestion | null;
  load: (opts?: LoadOptions) => Promise<void>;
  select: (s: Suggestion | null) => void;
};

const Ctx = createContext<Value | null>(null);

export function SuggestionsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emptyInventory, setEmptyInventory] = useState(false);
  const [selected, setSelected] = useState<Suggestion | null>(null);
  const latest = useRef(0);

  const load = useCallback(async (opts: LoadOptions = {}) => {
    const id = ++latest.current; // ignore stale responses if filters change quickly
    setLoading(true);
    setError(null);
    setEmptyInventory(false);
    try {
      const result = await getSuggestions(opts);
      if (id === latest.current) setSuggestions(result);
    } catch (e) {
      if (id !== latest.current) return;
      if (e instanceof ApiError && e.code === "empty_inventory")
        setEmptyInventory(true);
      else setError(errorMessage(e));
    } finally {
      if (id === latest.current) setLoading(false);
    }
  }, []);

  return (
    <Ctx.Provider
      value={{
        suggestions,
        loading,
        error,
        emptyInventory,
        selected,
        load,
        select: setSelected,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useSuggestions() {
  const v = useContext(Ctx);
  if (!v)
    throw new Error("useSuggestions must be used inside <SuggestionsProvider>");
  return v;
}
