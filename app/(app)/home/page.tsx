import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { RoomView } from "@/components/room-view";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background px-4 pb-28 pt-8">
      <div className="mx-auto w-full max-w-md">
        <Suspense fallback={<HomeSkeleton />}>
          <Room />
        </Suspense>
      </div>
    </main>
  );
}

async function Room() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const name =
    (user?.user_metadata?.name as string | undefined) ??
    user?.email?.split("@")[0] ??
    "Crafter";

  return <RoomView name={name} />;
}

function HomeSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true">
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 animate-pulse rounded-full bg-cork/60" />
        <div className="space-y-2">
          <div className="h-4 w-28 animate-pulse rounded bg-cork/60" />
          <div className="h-3 w-16 animate-pulse rounded bg-cork/60" />
        </div>
      </div>
      <div className="h-20 animate-pulse rounded-2xl bg-cork/60" />
      <div className="h-48 animate-pulse rounded-3xl bg-cork/60" />
    </div>
  );
}
