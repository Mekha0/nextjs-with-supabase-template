"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Camera, Package, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PhotoPicker } from "@/components/photo-picker";
import { removePhoto, uploadPhoto } from "@/lib/storage/img-bucket";
import { createItemSchema } from "@/lib/validation/items";

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
        <h1 className="font-display text-4xl  tracking-tight">Your Supplies</h1>
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
                aria-label={`Edit ${item.name}`}
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
        <ItemEditSheet
          item={selected}
          sharedPhoto={
            !!selected.photo_url &&
            items.some(
              (candidate) =>
                candidate.id !== selected.id &&
                candidate.photo_url === selected.photo_url,
            )
          }
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
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
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
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-1.5 hover:bg-muted"
          >
            <X className="h-5 w-5" />
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
  const [photo, setPhoto] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError(null);

    let photoUrl: string | null = null;
    try {
      if (photo) photoUrl = await uploadPhoto(photo, "items");
      const res = await fetch("/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          quantity,
          photo_url: photoUrl,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(data?.error?.message ?? "Couldn't add that supply.");
      onAdded();
    } catch (err) {
      void removePhoto(photoUrl); // don't leave an orphaned upload behind
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

        <PhotoPicker file={photo} onChange={setPhoto} disabled={saving} />

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
            {saving ? (photo ? "Uploading…" : "Saving…") : "Save"}
          </Button>
        </div>
      </form>
    </Sheet>
  );
}

function ItemEditSheet({
  item,
  sharedPhoto,
  onClose,
  onSaved,
}: {
  item: Item;
  sharedPhoto: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(item.name);
  const [quantity, setQuantity] = useState(String(item.quantity));
  const [photo, setPhoto] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const parsed = createItemSchema.safeParse({
      name,
      quantity: Number(quantity),
      photo_url: item.photo_url,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the supply details.");
      return;
    }

    setSaving(true);
    setError(null);
    let uploadedPhotoUrl: string | null = null;
    try {
      uploadedPhotoUrl = photo ? await uploadPhoto(photo, "items") : null;
      const photoUrl = uploadedPhotoUrl ?? item.photo_url;
      const response = await fetch(`/api/items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...parsed.data,
          photo_url: photoUrl,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(data?.error?.message ?? "Couldn't update that supply.");

      if (uploadedPhotoUrl && item.photo_url && !sharedPhoto)
        void removePhoto(item.photo_url);
      onSaved();
    } catch (err) {
      if (uploadedPhotoUrl) void removePhoto(uploadedPhotoUrl);
      setError(
        err instanceof Error ? err.message : "Couldn't update that supply.",
      );
      setSaving(false);
    }
  }

  async function remove() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/items/${item.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error?.message ?? "Couldn't delete that supply.");
      }
      if (item.photo_url && !sharedPhoto) void removePhoto(item.photo_url);
      onSaved();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Couldn't delete that supply.",
      );
      setSaving(false);
      setConfirmDelete(false);
    }
  }

  return (
    <Sheet title="Edit item" onClose={onClose}>
      <form onSubmit={save} className="space-y-4">
        <div className="grid gap-1.5">
          <label htmlFor="edit-item-name" className="text-xs text-foreground/70">
            Type
          </label>
          <input
            id="edit-item-name"
            required
            maxLength={64}
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="h-11 rounded-full bg-cork-input px-4 text-sm outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div className="grid gap-1.5">
          <label htmlFor="edit-item-quantity" className="text-xs text-foreground/70">
            Quantity
          </label>
          <input
            id="edit-item-quantity"
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            className="h-11 rounded-full bg-cork-input px-4 text-sm outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <PhotoPicker
          file={photo}
          onChange={setPhoto}
          existingUrl={item.photo_url}
          disabled={saving}
        />

        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <div className="grid grid-cols-2 gap-3">
          <Button
            type="button"
            variant="destructive"
            className="h-11 w-full rounded-full"
            onClick={remove}
            disabled={saving}
          >
            {confirmDelete ? "Confirm delete" : "Delete"}
          </Button>
          <Button
            type="submit"
            className="h-11 w-full rounded-full"
            disabled={saving}
          >
            {saving ? (photo ? "Uploading…" : "Saving…") : "Save"}
          </Button>
        </div>
      </form>
    </Sheet>
  );
}
