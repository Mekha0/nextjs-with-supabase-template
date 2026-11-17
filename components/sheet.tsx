"use client";

import { X } from "lucide-react";

export function Sheet({
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
        className="mx-auto max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-background p-5 pb-8 shadow-xl"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold leading-snug">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-full p-1.5 hover:bg-muted"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
