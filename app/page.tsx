import { createClient } from '@/lib/supabase-server'
import Link from 'next/link'
import { PublicShell } from '@/components/public-shell'
import { PrizeVisual } from '@/components/prize-visual'
import { formatCurrency, formatDate } from '@/lib/get-session-user'
import { prizePool } from '@/lib/prize'

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

const recentWinners = [
  { numbers: '04 11 23 38 52 67', name: 'Camila R.', city: 'Fortaleza, CE', prize: 'Pix de R$ 412,50' },
  { numbers: '02 15 29 44 58 71', name: 'Jonas M.', city: 'Curitiba, PR', prize: 'Pix de R$ 287,00' },
  { numbers: '07 19 33 46 60 74', name: 'Rafaela S.', city: 'Belém, PA', prize: 'Pix de R$ 356,80' },
]

const fmtInt = (n: number) => new Intl.NumberFormat('pt-BR').format(n)

export default async function Home() {
  const supabase = await createClient()

  const [{ data: activeRaffles }, { data: paidOrders }] = await Promise.all([
    supabase
      .from('raffles')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(3),
    supabase
      .from('orders')
      .select('raffle_id, total_amount, raffles!inner(status)')
      .eq('raffles.status', 'active')
      .eq('status', 'paid'),
  ])

  const hasReal = (activeRaffles?.length ?? 0) > 0
  const raffles: any[] = hasReal ? activeRaffles! : showcase
  const featured = raffles[0]
  const featuredHref = featured.id ? `/rifas/${featured.id}` : '/sorteios'
  const minPrice = Math.min(...raffles.map((r) => Number(r.ticket_price)))
  const revenueByRaffle = new Map<string, number>()
  ;(paidOrders ?? []).forEach((o: any) => {
    revenueByRaffle.set(o.raffle_id, (revenueByRaffle.get(o.raffle_id) ?? 0) + Number(o.total_amount || 0))
  })

  return (
    <PublicShell>
      {/* HERO */}
      <section className="pt-32 pb-16 px-4 sm:px-6 relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_left,oklch(0.82_0.13_174/0.14),transparent_55%)]" />

        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-card text-xs font-medium mb-6">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              {raffles.length} {raffles.length === 1 ? 'campanha aberta' : 'campanhas abertas'} agora
            </span>

            <h1 className="text-4xl md:text-6xl font-semibold tracking-tight leading-[1.05]">
              6 números. Um prêmio que só cresce.
            </h1>
            <p className="text-lg text-muted-foreground mt-6 max-w-lg">
              Escolha 6 números entre 1 e 75, pague por Pix e pronto. Acertando 4, 5 ou 6 números
              (Quadra, Quina ou Sena) você já ganha — os prêmios acumulam a cada aposta vendida.
            </p>

            <div className="flex flex-wrap gap-3 mt-8">
              <Link
                href={featuredHref}
                className="px-6 py-3.5 rounded-2xl bg-primary text-primary-foreground font-semibold hover:opacity-90 transition"
              >
                Concorrer agora →
              </Link>
              <Link
                href="/como-funciona"
                className="px-6 py-3.5 rounded-2xl border border-border bg-card font-medium hover:bg-muted transition"
              >
                Como funciona
              </Link>
            </div>

            <div className="grid grid-cols-3 gap-6 mt-12 pt-8 border-t border-border">
              {[
                { value: 'R$ 200', label: 'prêmio inicial garantido' },
                { value: '+17%', label: 'de cada aposta vai pro prêmio' },
                { value: '6/75', label: 'números pra cravar' },
              ].map((s) => (
                <div key={s.label}>
                  <p className="text-2xl md:text-3xl font-semibold tracking-tight">{s.value}</p>
                  <p className="text-xs md:text-sm text-muted-foreground mt-1">{s.label}</p>
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
            <div className="p-6">
              <div className="flex items-start justify-between gap-4 mb-4">
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
            </div>
          </Link>
        </div>
      </section>

      {/* SORTEIOS ABERTOS */}
      <section className="px-4 sm:px-6 py-20 border-t border-border">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
            <div>
              <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">Sorteios abertos</h2>
              <p className="text-muted-foreground mt-2">Escolha uma campanha e garanta seus números.</p>
            </div>
            <Link href="/sorteios" className="text-sm font-semibold text-primary hover:underline shrink-0">
              Ver todos →
            </Link>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {raffles.map((r, i) => {
              const href = r.id ? `/rifas/${r.id}` : '/sorteios'
              return (
                <Link
                  key={r.id ?? i}
                  href={href}
                  className="group rounded-2xl border border-border bg-card overflow-hidden hover:border-primary/40 hover:-translate-y-0.5 transition"
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

      {/* 3 PILARES */}
      <section className="px-4 sm:px-6 py-20 border-t border-border bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                n: '01',
                title: 'Pagamento por Pix',
                desc: 'QR Code gerado na hora. Assim que o pagamento cai, seus jogos ficam confirmados no seu nome.',
              },
              {
                n: '02',
                title: 'Sorteio ao vivo',
                desc: 'São sorteados 6 números entre 1 e 75 ao vivo. Acertou 4, 5 ou 6? Você ganha uma parte do prêmio.',
              },
              {
                n: '03',
                title: 'Prêmio que acumula',
                desc: 'Sena começa em R$ 200 e cresce a cada aposta. Quina e Quadra também levam uma parte da arrecadação.',
              },
            ].map((s) => (
              <div key={s.n}>
                <p className="text-sm font-mono text-primary mb-4">{s.n}</p>
                <h3 className="text-xl font-semibold mb-3">{s.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-10">
            <Link href="/como-funciona" className="text-sm font-semibold text-primary hover:underline">
              Ver regulamento completo e perguntas frequentes →
            </Link>
          </div>
        </div>
      </section>

      {/* ÚLTIMOS GANHADORES (resumo) */}
      <section className="px-4 sm:px-6 py-20 border-t border-border">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
            <div>
              <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">Últimos ganhadores</h2>
              <p className="text-muted-foreground mt-2">Nomes reduzidos para preservar a privacidade.</p>
            </div>
            <Link href="/resultados" className="text-sm font-semibold text-primary hover:underline shrink-0">
              Ver todos os resultados →
            </Link>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {recentWinners.map((w) => (
              <div key={w.numbers} className="rounded-2xl border border-border bg-card p-5">
                <p className="font-mono text-lg font-semibold text-primary">{w.numbers}</p>
                <p className="text-xs text-muted-foreground mb-4">Jogo premiado (6 acertos)</p>
                <p className="font-medium">{w.name}</p>
                <p className="text-xs text-muted-foreground">{w.city}</p>
                <p className="text-sm font-medium mt-3 pt-3 border-t border-border">{w.prize}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="px-4 sm:px-6 py-24 border-t border-border">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-4">
            Jogos a partir de {formatCurrency(minPrice)}
          </h2>
          <p className="text-muted-foreground mb-10">
            Monte seu jogo de 6 números, pague por Pix e concorra ao prêmio acumulado. Rápido, simples e ao vivo.
          </p>
          <Link
            href="/sorteios"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-secondary text-secondary-foreground font-semibold text-lg hover:opacity-90 transition"
          >
            Quero participar →
          </Link>
        </div>
      </section>
    </PublicShell>
  )
}
