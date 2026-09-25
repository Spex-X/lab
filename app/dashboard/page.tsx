import Link from 'next/link'
import { redirect } from 'next/navigation'
import { UserShell } from '@/components/user-shell'
import { AffiliateDashboard } from '@/components/affiliate-dashboard'
import { RaffleQuickActions } from '@/components/raffle-quick-actions'
import { getSessionUser, formatCurrency as fmt, formatDate as fmtDate } from '@/lib/get-session-user'
import { card, btnPrimary } from '@/components/ui'

const formatCurrency = (v: number | string | null | undefined) => fmt(v, 0)
const formatDate = (v: string | null | undefined) => fmtDate(v, { day: '2-digit', month: 'long' })

function timeAgo(value: string) {
  const diff = Math.floor((Date.now() - new Date(value).getTime()) / 60000)
  if (diff < 1) return 'agora'
  if (diff < 60) return `há ${diff} min`
  const h = Math.floor(diff / 60)
  if (h < 24) return `há ${h}h`
  return `há ${Math.floor(h / 24)}d`
}

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
}

export default async function DashboardPage() {
  const { supabase, session, userName, isAdmin, isAffiliate, profile } = await getSessionUser()

  // Afiliado vê o painel de parceiro aqui no /dashboard
  if (!isAdmin && isAffiliate) {
    return (
      <UserShell userName={userName} email={session.user.email ?? ''} isAdmin={isAdmin}>
        <AffiliateDashboard userId={session.user.id} affiliateCode={profile?.affiliate_code ?? ''} />
      </UserShell>
    )
  }

  // Usuário normal: painel simples com resumo dos números e sorteios ativos
  if (!isAdmin) {
    const [
      { count: boughtCount },
      { count: reservedCount },
      { data: userActiveRaffles },
    ] = await Promise.all([
      supabase
        .from('tickets')
        .select('id', { count: 'exact', head: true })
        .eq('buyer_id', session.user.id)
        .eq('status', 'sold'),
      supabase
        .from('tickets')
        .select('id', { count: 'exact', head: true })
        .eq('buyer_id', session.user.id)
        .eq('status', 'reserved'),
      supabase
        .from('raffles')
        .select('id, title, prize_name, prize_image, ticket_price, total_tickets, available_tickets, draw_date')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(3),
    ])

    return (
      <UserShell userName={userName} email={session.user.email ?? ''} isAdmin={isAdmin}>
        <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8 w-full">
          <div>
            <p className="text-sm text-muted-foreground mb-2">Minha conta</p>
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
              Olá, {userName}!
            </h1>
            <p className="text-muted-foreground mt-2">
              Acompanhe seus números e explore os sorteios ativos.
            </p>
          </div>

          <section className="grid grid-cols-3 gap-4">
            <div className={`${card} p-5`}>
              <p className="text-sm text-muted-foreground mb-2">Números comprados</p>
              <p className="text-3xl font-semibold text-primary">{boughtCount ?? 0}</p>
            </div>
            <div className={`${card} p-5`}>
              <p className="text-sm text-muted-foreground mb-2">Reservados</p>
              <p className="text-3xl font-semibold text-warning">{reservedCount ?? 0}</p>
            </div>
            <div className={`${card} p-5`}>
              <p className="text-sm text-muted-foreground mb-2">Sorteios ativos</p>
              <p className="text-3xl font-semibold">{userActiveRaffles?.length ?? 0}</p>
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-lg">Sorteios em destaque</h2>
              <Link href="/rifas" className="text-sm text-muted-foreground hover:text-foreground transition">
                Ver todos
              </Link>
            </div>
            {userActiveRaffles && userActiveRaffles.length > 0 ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {userActiveRaffles.map((r: any) => {
                  const sold = r.total_tickets - r.available_tickets
                  const pct = Math.round((sold / r.total_tickets) * 100)
                  return (
                    <Link
                      key={r.id}
                      href={`/rifas/${r.id}`}
                      className="group rounded-2xl border border-border bg-card overflow-hidden hover:border-primary/40 transition"
                    >
                      <div className="h-36 bg-gradient-to-br from-primary/25 to-secondary/25 relative overflow-hidden">
                        {r.prize_image ? (
                          <img src={r.prize_image} alt={r.prize_name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-4xl">🎁</div>
                        )}
                        <span className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-background/90 backdrop-blur text-xs font-semibold text-primary">
                          {pct}% vendido
                        </span>
                      </div>
                      <div className="p-4">
                        <h3 className="font-semibold group-hover:text-primary transition truncate">{r.title}</h3>
                        <p className="text-sm text-muted-foreground truncate">{r.prize_name}</p>
                        <p className="text-sm font-semibold mt-2">{formatCurrency(r.ticket_price)}</p>
                      </div>
                    </Link>
                  )
                })}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-border p-12 text-center">
                <div className="text-4xl mb-3">🎰</div>
                <p className="font-medium mb-1">Nenhum sorteio ativo no momento</p>
                <p className="text-sm text-muted-foreground">Novos sorteios em breve. Fique de olho!</p>
              </div>
            )}
          </section>

          <div className="flex flex-wrap gap-3">
            <Link href="/rifas" className={btnPrimary}>Explorar sorteios</Link>
            <Link
              href="/meus-bilhetes"
              className="px-5 py-2.5 rounded-xl border border-border bg-card text-sm font-medium hover:bg-muted transition"
            >
              Meus bilhetes
            </Link>
          </div>
        </main>
      </UserShell>
    )
  }

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const [
    { data: myRaffleRows },
    { data: paidOrders },
    { data: todayOrders },
    { data: recentOrders },
  ] = await Promise.all([
    supabase
      .from('raffles')
      .select('*')
      .eq('created_by', session.user.id)
      .order('created_at', { ascending: false }),

    supabase
      .from('orders')
      .select('total_amount, quantity, raffle_id, raffles!inner(created_by)')
      .eq('status', 'paid')
      .eq('raffles.created_by', session.user.id),

    supabase
      .from('orders')
      .select('total_amount, quantity, raffles!inner(created_by)')
      .eq('status', 'paid')
      .eq('raffles.created_by', session.user.id)
      .gte('paid_at', todayStart.toISOString()),

    supabase
      .from('orders')
      .select('id, status, total_amount, quantity, created_at, user:profiles(full_name, email), raffles!inner(created_by)')
      .eq('raffles.created_by', session.user.id)
      .order('created_at', { ascending: false })
      .limit(4),
  ])

  const myRaffles = myRaffleRows ?? []
  const activeRaffles = myRaffles.filter((r) => r.status === 'active')

  const totalRevenue = (paidOrders ?? []).reduce((s, o) => s + Number(o.total_amount ?? 0), 0)
  const todayRevenue = (todayOrders ?? []).reduce((s, o) => s + Number(o.total_amount ?? 0), 0)
  const todayTickets = (todayOrders ?? []).reduce((s, o) => s + Number(o.quantity ?? 0), 0)

  const featured = activeRaffles[0]
  const featuredSold = featured ? featured.total_tickets - featured.available_tickets : 0
  const featuredPct = featured ? Math.round((featuredSold / featured.total_tickets) * 100) : 0

  const { data: featuredTickets } = featured
    ? await supabase
        .from('tickets')
        .select('ticket_number')
        .eq('raffle_id', featured.id)
        .eq('status', 'sold')
        .order('purchased_at', { ascending: false })
        .limit(5)
    : { data: [] }

  return (
    <UserShell userName={userName} email={session.user.email ?? ''} isAdmin={isAdmin}>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8 w-full">

        {/* HERO */}
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <p className="text-sm text-muted-foreground mb-2">Resumo financeiro</p>
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
              Saldo acumulado e atividade de hoje
            </h1>
          </div>
          <div className="flex gap-3">
            <Link
              href="/meus-bilhetes"
              className="px-5 py-2.5 rounded-xl border border-border bg-card text-sm font-medium hover:bg-muted transition"
            >
              Gerenciar números
            </Link>
            <Link
              href="/criar-rifa"
              className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition"
            >
              Criar rifa
            </Link>
          </div>
        </section>

        {/* STATS */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground mb-3">Saldo acumulado</p>
            <p className="text-3xl font-semibold tracking-tight">{formatCurrency(totalRevenue)}</p>
            <p className="text-xs text-primary mt-2">{paidOrders?.length ?? 0} pedidos pagos</p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground mb-3">Vendido hoje</p>
            <p className="text-3xl font-semibold tracking-tight">{formatCurrency(todayRevenue)}</p>
            <p className="text-xs text-muted-foreground mt-2">{todayTickets} números</p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground mb-3">Rifas ativas</p>
            <p className="text-3xl font-semibold tracking-tight">{String(activeRaffles.length).padStart(2, '0')}</p>
            <p className="text-xs text-muted-foreground mt-2">{myRaffles.length} no total</p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground mb-3">Ticket médio</p>
            <p className="text-3xl font-semibold tracking-tight">
              {paidOrders && paidOrders.length > 0
                ? formatCurrency(totalRevenue / paidOrders.length)
                : 'R$ 0'}
            </p>
            <p className="text-xs text-muted-foreground mt-2">por pedido pago</p>
          </div>
        </section>

        {/* CAMPANHA EM DESTAQUE */}
        {featured ? (
          <section className="rounded-2xl border border-border bg-card p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Campanha em destaque</p>
                <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">{featured.title}</h2>
                <p className="text-sm text-muted-foreground mt-2">
                  Sorteio {formatDate(featured.draw_date)} · {featured.total_tickets} números · {formatCurrency(featured.ticket_price)}
                </p>
              </div>
              <Link
                href={`/rifas/${featured.id}`}
                className="shrink-0 px-5 py-2.5 rounded-xl bg-secondary text-secondary-foreground text-sm font-semibold hover:opacity-90 transition"
              >
                Vender número
              </Link>
            </div>

            <div className="flex items-end justify-between mb-3">
              <p className="text-sm text-muted-foreground">Progresso de números vendidos</p>
              <p className="text-2xl font-semibold">
                {featuredSold}<span className="text-muted-foreground">/{featured.total_tickets}</span>
              </p>
            </div>

            <div className="h-3 rounded-full bg-muted overflow-hidden mb-2">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-secondary"
                style={{ width: `${featuredPct}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mb-6">{featuredPct}% vendido</p>

            <div className="flex flex-wrap gap-2">
              {(featuredTickets ?? []).map((t) => (
                <span key={t.ticket_number} className="px-3 py-1.5 rounded-lg bg-muted text-sm">
                  Nº {String(t.ticket_number).padStart(3, '0')} · <span className="text-primary">vendido</span>
                </span>
              ))}
              {featured.available_tickets > 0 && (
                <span className="px-3 py-1.5 rounded-lg border border-dashed border-border text-sm text-muted-foreground">
                  +{featured.available_tickets} números
                </span>
              )}
            </div>
          </section>
        ) : (
          <section className="rounded-2xl border border-dashed border-border p-12 text-center">
            <p className="text-lg font-medium mb-2">Nenhuma rifa ativa</p>
            <p className="text-sm text-muted-foreground mb-6">Crie sua primeira campanha para começar a vender números.</p>
            <Link href="/criar-rifa" className="inline-block px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold">
              Criar rifa
            </Link>
          </section>
        )}

        {/* GRID */}
        <div className="grid lg:grid-cols-2 gap-6">

          {/* MINHAS RIFAS */}
          <section className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold text-lg">Minhas rifas</h3>
              <Link href="/minhas-rifas" className="text-sm text-muted-foreground hover:text-foreground transition">
                Ver todas
              </Link>
            </div>

            {myRaffles.length > 0 ? (
              <div className="space-y-2">
                {myRaffles.slice(0, 6).map((r) => {
                  const sold = r.total_tickets - r.available_tickets
                  const pct = Math.round((sold / r.total_tickets) * 100)
                  const statusLabel: Record<string, string> = {
                    active: 'Ativa',
                    paused: 'Pausada',
                    completed: 'Concluída',
                    cancelled: 'Cancelada',
                  }
                  const statusColor: Record<string, string> = {
                    active: 'text-primary',
                    paused: 'text-warning',
                    completed: 'text-muted-foreground',
                    cancelled: 'text-destructive',
                  }
                  return (
                    <div
                      key={r.id}
                      className="flex items-center gap-4 p-3 rounded-xl hover:bg-muted transition group"
                    >
                      <Link
                        href={`/rifas/${r.id}/gerenciar`}
                        className="w-11 h-11 rounded-xl bg-muted flex items-center justify-center font-semibold text-sm shrink-0 group-hover:bg-card"
                      >
                        {initials(r.title)}
                      </Link>
                      <Link href={`/rifas/${r.id}/gerenciar`} className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">{r.title}</p>
                          <span className={`text-[11px] font-semibold ${statusColor[r.status] ?? ''}`}>
                            {statusLabel[r.status] ?? r.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1.5">
                          <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs text-muted-foreground tabular-nums">{sold}/{r.total_tickets}</span>
                        </div>
                      </Link>
                      <RaffleQuickActions id={r.id} title={r.title} soldCount={sold} />
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-10">
                <p className="text-sm text-muted-foreground mb-4">Você ainda não criou nenhuma rifa</p>
                <Link href="/criar-rifa" className="text-sm text-primary font-semibold hover:underline">
                  Criar primeira rifa
                </Link>
              </div>
            )}
          </section>

          {/* PEDIDOS RECENTES */}
          <section className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold text-lg">Pedidos recentes</h3>
              <Link href="/minhas-rifas" className="text-sm text-muted-foreground hover:text-foreground transition">
                Ver todos
              </Link>
            </div>

            {recentOrders && recentOrders.length > 0 ? (
              <div className="space-y-3">
                {recentOrders.map((o: any) => {
                  const paid = o.status === 'paid'
                  const buyer = o.user?.full_name || o.user?.email?.split('@')[0] || 'Participante'
                  return (
                    <div key={o.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-muted transition">
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold shrink-0 ${
                            paid ? 'bg-primary/15 text-primary' : 'bg-secondary/15 text-secondary'
                          }`}
                        >
                          {paid ? 'Pago' : o.status === 'pending' ? 'Pendente' : o.status === 'expired' ? 'Expirado' : 'Cancelado'}
                        </span>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{buyer}</p>
                          <p className="text-xs text-muted-foreground">
                            {o.quantity} {o.quantity === 1 ? 'número' : 'números'} · {timeAgo(o.created_at)}
                          </p>
                        </div>
                      </div>
                      <p className="font-semibold tabular-nums shrink-0">{formatCurrency(o.total_amount)}</p>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-10">Nenhum pedido ainda</p>
            )}
          </section>
        </div>

        <p className="text-center text-xs text-muted-foreground pt-4">
          RifaLab · {userName}
        </p>
      </main>
    </UserShell>
  )
}
