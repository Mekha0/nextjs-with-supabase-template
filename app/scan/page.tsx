import { MaterialScanner } from "@/components/material-scanner";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";

export default function ScanPage() {
  return (
    <main className="min-h-screen bg-background px-4 py-10">
      <Suspense
        fallback={
          <div className="mx-auto w-full max-w-2xl rounded-xl border p-5 text-sm text-muted-foreground">
            Loading your scanner…
          </div>
        }
      >
        <AuthenticatedScanner />
      </Suspense>
    </main>
  );
}

async function AuthenticatedScanner() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) redirect("/auth/login");

  return <MaterialScanner />;
}
