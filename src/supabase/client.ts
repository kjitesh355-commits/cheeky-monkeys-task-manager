'use client';

import { createBrowserClient } from '@supabase/ssr';
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from '../lib/env';

type BrowserClient = ReturnType<typeof createBrowserClient>;

let client: BrowserClient | null = null;

/**
 * Supabase browser client (cookie session via @supabase/ssr).
 * Returns null when environment variables are not configured.
 */
export function getSupabaseBrowser(): BrowserClient | null {
  if (!isSupabaseConfigured) return null;
  if (!client) {
    client = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return client;
}
