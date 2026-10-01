import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { formatCurrency } from '@/lib/get-session-user'

export default async function AdminRankingPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') redirect('/dashboard')

  // Pedidos pagos com afiliado
  const { data: orders } = await supabase
    .from('orders')
    .select('affiliate_id, total_amount, quantity')
    .eq('status', 'paid')
    .not('affiliate_id', 'is', null)

  const stats = new Map<string, { revenue: number; jogos: number; pedidos: number }>()
  ;(orders ?? []).forEach((o: any) => {
    const s = stats.get(o.affiliate_id) ?? { revenue: 0, jogos: 0, pedidos: 0 }
    s.revenue += Number(o.total_amount || 0)
    s.jogos += Number(o.quantity || 0)
    s.pedidos += 1
    stats.set(o.affiliate_id, s)
  })

  const ids = Array.from(stats.keys())
  const { data: sellers } = ids.length
    ? await supabase
        .from('profiles')
        .select('id, full_name, email, affiliate_code')
        .in('id', ids)
    : { data: [] }

  const ranking = (sellers ?? [])
    .map((s: any) => ({ ...s, ...(stats.get(s.id)!) }))
    .sort((a, b) => b.revenue - a.revenue)

  const medal = (i: number) =>
    i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}º`

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-foreground">Ranking de vendedores</h2>
        <p className="text-muted-foreground mt-1">Parceiros que mais geraram vendas pagas</p>
      </div>

      {ranking.length > 0 ? (
        <div className="bg-card rounded-lg border border-border overflow-hidden">
          <div className="divide-y divide-border">
            {ranking.map((s: any, i: number) => (
              <div key={s.id} className="px-5 py-4 flex items-center gap-4">
                <span className="text-2xl w-10 text-center">{medal(i)}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground truncate">{s.full_name || 'Sem nome'}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {s.email}
                    {s.affiliate_code ? ` · código ${s.affiliate_code}` : ''}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-semibold text-green-600 tabular-nums">{formatCurrency(s.revenue)}</p>
                  <p className="text-xs text-muted-foreground tabular-nums">
                    {s.jogos} jogos · {s.pedidos} pedidos
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-card rounded-lg border border-border p-16 text-center text-muted-foreground">
          Nenhuma venda via parceiro ainda.
        </div>
      )}
    </main>
  )
}
