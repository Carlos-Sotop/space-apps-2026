import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/**
 * Browser client for rooms, team play and the futarchy round.
 * null until the Supabase project exists and .env.local has its URL and publishable key,
 * so the single-player game keeps working without it.
 */
export const supabase: SupabaseClient | null = url && key ? createClient(url, key) : null;
