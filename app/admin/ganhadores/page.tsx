import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { formatCurrency } from '@/lib/get-session-user'
import { PRIZE_TIERS, tierPot } from '@/lib/prize'

export default async function AdminGanhadoresPage() {
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

  // Sorteios encerrados
  const { data: raffles } = await supabase
    .from('raffles')
    .select('id, title, prize_name, drawn_at, winning_numbers, base_prize')
    .eq('status', 'completed')
    .not('winning_numbers', 'is', null)
    .order('drawn_at', { ascending: false })

  const raffleIds = (raffles ?? []).map((r: any) => r.id)

  const [{ data: winners }, { data: orders }] = raffleIds.length
    ? await Promise.all([
        supabase
          .from('bets')
          .select('id, numbers, hits, raffle_id, created_at, profiles(full_name, email)')
          .in('raffle_id', raffleIds)
          .gte('hits', 4)
          .order('hits', { ascending: false }),
        supabase
          .from('orders')
          .select('raffle_id, total_amount')
          .in('raffle_id', raffleIds)
          .eq('status', 'paid'),
      ])
    : [{ data: [] }, { data: [] }]

  const revenueByRaffle = new Map<string, number>()
  ;(orders ?? []).forEach((o: any) => {
    revenueByRaffle.set(o.raffle_id, (revenueByRaffle.get(o.raffle_id) ?? 0) + Number(o.total_amount))
  })

  // Ganhadores agrupados por sorteio
  const byRaffle = new Map<string, any[]>()
  ;(winners ?? []).forEach((w: any) => {
    const list = byRaffle.get(w.raffle_id) ?? []
    list.push(w)
    byRaffle.set(w.raffle_id, list)
  })

  const totalPago = (raffles ?? []).reduce((sum: number, r: any) => {
    const ws = byRaffle.get(r.id) ?? []
    const revenue = revenueByRaffle.get(r.id) ?? 0
    return (
      sum +
      PRIZE_TIERS.reduce((s, t) => {
        const n = ws.filter((w: any) => w.hits === t.hits).length
        return s + (n > 0 ? tierPot(t, revenue, r.base_prize) : 0)
      }, 0)
    )
  }, 0)

  const tierLabel = (hits: number) =>
    hits === 6 ? 'Sena' : hits === 5 ? 'Quina' : 'Quadra'

  const tierClass = (hits: number) =>
    hits === 6
      ? 'bg-primary/15 text-primary'
      : hits === 5
        ? 'bg-secondary/15 text-secondary'
        : 'bg-warning/15 text-warning'

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Ganhadores</h2>
          <p className="text-muted-foreground mt-1">Quem acertou e quanto levou em cada sorteio</p>
        </div>
        <div className="bg-card px-5 py-3 rounded-lg border border-border">
          <p className="text-xs text-muted-foreground">Total pago em prêmios</p>
          <p className="text-xl font-bold text-primary tabular-nums">{formatCurrency(totalPago)}</p>
        </div>
      </div>

      {(raffles ?? []).length === 0 ? (
        <div className="bg-card rounded-lg border border-border p-16 text-center">
          <div className="text-5xl mb-4">🏆</div>
          <p className="text-muted-foreground">Nenhum sorteio encerrado ainda.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {(raffles ?? []).map((r: any) => {
            const ws = byRaffle.get(r.id) ?? []
            const revenue = revenueByRaffle.get(r.id) ?? 0
            return (
              <div key={r.id} className="bg-card rounded-lg border border-border overflow-hidden">
                <div className="px-5 py-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-foreground">{r.title}</p>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      {r.winning_numbers?.map((n: number) => (
                        <span key={n} className="w-7 h-7 rounded-md bg-muted text-xs font-bold flex items-center justify-center">
                          {String(n).padStart(2, '0')}
                        </span>
                      ))}
                    </div>
                  </div>
                  <Link
                    href={`/rifas/${r.id}/gerenciar`}
                    className="text-xs font-medium text-primary hover:underline shrink-0"
                  >
                    Gerenciar →
                  </Link>
                </div>

                {ws.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted text-left text-muted-foreground text-xs uppercase">
                          <th className="px-5 py-3">Ganhador</th>
                          <th className="px-5 py-3">Jogo</th>
                          <th className="px-5 py-3">Faixa</th>
                          <th className="px-5 py-3 text-right">Prêmio</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {ws.map((w: any) => {
                          const tier = PRIZE_TIERS.find((t) => t.hits === w.hits)
                          const n = ws.filter((x: any) => x.hits === w.hits).length
                          const prizeEach = tier ? tierPot(tier, revenue, r.base_prize) / Math.max(n, 1) : 0
                          return (
                            <tr key={w.id} className="hover:bg-muted/50">
                              <td className="px-5 py-3.5">
                                <p className="font-medium text-foreground">
                                  {w.profiles?.full_name || w.profiles?.email || 'Participante'}
                                </p>
                                {w.profiles?.full_name && (
                                  <p className="text-xs text-muted-foreground">{w.profiles.email}</p>
                                )}
                              </td>
                              <td className="px-5 py-3.5 font-mono text-xs text-muted-foreground">
                                {[...w.numbers].sort((a: number, b: number) => a - b).map((x: number) => String(x).padStart(2, '0')).join(' ')}
                              </td>
                              <td className="px-5 py-3.5">
                                <span className={`px-2 py-1 rounded text-xs font-semibold ${tierClass(w.hits)}`}>
                                  {tierLabel(w.hits)} · {w.hits} acertos
                                </span>
                              </td>
                              <td className="px-5 py-3.5 text-right font-semibold tabular-nums text-primary">
                                {formatCurrency(prizeEach)}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="px-5 py-6 text-sm text-muted-foreground">Nenhum ganhador nesse sorteio.</p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </main>
  )
}
