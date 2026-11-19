import { createClient } from "@/lib/supabase/server";
import { RoomView } from "@/components/room-view";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const name =
    (user?.user_metadata?.name as string | undefined) ??
    user?.email?.split("@")[0] ??
    "Crafter";

  return (
    <main className="min-h-screen bg-background px-4 pb-28 pt-8">
      <div className="font-sans mx-auto w-full max-w-md">
        <RoomView name={name} />
      </div>
    </main>
  );
}
