"use client";

import { useState } from "react";
import { PhotoField } from "@/components/photo-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { errorMessage } from "@/lib/api/http";
import { uploadPhoto } from "@/lib/storage/photos";

const MAX_QUANTITY = 2_147_483_647;

export type ItemFormValues = {
  name: string;
  quantity: number;
  photo_url: string | null;
};

type Props = {
  initial?: { name?: string; quantity?: number; photo_url?: string | null };
  initialPhotoFile?: File | null;
  nameOptions?: string[];
  onSave: (values: ItemFormValues) => Promise<void>;
  onCancel: () => void;
  onDelete?: () => Promise<void>;
};

export function AddItemForm({
  initial,
  initialPhotoFile = null,
  nameOptions,
  onSave,
  onCancel,
  onDelete,
}: Props) {
  const [name, setName] = useState(initial?.name ?? "");
  const [quantityText, setQuantityText] = useState(
    String(initial?.quantity ?? 1),
  );
  const [photo, setPhoto] = useState<File | null>(initialPhotoFile);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  function validate(): string | null {
    const trimmed = name.trim();
    if (trimmed.length < 1 || trimmed.length > 64) {
      return "Type is required (up to 64 characters).";
    }
    const qty = Number(quantityText);
    if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QUANTITY) {
      return "Quantity must be a whole number, 1 or more.";
    }
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const problem = validate();
    if (problem) return setError(problem);

    setBusy(true);
    setError(null);
    try {
      // Upload only on Save, so cancelling never leaves orphaned files in storage.
      const photo_url = photo
        ? await uploadPhoto(photo)
        : (initial?.photo_url ?? null);
      await onSave({
        name: name.trim(),
        quantity: Number(quantityText),
        photo_url,
      });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!onDelete) return;
    if (!confirmDelete) return setConfirmDelete(true);
    setBusy(true);
    setError(null);
    try {
      await onDelete();
    } catch (err) {
      setError(errorMessage(err));
      setConfirmDelete(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="item-name">Type</Label>
        <Input
          id="item-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={64}
          placeholder="Yarn"
          className="rounded-full border-border bg-input"
        />
        {nameOptions && nameOptions.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {nameOptions.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setName(option)}
                className="rounded-full bg-secondary px-3 py-1 text-xs text-secondary-foreground"
              >
                {option}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="item-qty">Quantity</Label>
        <Input
          id="item-qty"
          type="number"
          inputMode="numeric"
          min={1}
          step={1}
          value={quantityText}
          onChange={(e) => setQuantityText(e.target.value)}
          className="rounded-full border-border bg-input"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label>Photo</Label>
        <PhotoField
          initialUrl={initial?.photo_url ?? null}
          initialFile={initialPhotoFile}
          onChange={setPhoto}
        />
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex gap-3">
        {onDelete ? (
          <Button
            type="button"
            variant="destructive"
            disabled={busy}
            onClick={handleDelete}
            className="flex-1 rounded-full"
          >
            {confirmDelete ? "Tap again to delete" : "Delete"}
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={onCancel}
            className="flex-1 rounded-full"
          >
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={busy} className="flex-1 rounded-full">
          {busy ? "Saving…" : "Save"}
        </Button>
      </div>
    </form>
  );
}
