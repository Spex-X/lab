import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

let client: SupabaseClient | null = null

export function createClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Durante o prerender do build as envs públicas podem não estar presentes —
  // devolve um cliente placeholder que nunca é usado de fato no servidor.
  if (!url || !key) {
    return createBrowserClient('https://placeholder.supabase.co', 'placeholder-key') as SupabaseClient
  }

  if (!client) {
    client = createBrowserClient(url, key) as SupabaseClient
  }
  return client
}
