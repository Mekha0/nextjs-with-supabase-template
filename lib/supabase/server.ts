import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";

/**
 * Especially important if using Fluid compute: Don't put this client in a
 * global variable. Always create a new client within each function when using
 * it.
 */ 

//Add bearer token for API routes, else cookies
export async function getBearerToken() {
  const auth = (await headers()).get("authorization");
  return auth?.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : undefined;
}

export async function createClient() {
  const cookieStore = await cookies();
  const token = await getBearerToken();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      // API clients (e.g. Postman) can authenticate with a Bearer token instead of cookies
      global: token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have proxy refreshing
            // user sessions.
          }
        },
      },
    },
  );
}
