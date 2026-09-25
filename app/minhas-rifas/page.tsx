import Link from 'next/link'
import { redirect } from 'next/navigation'
import { UserShell } from '@/components/user-shell'
import { getSessionUser, formatCurrency, formatDate } from '@/lib/get-session-user'
import { badgeClass, statusLabel, btnPrimary, btnOutline, card } from '@/components/ui'

export default async function MyRafflesPage() {
  const { supabase, session, userName, isAdmin } = await getSessionUser()

  if (!isAdmin) redirect('/dashboard')

  const { data: myRaffles } = await supabase
    .from('raffles')
    .select('*')
    .eq('created_by', session.user.id)
    .order('created_at', { ascending: false })

  const raffles = myRaffles ?? []
  const active = raffles.filter((r) => r.status === 'active').length
  const totalSold = raffles.reduce((s, r) => s + (r.total_tickets - r.available_tickets), 0)
  const totalRevenue = raffles.reduce((s, r) => s + (r.total_tickets - r.available_tickets) * Number(r.ticket_price), 0)

  return (
    <UserShell userName={userName} email={session.user.email ?? ''} isAdmin={isAdmin}>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8 w-full">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground mb-2">Minhas campanhas</p>
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
              {raffles.length} {raffles.length === 1 ? 'rifa criada' : 'rifas criadas'}
            </h1>
          </div>
          <Link href="/criar-rifa" className={btnPrimary}>Criar rifa</Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <div className={`${card} p-5`}>
            <p className="text-sm text-muted-foreground mb-2">Ativas</p>
            <p className="text-3xl font-semibold">{String(active).padStart(2, '0')}</p>
          </div>
          <div className={`${card} p-5`}>
            <p className="text-sm text-muted-foreground mb-2">Números vendidos</p>
            <p className="text-3xl font-semibold">{totalSold}</p>
          </div>
          <div className={`${card} p-5`}>
            <p className="text-sm text-muted-foreground mb-2">Arrecadado</p>
            <p className="text-3xl font-semibold text-primary tabular-nums break-all">{formatCurrency(totalRevenue, 0)}</p>
          </div>
        </div>

        {raffles.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {raffles.map((raffle) => {
              const sold = raffle.total_tickets - raffle.available_tickets
              const pct = Math.round((sold / raffle.total_tickets) * 100)

              return (
                <div key={raffle.id} className={`${card} overflow-hidden flex flex-col`}>
                  <div className="h-40 bg-gradient-to-br from-primary/25 to-secondary/25 relative">
                    {raffle.prize_image ? (
                      <img src={raffle.prize_image} alt={raffle.prize_name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-5xl">🎁</div>
                    )}
                    <span className={`absolute top-3 right-3 ${badgeClass(raffle.status)}`}>
                      {statusLabel[raffle.status] ?? raffle.status}
                    </span>
                  </div>

                  <div className="p-5 flex-1 flex flex-col">
                    <h3 className="font-semibold truncate">{raffle.title}</h3>
                    <p className="text-sm text-muted-foreground truncate mb-4">{raffle.prize_name}</p>

                    <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                      <span>{sold}/{raffle.total_tickets} vendidos</span>
                      <span className="font-semibold text-foreground">{pct}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden mb-4">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm mb-5">
                      <div>
                        <p className="text-xs text-muted-foreground">Arrecadado</p>
                        <p className="font-semibold text-primary">{formatCurrency(sold * Number(raffle.ticket_price), 0)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Sorteio</p>
                        <p className="font-medium">{raffle.draw_date ? formatDate(raffle.draw_date, { day: '2-digit', month: 'short' }) : '—'}</p>
                      </div>
                    </div>

                    <div className="mt-auto grid grid-cols-2 gap-2">
                      <Link href={`/rifas/${raffle.id}/gerenciar`} className={`${btnPrimary} px-3 py-2`}>Gerenciar</Link>
                      <Link href={`/rifas/${raffle.id}`} className={`${btnOutline} px-3 py-2`}>Ver página</Link>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border p-16 text-center">
            <div className="text-5xl mb-4">📋</div>
            <h3 className="text-xl font-semibold mb-2">Você ainda não criou nenhuma rifa</h3>
            <p className="text-muted-foreground mb-6">Comece criando sua primeira campanha.</p>
            <Link href="/criar-rifa" className={btnPrimary}>Criar rifa</Link>
          </div>
        )}
      </main>
    </UserShell>
  )
}
