import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ThemeToggle } from '@/components/theme-toggle'
import { formatCurrency } from '@/lib/get-session-user'

export default async function Home() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) redirect('/dashboard')

  const { data: featuredRaffles } = await supabase
    .from('raffles')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(6)

  const raffleCount = featuredRaffles?.length ?? 0

  return (
    <main className="min-h-screen bg-background text-foreground">

      {/* NAVBAR */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg">
              R
            </div>
            <span className="font-semibold text-lg">RifaLab</span>
          </Link>

          <div className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#sorteios" className="hover:text-foreground transition">Sorteios</a>
            <a href="#como-funciona" className="hover:text-foreground transition">Como funciona</a>
            <a href="#resultados" className="hover:text-foreground transition">Resultados</a>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link
              href="/login"
              className="px-5 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition"
            >
              Entrar
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="pt-36 pb-20 px-4 sm:px-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,oklch(0.82_0.13_174/0.12),transparent_55%)]" />

        <p className="text-sm font-medium text-primary mb-4 tracking-wide">
          Sorteios de prêmios online
        </p>
        <h1 className="text-4xl md:text-6xl font-semibold tracking-tight max-w-3xl mx-auto leading-tight">
          Concorra a prêmios incríveis de forma simples
        </h1>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto mt-6">
          Escolha o sorteio, selecione seus números, pague via PIX e acompanhe tudo pela plataforma.
        </p>
        <div className="mt-10">
          <a
            href="#sorteios"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-primary text-primary-foreground font-semibold text-lg hover:opacity-90 transition"
          >
            Ver sorteios ativos →
          </a>
        </div>
      </section>

      {/* PASSOS RÁPIDOS */}
      <section className="px-4 sm:px-6 pb-20">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">Prêmios esperando por você</h2>
            <p className="text-muted-foreground mt-3 max-w-xl mx-auto">
              Participe dos sorteios disponíveis e concorra a smartphones, eletrônicos, veículos, dinheiro e muito mais.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {[
              { icon: '🎯', title: 'Escolha seus números', desc: 'Selecione seus números disponíveis diretamente na plataforma.' },
              { icon: '⚡', title: 'Pague com PIX', desc: 'Pagamento rápido e confirmação automática.' },
              { icon: '🏆', title: 'Acompanhe o sorteio', desc: 'Consulte suas participações, acompanhe o andamento e confira os resultados.' },
            ].map((s) => (
              <div key={s.title} className="rounded-2xl border border-border bg-card p-6 hover:border-primary/40 transition">
                <div className="w-11 h-11 rounded-xl bg-primary/15 flex items-center justify-center text-xl mb-4">
                  {s.icon}
                </div>
                <h3 className="font-semibold mb-2">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SORTEIOS EM DESTAQUE */}
      <section id="sorteios" className="px-4 sm:px-6 py-20 border-t border-border">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
            <div>
              <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">Sorteios em destaque</h2>
              <p className="text-muted-foreground mt-2">
                Descubra os prêmios disponíveis e escolha em qual você quer participar.
              </p>
            </div>
            <Link href="/rifas" className="text-sm font-semibold text-primary hover:underline shrink-0">
              Ver todos os sorteios →
            </Link>
          </div>

          {raffleCount > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {featuredRaffles!.map((r) => {
                const sold = r.total_tickets - r.available_tickets
                const pct = Math.round((sold / r.total_tickets) * 100)
                return (
                  <Link
                    key={r.id}
                    href={`/rifas/${r.id}`}
                    className="rounded-2xl border border-border bg-card overflow-hidden hover:border-primary/40 hover:-translate-y-0.5 transition group"
                  >
                    <div className="h-40 bg-gradient-to-br from-primary/20 to-secondary/20 relative">
                      {r.prize_image ? (
                        <img src={r.prize_image} alt={r.prize_name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-5xl">🎁</div>
                      )}
                      <span className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-background/80 backdrop-blur text-xs font-semibold text-primary">
                        {pct}% vendido
                      </span>
                    </div>
                    <div className="p-5">
                      <h3 className="font-semibold truncate group-hover:text-primary transition">{r.title}</h3>
                      <p className="text-sm text-muted-foreground truncate mt-1">{r.prize_name}</p>
                      <div className="h-1.5 rounded-full bg-muted mt-4 overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="flex items-center justify-between mt-4">
                        <div>
                          <p className="text-xs text-muted-foreground">Bilhete</p>
                          <p className="font-semibold">{formatCurrency(r.ticket_price)}</p>
                        </div>
                        <span className="px-4 py-2 rounded-xl bg-secondary text-secondary-foreground text-xs font-semibold">
                          Participar
                        </span>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border p-14 text-center">
              <p className="text-lg font-medium mb-2">Nenhum sorteio ativo no momento</p>
              <p className="text-sm text-muted-foreground">Volte em breve para conferir novos prêmios.</p>
            </div>
          )}
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section id="como-funciona" className="px-4 sm:px-6 py-20 border-t border-border">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">Como funciona</h2>
            <p className="text-muted-foreground mt-3">Participar é simples</p>
          </div>

          <div className="space-y-4">
            {[
              { n: '1', title: 'Escolha um prêmio', desc: 'Veja todos os sorteios disponíveis na plataforma.' },
              { n: '2', title: 'Escolha seus números', desc: 'Selecione quantos números quiser entre os disponíveis.' },
              { n: '3', title: 'Faça o pagamento', desc: 'Finalize sua participação através do PIX.' },
              { n: '4', title: 'Acompanhe o resultado', desc: 'Seus números ficam disponíveis na sua conta para você acompanhar até o sorteio.' },
            ].map((s) => (
              <div key={s.n} className="flex items-start gap-5 rounded-2xl border border-border bg-card p-6">
                <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-bold shrink-0">
                  {s.n}
                </div>
                <div>
                  <h3 className="font-semibold">{s.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* VANTAGENS */}
      <section className="px-4 sm:px-6 py-20 border-t border-border">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-center mb-12">
            Tudo em um só lugar
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { icon: '🎁', title: 'Prêmios exclusivos', desc: 'Novos sorteios e diferentes categorias de prêmios.' },
              { icon: '⚡', title: 'Confirmação rápida', desc: 'Participações confirmadas automaticamente após o pagamento.' },
              { icon: '📱', title: 'Acompanhe pelo celular', desc: 'Consulte seus números, pagamentos e resultados quando quiser.' },
              { icon: '🏆', title: 'Histórico de ganhadores', desc: 'Veja os sorteios encerrados e os ganhadores anteriores.' },
            ].map((b) => (
              <div key={b.title} className="flex items-start gap-4 rounded-2xl border border-border bg-card p-6">
                <span className="text-2xl">{b.icon}</span>
                <div>
                  <h3 className="font-semibold">{b.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{b.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* RESULTADOS */}
      <section id="resultados" className="px-4 sm:px-6 py-20 border-t border-border">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-semibold tracking-tight mb-4">Resultados</h2>
          <p className="text-muted-foreground max-w-lg mx-auto mb-8">
            Os sorteios encerrados e seus ganhadores ficam disponíveis aqui. Em breve você poderá consultar o histórico completo.
          </p>
          <div className="rounded-2xl border border-dashed border-border p-10 text-muted-foreground text-sm">
            Nenhum sorteio encerrado ainda.
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="px-4 sm:px-6 py-24 border-t border-border">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-4">
            Seu próximo prêmio pode estar aqui
          </h2>
          <p className="text-muted-foreground mb-10">
            Confira os sorteios disponíveis e escolha seus números.
          </p>
          <Link
            href="/rifas"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-secondary text-secondary-foreground font-semibold text-lg hover:opacity-90 transition"
          >
            Participar dos sorteios →
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-border px-4 sm:px-6 py-10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold">
              R
            </div>
            <div>
              <div className="font-semibold">RifaLab</div>
              <div className="text-xs text-muted-foreground">Plataforma de sorteios de prêmios online.</div>
            </div>
          </div>
          <nav className="flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#sorteios" className="hover:text-foreground transition">Sorteios</a>
            <a href="#como-funciona" className="hover:text-foreground transition">Como funciona</a>
            <a href="#resultados" className="hover:text-foreground transition">Resultados</a>
            <Link href="/login" className="hover:text-foreground transition">Minha conta</Link>
          </nav>
        </div>
      </footer>
    </main>
  )
}
