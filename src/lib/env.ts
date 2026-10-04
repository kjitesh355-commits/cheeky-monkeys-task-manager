export type AppMode = 'supabase' | 'demo' | 'unconfigured';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const SUPABASE_URL = supabaseUrl ?? '';
export const SUPABASE_ANON_KEY = supabaseAnonKey ?? '';
export const SUPABASE_SERVICE_ROLE_KEY = supabaseServiceRoleKey ?? '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl.startsWith('http') &&
    !supabaseUrl.includes('your-project')
);

export const isDemoMode =
  !isSupabaseConfigured && process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

export const appMode: AppMode = isSupabaseConfigured
  ? 'supabase'
  : isDemoMode
    ? 'demo'
    : 'unconfigured';

/** Supabase auth cookie name for a project URL, e.g. sb-abcdef-auth-token */
export function supabaseCookiePrefix(url: string): string {
  try {
    const ref = new URL(url).hostname.split('.')[0];
    return `sb-${ref}-auth-token`;
  } catch {
    return 'sb-auth-token';
  }
}
