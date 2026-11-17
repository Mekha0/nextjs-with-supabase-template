import { Suspense } from "react";
import Navbar from "@/components/nav-bar";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <p className="text-muted-foreground">Loading your workspace...</p>
        </div>
      }
    >
      <AuthenticatedLayout>{children}</AuthenticatedLayout>
    </Suspense>
  );
}

async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    redirect("/login");
  }

  return (
    <>
      {children}
      <Navbar />
    </>
  );
}
