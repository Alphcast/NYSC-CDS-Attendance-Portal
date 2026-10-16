import { createBrowserClient } from "@supabase/ssr";
import { createClient as createSupabaseJsClient } from "@supabase/supabase-js";

const supabaseUrl =
  (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_SUPABASE_URL) ||
  (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_SUPABASE_URL) ||
  "https://fxdfoylwulrijmwzxqnd.supabase.co";

const supabaseKey =
  (typeof process !== "undefined" && (process.env?.SUPABASE_ANON_KEY || process.env?.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)) ||
  (typeof import.meta !== "undefined" && ((import.meta as any).env?.VITE_SUPABASE_ANON_KEY || (import.meta as any).env?.SUPABASE_ANON_KEY)) ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ4ZGZveWx3dWxyaWptd3p4cW5kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwOTcyODksImV4cCI6MjEwNzY3MzI4OX0.Iwxw2U0k1qTGjHxR3U-yocJxCV7P2gLiPdz4fW-rWKk";

export const createClient = () =>
  createBrowserClient(
    supabaseUrl!,
    supabaseKey!,
  );

export const supabase = createSupabaseJsClient(supabaseUrl!, supabaseKey!);
