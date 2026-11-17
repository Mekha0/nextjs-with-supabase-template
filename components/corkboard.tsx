import Link from "next/link";
import type { ReactNode } from "react";
import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// Full class names, so Tailwind can find them.
const NOTE_COLORS = [
  "bg-postit-yellow",
  "bg-postit-pink",
  "bg-postit-green",
  "bg-postit-blue",
];
const TILTS = ["-rotate-1", "rotate-0", "rotate-1"];

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

type StickyNoteProps = {
  id: string; // used only to pick a stable color and tilt
  label: string;
  imageUrl?: string | null;
  badge?: string; // e.g. "×5"
  href?: string;
  onClick?: () => void;
};

export function StickyNote({
  id,
  label,
  imageUrl,
  badge,
  href,
  onClick,
}: StickyNoteProps) {
  const h = hash(id);
  const classes = cn(
    "relative block w-full rounded-md p-2 pt-4 text-left shadow-md transition-transform",
    "hover:-translate-y-0.5 hover:rotate-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    NOTE_COLORS[h % NOTE_COLORS.length],
    TILTS[(h >> 2) % TILTS.length],
  );

  const content = (
    <>
      <span
        aria-hidden
        className="absolute left-1/2 top-1.5 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-cork-dark shadow"
      />
      <span className="flex aspect-square items-center justify-center overflow-hidden rounded-sm bg-card">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <ImageIcon className="h-8 w-8 text-muted-foreground" />
        )}
      </span>
      <span className="mt-2 flex items-center justify-between gap-2 text-sm font-medium text-foreground">
        <span className="truncate">{label}</span>
        {badge && (
          <span className="shrink-0 text-xs text-muted-foreground">
            {badge}
          </span>
        )}
      </span>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={classes}>
        {content}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={classes}>
      {content}
    </button>
  );
}

type CorkboardProps = {
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  isEmpty?: boolean;
  emptyTitle?: string;
  emptyHint?: string;
  emptyAction?: ReactNode;
  children?: ReactNode;
};

export function Corkboard({
  loading,
  error,
  onRetry,
  isEmpty,
  emptyTitle = "Nothing here yet",
  emptyHint,
  emptyAction,
  children,
}: CorkboardProps) {
  let body: ReactNode;

  if (loading) {
    body = (
      <div className="grid grid-cols-2 gap-3" aria-busy="true">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="aspect-[4/5] animate-pulse rounded-md bg-muted"
          />
        ))}
      </div>
    );
  } else if (error) {
    body = (
      <div className="flex flex-col items-center gap-3 py-12 text-center">
        <p role="alert" className="text-sm text-foreground">
          {error}
        </p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground"
          >
            Try again
          </button>
        )}
      </div>
    );
  } else if (isEmpty) {
    body = (
      <div className="flex flex-col items-center gap-2 py-12 text-center">
        <p className="font-medium text-foreground">{emptyTitle}</p>
        {emptyHint && <p className="text-sm text-foreground">{emptyHint}</p>}
        {emptyAction}
      </div>
    );
  } else {
    body = <div className="grid grid-cols-2 gap-3">{children}</div>;
  }

  return (
    <section className="min-h-64 rounded-2xl border-4 border-cork-dark bg-accent p-3 shadow-inner">
      {body}
    </section>
  );
}
