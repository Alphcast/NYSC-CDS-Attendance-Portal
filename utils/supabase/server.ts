import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseJsClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "https://fxdfoylwulrijmwzxqnd.supabase.co";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ4ZGZveWx3dWxyaWptd3p4cW5kIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MjA5NzI4OSwiZXhwIjoyMTA3NjczMjg5fQ.SCqOMUIuZINeoQXq4ueKca4iNr99ond6k7ICz3MKlXk";

export const createClient = (cookieStore?: any) => {
  if (!cookieStore) {
    return createSupabaseJsClient(supabaseUrl!, supabaseKey!);
  }

  return createServerClient(
    supabaseUrl!,
    supabaseKey!,
    {
      cookies: {
        getAll() {
          return typeof cookieStore.getAll === "function" ? cookieStore.getAll() : [];
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              if (typeof cookieStore.set === "function") {
                cookieStore.set(name, value, options);
              }
            });
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if user sessions are handled by middleware.
          }
        },
      },
    },
  );
};

export const supabaseServer = createSupabaseJsClient(supabaseUrl!, supabaseKey!);
