"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ExternalLink, Hammer, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/sheet";
import { cn } from "@/lib/utils";
import { PhotoPicker } from "@/components/photo-picker";
import { removePhoto, uploadPhoto } from "@/lib/storage/photos";

type CraftStatus = "todo" | "in_progress" | "complete";
type Craft = {
  id: string;
  title: string;
  description: string | null;
  status: CraftStatus;
  photo_url: string | null;
};

const TABS: { id: CraftStatus; label: string }[] = [
  { id: "todo", label: "To-do" },
  { id: "in_progress", label: "In progress" },
  { id: "complete", label: "Completed" },
];

const isStatus = (v: string | null): v is CraftStatus =>
  v === "todo" || v === "in_progress" || v === "complete";

// Suggestions are saved with "Instructions: <url>" at the end of the description.
function splitDescription(description: string | null) {
  const text = description ?? "";
  const match = text.match(/Instructions:\s*(https:\/\/\S+)/);
  return {
    summary: text.split("\n\n")[0] ?? "",
    full: text.replace(/\n*Instructions:\s*https:\/\/\S+/, "").trim(),
    link: match?.[1] ?? null,
  };
}

export function CraftsList() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const param = searchParams.get("status");
  const active: CraftStatus = isStatus(param) ? param : "todo";

  const [crafts, setCrafts] = useState<Craft[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/crafts");
      const data = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(data?.error?.message ?? "Couldn't load your projects.");
      setCrafts(data.crafts ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load your projects.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const counts = useMemo(() => {
    const c: Record<CraftStatus, number> = {
      todo: 0,
      in_progress: 0,
      complete: 0,
    };
    for (const craft of crafts) c[craft.status] += 1;
    return c;
  }, [crafts]);

  const visible = crafts.filter((c) => c.status === active);
  const selected = crafts.find((c) => c.id === selectedId) ?? null;

  function setTab(status: CraftStatus) {
    router.replace(`${pathname}?status=${status}`, { scroll: false });
  }

  return (
    <div className="space-y-5">
      <header className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-4xl font-display tracking-tight">My Projects</h1>
          <p className="text-sm text-muted-foreground">
            Pick up where you left off.
          </p>
        </div>
        <Button
          variant="outline"
          asChild
          className="mx-0 h-8 w-auto shrink-0 px-3.5 text-xs"
        >
          <Link href="/home">Home</Link>
        </Button>
      </header>

      <div
        role="tablist"
        aria-label="Project status"
        className="flex gap-1 rounded-full bg-muted p-1"
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={active === t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex-1 rounded-full px-2 py-2 text-xs font-medium transition-colors",
              active === t.id
                ? "bg-primary text-primary-foreground"
                : "text-foreground/70",
            )}
          >
            {t.label} ({counts[t.id]})
          </button>
        ))}
      </div>

      {loading && (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-2xl bg-cork/60"
            />
          ))}
        </div>
      )}

      {error && (
        <div className="space-y-3 text-center">
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
          <Button
            variant="outline"
            className="rounded-full"
            onClick={() => void load()}
          >
            Try again
          </Button>
        </div>
      )}

      {!loading && !error && visible.length === 0 && (
        <div className="space-y-3 rounded-2xl border border-dashed border-foreground/30 p-6 text-center">
          <p className="text-sm text-foreground/70">
            {active === "todo" && "Nothing saved yet."}
            {active === "in_progress" && "You haven't started a project yet."}
            {active === "complete" &&
              "No finished projects yet. You've got this!"}
          </p>
          <Button asChild className="rounded-full">
            <Link href="/suggestions">Find a project</Link>
          </Button>
        </div>
      )}

      <ul className="space-y-3">
        {visible.map((craft) => (
          <li key={craft.id}>
            <button
              type="button"
              onClick={() => setSelectedId(craft.id)}
              className="flex w-full gap-3 rounded-2xl bg-cork p-3 text-left shadow-md transition-transform active:scale-[0.98]"
            >
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-cork-input text-foreground/40">
                {craft.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={craft.photo_url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Hammer className="h-7 w-7" strokeWidth={1.5} />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="truncate font-semibold">{craft.title}</h2>
                <p className="line-clamp-2 text-xs text-foreground/80">
                  {splitDescription(craft.description).summary}
                </p>
              </div>
            </button>
          </li>
        ))}
      </ul>

      {selected && (
        <CraftSheet
          craft={selected}
          onClose={() => setSelectedId(null)}
          onChanged={(updated) =>
            setCrafts((cur) =>
              cur.map((c) => (c.id === updated.id ? { ...c, ...updated } : c)),
            )
          }
          onDeleted={(id) => {
            setCrafts((cur) => cur.filter((c) => c.id !== id));
            setSelectedId(null);
          }}
        />
      )}
    </div>
  );
}

function CraftSheet({
  craft,
  onClose,
  onChanged,
  onDeleted,
}: {
  craft: Craft;
  onClose: () => void;
  onChanged: (craft: Craft) => void;
  onDeleted: (id: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const { full, link } = splitDescription(craft.description);

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function patch(body: { status?: CraftStatus; photo_url?: string }) {
    const res = await fetch(`/api/crafts/${craft.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok)
      throw new Error(data?.error?.message ?? "Couldn't update that project.");
    onChanged((data.craft as Craft | undefined) ?? { ...craft, ...body });
  }

  // Uploads the selected photo (if any), then updates the craft in one PATCH.
  async function applyChanges(status?: CraftStatus) {
    let url: string | undefined;
    try {
      if (file) url = await uploadPhoto(file, "crafts");
      await patch({
        ...(status ? { status } : {}),
        ...(url ? { photo_url: url } : {}),
      });
    } catch (e) {
      void removePhoto(url);
      throw e;
    }
    if (url && craft.photo_url) void removePhoto(craft.photo_url); // replaced
    setFile(null);
  }

  const setStatus = (status: CraftStatus) => run(() => patch({ status }));

  const remove = () =>
    run(async () => {
      const res = await fetch(`/api/crafts/${craft.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          data?.error?.message ?? "Couldn't delete that project.",
        );
      }
      void removePhoto(craft.photo_url);
      onDeleted(craft.id);
    });

  return (
    <Sheet title={craft.title} onClose={onClose}>
      <div className="space-y-4">
        {craft.status === "todo" && craft.photo_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={craft.photo_url}
            alt=""
            className="aspect-[4/3] w-full rounded-2xl object-cover"
          />
        )}

        {full && (
          <p className="whitespace-pre-wrap text-sm text-foreground/90">
            {full}
          </p>
        )}

        {link && (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary underline underline-offset-4"
          >
            <ExternalLink className="h-4 w-4" /> Open instructions
          </a>
        )}

        {craft.status !== "todo" && (
          <PhotoPicker
            file={file}
            onChange={setFile}
            existingUrl={craft.photo_url}
            disabled={busy}
            label={
              craft.status === "complete"
                ? "Photo of your finished craft"
                : "Add a photo of your finished craft (optional)"
            }
          />
        )}

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        {confirming ? (
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="h-11 flex-1 rounded-full"
              onClick={() => setConfirming(false)}
            >
              Keep it
            </Button>
            <Button
              variant="destructive"
              className="h-11 flex-1 rounded-full"
              onClick={remove}
              disabled={busy}
            >
              {busy ? "Deleting…" : "Yes, delete"}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {craft.status === "todo" && (
              <Button
                className="h-11 w-full rounded-full"
                disabled={busy}
                onClick={() => setStatus("in_progress")}
              >
                Start this craft
              </Button>
            )}
            {craft.status === "in_progress" && (
              <>
                <Button
                  className="h-11 w-full rounded-full"
                  disabled={busy}
                  onClick={() => run(() => applyChanges("complete"))}
                >
                  {busy ? (file ? "Uploading…" : "Saving…") : "Mark complete"}
                </Button>
                <Button
                  variant="outline"
                  className="h-11 w-full rounded-full"
                  disabled={busy}
                  onClick={() => setStatus("todo")}
                >
                  Move back to saved
                </Button>
              </>
            )}
            {craft.status === "complete" && (
              <>
                {file && (
                  <Button
                    className="h-11 w-full rounded-full"
                    disabled={busy}
                    onClick={() => run(() => applyChanges())}
                  >
                    {busy ? "Uploading…" : "Save photo"}
                  </Button>
                )}
                <Button
                  variant="outline"
                  className="h-11 w-full rounded-full"
                  disabled={busy}
                  onClick={() => setStatus("in_progress")}
                >
                  Reopen
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              className="h-11 w-full rounded-full text-destructive hover:text-destructive"
              disabled={busy}
              onClick={() => setConfirming(true)}
            >
              Delete project
            </Button>
          </div>
        )}
      </div>
    </Sheet>
  );
}
