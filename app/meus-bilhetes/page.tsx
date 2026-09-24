import Link from 'next/link'
import { UserShell } from '@/components/user-shell'
import { getSessionUser, formatCurrency, formatDate } from '@/lib/get-session-user'
import { badgeClass, statusLabel, btnPrimary, card } from '@/components/ui'

export default async function MyTicketsPage() {
  const { supabase, session, userName, isAdmin } = await getSessionUser()

  const { data: myTickets } = await supabase
    .from('tickets')
    .select(`
      *,
      raffles ( id, title, prize_name, prize_image, draw_date, status, ticket_price )
    `)
    .eq('buyer_id', session.user.id)
    .in('status', ['sold', 'reserved'])
    .order('purchased_at', { ascending: false, nullsFirst: true })

  const tickets = myTickets ?? []
  const sold = tickets.filter((t) => t.status === 'sold')
  const reserved = tickets.filter((t) => t.status === 'reserved')
  const totalSpent = sold.reduce((s, t: any) => s + Number(t.raffles?.ticket_price ?? 0), 0)

  const grouped = tickets.reduce<Record<string, { raffle: any; tickets: any[] }>>((acc, t: any) => {
    const id = t.raffles?.id ?? 'unknown'
    if (!acc[id]) acc[id] = { raffle: t.raffles, tickets: [] }
    acc[id].tickets.push(t)
    return acc
  }, {})

  return (
    <UserShell userName={userName} email={session.user.email ?? ''} isAdmin={isAdmin}>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8 w-full">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground mb-2">Meus números</p>
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
              {sold.length} {sold.length === 1 ? 'número comprado' : 'números comprados'}
            </h1>
          </div>
          <Link href="/rifas" className={btnPrimary}>Explorar rifas</Link>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className={`${card} p-5`}>
            <p className="text-sm text-muted-foreground mb-2">Comprados</p>
            <p className="text-3xl font-semibold text-primary">{sold.length}</p>
          </div>
          <div className={`${card} p-5`}>
            <p className="text-sm text-muted-foreground mb-2">Reservados</p>
            <p className="text-3xl font-semibold text-warning">{reserved.length}</p>
          </div>
          <div className={`${card} p-5`}>
            <p className="text-sm text-muted-foreground mb-2">Total investido</p>
            <p className="text-3xl font-semibold">{formatCurrency(totalSpent, 0)}</p>
          </div>
        </div>

        {tickets.length > 0 ? (
          <div className="space-y-4">
            {Object.values(grouped).map(({ raffle, tickets: ts }) => (
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

                    <div className="flex flex-wrap gap-1.5">
                      {ts
                        .sort((a, b) => a.ticket_number - b.ticket_number)
                        .map((t) => (
                          <span
                            key={t.id}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold tabular-nums ${
                              t.status === 'sold' ? 'bg-primary/15 text-primary' : 'bg-warning/20 text-warning'
                            }`}
                            title={t.status === 'sold' ? 'Pago' : 'Reservado'}
                          >
                            {String(t.ticket_number).padStart(3, '0')}
                          </span>
                        ))}
                    </div>
                  </div>

                  <div className="flex md:flex-col items-center md:items-end justify-between gap-2 shrink-0">
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">{ts.length} {ts.length === 1 ? 'número' : 'números'}</p>
                      <p className="font-semibold">{formatCurrency(ts.length * Number(raffle?.ticket_price ?? 0))}</p>
                    </div>
                    <Link href={`/rifas/${raffle?.id}`} className="text-sm text-primary hover:underline">Ver rifa →</Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border p-16 text-center">
            <div className="text-5xl mb-4">🎫</div>
            <h3 className="text-xl font-semibold mb-2">Você ainda não tem números</h3>
            <p className="text-muted-foreground mb-6">Explore as rifas ativas e escolha seus números da sorte.</p>
            <Link href="/rifas" className={btnPrimary}>Explorar rifas</Link>
          </div>
        )}
      </main>
    </UserShell>
  )
}
