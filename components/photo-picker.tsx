"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { MAX_UPLOAD_BYTES } from "@/lib/storage/img-bucket";

export function PhotoPicker({
  file,
  onChange,
  existingUrl,
  label = "Insert photo",
  disabled,
}: {
  file: File | null;
  onChange: (file: File | null) => void;
  existingUrl?: string | null;
  label?: string;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function pick(f?: File) {
    if (inputRef.current) inputRef.current.value = ""; // allow re-picking the same file
    if (!f) return;
    if (!f.type.startsWith("image/")) return setError("Choose an image file.");
    if (f.size > MAX_UPLOAD_BYTES)
      return setError("Choose an image that is 10 MB or smaller.");
    setError(null);
    onChange(f);
  }

  const shown = preview ?? existingUrl ?? null;

  return (
    <div className="space-y-1.5">
      <p className="text-xs text-foreground/70">{label}</p>
      <div className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          aria-label={shown ? "Change photo" : "Choose a photo"}
          className="flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-2xl bg-cork-input text-foreground/50 disabled:opacity-60"
        >
          {shown ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={shown} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="flex flex-col items-center gap-2">
              <ImagePlus className="h-12 w-12" strokeWidth={1.25} />
              <span className="text-xs">Tap to add a photo</span>
            </span>
          )}
        </button>

        {file && !disabled && (
          <button
            type="button"
            onClick={() => onChange(null)}
            aria-label="Remove selected photo"
            className="absolute right-2 top-2 rounded-full bg-background/90 p-1.5 shadow"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => pick(e.target.files?.[0])}
        />
      </div>
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
