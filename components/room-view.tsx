"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Me } from "@/lib/api/types";

type CraftStatus = "todo" | "in_progress" | "complete";
type Craft = { id: string; title: string; status: CraftStatus };
type Item = {
  id: string;
  name: string;
  quantity?: number;
  photo_url?: string | null;
};

const SUPPLY_COLORS = [
  {
    card: "border-[#965455] bg-[#fff5cd]",
    stringMask: "bg-[#fff5cd]",
  },
  {
    card: "border-[#c28080] bg-[#ffe5ea]",
    stringMask: "bg-[#ffe5ea]",
  },
  {
    card: "border-[#558266] bg-[#d4f4e0]",
    stringMask: "bg-[#d4f4e0]",
  },
  {
    card: "border-[#6699bc] bg-[#d7edfc]",
    stringMask: "bg-[#d7edfc]",
  },
];

const RIBBONS = [
  {
    label: "First craft",
    need: 1,
    image: "/achievements/first-craft.svg",
    width: 130,
    height: 142,
  },
  {
    label: "Crafty",
    need: 3,
    image: "/achievements/crafty.svg",
    width: 77,
    height: 89,
  },
  {
    label: "Maker",
    need: 5,
    image: "/achievements/maker.svg",
    width: 91,
    height: 107,
  },
];

export function RoomView({ name }: { name: string }) {
  const [crafts, setCrafts] = useState<Craft[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [progress, setProgress] = useState<Pick<Me, "xp" | "level">>({
    xp: 0,
    level: 1,
  });
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
    <div className="space-y-8 pb-3">
      {/* Header */}
      <header className="font-display flex items-center justify-between gap-3 px-1 pt-1">
        <div className="flex min-w-0 items-center gap-3">
          <div className="font-display flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--green-600))] text-lg uppercase text-primary-foreground">
            {name.charAt(0)}
          </div>
          <div>
            <h1 className="truncate text-2xl leading-tight">{name}</h1>
            <p className="font-sans text-[13px] font-medium text-muted-foreground">
              Level {progress.level} · {progress.xp} XP
            </p>
          </div>
        </div>
        <Link
          href="/crafts?status=todo"
          aria-label="Open saved projects"
          title="Saved projects"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/shopping-cart.svg" alt="" width={29} height={29} />
        </Link>
      </header>

      {/* Supplies shelf */}
      <section aria-label="Your supplies">
        <div
          className={cn(
            "-mx-4 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
            items.length > 4 && "overscroll-x-contain",
          )}
        >
          {loading ? (
            <div className="h-[136px] w-full animate-pulse rounded-xl bg-cork-input/70" />
          ) : items.length === 0 ? (
            <Link
              href="/scan"
              className="flex h-14 items-center justify-center gap-2 rounded-xl border-2 border-dashed border-foreground/30 text-sm text-foreground/70"
            >
              <Plus className="h-4 w-4" /> Scan your first supply
            </Link>
          ) : (
            <div
              className={cn("relative", items.length > 4 ? "w-max" : "w-full")}
            >
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-[16px] z-20 h-[3px] bg-[#8e6548] shadow-[0_1px_1px_rgba(59,47,42,0.5)]"
              />
              <Link
                href="/inventory"
                className={cn(
                  "relative flex gap-2",
                  items.length > 4 ? "w-max" : "w-full justify-evenly",
                )}
                aria-label="Open your supplies"
              >
                {items.map((it, i) => (
                  <span
                    key={it.id}
                    className={cn(
                      "relative flex h-[136px] shrink-0 flex-col items-center rounded-md border p-[7px] pt-[28px] shadow-md",
                      items.length === 4
                        ? "w-[calc((100vw-64px)/4)] max-w-[106px]"
                        : "w-[112px]",
                      SUPPLY_COLORS[i % SUPPLY_COLORS.length].card,
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        "pointer-events-none absolute left-[14px] right-[14px] top-[16px] z-30 h-[3px]",
                        SUPPLY_COLORS[i % SUPPLY_COLORS.length].stringMask,
                      )}
                    />
                    <span
                      className="absolute left-2 right-2 top-[10px] z-40 flex justify-between"
                      aria-hidden="true"
                    >
                      <span className="h-3 w-3 rounded-full border border-[#816f68] bg-[#f4c7b7] shadow-inner" />
                      <span className="h-3 w-3 rounded-full border border-[#816f68] bg-[#f4c7b7] shadow-inner" />
                    </span>
                    <span className="flex h-[98px] w-full items-center justify-center overflow-hidden rounded-[5px] border border-black/20 bg-white/35">
                      {it.photo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={it.photo_url}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="line-clamp-2 px-1 text-center text-[11px] font-semibold">
                          {it.name}
                        </span>
                      )}
                    </span>
                    <span className="mt-1 flex w-full items-center justify-between gap-1 text-[10px] font-semibold leading-none">
                      <span className="truncate">{it.name}</span>
                      {it.quantity && it.quantity > 1 ? (
                        <span>×{it.quantity}</span>
                      ) : null}
                    </span>
                  </span>
                ))}
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Corkboard */}
      <section
        aria-label="Your projects"
        className="relative min-h-[520px] overflow-hidden rounded-[5px] border border-[#96754b] bg-cork p-5 shadow-[4px_4px_25px_0px_rgba(0,0,0,0.2)]"
      >
        {loading ? (
          <div className="h-40 animate-pulse rounded-2xl bg-cork-input/60" />
        ) : (
          <div className="relative grid grid-cols-2 gap-5 pt-8">
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
              title="In Progress"
              crafts={byStatus("in_progress")}
              color="bg-[hsl(349_100%_93%)]"
              tilt="rotate-2"
              className="col-span-2 mx-auto w-1/2"
            />
          </div>
        )}
        {!loading && (
          <ul
            aria-label="Achievements"
            className="absolute inset-x-2 bottom-0 flex h-[130px] items-end justify-around gap-2"
          >
            {RIBBONS.map((r) => {
              const unlocked = completed >= r.need;
              return (
                <li
                  key={r.label}
                  className={cn(
                    "flex min-w-0 flex-1 flex-col items-center gap-1 text-center",
                    !unlocked && "text-foreground/50",
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={r.image}
                    alt=""
                    width={r.width}
                    height={r.height}
                    className={cn("drop-shadow-sm", !unlocked && "opacity-45")}
                  />
                  <span className="w-full truncate text-[10px] font-semibold">
                    {r.label}
                  </span>
                  <span className="text-[9px] opacity-70">
                    {unlocked ? "Unlocked" : `${r.need} completed`}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
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
        "relative z-10 block min-h-[132px] rounded-[5px] border border-black/10 p-3 pt-7 shadow-md transition-transform hover:rotate-0",
        color,
        tilt,
        className,
      )}
    >
      <span
        className="absolute right-3 top-3 h-2.5 w-2.5 rounded-full bg-primary/80"
        aria-hidden="true"
      />
      <p className="text-center text-lg font-display font-light leading-tight">
        {title}
      </p>
      <p className="mt-1 text-center text-2xl font-display font-bold">
        {crafts.length}
      </p>
      {crafts.length > 0 ? (
        <ul className="mt-1 space-y-0.5 text-[12px] text-center text-foreground/80">
          {crafts.slice(0, 2).map((c) => (
            <li key={c.id} className="truncate">
              {c.title}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-1 text-[12px] text-center text-foreground/60">
          Nothing here yet
        </p>
      )}
    </Link>
  );
}
