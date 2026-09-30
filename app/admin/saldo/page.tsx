import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { formatCurrency, formatDate } from '@/lib/get-session-user'

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
  const [{ data: raffles }, { data: orders }] = await Promise.all([
    supabase
      .from('raffles')
      .select('id, title, prize_name, status, draw_date, ticket_price')
      .order('created_at', { ascending: false }),
    supabase
      .from('orders')
      .select('raffle_id, total_amount, quantity')
      .eq('status', 'paid'),
  ])

  const stats = new Map<string, { revenue: number; jogos: number; pedidos: number }>()
  ;(orders ?? []).forEach((o: any) => {
    const s = stats.get(o.raffle_id) ?? { revenue: 0, jogos: 0, pedidos: 0 }
    s.revenue += Number(o.total_amount || 0)
    s.jogos += Number(o.quantity || 0)
    s.pedidos += 1
    stats.set(o.raffle_id, s)
  })

  const totalGeral = (orders ?? []).reduce((sum: number, o: any) => sum + Number(o.total_amount || 0), 0)
  const totalJogos = (orders ?? []).reduce((sum: number, o: any) => sum + Number(o.quantity || 0), 0)

  const rows = (raffles ?? []).map((r: any) => ({
    ...r,
    ...(stats.get(r.id) ?? { revenue: 0, jogos: 0, pedidos: 0 }),
  }))

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-foreground">Saldo</h2>
        <p className="text-muted-foreground mt-1">Arrecadação por sorteio</p>
      </div>

      {/* Totais */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-card p-6 rounded-lg border border-border">
          <p className="text-muted-foreground text-sm">Arrecadação total</p>
          <p className="text-3xl font-bold text-green-600">{formatCurrency(totalGeral)}</p>
        </div>
        <div className="bg-card p-6 rounded-lg border border-border">
          <p className="text-muted-foreground text-sm">Jogos vendidos</p>
          <p className="text-3xl font-bold text-foreground">{totalJogos}</p>
        </div>
        <div className="bg-card p-6 rounded-lg border border-border">
          <p className="text-muted-foreground text-sm">Sorteios</p>
          <p className="text-3xl font-bold text-foreground">{rows.length}</p>
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
                  <td colSpan={7} className="px-5 py-10 text-center text-muted-foreground">
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
