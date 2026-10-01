import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { formatCurrency, formatDate } from '@/lib/get-session-user'
import { TOTAL_PRIZE_RATE, DEFAULT_BASE_PRIZE, prizePool } from '@/lib/prize'

export default async function AdminSaldoPage() {
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

  // Arrecadação por sorteio: pedidos pagos agrupados por rifa
  const [{ data: raffles }, { data: orders }, { data: commissions }] = await Promise.all([
    supabase
      .from('raffles')
      .select('id, title, prize_name, status, draw_date, ticket_price, base_prize')
      .order('created_at', { ascending: false }),
    supabase
      .from('orders')
      .select('raffle_id, total_amount, quantity')
      .eq('status', 'paid'),
    supabase
      .from('affiliate_commissions')
      .select('amount, orders!inner(raffle_id)'),
  ])

  const stats = new Map<string, { revenue: number; jogos: number; pedidos: number }>()
  ;(orders ?? []).forEach((o: any) => {
    const s = stats.get(o.raffle_id) ?? { revenue: 0, jogos: 0, pedidos: 0 }
    s.revenue += Number(o.total_amount || 0)
    s.jogos += Number(o.quantity || 0)
    s.pedidos += 1
    stats.set(o.raffle_id, s)
  })

  // Comissões por sorteio
  const commissionsByRaffle = new Map<string, number>()
  ;(commissions ?? []).forEach((c: any) => {
    const rid = c.orders?.raffle_id
    if (rid) commissionsByRaffle.set(rid, (commissionsByRaffle.get(rid) ?? 0) + Number(c.amount || 0))
  })

  const totalGeral = (orders ?? []).reduce((sum: number, o: any) => sum + Number(o.total_amount || 0), 0)
  const totalJogos = (orders ?? []).reduce((sum: number, o: any) => sum + Number(o.quantity || 0), 0)
  const totalComissoes = (commissions ?? []).reduce((sum: number, c: any) => sum + Number(c.amount || 0), 0)

  const rows = (raffles ?? []).map((r: any) => {
    const s = stats.get(r.id) ?? { revenue: 0, jogos: 0, pedidos: 0 }
    const premios = prizePool(s.revenue, r.base_prize)
    const comissao = commissionsByRaffle.get(r.id) ?? 0
    return { ...r, ...s, premios, comissao, liquido: s.revenue - premios - comissao }
  })

  const totalPremios = rows.reduce((s: number, r: any) => s + r.premios, 0)
  const totalLiquido = totalGeral - totalPremios - totalComissoes

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-foreground">Saldo</h2>
        <p className="text-muted-foreground mt-1">Arrecadação por sorteio</p>
      </div>

      {/* Totais */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <div className="bg-card p-6 rounded-lg border border-border">
          <p className="text-muted-foreground text-sm">Arrecadação total</p>
          <p className="text-3xl font-bold text-green-600">{formatCurrency(totalGeral)}</p>
          <p className="text-xs text-muted-foreground mt-1">{totalJogos} jogos · {rows.length} sorteios</p>
        </div>
        <div className="bg-card p-6 rounded-lg border border-border">
          <p className="text-muted-foreground text-sm">Vai pro prêmio</p>
          <p className="text-3xl font-bold text-primary">{formatCurrency(totalPremios)}</p>
          <p className="text-xs text-muted-foreground mt-1">bases + {Math.round(TOTAL_PRIZE_RATE * 100)}% das vendas</p>
        </div>
        <div className="bg-card p-6 rounded-lg border border-border">
          <p className="text-muted-foreground text-sm">Comissões parceiros</p>
          <p className="text-3xl font-bold text-secondary">{formatCurrency(totalComissoes)}</p>
          <p className="text-xs text-muted-foreground mt-1">pagas nas vendas indicadas</p>
        </div>
        <div className="bg-card p-6 rounded-lg border border-border">
          <p className="text-muted-foreground text-sm">Fica pra casa</p>
          <p className={`text-3xl font-bold ${totalLiquido >= 0 ? 'text-foreground' : 'text-destructive'}`}>{formatCurrency(totalLiquido)}</p>
          <p className="text-xs text-muted-foreground mt-1">arrecadado − prêmios − comissões</p>
        </div>
      </div>

      {/* Tabela por sorteio */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted text-left text-muted-foreground text-xs uppercase">
                <th className="px-5 py-3">Sorteio</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Preço/jogo</th>
                <th className="px-5 py-3 text-right">Pedidos</th>
                <th className="px-5 py-3 text-right">Jogos</th>
                <th className="px-5 py-3 text-right">Arrecadado</th>
                <th className="px-5 py-3 text-right">Prêmios</th>
                <th className="px-5 py-3 text-right">Parceiros</th>
                <th className="px-5 py-3 text-right">Líquido</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.length > 0 ? (
                rows.map((r: any) => (
                  <tr key={r.id} className="hover:bg-muted">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-foreground">{r.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {r.prize_name}
                        {r.draw_date ? ` · ${formatDate(r.draw_date)}` : ''}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`px-2 py-1 rounded text-xs font-semibold ${
                          r.status === 'active'
                            ? 'bg-primary/15 text-primary'
                            : r.status === 'paused'
                              ? 'bg-warning/15 text-warning'
                              : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {r.status === 'active' ? 'Ativa' : r.status === 'paused' ? 'Pausada' : 'Encerrada'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right tabular-nums">{formatCurrency(r.ticket_price)}</td>
                    <td className="px-5 py-4 text-right tabular-nums">{r.pedidos}</td>
                    <td className="px-5 py-4 text-right tabular-nums">{r.jogos}</td>
                    <td className="px-5 py-4 text-right font-semibold text-green-600 tabular-nums">
                      {formatCurrency(r.revenue)}
                    </td>
                    <td className="px-5 py-4 text-right tabular-nums text-primary">{formatCurrency(r.premios)}</td>
                    <td className="px-5 py-4 text-right tabular-nums text-secondary">{formatCurrency(r.comissao)}</td>
                    <td className={`px-5 py-4 text-right font-semibold tabular-nums ${r.liquido >= 0 ? 'text-foreground' : 'text-destructive'}`}>
                      {formatCurrency(r.liquido)}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        href={`/rifas/${r.id}/gerenciar`}
                        className="text-blue-600 hover:underline text-xs font-medium"
                      >
                        Gerenciar
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={10} className="px-5 py-10 text-center text-muted-foreground">
                    Nenhum sorteio cadastrado ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  )
}
