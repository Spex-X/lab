import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Client com chave secreta — ignora RLS. Só usar em rotas de servidor
// (webhook, jobs). Retorna null se a chave não estiver configurada.
export function createAdminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
