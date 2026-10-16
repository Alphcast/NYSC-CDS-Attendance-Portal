import { createServerClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://fxdfoylwulrijmwzxqnd.supabase.co";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_P7KYI36y8T5p-S8A19WDww_opcsr0oa";

export const createClient = (request: any) => {
  const cookies = request?.cookies || {};

  return createServerClient(
    supabaseUrl!,
    supabaseKey!,
    {
      cookies: {
        getAll() {
          if (typeof cookies.getAll === "function") return cookies.getAll();
          return [];
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              if (typeof cookies.set === "function") cookies.set(name, value, options);
            });
          } catch {
            // Ignored
          }
        },
      },
    },
  );
};
