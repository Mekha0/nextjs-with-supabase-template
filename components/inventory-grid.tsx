"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Camera, Package, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AddItemForm } from "@/components/add-item-form";
import { deleteItem, updateItem } from "@/lib/api/items";

// ASSUMED item shape: adjust to what GET /api/items returns.
type Item = {
  id: string;
  name: string;
  quantity: number;
  photo_url: string | null;
};

// Pastel post-it colors from the Figma (tweak to taste).
const POSTIT = [
  "bg-[hsl(140_42%_82%)]",
  "bg-[hsl(205_70%_84%)]",
  "bg-[hsl(335_70%_88%)]",
  "bg-[hsl(48_90%_82%)]",
];

export function InventoryGrid() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [selected, setSelected] = useState<Item | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/items");
      const data = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(data?.error?.message ?? "Couldn't load your supplies.");
      setItems(Array.isArray(data) ? data : (data.items ?? []));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load your supplies.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Your Supplies</h1>
        <button
          type="button"
          onClick={() => setAdding(true)}
          aria-label="Add a supply"
          className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-primary text-primary hover:bg-primary/10"
        >
          <Plus className="h-5 w-5" />
        </button>
      </header>

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

      {loading && (
        <div className="grid grid-cols-2 gap-3 rounded-3xl bg-cork p-3">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="aspect-[4/5] animate-pulse rounded-xl bg-cork-input/70"
            />
          ))}
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="space-y-3 rounded-3xl bg-cork p-6 text-center">
          <Package
            className="mx-auto h-10 w-10 text-foreground/50"
            strokeWidth={1.25}
          />
          <p className="text-sm text-foreground/80">No supplies yet.</p>
          <div className="flex justify-center gap-2">
            <Button asChild className="rounded-full">
              <Link href="/scan">
                <Camera className="mr-2 h-4 w-4" /> Scan
              </Link>
            </Button>
            <Button
              variant="outline"
              className="rounded-full"
              onClick={() => setAdding(true)}
            >
              Add manually
            </Button>
          </div>
        </div>
      )}

      {!loading && items.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 rounded-3xl bg-cork p-3 shadow-inner">
          {items.map((item, i) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => setSelected(item)}
                className={cn(
                  "w-full rounded-xl p-2.5 text-left shadow-md transition-transform active:scale-95",
                  POSTIT[i % POSTIT.length],
                )}
              >
                <div className="flex aspect-square items-center justify-center overflow-hidden rounded-lg bg-white/60 text-foreground/40">
                  {item.photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.photo_url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Package className="h-8 w-8" strokeWidth={1.25} />
                  )}
                </div>
                <p className="mt-2 truncate text-sm font-medium">{item.name}</p>
                <p className="text-xs text-foreground/70">
                  Qty: {item.quantity}
                </p>
              </button>
            </li>
          ))}
        </ul>
      )}

      {adding && (
        <AddItemSheet
          onClose={() => setAdding(false)}
          onAdded={() => {
            setAdding(false);
            void load();
          }}
        />
      )}

      {selected && (
        <ItemSheet
          item={selected}
          onClose={() => setSelected(null)}
          onSaved={() => {
            setSelected(null);
            void load();
          }}
        />
      )}
    </div>
  );
}

function Sheet({
  title,
  onClose,
  children,
  closeLabel,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  closeLabel?: string;
}) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-end bg-black/40"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="mx-auto w-full max-w-md rounded-t-3xl bg-background p-5 pb-8 shadow-xl"
      >
        <div
          className={cn(
            "mb-4 flex items-center justify-between",
            closeLabel && "border-b border-[#502d1e] pb-1",
          )}
        >
          <h2 className="text-2xl font-bold text-[#502d1e]">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={closeLabel ?? "Close"}
            className={cn(
              "rounded-full p-1.5 hover:bg-muted",
              closeLabel &&
                "min-w-[103px] border border-[#496944] px-4 py-2 text-[16px] font-bold text-[#502d1e]",
            )}
          >
            {closeLabel ?? <X className="h-5 w-5" />}
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function AddItemSheet({
  onClose,
  onAdded,
}: {
  onClose: () => void;
  onAdded: () => void;
}) {
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), quantity, photo_url: null }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(data?.error?.message ?? "Couldn't add that supply.");
      onAdded();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Couldn't add that supply.",
      );
      setSaving(false);
    }
  }

  return (
    <Sheet title="Add item" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-1.5">
          <label htmlFor="item-name" className="text-xs text-foreground/70">
            Type
          </label>
          <input
            id="item-name"
            autoFocus
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Yarn"
            className="h-11 rounded-full bg-cork-input px-4 text-sm outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div className="grid gap-1.5">
          <label htmlFor="item-qty" className="text-xs text-foreground/70">
            Quantity
          </label>
          <input
            id="item-qty"
            type="number"
            min={1}
            value={quantity}
            onChange={(e) =>
              setQuantity(Math.max(1, Number(e.target.value) || 1))
            }
            className="h-11 rounded-full bg-cork-input px-4 text-sm outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            className="h-11 flex-1 rounded-full"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="h-11 flex-1 rounded-full"
            disabled={saving}
          >
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </form>
    </Sheet>
  );
}

function ItemSheet({
  item,
  onClose,
  onSaved,
}: {
  item: Item;
  onClose: () => void;
  onSaved: () => void;
}) {
  return (
    <Sheet title="Edit Item" onClose={onClose} closeLabel="Cancel">
      <AddItemForm
        variant="editor"
        initial={item}
        onCancel={onClose}
        onSave={async (values) => {
          await updateItem(item.id, values);
          onSaved();
        }}
        onDelete={async () => {
          await deleteItem(item.id);
          onSaved();
        }}
      />
    </Sheet>
  );
}
