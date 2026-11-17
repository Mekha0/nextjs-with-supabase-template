import { Suspense } from "react";
import { CraftsList } from "@/components/crafts-list";

export default function CraftsPage() {
  return (
    <main className="min-h-screen bg-background px-4 pb-28 pt-8">
      <div className="mx-auto w-full max-w-md">
        <Suspense
          fallback={
            <p className="text-sm text-muted-foreground">
              Loading your projects…
            </p>
          }
        >
          <CraftsList />
        </Suspense>
      </div>
    </main>
  );
}
