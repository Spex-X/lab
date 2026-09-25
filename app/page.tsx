import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { PublicShell } from '@/components/public-shell'
import { formatCurrency, formatDate } from '@/lib/get-session-user'

// Vitrine usada quando ainda não há rifas cadastradas
const showcase = [
  {
    id: null,
    title: 'Pickup Wildtrak 0 km',
    prize_name: 'Caminhonete 0 km + R$ 10.000 no Pix',
    prize_image: '/premios/carro.jpg',
    ticket_price: 9.9,
    total_tickets: 120000,
    available_tickets: 33600,
    draw_date: '2026-10-12',
  },
  {
    id: null,
    title: 'Superbike Black Edition',
    prize_name: 'Moto esportiva 1000cc',
    prize_image: '/premios/moto.jpg',
    ticket_price: 4.9,
    total_tickets: 60000,
    available_tickets: 18780,
    draw_date: '2026-09-28',
  },
  {
    id: null,
    title: 'Kit Apple Completo',
    prize_name: 'iPhone linha Pro + fones sem fio',
    prize_image: '/premios/iphone.jpg',
    ticket_price: 1.9,
    total_tickets: 26000,
    available_tickets: 1820,
    draw_date: '2026-09-20',
  },
]

const recentWinners = [
  { number: '047.213', name: 'Camila R.', city: 'Fortaleza, CE', prize: 'Pix de R$ 100 mil' },
  { number: '012.980', name: 'Jonas M.', city: 'Curitiba, PR', prize: 'SUV compacto 0 km' },
  { number: '008.451', name: 'Rafaela S.', city: 'Belém, PA', prize: 'Kit Apple Completo' },
]

const fmtInt = (n: number) => new Intl.NumberFormat('pt-BR').format(n)

export default async function Home() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) redirect('/dashboard')

  const { data: activeRaffles } = await supabase
    .from('raffles')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(3)

  const hasReal = (activeRaffles?.length ?? 0) > 0
  const raffles: any[] = hasReal ? activeRaffles! : showcase
  const featured = raffles[0]
  const featuredSold = featured.total_tickets - featured.available_tickets
  const featuredPct = Math.round((featuredSold / featured.total_tickets) * 100)
  const featuredHref = featured.id ? `/rifas/${featured.id}` : '/sorteios'
  const minPrice = Math.min(...raffles.map((r) => Number(r.ticket_price)))

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
              Seu número da sorte custa menos que um café.
            </h1>
            <p className="text-lg text-muted-foreground mt-6 max-w-lg">
              Sorteios de carros, motos, eletrônicos e dinheiro no Pix. Você escolhe os números,
              paga em segundos e acompanha tudo em tempo real.
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
                { value: 'R$ 2,4 mi', label: 'em prêmios pagos' },
                { value: '38 mil', label: 'participantes' },
                { value: '112', label: 'sorteios realizados' },
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
              <img
                src={featured.prize_image || '/premios/carro.jpg'}
                alt={featured.prize_name}
                className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700"
              />
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
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="font-semibold text-primary">{featuredPct}% vendido</span>
                <span className="text-muted-foreground">{fmtInt(featured.available_tickets)} números livres</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-secondary"
                  style={{ width: `${featuredPct}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                {fmtInt(featuredSold)} números já reservados — cada um custa {formatCurrency(featured.ticket_price)}.
              </p>
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
              const sold = r.total_tickets - r.available_tickets
              const pct = Math.round((sold / r.total_tickets) * 100)
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
                      <div className="w-full h-full flex items-center justify-center text-5xl">🎁</div>
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

                    <div className="flex items-center justify-between text-xs mt-4 mb-1.5">
                      <span className="font-semibold text-primary">{pct}% vendido</span>
                      <span className="text-muted-foreground">{fmtInt(r.available_tickets)} números livres</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                    </div>

                    <div className="flex items-end justify-between mt-5">
                      <div>
                        <p className="text-xs text-muted-foreground">a partir de</p>
                        <p className="text-xl font-semibold">{formatCurrency(r.ticket_price)}</p>
                      </div>
                      <span className="text-sm font-semibold text-primary group-hover:underline">
                        Escolher números →
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
                desc: 'QR Code gerado na hora. Assim que o pagamento cai, seus números ficam reservados no seu nome.',
              },
              {
                n: '02',
                title: 'Resultado auditado',
                desc: 'Todo sorteio segue a extração da Loteria Federal, com o bilhete premiado publicado na campanha.',
              },
              {
                n: '03',
                title: 'Prêmio entregue',
                desc: 'Documentação, transporte e transferência por nossa conta, em qualquer estado do Brasil.',
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
              <div key={w.number} className="rounded-2xl border border-border bg-card p-5">
                <p className="font-mono text-2xl font-semibold text-primary">{w.number}</p>
                <p className="text-xs text-muted-foreground mb-4">Bilhete premiado</p>
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
            Números a partir de {formatCurrency(minPrice)}
          </h2>
          <p className="text-muted-foreground mb-10">
            Escolha seus números, pague por Pix e concorra. Rápido, simples e auditado.
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
