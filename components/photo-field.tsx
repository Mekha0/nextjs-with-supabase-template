"use client";

import { useRef, useState } from "react";
import { ImagePlus } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  initialUrl?: string | null; // existing saved photo
  initialFile?: File | null; // e.g. the scanner's captured photo
  onChange: (file: File | null) => void;
  capture?: boolean; // open the camera directly on phones
  className?: string;
  placeholderIconSrc?: string;
};

export function PhotoField({
  initialUrl = null,
  initialFile = null,
  onChange,
  capture,
  className,
  placeholderIconSrc,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(() =>
    initialFile ? URL.createObjectURL(initialFile) : initialUrl,
  );

  function handlePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(file));
    onChange(file);
  }

  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      className={cn(
        "flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl bg-card shadow-sm",
        className,
      )}
      aria-label="Choose a photo"
    >
      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview} alt="" className="h-full w-full object-cover" />
      ) : (
        placeholderIconSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={placeholderIconSrc} alt="" width={122} height={122} />
        ) : (
          <ImagePlus className="h-16 w-16 text-muted-foreground" />
        )
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture={capture ? "environment" : undefined}
        className="hidden"
        onChange={handlePick}
      />
    </button>
  );
}
