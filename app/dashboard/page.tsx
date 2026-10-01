import Link from 'next/link'
import { redirect } from 'next/navigation'
import { UserShell } from '@/components/user-shell'
import { AffiliateDashboard } from '@/components/affiliate-dashboard'
import { RaffleQuickActions } from '@/components/raffle-quick-actions'
import { getSessionUser, formatCurrency as fmt, formatDate as fmtDate } from '@/lib/get-session-user'
import { PRIZE_TIERS, TOTAL_PRIZE_RATE, DEFAULT_BASE_PRIZE, tierPot } from '@/lib/prize'
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

  // Usuário normal: painel simples com resumo dos jogos e sorteios ativos
  if (!isAdmin) {
    const [
      { count: boughtCount },
      { count: reservedCount },
      { data: userActiveRaffles },
    ] = await Promise.all([
      supabase
        .from('bets')
        .select('id, orders!inner(status)', { count: 'exact', head: true })
        .eq('user_id', session.user.id)
        .eq('orders.status', 'paid'),
      supabase
        .from('bets')
        .select('id, orders!inner(status)', { count: 'exact', head: true })
        .eq('user_id', session.user.id)
        .eq('orders.status', 'pending'),
      supabase
        .from('raffles')
        .select('id, title, prize_name, prize_image, ticket_price, total_tickets, available_tickets, draw_date')
        .eq('status', 'active')
        .order('created_at', { ascending: false }),
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
              Acompanhe seus jogos e explore os sorteios ativos.
            </p>
          </div>

          <section className="grid grid-cols-3 gap-3 sm:gap-4">
            <div className={`${card} p-5`}>
              <p className="text-sm text-muted-foreground mb-2">Jogos confirmados</p>
              <p className="text-3xl font-semibold text-primary">{boughtCount ?? 0}</p>
            </div>
            <div className={`${card} p-5`}>
              <p className="text-sm text-muted-foreground mb-2">Aguardando PIX</p>
              <p className="text-3xl font-semibold text-warning">{reservedCount ?? 0}</p>
            </div>
            <div className={`${card} p-5`}>
              <p className="text-sm text-muted-foreground mb-2">Sorteios ativos</p>
              <p className="text-3xl font-semibold">{userActiveRaffles?.length ?? 0}</p>
            </div>
          </section>

          <section>
            <h2 className="font-semibold text-lg mb-4">Sorteios abertos</h2>
            {userActiveRaffles && userActiveRaffles.length > 0 ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {userActiveRaffles.map((r: any) => {
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
                          6 números / jogo
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
            <Link href="/meus-bilhetes" className={btnPrimary}>Meus jogos</Link>
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

  // Comissões de afiliados pagas nos jogos do admin
  const { data: commissions } = await supabase
    .from('affiliate_commissions')
    .select('amount, orders!inner(raffle_id)')

  const myRaffles = myRaffleRows ?? []
  const activeRaffles = myRaffles.filter((r) => r.status === 'active')

  const totalRevenue = (paidOrders ?? []).reduce((s, o) => s + Number(o.total_amount ?? 0), 0)
  const todayRevenue = (todayOrders ?? []).reduce((s, o) => s + Number(o.total_amount ?? 0), 0)
  const todayTickets = (todayOrders ?? []).reduce((s, o) => s + Number(o.quantity ?? 0), 0)

  // Divisão da arrecadação: prêmios (base + 43%) / comissões / casa
  const myRaffleIds = new Set(myRaffles.map((r) => r.id))
  const baseTotal = myRaffles.reduce((s, r) => s + Number(r.base_prize ?? DEFAULT_BASE_PRIZE), 0)
  const prizeTotal = baseTotal + totalRevenue * TOTAL_PRIZE_RATE
  const commissionTotal = (commissions ?? [])
    .filter((c: any) => myRaffleIds.has(c.orders?.raffle_id))
    .reduce((s, c: any) => s + Number(c.amount ?? 0), 0)
  const houseNet = totalRevenue - prizeTotal - commissionTotal

  const featured = activeRaffles[0]

  const { data: featuredBets } = featured
    ? await supabase
        .from('bets')
        .select('numbers, orders!inner(status)')
        .eq('raffle_id', featured.id)
        .eq('orders.status', 'paid')
        .order('created_at', { ascending: false })
        .limit(5)
    : { data: [] }

  const featuredJogos = (featuredBets ?? []).length

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
        </section>

        {/* STATS */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground mb-3">Saldo acumulado</p>
            <p className="text-2xl sm:text-3xl font-semibold tracking-tight tabular-nums break-all">{formatCurrency(totalRevenue)}</p>
            <p className="text-xs text-primary mt-2">{paidOrders?.length ?? 0} pedidos pagos</p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground mb-3">Vendido hoje</p>
            <p className="text-2xl sm:text-3xl font-semibold tracking-tight tabular-nums break-all">{formatCurrency(todayRevenue)}</p>
            <p className="text-xs text-muted-foreground mt-2">{todayTickets} jogos</p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground mb-3">Jogos ativos</p>
            <p className="text-3xl font-semibold tracking-tight">{String(activeRaffles.length).padStart(2, '0')}</p>
            <p className="text-xs text-muted-foreground mt-2">{myRaffles.length} no total</p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground mb-3">Ticket médio</p>
            <p className="text-2xl sm:text-3xl font-semibold tracking-tight tabular-nums break-all">
              {paidOrders && paidOrders.length > 0
                ? formatCurrency(totalRevenue / paidOrders.length)
                : 'R$ 0'}
            </p>
            <p className="text-xs text-muted-foreground mt-2">por pedido pago</p>
          </div>
        </section>

        {/* DIVISÃO DA ARRECADAÇÃO */}
        <section className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-lg">Divisão da arrecadação</h3>
            <span className="text-xs text-muted-foreground">sobre {formatCurrency(totalRevenue)} vendidos</span>
          </div>

          {/* Barra empilhada */}
          <div className="h-4 rounded-full overflow-hidden flex bg-muted mb-6">
            {totalRevenue + baseTotal > 0 ? (
              <>
                <div className="bg-primary" style={{ width: `${Math.min((prizeTotal / (totalRevenue + baseTotal)) * 100, 100)}%` }} title="Prêmios" />
                <div className="bg-secondary" style={{ width: `${Math.min((commissionTotal / (totalRevenue + baseTotal)) * 100, 100)}%` }} title="Afiliados" />
                <div className="bg-warning" style={{ width: `${Math.max(Math.min((houseNet / (totalRevenue + baseTotal)) * 100, 100), 0)}%` }} title="Casa" />
              </>
            ) : null}
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            <div className="rounded-xl bg-muted p-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2.5 h-2.5 rounded-full bg-primary shrink-0" />
                <p className="text-xs text-muted-foreground">Prêmios (Sena · Quina · Quadra)</p>
              </div>
              <p className="text-xl font-semibold tabular-nums">{formatCurrency(prizeTotal)}</p>
              <p className="text-[11px] text-muted-foreground mt-1">
                {formatCurrency(baseTotal)} de base + {Math.round(TOTAL_PRIZE_RATE * 100)}% das vendas
              </p>
            </div>

            <div className="rounded-xl bg-muted p-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2.5 h-2.5 rounded-full bg-secondary shrink-0" />
                <p className="text-xs text-muted-foreground">Comissões de afiliados</p>
              </div>
              <p className="text-xl font-semibold tabular-nums">{formatCurrency(commissionTotal)}</p>
              <p className="text-[11px] text-muted-foreground mt-1">até 30% por venda indicada</p>
            </div>

            <div className="rounded-xl bg-muted p-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2.5 h-2.5 rounded-full bg-warning shrink-0" />
                <p className="text-xs text-muted-foreground">Fica pra casa</p>
              </div>
              <p className="text-xl font-semibold tabular-nums">{formatCurrency(houseNet)}</p>
              <p className="text-[11px] text-muted-foreground mt-1">arrecadado − prêmios − comissões</p>
            </div>
          </div>

          {/* Detalhe por faixa de prêmio */}
          <div className="grid sm:grid-cols-3 gap-3 mt-3">
            {PRIZE_TIERS.map((t) => (
              <div key={t.key} className="rounded-xl border border-border px-4 py-3 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t.label} ({t.hits} acertos)</span>
                <span className="font-semibold tabular-nums">{formatCurrency(tierPot(t, totalRevenue, baseTotal))}</span>
              </div>
            ))}
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
                  Sorteio {formatDate(featured.draw_date)} · jogos de 6 números (1–75) · {formatCurrency(featured.ticket_price)}
                </p>
              </div>
              <Link
                href={`/rifas/${featured.id}`}
                className="shrink-0 px-5 py-2.5 rounded-xl bg-secondary text-secondary-foreground text-sm font-semibold hover:opacity-90 transition"
              >
                Ver sorteio
              </Link>
            </div>

            <p className="text-sm text-muted-foreground mb-3">
              <span className="text-2xl font-semibold text-foreground">{featuredJogos}</span> jogos vendidos
            </p>

            <div className="flex flex-wrap gap-2">
              {(featuredBets ?? []).map((b: any, i: number) => (
                <span key={i} className="px-3 py-1.5 rounded-lg bg-muted text-sm font-mono">
                  {[...b.numbers].sort((a: number, z: number) => a - z).map((n: number) => String(n).padStart(2, '0')).join(' ')}
                </span>
              ))}
            </div>
          </section>
        ) : (
          <section className="rounded-2xl border border-dashed border-border p-12 text-center">
            <p className="text-lg font-medium mb-2">Nenhum jogo ativo</p>
            <p className="text-sm text-muted-foreground mb-6">Crie sua primeira campanha para começar a vender números.</p>
            <Link href="/criar-rifa" className="inline-block px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold">
              Criar jogo
            </Link>
          </section>
        )}

        {/* GRID */}
        <div className="grid lg:grid-cols-2 gap-6">

          {/* MINHAS RIFAS */}
          <section className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold text-lg">Jogos criados</h3>
              <Link href="/minhas-rifas" className="text-sm text-muted-foreground hover:text-foreground transition">
                Ver todas
              </Link>
            </div>

            {myRaffles.length > 0 ? (
              <div className="space-y-2">
                {myRaffles.slice(0, 6).map((r) => {
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
                        <p className="text-xs text-muted-foreground mt-1.5">jogos de 6 números · 1–75</p>
                      </Link>
                      <RaffleQuickActions id={r.id} title={r.title} soldCount={0} />
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-10">
                <p className="text-sm text-muted-foreground mb-4">Você ainda não criou nenhum jogo</p>
                <Link href="/criar-rifa" className="text-sm text-primary font-semibold hover:underline">
                  Criar primeiro jogo
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
                            {o.quantity} {o.quantity === 1 ? 'jogo' : 'jogos'} · {timeAgo(o.created_at)}
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
          Sorteios Rápidos · {userName}
        </p>
      </main>
    </UserShell>
  )
}
