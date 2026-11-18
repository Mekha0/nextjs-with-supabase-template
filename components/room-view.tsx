"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Award, Package, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Me } from "@/lib/api/types";

type CraftStatus = "todo" | "in_progress" | "complete";
type Craft = { id: string; title: string; status: CraftStatus };
type Item = { id: string; name: string };

const SHELF_COLORS = [
  "bg-[hsl(140_42%_82%)]",
  "bg-[hsl(205_70%_84%)]",
  "bg-[hsl(335_70%_88%)]",
  "bg-[hsl(48_90%_82%)]",
];

const RIBBONS = [
  { label: "First craft", need: 1 },
  { label: "Crafty", need: 3 },
  { label: "Maker", need: 5 },
];

export function RoomView({ name }: { name: string }) {
  const [crafts, setCrafts] = useState<Craft[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [progress, setProgress] = useState<Pick<Me, "xp" | "level">>({ xp: 0, level: 1 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [c, i, me] = await Promise.all([
          fetch("/api/crafts"),
          fetch("/api/items"),
          fetch("/api/auth/me"),
        ]);
        if (c.ok) setCrafts((await c.json()).crafts ?? []);
        if (i.ok) {
          const data = await i.json();
          setItems(Array.isArray(data) ? data : (data.items ?? []));
        }
        if (me.ok) {
          const data = await me.json();
          setProgress({ xp: data.user.xp, level: data.user.level });
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const byStatus = (s: CraftStatus) => crafts.filter((c) => c.status === s);
  const completed = byStatus("complete").length;
  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-lg font-semibold uppercase text-primary-foreground">
          {name.charAt(0)}
        </div>
        <div>
          <h1 className="text-xl font-semibold leading-tight">{name}</h1>
          <p className="text-xs text-muted-foreground">
            Level {progress.level} · {progress.xp} XP
          </p>
        </div>
      </header>

      {/* Supplies shelf */}
      <section aria-label="Your supplies">
        <div className="rounded-2xl bg-cork p-3 shadow-inner">
          {loading ? (
            <div className="h-14 animate-pulse rounded-xl bg-cork-input/70" />
          ) : items.length === 0 ? (
            <Link
              href="/scan"
              className="flex h-14 items-center justify-center gap-2 rounded-xl border-2 border-dashed border-foreground/30 text-sm text-foreground/70"
            >
              <Plus className="h-4 w-4" /> Scan your first supply
            </Link>
          ) : (
            <Link
              href="/inventory"
              className="flex gap-2"
              aria-label="Open your supplies"
            >
              {items.slice(0, 4).map((it, i) => (
                <span
                  key={it.id}
                  className={cn(
                    "flex h-14 min-w-0 flex-1 items-center justify-center rounded-md px-1 text-center text-[11px] font-medium leading-tight shadow-sm",
                    SHELF_COLORS[i % SHELF_COLORS.length],
                  )}
                >
                  <span className="line-clamp-2">{it.name}</span>
                </span>
              ))}
              {items.length > 4 && (
                <span className="flex h-14 w-10 shrink-0 items-center justify-center rounded-md bg-cork-input text-xs">
                  +{items.length - 4}
                </span>
              )}
            </Link>
          )}
        </div>
        <div className="mx-1 h-2 rounded-b-md bg-primary/70" />
      </section>

      {/* Corkboard */}
      <section
        aria-label="Your projects"
        className="rounded-3xl bg-cork p-4 shadow-inner"
      >
        {loading ? (
          <div className="h-40 animate-pulse rounded-2xl bg-cork-input/60" />
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <PostIt
              href="/crafts?status=todo"
              title="Saved / To-Do"
              crafts={byStatus("todo")}
              color="bg-[hsl(140_42%_82%)]"
              tilt="-rotate-3"
            />
            <PostIt
              href="/crafts?status=complete"
              title="Completed"
              crafts={byStatus("complete")}
              color="bg-[hsl(48_90%_82%)]"
              tilt="rotate-3"
            />
            <PostIt
              href="/crafts?status=in_progress"
              title="In progress"
              crafts={byStatus("in_progress")}
              color="bg-[hsl(335_70%_88%)]"
              tilt="rotate-2"
              className="col-span-2 mx-auto w-1/2"
            />
          </div>
        )}
      </section>

      {/* Milestone ribbons */}
      <section aria-label="Milestones" className="space-y-2">
        <h2 className="text-sm font-medium text-foreground/70">Milestones</h2>
        <ul className="flex gap-3">
          {RIBBONS.map((r) => {
            const unlocked = completed >= r.need;
            return (
              <li
                key={r.label}
                className={cn(
                  "flex flex-1 flex-col items-center gap-1 rounded-2xl p-3 text-center",
                  unlocked ? "bg-cork" : "bg-muted text-muted-foreground",
                )}
              >
                <Award
                  className={cn(
                    "h-7 w-7",
                    unlocked ? "text-primary" : "opacity-40",
                  )}
                />
                <span className="text-xs font-medium">{r.label}</span>
                <span className="text-[10px] opacity-70">
                  {unlocked ? "Unlocked" : `${r.need} completed`}
                </span>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

function PostIt({
  href,
  title,
  crafts,
  color,
  tilt,
  className,
}: {
  href: string;
  title: string;
  crafts: { id: string; title: string }[];
  color: string;
  tilt: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "block min-h-32 rounded-md p-3 shadow-md transition-transform hover:rotate-0",
        color,
        tilt,
        className,
      )}
    >
      <p className="text-sm font-semibold leading-tight">{title}</p>
      <p className="text-2xl font-bold">{crafts.length}</p>
      {crafts.length > 0 ? (
        <ul className="mt-1 space-y-0.5 text-[11px] text-foreground/80">
          {crafts.slice(0, 2).map((c) => (
            <li key={c.id} className="truncate">
              {c.title}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-1 text-[11px] text-foreground/60">Nothing here yet</p>
      )}
    </Link>
  );
}
