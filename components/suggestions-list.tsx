"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Bookmark, BookmarkCheck, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Suggestion = {
  title: string;
  description: string;
  link: string | null;
  required_materials: string[];
  required_tools: string[];
  missing_materials: string[];
  source: string;
};

type CraftStatus = "todo" | "in_progress" | "complete";
type Craft = { id: string; title: string; status: CraftStatus };
type ApiError = { code: string; message: string };

const DIFFICULTIES = ["any", "beginner", "intermediate", "advanced"] as const;
type Difficulty = (typeof DIFFICULTIES)[number];

const norm = (title: string) => title.trim().toLowerCase();

// The crafts schema is strict (title, description, status, photo_url),
// so materials, tools and the link go into the description text.
function buildDescription(s: Suggestion) {
  const parts = [s.description.trim()];
  if (s.required_materials.length)
    parts.push(`Materials you have: ${s.required_materials.join(", ")}`);
  if (s.missing_materials.length)
    parts.push(`Need to buy: ${s.missing_materials.join(", ")}`);
  if (s.required_tools.length)
    parts.push(`Tools: ${s.required_tools.join(", ")}`);
  if (s.link) parts.push(`Instructions: ${s.link}`);
  return parts.join("\n\n").slice(0, 2000);
}

export function SuggestionsList() {
  const [items, setItems] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [willingToBuy, setWillingToBuy] = useState(true);
  const [difficulty, setDifficulty] = useState<Difficulty>("any");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Existing crafts, keyed by normalized title, so we can show Saved / In progress.
  const [crafts, setCrafts] = useState<Record<string, Craft>>({});
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/crafts");
        if (!res.ok) return;
        const data = await res.json();
        const map: Record<string, Craft> = {};
        for (const c of (data.crafts ?? []) as Craft[]) map[norm(c.title)] = c;
        setCrafts(map);
      } catch {
        /* non-fatal: buttons just won't know about existing crafts */
      }
    })();
  }, []);

  const load = useCallback(
    async (signal: AbortSignal) => {
      setLoading(true);
      setError(null);
      setExpanded(null);
      try {
        const qs = new URLSearchParams({
          limit: "5",
          difficulty,
          allow_extra: String(willingToBuy),
        });
        const res = await fetch(`/api/suggestions?${qs}`, { signal });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError({
            code: data?.error?.code ?? "unknown",
            message: data?.error?.message ?? "Couldn't load suggestions.",
          });
          setItems([]);
          return;
        }
        setItems(data.suggestions ?? []);
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
        setError({ code: "network", message: "Couldn't reach the server." });
        setItems([]);
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    },
    [difficulty, willingToBuy],
  );

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load, refreshKey]);

  async function saveCraft(s: Suggestion, status: CraftStatus) {
    const k = norm(s.title);
    const existing = crafts[k];
    setBusyKey(k);
    setActionError(null);
    try {
      const res = existing
        ? await fetch(`/api/crafts/${existing.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status }),
          })
        : await fetch("/api/crafts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: s.title.trim().slice(0, 128),
              description: buildDescription(s),
              status,
              required_materials: s.required_materials,
            }),
          });
      const data = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(data?.error?.message ?? "Couldn't save that project.");
      const craft = (data.craft ?? { ...existing, status }) as Craft;
      setCrafts((cur) => ({ ...cur, [k]: craft }));
    } catch (e) {
      setActionError(
        e instanceof Error ? e.message : "Couldn't save that project.",
      );
    } finally {
      setBusyKey(null);
    }
  }

  const retry = () => setRefreshKey((n) => n + 1);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="h-4 w-4 accent-[hsl(var(--primary))]"
            checked={willingToBuy}
            onChange={(e) => setWillingToBuy(e.target.checked)}
          />
          Willing to buy supplies?
        </label>

        <select
          aria-label="Difficulty level"
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value as Difficulty)}
          className="h-9 rounded-full bg-primary px-4 text-sm capitalize text-primary-foreground outline-none"
        >
          {DIFFICULTIES.map((d) => (
            <option key={d} value={d}>
              {d === "any" ? "Difficulty level" : d}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-3 text-sm text-foreground/70">
        <span>You can make:</span>
        <span className="h-px flex-1 border-t border-dashed border-foreground/30" />
        <button
          type="button"
          onClick={retry}
          disabled={loading}
          aria-label="Get new ideas"
          className="rounded-full p-1.5 hover:bg-cork/50 disabled:opacity-50"
        >
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
        </button>
      </div>

      {actionError && (
        <p role="alert" className="text-sm text-destructive">
          {actionError}
        </p>
      )}

      {loading && (
        <div className="space-y-3" aria-busy="true">
          <p className="flex items-center gap-2 text-sm text-foreground/70">
            <Sparkles className="h-4 w-4" /> Dreaming up projects from your
            supplies…
          </p>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-2xl bg-cork/60"
            />
          ))}
        </div>
      )}

      {!loading && error?.code === "empty_inventory" && (
        <div className="space-y-3 rounded-2xl border border-dashed border-foreground/30 p-6 text-center">
          <p className="text-sm text-foreground/70">
            Add at least one supply to get project ideas.
          </p>
          <Button asChild className="rounded-full">
            <Link href="/scan">Scan supplies</Link>
          </Button>
        </div>
      )}

      {!loading && error && error.code !== "empty_inventory" && (
        <div className="space-y-3 text-center">
          <p role="alert" className="text-sm text-destructive">
            {error.message}
          </p>
          <Button variant="outline" className="rounded-full" onClick={retry}>
            Try again
          </Button>
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <p className="rounded-2xl border border-dashed border-foreground/30 p-6 text-center text-sm text-foreground/70">
          Nothing matched. Try allowing extra supplies, or change the
          difficulty.
        </p>
      )}

      {!loading && (
        <ul className="space-y-3">
          {items.map((s, i) => {
            const k = norm(s.title);
            const cardKey = `${k}-${i}`;
            const open = expanded === cardKey;
            const craft = crafts[k];
            const busy = busyKey === k;
            const started =
              craft?.status === "in_progress" || craft?.status === "complete";

            return (
              <li key={cardKey} className="rounded-2xl bg-cork p-3 shadow-md">
                <div className="flex gap-3">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-cork-input text-foreground/40">
                    <Sparkles className="h-7 w-7" strokeWidth={1.5} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-semibold leading-snug">{s.title}</h2>
                    <p
                      className={cn(
                        "mt-0.5 text-xs text-foreground/80",
                        !open && "line-clamp-2",
                      )}
                    >
                      {s.description}
                    </p>
                  </div>
                </div>

                {open && (
                  <div className="mt-3 space-y-3 border-t border-foreground/15 pt-3 text-xs">
                    {s.required_materials.length > 0 && (
                      <div>
                        <p className="font-medium">You have:</p>
                        <ul className="mt-1 list-inside list-disc space-y-0.5">
                          {s.required_materials.map((m) => (
                            <li key={m}>{m}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {s.missing_materials.length > 0 && (
                      <div>
                        <p className="font-medium">You need to buy:</p>
                        <ul className="mt-1 list-inside list-disc space-y-0.5">
                          {s.missing_materials.map((m) => (
                            <li key={m}>{m}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {s.required_tools.length > 0 && (
                      <div>
                        <p className="font-medium">Tools:</p>
                        <ul className="mt-1 list-inside list-disc space-y-0.5">
                          {s.required_tools.map((t) => (
                            <li key={t}>{t}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {s.link && (
                      <a
                        href={s.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block truncate underline underline-offset-2"
                      >
                        Instructions
                      </a>
                    )}
                  </div>
                )}

                <div className="mt-3 flex items-center justify-end gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 rounded-full px-3 text-xs"
                    onClick={() => setExpanded(open ? null : cardKey)}
                  >
                    {open ? "Shorten" : "Expand"}
                  </Button>

                  {!started && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 rounded-full px-3 text-xs"
                      disabled={busy || !!craft}
                      onClick={() => saveCraft(s, "todo")}
                      aria-label={craft ? "Saved" : "Save for later"}
                    >
                      {craft ? (
                        <BookmarkCheck className="h-3.5 w-3.5" />
                      ) : (
                        <Bookmark className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  )}

                  <Button
                    size="sm"
                    className="h-7 rounded-full px-3 text-xs"
                    disabled={busy || started}
                    onClick={() => saveCraft(s, "in_progress")}
                  >
                    {craft?.status === "complete"
                      ? "Completed"
                      : craft?.status === "in_progress"
                        ? "In progress"
                        : busy
                          ? "Starting…"
                          : "Start this craft"}
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
