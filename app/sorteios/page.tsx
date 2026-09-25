import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import { PublicShell } from '@/components/public-shell'
import { formatCurrency, formatDate } from '@/lib/get-session-user'

const fmtInt = (n: number) => new Intl.NumberFormat('pt-BR').format(n)

export default async function SorteiosPage() {
  const supabase = await createClient()

  const { data: raffles } = await supabase
    .from('raffles')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  const list = raffles ?? []

  return (
    <PublicShell active="/sorteios">
      <section className="pt-32 pb-12 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-sm font-medium text-primary mb-4 tracking-wide">Sorteios abertos</p>
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight leading-tight">
            {list.length} {list.length === 1 ? 'campanha aberta' : 'campanhas abertas'} agora
          </h1>
          <p className="text-lg text-muted-foreground mt-6">
            Escolha o prêmio, selecione seus números e pague por Pix. Sem cadastro prévio.
          </p>
        </div>
      </section>

      <section className="px-4 sm:px-6 pb-24">
        <div className="max-w-7xl mx-auto">
          {list.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {list.map((r) => {
                const sold = r.total_tickets - r.available_tickets
                const pct = Math.round((sold / r.total_tickets) * 100)
                const almostOut = r.available_tickets / r.total_tickets < 0.2
                return (
                  <Link
                    key={r.id}
                    href={`/rifas/${r.id}`}
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
                      {almostOut && (
                        <span className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-secondary text-secondary-foreground text-xs font-semibold">
                          Quase esgotado
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
                        <div className={`h-full rounded-full ${almostOut ? 'bg-secondary' : 'bg-primary'}`} style={{ width: `${pct}%` }} />
                      </div>

                      <div className="flex items-end justify-between mt-5">
                        <div>
                          <p className="text-xs text-muted-foreground">a partir de</p>
                          <p className="text-xl font-semibold">{formatCurrency(r.ticket_price)}</p>
                        </div>
                        <span className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold">
                          Participar
                        </span>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border p-16 text-center max-w-2xl mx-auto">
              <div className="text-5xl mb-4">🎰</div>
              <h3 className="text-xl font-semibold mb-2">Nenhum sorteio aberto no momento</h3>
              <p className="text-muted-foreground">Novas campanhas em breve. Fique de olho!</p>
            </div>
          )}
        </div>
      </section>
    </PublicShell>
  )
}
