import { Suspense } from "react";
import { MaterialScanner } from "@/components/material-scanner";

export default function ScanPage() {
  return (
    <main className="font-sans min-h-screen bg-background px-4 pb-28 pt-8">
      <div className="mx-auto w-full max-w-md space-y-6">
        <header className="space-y-1">
          <h1 className="font-display text-4xl tracking-tight">
            Scan supplies
          </h1>
          <p className="text-sm text-muted-foreground">
            Snap a photo of your craft materials and we&apos;ll add them to your
            inventory.
          </p>
        </header>

        <Suspense fallback={<ScannerSkeleton />}>
          <MaterialScanner />
        </Suspense>
      </div>
    </main>
  );
}

function ScannerSkeleton() {
  return (
    <div className="space-y-4">
      <div className="aspect-[4/3] animate-pulse rounded-2xl bg-muted" />
      <div className="h-11 animate-pulse rounded-full bg-muted" />
    </div>
  );
}
