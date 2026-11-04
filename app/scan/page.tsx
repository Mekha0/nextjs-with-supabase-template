import { MaterialScanner } from "@/components/material-scanner";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function ScanPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) redirect("/auth/login");

  return <main className="min-h-screen bg-background px-4 py-10"><MaterialScanner /></main>;
}
