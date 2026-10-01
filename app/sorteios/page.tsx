import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import { PublicShell } from '@/components/public-shell'
import { UserShell } from '@/components/user-shell'
import { formatCurrency, formatDate } from '@/lib/get-session-user'
import { prizePool } from '@/lib/prize'

const fmtInt = (n: number) => new Intl.NumberFormat('pt-BR').format(n)

export default async function SorteiosPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: raffles } = await supabase
    .from('raffles')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  const list = raffles ?? []

  // Arrecadação por rifa (pedidos pagos) pra calcular o prêmio acumulado
  const ids = list.map((r) => r.id)
  const { data: paidOrders } = ids.length
    ? await supabase
        .from('orders')
        .select('raffle_id, total_amount')
        .in('raffle_id', ids)
        .eq('status', 'paid')
    : { data: [] }

  const revenueByRaffle = new Map<string, number>()
  ;(paidOrders ?? []).forEach((o: any) => {
    revenueByRaffle.set(o.raffle_id, (revenueByRaffle.get(o.raffle_id) ?? 0) + Number(o.total_amount || 0))
  })

  const content = (
    <>
      <section className="pb-12 px-4 sm:px-6">
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
                      <span className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-background/85 backdrop-blur text-xs font-medium">
                        Jogos de 6 números
                      </span>
                    </div>
                    <div className="p-5">
                      <h3 className="text-lg font-semibold group-hover:text-primary transition truncate">{r.title}</h3>
                      <p className="text-sm text-muted-foreground truncate mt-0.5">{r.prize_name}</p>

                      <p className="text-xs text-muted-foreground mt-4">Volante de 1 a 75 · acerte 4, 5 ou 6 números</p>

                      <div className="flex items-end justify-between mt-5">
                        <div>
                          <p className="text-xs text-muted-foreground">Prêmios acumulados</p>
                          <p className="text-xl font-semibold">{formatCurrency(prizePool(revenueByRaffle.get(r.id), r.base_prize))}</p>
                          <p className="text-[11px] text-muted-foreground">jogo {formatCurrency(r.ticket_price)}</p>
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
    </>
  )

  if (user) {
    return (
      <UserShell>
        <main className="max-w-7xl mx-auto w-full pt-6">{content}</main>
      </UserShell>
    )
  }

  return (
    <PublicShell active="/sorteios">
      <div className="pt-24">{content}</div>
    </PublicShell>
  )
}
