import type { SupabaseClient } from '@supabase/supabase-js'

// Arrecadação paga de cada jogo. Usa a RPC get_raffle_stats (security definer)
// porque a RLS de orders só mostra os pedidos do próprio usuário.
export async function getRevenueByRaffle(supabase: SupabaseClient, raffleIds: string[]) {
  const results = await Promise.all(
    raffleIds.map((id) => supabase.rpc('get_raffle_stats', { p_raffle_id: id }))
  )
  const map = new Map<string, number>()
  results.forEach(({ data }, i) => {
    map.set(raffleIds[i], Number((data as any)?.revenue ?? 0))
  })
  return map
}
