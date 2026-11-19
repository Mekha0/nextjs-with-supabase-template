import Link from "next/link";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { SuggestionsList } from "@/components/suggestions-list";

export default function SuggestionsPage() {
  return (
    <main className="min-h-screen bg-background px-4 pb-28 pt-8">
      <div className="mx-auto w-full max-w-md space-y-6">
        <header className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <h1 className="font-display text-4xl tracking-tight">
              Find a New Project!
            </h1>
            <p className="font-sans text-sm text-muted-foreground">
              Things you can make with what you already have.
            </p>
          </div>

          <Button
            variant="outline"
            asChild
            className="mx-0 h-8 w-auto shrink-0 px-3.5 text-xs"
          >
            <Link href="/crafts">Saved</Link>
          </Button>
        </header>

        <Suspense
          fallback={<p className="text-sm text-muted-foreground">Loading…</p>}
        >
          <SuggestionsList />
        </Suspense>
      </div>
    </main>
  );
}
