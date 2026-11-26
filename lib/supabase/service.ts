import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Service-role Supabase client — has full DB and Storage access.
 * NEVER expose this client or the service role key to the browser.
 * Use only inside server actions or API route handlers.
 */
export function createServiceClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll: () => [],
        setAll: () => {},
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
