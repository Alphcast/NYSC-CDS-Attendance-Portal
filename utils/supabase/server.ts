import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseJsClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "https://fxdfoylwulrijmwzxqnd.supabase.co";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || "sb_publishable_P7KYI36y8T5p-S8A19WDww_opcsr0oa";

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
