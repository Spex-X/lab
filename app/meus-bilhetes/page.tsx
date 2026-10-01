import Link from 'next/link'
import { UserShell } from '@/components/user-shell'
import { getSessionUser, formatCurrency, formatDate } from '@/lib/get-session-user'
import { badgeClass, statusLabel, btnPrimary, card } from '@/components/ui'

export default async function MyBetsPage() {
  const { supabase, session, userName, isAdmin } = await getSessionUser()

  const { data: myBets } = await supabase
    .from('bets')
    .select(`
      *,
      orders!inner ( id, status, total_amount, created_at ),
      raffles ( id, title, prize_name, prize_image, draw_date, status, ticket_price, winning_numbers )
    `)
    .eq('user_id', session.user.id)
    .in('orders.status', ['paid', 'pending'])
    .order('created_at', { ascending: false })

  const bets = myBets ?? []
  const paid = bets.filter((b: any) => b.orders?.status === 'paid')
  const pending = bets.filter((b: any) => b.orders?.status === 'pending')
  const totalSpent = paid.reduce((s: number, b: any) => s + Number(b.raffles?.ticket_price ?? 0), 0)

  const grouped = bets.reduce<Record<string, { raffle: any; bets: any[] }>>((acc, b: any) => {
    const id = b.raffles?.id ?? 'unknown'
    if (!acc[id]) acc[id] = { raffle: b.raffles, bets: [] }
    acc[id].bets.push(b)
    return acc
  }, {})

  return (
    <UserShell userName={userName} email={session.user.email ?? ''} isAdmin={isAdmin}>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8 w-full">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground mb-2">Meus jogos</p>
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
              {paid.length} {paid.length === 1 ? 'jogo confirmado' : 'jogos confirmados'}
            </h1>
          </div>
          <Link href="/sorteios" className={btnPrimary}>Explorar sorteios</Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <div className={`${card} p-5`}>
            <p className="text-sm text-muted-foreground mb-2">Jogos pagos</p>
            <p className="text-3xl font-semibold text-primary">{paid.length}</p>
          </div>
          <div className={`${card} p-5`}>
            <p className="text-sm text-muted-foreground mb-2">Aguardando PIX</p>
            <p className="text-3xl font-semibold text-warning">{pending.length}</p>
          </div>
          <div className={`${card} p-5`}>
            <p className="text-sm text-muted-foreground mb-2">Total investido</p>
            <p className="text-3xl font-semibold tabular-nums break-all">{formatCurrency(totalSpent, 0)}</p>
          </div>
        </div>

        {bets.length > 0 ? (
          <div className="space-y-4">
            {Object.values(grouped).map(({ raffle, bets: bs }) => (
              <div key={raffle?.id} className={`${card} p-5 md:p-6`}>
                <div className="flex flex-col md:flex-row md:items-center gap-5">
                  <div className="w-full md:w-24 h-32 md:h-24 rounded-xl bg-gradient-to-br from-primary/25 to-secondary/25 overflow-hidden shrink-0">
                    {raffle?.prize_image ? (
                      <img src={raffle.prize_image} alt={raffle.prize_name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-3xl">🎁</div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 mb-1">
                      <h3 className="font-semibold truncate">{raffle?.title}</h3>
                      <span className={badgeClass(raffle?.status)}>{statusLabel[raffle?.status] ?? raffle?.status}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      {raffle?.prize_name}
                      {raffle?.draw_date && ` · Sorteio ${formatDate(raffle.draw_date, { day: '2-digit', month: 'short' })}`}
                    </p>

                    {raffle?.winning_numbers && (
                      <div className="mb-3 flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-medium text-muted-foreground">Sorteados:</span>
                        {raffle.winning_numbers.map((n: number) => (
                          <span key={n} className="w-7 h-7 rounded-md bg-secondary text-secondary-foreground text-xs font-bold flex items-center justify-center">
                            {String(n).padStart(2, '0')}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="space-y-1.5">
                      {bs.map((b: any) => (
                        <div key={b.id} className="flex items-center gap-2 flex-wrap">
                          <div className="flex gap-1">
                            {[...b.numbers].sort((a: number, z: number) => a - z).map((n: number) => {
                              const hit = raffle?.winning_numbers?.includes(n)
                              return (
                                <span
                                  key={n}
                                  className={`px-1.5 py-0.5 rounded text-xs font-semibold tabular-nums ${
                                    hit
                                      ? 'bg-primary text-primary-foreground'
                                      : b.orders?.status === 'paid'
                                      ? 'bg-primary/15 text-primary'
                                      : 'bg-warning/20 text-warning'
                                  }`}
                                >
                                  {String(n).padStart(2, '0')}
                                </span>
                              )
                            })}
                          </div>
                          {b.hits != null && (
                            <span className={`text-xs font-semibold ${b.hits === 6 ? 'text-primary' : 'text-muted-foreground'}`}>
                              {b.hits === 6 ? '🏆 Sena!' : b.hits === 5 ? '🏆 Quina!' : b.hits === 4 ? '🏆 Quadra!' : `${b.hits} acertos`}
                            </span>
                          )}
                          {b.orders?.status === 'pending' && (
                            <span className="text-xs text-warning">aguardando PIX</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex md:flex-col items-center md:items-end justify-between gap-2 shrink-0">
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">{bs.length} {bs.length === 1 ? 'jogo' : 'jogos'}</p>
                      <p className="font-semibold">{formatCurrency(bs.length * Number(raffle?.ticket_price ?? 0))}</p>
                    </div>
                    <Link href={`/rifas/${raffle?.id}`} className="text-sm text-primary hover:underline">Ver sorteio →</Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border p-16 text-center">
            <div className="text-5xl mb-4">�</div>
            <h3 className="text-xl font-semibold mb-2">Você ainda não tem jogos</h3>
            <p className="text-muted-foreground mb-6">Explore os sorteios ativos e monte seu jogo de 6 números.</p>
            <Link href="/sorteios" className={btnPrimary}>Explorar sorteios</Link>
          </div>
        )}
      </main>
    </UserShell>
  )
}
