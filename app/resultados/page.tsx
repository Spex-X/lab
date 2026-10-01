import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import { PublicShell } from '@/components/public-shell'
import { formatDate, formatCurrency } from '@/lib/get-session-user'
import { PRIZE_TIERS, tierPot } from '@/lib/prize'

export default async function ResultadosPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: completed } = await supabase
    .from('raffles')
    .select('id, title, prize_name, prize_image, draw_date, winning_numbers, drawn_at, base_prize')
    .eq('status', 'completed')
    .not('winning_numbers', 'is', null)
    .order('drawn_at', { ascending: false })
    .limit(12)

  // Ganhadores: Sena (6), Quina (5) e Quadra (4)
  const raffleIds = (completed ?? []).map((r) => r.id)
  const { data: topBets } = raffleIds.length
    ? await supabase
        .from('bets')
        .select('numbers, hits, raffle_id, profiles(full_name)')
        .in('raffle_id', raffleIds)
        .gte('hits', 4)
        .order('hits', { ascending: false })
        .limit(60)
    : { data: [] }

  // Arrecadação de cada sorteio pra calcular os potes das faixas
  const { data: paidOrders } = raffleIds.length
    ? await supabase
        .from('orders')
        .select('raffle_id, total_amount')
        .in('raffle_id', raffleIds)
        .eq('status', 'paid')
    : { data: [] }
  const revenueByRaffle = new Map<string, number>()
  ;(paidOrders ?? []).forEach((o: any) => {
    revenueByRaffle.set(o.raffle_id, (revenueByRaffle.get(o.raffle_id) ?? 0) + Number(o.total_amount))
  })

  const winnersByRaffle = new Map<string, any[]>()
  ;(topBets ?? []).forEach((b: any) => {
    const list = winnersByRaffle.get(b.raffle_id) ?? []
    list.push(b)
    winnersByRaffle.set(b.raffle_id, list)
  })

  const hasCompleted = (completed?.length ?? 0) > 0

  return (
    <PublicShell active="/resultados" loggedIn={!!user}>
      <section className="pt-32 pb-12 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-sm font-medium text-primary mb-4 tracking-wide">Resultados</p>
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight leading-tight">
            Sorteios encerrados e ganhadores
          </h1>
          <p className="text-lg text-muted-foreground mt-6">
            Cada jogo tem 6 números entre 1 e 75. Ganha quem acertar 4, 5 ou 6 números (Quadra, Quina e Sena).
          </p>
        </div>
      </section>

      {hasCompleted ? (
        <section className="px-4 sm:px-6 pb-16">
          <div className="max-w-6xl mx-auto space-y-6">
            {(completed ?? []).map((r) => {
              const winners = winnersByRaffle.get(r.id) ?? []
              return (
                <div key={r.id} className="rounded-2xl border border-border bg-card p-6">
                  <div className="flex flex-col md:flex-row md:items-center gap-5">
                    <div className="w-full md:w-20 h-24 md:h-20 rounded-xl bg-muted overflow-hidden shrink-0">
                      {r.prize_image ? (
                        <img src={r.prize_image} alt={r.prize_name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-3xl">🏆</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{r.title}</h3>
                      <p className="text-sm text-muted-foreground truncate">{r.prize_name}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Sorteado em {formatDate(r.drawn_at ?? r.draw_date, { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Números sorteados</p>
                      <div className="flex gap-1.5">
                        {r.winning_numbers?.map((n: number) => (
                          <span key={n} className="w-9 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center">
                            {String(n).padStart(2, '0')}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {winners.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-border space-y-1.5">
                      {winners.map((w: any, i: number) => {
                        const tier = PRIZE_TIERS.find((t) => t.hits === w.hits)
                        const tierWinners = winners.filter((x: any) => x.hits === w.hits).length
                        const revenue = revenueByRaffle.get(r.id) ?? 0
                        const prizeEach = tier && tierWinners > 0 ? tierPot(tier, revenue, (r as any).base_prize) / tierWinners : 0
                        return (
                          <div key={i} className="flex items-center justify-between gap-3 text-sm">
                            <span className="font-medium truncate">{w.profiles?.full_name || 'Participante'}</span>
                            <span className="font-mono text-muted-foreground shrink-0">
                              {[...w.numbers].sort((a: number, b: number) => a - b).map((n: number) => String(n).padStart(2, '0')).join(' ')}
                            </span>
                            <span className={`font-semibold shrink-0 ${w.hits === 6 ? 'text-primary' : 'text-muted-foreground'}`}>
                              {w.hits === 6 ? `🏆 Sena` : `${tier?.label} (${w.hits})`} · {formatCurrency(prizeEach)}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      ) : (
        <section className="px-4 sm:px-6 pb-16">
          <div className="max-w-6xl mx-auto rounded-2xl border border-dashed border-border p-16 text-center">
            <div className="text-5xl mb-4">🎲</div>
            <h3 className="text-xl font-semibold mb-2">Nenhum sorteio realizado ainda</h3>
            <p className="text-muted-foreground">Os resultados vão aparecer aqui assim que os primeiros sorteios forem feitos.</p>
          </div>
        </section>
      )}

      <section className="px-4 sm:px-6 py-24 border-t border-border">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-4">O próximo nome pode ser o seu</h2>
          <p className="text-muted-foreground mb-10">Veja os sorteios abertos e monte seu jogo de 6 números.</p>
          <Link
            href="/sorteios"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-secondary text-secondary-foreground font-semibold text-lg hover:opacity-90 transition"
          >
            Ver sorteios abertos →
          </Link>
        </div>
      </section>
    </PublicShell>
  )
}
