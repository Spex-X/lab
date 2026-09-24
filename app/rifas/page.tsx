import Link from 'next/link'
import { UserShell } from '@/components/user-shell'
import { getSessionUser, formatCurrency, formatDate } from '@/lib/get-session-user'

export default async function RafflesPage() {
  const { supabase, session, userName, isAdmin } = await getSessionUser()

  const { data: raffles } = await supabase
    .from('raffles')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  return (
    <UserShell userName={userName} email={session.user.email ?? ''} isAdmin={isAdmin}>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8 w-full">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground mb-2">Explorar</p>
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
              {raffles?.length || 0} {raffles?.length === 1 ? 'rifa disponível' : 'rifas disponíveis'}
            </h1>
          </div>
          <Link
            href="/criar-rifa"
            className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition"
          >
            Criar rifa
          </Link>
        </div>

        {raffles && raffles.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {raffles.map((raffle) => {
              const sold = raffle.total_tickets - raffle.available_tickets
              const pct = Math.round((sold / raffle.total_tickets) * 100)
              const almostOut = raffle.available_tickets / raffle.total_tickets < 0.2

              return (
                <Link
                  key={raffle.id}
                  href={`/rifas/${raffle.id}`}
                  className="group rounded-2xl border border-border bg-card overflow-hidden hover:border-primary/40 transition"
                >
                  <div className="h-44 bg-gradient-to-br from-primary/25 to-secondary/25 relative overflow-hidden">
                    {raffle.prize_image ? (
                      <img
                        src={raffle.prize_image}
                        alt={raffle.prize_name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-5xl">🎁</div>
                    )}
                    <span
                      className={`absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-background/90 backdrop-blur text-xs font-semibold ${
                        almostOut ? 'text-secondary' : 'text-primary'
                      }`}
                    >
                      {almostOut ? 'Quase esgotada' : `${pct}% vendido`}
                    </span>
                  </div>

                  <div className="p-5">
                    <h3 className="font-semibold mb-0.5 group-hover:text-primary transition truncate">{raffle.title}</h3>
                    <p className="text-sm text-muted-foreground mb-4 truncate">{raffle.prize_name}</p>

                    <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                      <span>{sold} vendidos</span>
                      <span>{raffle.available_tickets} disponíveis</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden mb-4">
                      <div
                        className={`h-full rounded-full ${almostOut ? 'bg-secondary' : 'bg-primary'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">Bilhete</p>
                        <p className="text-lg font-semibold">{formatCurrency(raffle.ticket_price)}</p>
                      </div>
                      {raffle.draw_date && (
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Sorteio</p>
                          <p className="text-sm font-medium">{formatDate(raffle.draw_date, { day: '2-digit', month: 'short' })}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border p-16 text-center">
            <div className="text-5xl mb-4">🎰</div>
            <h3 className="text-xl font-semibold mb-2">Nenhuma rifa disponível</h3>
            <p className="text-muted-foreground mb-6">Seja o primeiro a criar uma rifa!</p>
            <Link href="/criar-rifa" className="inline-block px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold">
              Criar rifa
            </Link>
          </div>
        )}
      </main>
    </UserShell>
  )
}
