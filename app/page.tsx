import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import Link from 'next/link'
import { PublicShell } from '@/components/public-shell'
import { PrizeVisual } from '@/components/prize-visual'
import { Countdown } from '@/components/countdown'
import { formatCurrency, formatDate } from '@/lib/get-session-user'
import { prizePool, tierPot, PRIZE_TIERS } from '@/lib/prize'
import { getRevenueByRaffle } from '@/lib/raffle-revenue'

// Vitrine usada quando ainda não há rifas cadastradas
const showcase = [
  {
    id: null,
    title: 'Bolão da Sexta',
    prize_name: 'Prêmio acumulado em Pix',
    prize_image: '/premios/carro.jpg',
    ticket_price: 10,
    draw_date: '2026-10-12',
  },
  {
    id: null,
    title: 'Sorteio Relâmpago',
    prize_name: 'Prêmio acumulado em Pix',
    prize_image: '/premios/moto.jpg',
    ticket_price: 10,
    draw_date: '2026-09-28',
  },
  {
    id: null,
    title: 'Jogo do Fim de Semana',
    prize_name: 'Prêmio acumulado em Pix',
    prize_image: '/premios/iphone.jpg',
    ticket_price: 10,
    draw_date: '2026-09-20',
  },
]

// "Camila Rodrigues" -> "Camila R." (privacidade)
const shortName = (full?: string | null) => {
  const parts = (full ?? '').trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return 'Participante'
  return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.` : parts[0]
}

// Ganhadores reais dos últimos sorteios. bets e orders têm RLS por dono,
// então lê com a chave secreta no servidor e só devolve nome abreviado.
async function getRecentWinners() {
  const admin = createAdminClient()
  if (!admin) return []

  const { data: completed } = await admin
    .from('raffles')
    .select('id, title, base_prize, drawn_at')
    .eq('status', 'completed')
    .not('winning_numbers', 'is', null)
    .order('drawn_at', { ascending: false })
    .limit(5)
  if (!completed?.length) return []

  const ids = completed.map((r) => r.id)
  const [{ data: bets }, revenue] = await Promise.all([
    admin
      .from('bets')
      .select('numbers, hits, raffle_id, profiles(full_name)')
      .in('raffle_id', ids)
      .gte('hits', 4),
    getRevenueByRaffle(admin, ids),
  ])

  const winners = (bets ?? []).map((b: any) => {
    const raffle = completed.find((r) => r.id === b.raffle_id)!
    const tier = PRIZE_TIERS.find((t) => t.hits === b.hits)!
    const sameTier = (bets ?? []).filter((x: any) => x.raffle_id === b.raffle_id && x.hits === b.hits).length
    return {
      name: shortName(b.profiles?.full_name),
      numbers: [...b.numbers].sort((x: number, y: number) => x - y),
      hits: b.hits as number,
      tier: tier.label,
      raffle: raffle.title,
      drawnAt: raffle.drawn_at,
      prize: tierPot(tier, revenue.get(b.raffle_id), raffle.base_prize) / sameTier,
    }
  })

  return winners
    .sort((a, b) => b.hits - a.hits || +new Date(b.drawnAt) - +new Date(a.drawnAt))
    .slice(0, 6)
}

const fmtInt = (n: number) => new Intl.NumberFormat('pt-BR').format(n)

export default async function Home() {
  const supabase = await createClient()

  const [{ data: activeRaffles }, recentWinners] = await Promise.all([
    supabase
      .from('raffles')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(3),
    getRecentWinners(),
  ])

  const hasReal = (activeRaffles?.length ?? 0) > 0
  const raffles: any[] = hasReal ? activeRaffles! : showcase
  const featured = raffles[0]
  const featuredHref = featured.id ? `/rifas/${featured.id}` : '/sorteios'
  const minPrice = Math.min(...raffles.map((r) => Number(r.ticket_price)))
  const revenueByRaffle = hasReal
    ? await getRevenueByRaffle(supabase, activeRaffles!.map((r) => r.id))
    : new Map<string, number>()
  const featuredDrawSoon =
    featured.draw_date && new Date(featured.draw_date).getTime() > Date.now() ? featured.draw_date : null

  return (
    <PublicShell
      mobileCta={
        <Link
          href={featuredHref}
          className="flex items-center justify-between gap-3 w-full px-5 py-3.5 rounded-2xl bg-primary text-primary-foreground font-semibold active:opacity-90"
        >
          <span>Montar meu jogo</span>
          <span className="text-sm font-medium opacity-90">
            {formatCurrency(featured.ticket_price)} →
          </span>
        </Link>
      }
    >
      {/* HERO */}
      <section className="pt-24 sm:pt-32 pb-10 sm:pb-16 px-4 sm:px-6 relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_left,oklch(0.82_0.13_174/0.14),transparent_55%)]" />

        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          <div>
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-card text-xs font-medium mb-4 sm:mb-6">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              {raffles.length} {raffles.length === 1 ? 'campanha aberta' : 'campanhas abertas'} agora
            </span>

            <h1 className="text-[2.15rem] sm:text-5xl md:text-6xl font-semibold tracking-tight leading-[1.08]">
              6 números. Um prêmio que só cresce.
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground mt-4 sm:mt-6 max-w-lg">
              Escolha 6 números entre 1 e 75, pague por Pix e pronto. Acertando 4, 5 ou 6 números
              (Quadra, Quina ou Sena) você já ganha — os prêmios acumulam a cada aposta vendida.
            </p>

            <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-3 mt-6 sm:mt-8">
              <Link
                href={featuredHref}
                className="text-center px-4 sm:px-6 py-3.5 rounded-2xl bg-primary text-primary-foreground font-semibold hover:opacity-90 transition"
              >
                Concorrer agora →
              </Link>
              <Link
                href="/como-funciona"
                className="text-center px-4 sm:px-6 py-3.5 rounded-2xl border border-border bg-card font-medium hover:bg-muted transition"
              >
                Como funciona
              </Link>
            </div>

            <div className="grid grid-cols-3 gap-3 sm:gap-6 mt-8 sm:mt-12 pt-6 sm:pt-8 border-t border-border">
              {[
                { value: 'R$ 200', label: 'prêmio inicial garantido' },
                { value: '3 faixas', label: 'Quadra, Quina e Sena' },
                { value: '6/75', label: 'números pra cravar' },
              ].map((s) => (
                <div key={s.label}>
                  <p className="text-xl sm:text-2xl md:text-3xl font-semibold tracking-tight">{s.value}</p>
                  <p className="text-[11px] sm:text-sm text-muted-foreground mt-1 leading-snug">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* CARD DESTAQUE */}
          <Link
            href={featuredHref}
            className="group rounded-3xl border border-border bg-card overflow-hidden hover:border-primary/40 transition shadow-xl shadow-primary/5"
          >
            <div className="aspect-[4/3] relative overflow-hidden bg-muted">
              {featured.prize_image ? (
                <img
                  src={featured.prize_image}
                  alt={featured.prize_name}
                  className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700"
                />
              ) : (
                <PrizeVisual
                  size="lg"
                  value={prizePool(revenueByRaffle.get(featured.id), featured.base_prize)}
                />
              )}
              <span className="absolute top-4 left-4 px-3 py-1.5 rounded-lg bg-secondary text-secondary-foreground text-xs font-semibold">
                Em destaque
              </span>
            </div>
            <div className="p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4 mb-3 sm:mb-4">
                <h2 className="text-xl md:text-2xl font-semibold tracking-tight">{featured.title}</h2>
                {featured.draw_date && (
                  <span className="text-sm text-muted-foreground shrink-0">
                    {formatDate(featured.draw_date, { day: '2-digit', month: '2-digit', year: 'numeric' })}
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                Volante de 1 a 75 — monte seu jogo de 6 números por {formatCurrency(featured.ticket_price)}.
              </p>
              {hasReal && (
                <p className="text-sm font-semibold text-primary mt-3">
                  Prêmios acumulados: {formatCurrency(prizePool(revenueByRaffle.get(featured.id), featured.base_prize))}
                </p>
              )}
              {hasReal && featuredDrawSoon && (
                <div className="mt-5 pt-5 border-t border-border">
                  <p className="text-xs text-muted-foreground mb-2">Sorteio em</p>
                  <Countdown target={featuredDrawSoon} />
                </div>
              )}
              <span className="mt-5 flex items-center justify-center w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold group-hover:opacity-90 transition">
                Montar meu jogo →
              </span>
            </div>
          </Link>
        </div>
      </section>

      {/* SORTEIOS ABERTOS — carrossel deslizante no celular, grade no desktop */}
      <section className="px-4 sm:px-6 py-12 sm:py-20 border-t border-border">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-end justify-between gap-4 mb-6 sm:mb-10">
            <div>
              <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">Sorteios abertos</h2>
              <p className="text-sm sm:text-base text-muted-foreground mt-1 sm:mt-2">Escolha uma campanha e garanta seus números.</p>
            </div>
            <Link href="/sorteios" className="text-sm font-semibold text-primary hover:underline shrink-0">
              Ver todos →
            </Link>
          </div>

          <div className="flex sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 overflow-x-auto sm:overflow-visible snap-x snap-mandatory -mx-4 px-4 sm:mx-0 sm:px-0 pb-2 sm:pb-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {raffles.map((r, i) => {
              const href = r.id ? `/rifas/${r.id}` : '/sorteios'
              return (
                <Link
                  key={r.id ?? i}
                  href={href}
                  className={`group shrink-0 snap-start sm:w-auto rounded-2xl border border-border bg-card overflow-hidden hover:border-primary/40 hover:-translate-y-0.5 transition ${
                    raffles.length > 1 ? 'w-[85%]' : 'w-full'
                  }`}
                >
                  <div className="aspect-[4/3] bg-muted relative overflow-hidden">
                    {r.prize_image ? (
                      <img
                        src={r.prize_image}
                        alt={r.prize_name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <PrizeVisual value={prizePool(revenueByRaffle.get(r.id), r.base_prize)} />
                    )}
                    {r.draw_date && (
                      <span className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-background/85 backdrop-blur text-xs font-medium">
                        Sorteio {formatDate(r.draw_date, { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </span>
                    )}
                  </div>
                  <div className="p-5">
                    <h3 className="text-lg font-semibold group-hover:text-primary transition truncate">{r.title}</h3>
                    <p className="text-sm text-muted-foreground truncate mt-0.5">{r.prize_name}</p>

                    <p className="text-xs text-muted-foreground mt-4">Jogo de 6 números entre 1 e 75</p>

                    <div className="flex items-end justify-between mt-5">
                      <div>
                        <p className="text-xs text-muted-foreground">Prêmio acumulado</p>
                        <p className="text-xl font-semibold">{formatCurrency(prizePool(revenueByRaffle.get(r.id), r.base_prize))}</p>
                        <p className="text-[11px] text-muted-foreground">jogo {formatCurrency(r.ticket_price)}</p>
                      </div>
                      <span className="text-sm font-semibold text-primary group-hover:underline">
                        Montar jogo →
                      </span>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      {/* FAIXAS DE PRÊMIO — linhas compactas no celular, cards no desktop */}
      <section className="px-4 sm:px-6 py-12 sm:py-20 border-t border-border">
        <div className="max-w-6xl mx-auto">
          <div className="mb-6 sm:mb-10">
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">Três chances de ganhar</h2>
            <p className="text-sm sm:text-base text-muted-foreground mt-1 sm:mt-2">
              Acertou 4, 5 ou 6 números? O prêmio da faixa é dividido entre os ganhadores dela.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-3 sm:gap-5">
            {PRIZE_TIERS.map((t) => (
              <div
                key={t.key}
                className={`rounded-2xl border bg-card p-4 sm:p-6 flex md:block items-center justify-between gap-4 ${
                  t.key === 'sena' ? 'border-primary/50 shadow-lg shadow-primary/10' : 'border-border'
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 md:justify-between md:mb-6">
                    <span className="text-base sm:text-lg font-semibold">{t.label}</span>
                    <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg bg-primary/15 text-primary text-[11px] sm:text-xs font-semibold">
                      {t.hits} acertos
                    </span>
                  </div>
                  <div className="flex gap-1 sm:gap-1.5 mt-2 md:mt-0 md:mb-6">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <span
                        key={i}
                        className={`w-5 h-5 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-semibold ${
                          i < t.hits ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {i < t.hits ? '✓' : '·'}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="text-right md:text-left shrink-0">
                  <p className="text-[11px] sm:text-xs text-muted-foreground">
                    <span className="md:hidden">Prêmio</span>
                    <span className="hidden md:inline">
                      {hasReal ? `Acumulado em ${featured.title}` : 'Prêmio da faixa'}
                    </span>
                  </p>
                  <p className="text-lg sm:text-2xl font-semibold tracking-tight mt-0.5 sm:mt-1 tabular-nums">
                    {formatCurrency(tierPot(t, hasReal ? revenueByRaffle.get(featured.id) : 0, featured.base_prize))}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COMO JOGAR */}
      <section className="px-4 sm:px-6 py-12 sm:py-20 border-t border-border bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="mb-6 sm:mb-10">
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">Como jogar</h2>
            <p className="text-sm sm:text-base text-muted-foreground mt-1 sm:mt-2">Em menos de um minuto seu jogo está confirmado.</p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
            {[
              {
                icon: '🎯',
                title: 'Escolha 6 números',
                desc: 'Marque 6 números de 1 a 75 no volante, ou use a surpresinha.',
              },
              {
                icon: '⚡',
                title: 'Pague por Pix',
                desc: 'QR Code na hora. Caiu o pagamento, o jogo fica confirmado no seu nome.',
              },
              {
                icon: '🎲',
                title: 'Acompanhe o sorteio',
                desc: 'São sorteados 6 números ao vivo. Seus acertos aparecem em "Meus jogos".',
              },
              {
                icon: '💸',
                title: 'Receba o prêmio',
                desc: 'Acertou 4, 5 ou 6? O prêmio da faixa é dividido entre os ganhadores.',
              },
            ].map((s, i) => (
              <div key={s.title} className="relative rounded-2xl border border-border bg-card p-4 sm:p-6">
                <span className="absolute top-4 right-4 sm:top-5 sm:right-5 text-[10px] sm:text-xs font-mono text-muted-foreground">0{i + 1}</span>
                <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-primary/15 flex items-center justify-center text-lg sm:text-xl mb-3 sm:mb-5">
                  {s.icon}
                </div>
                <h3 className="text-sm sm:text-base font-semibold mb-1 sm:mb-2 leading-snug">{s.title}</h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 sm:mt-10">
            <Link href="/como-funciona" className="text-sm font-semibold text-primary hover:underline">
              Ver regulamento completo e perguntas frequentes →
            </Link>
          </div>
        </div>
      </section>

      {/* ÚLTIMOS GANHADORES (reais) — só aparece depois do primeiro sorteio com ganhador */}
      {recentWinners.length > 0 && (
        <section className="px-4 sm:px-6 py-12 sm:py-20 border-t border-border">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 sm:gap-4 mb-6 sm:mb-8">
              <div>
                <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">Últimos ganhadores</h2>
                <p className="text-muted-foreground mt-2">Nomes reduzidos para preservar a privacidade.</p>
              </div>
              <Link href="/resultados" className="text-sm font-semibold text-primary hover:underline shrink-0">
                Ver todos os resultados →
              </Link>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              {recentWinners.map((w, i) => (
                <div key={i} className="rounded-2xl border border-border bg-card p-5">
                  <div className="flex items-center justify-between mb-4">
                    <span
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                        w.hits === 6 ? 'bg-primary text-primary-foreground' : 'bg-primary/15 text-primary'
                      }`}
                    >
                      {w.hits === 6 ? '🏆 ' : ''}
                      {w.tier} · {w.hits} acertos
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(w.drawnAt, { day: '2-digit', month: '2-digit' })}
                    </span>
                  </div>
                  <div className="flex gap-1 mb-4">
                    {w.numbers.map((n: number) => (
                      <span
                        key={n}
                        className="w-8 h-8 rounded-full bg-muted text-xs font-semibold flex items-center justify-center tabular-nums"
                      >
                        {String(n).padStart(2, '0')}
                      </span>
                    ))}
                  </div>
                  <p className="font-medium">{w.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{w.raffle}</p>
                  <p className="text-lg font-semibold text-primary mt-3 pt-3 border-t border-border">
                    {formatCurrency(w.prize)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CONFIANÇA */}
      <section className="px-4 sm:px-6 py-10 sm:py-14 border-t border-border">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-6 text-center">
          {[
            { icon: '🔒', title: 'Pagamento seguro', desc: 'Pix via Mercado Pago' },
            { icon: '⚡', title: 'Confirmação na hora', desc: 'Jogo no seu nome em segundos' },
            { icon: '📺', title: 'Sorteio transparente', desc: 'Resultados públicos' },
            { icon: '💸', title: 'Prêmio por Pix', desc: 'Direto na sua conta' },
          ].map((b) => (
            <div key={b.title}>
              <div className="text-2xl mb-2">{b.icon}</div>
              <p className="font-semibold text-sm">{b.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{b.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="px-4 sm:px-6 py-14 sm:py-24 border-t border-border">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight mb-3 sm:mb-4">
            Jogos a partir de {formatCurrency(minPrice)}
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground mb-8 sm:mb-10">
            Monte seu jogo de 6 números, pague por Pix e concorra ao prêmio acumulado. Rápido, simples e ao vivo.
          </p>
          <Link
            href="/sorteios"
            className="flex sm:inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-secondary text-secondary-foreground font-semibold text-lg hover:opacity-90 transition"
          >
            Quero participar →
          </Link>
        </div>
      </section>
    </PublicShell>
  )
}
