import { createClient } from '@/lib/supabase-server'
import Link from 'next/link'
import { formatCurrency } from '@/lib/get-session-user'

const LIMIT = 500

const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

const fmtPlace = (o: any) =>
  o?.city || o?.region
    ? [o.city, o.region].filter(Boolean).join(' - ') + (o.country && o.country !== 'BR' ? ` (${o.country})` : '')
    : '—'

export default async function AdminVendasPage({
  searchParams,
}: {
  searchParams: Promise<{ jogo?: string }>
}) {
  const { jogo } = await searchParams
  const supabase = await createClient()

  const query = (withLocation: boolean) => {
    let q = supabase
      .from('bets')
      .select(
        `id, numbers, raffle_id, created_at,
         raffles(title, ticket_price),
         profiles(full_name, email),
         orders!inner(id, status, paid_at, created_at${withLocation ? ', city, region, country' : ''})`
      )
      .eq('orders.status', 'paid')
      .order('created_at', { ascending: false })
      .limit(LIMIT)
    if (jogo) q = q.eq('raffle_id', jogo)
    return q
  }

  const [betsRes, { data: raffles }] = await Promise.all([
    query(true),
    supabase.from('raffles').select('id, title').order('created_at', { ascending: false }),
  ])
  // Se a migration add_order_location.sql ainda não rodou, busca sem as colunas de local
  const { data: bets } = betsRes.error ? await query(false) : betsRes

  const list = (bets ?? []) as any[]
  const orderIds = new Set(list.map((b) => b.orders?.id))
  const buyers = new Set(list.map((b) => b.profiles?.email).filter(Boolean))
  const total = list.reduce((s, b) => s + Number(b.raffles?.ticket_price ?? 0), 0)

  const chip = (active: boolean) =>
    `px-3 py-1.5 rounded-lg text-xs font-medium border transition whitespace-nowrap ${
      active
        ? 'bg-primary/15 text-primary border-primary/40'
        : 'bg-card border-border text-muted-foreground hover:text-foreground'
    }`

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-foreground">Jogos vendidos</h2>
        <p className="text-muted-foreground mt-1">Cada jogo pago, com horário e local da compra</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Jogos vendidos', value: String(list.length) },
          { label: 'Arrecadado', value: formatCurrency(total) },
          { label: 'Compradores', value: `${buyers.size} · ${orderIds.size} pedidos` },
        ].map((s) => (
          <div key={s.label} className="bg-card rounded-lg border border-border p-5">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">{s.label}</p>
            <p className="text-2xl font-bold text-foreground mt-1 tabular-nums">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
        <Link href="/admin/vendas" className={chip(!jogo)}>
          Todos os sorteios
        </Link>
        {(raffles ?? []).map((r: any) => (
          <Link key={r.id} href={`/admin/vendas?jogo=${r.id}`} className={chip(jogo === r.id)}>
            {r.title}
          </Link>
        ))}
      </div>

      {list.length === 0 ? (
        <div className="bg-card rounded-lg border border-border p-16 text-center">
          <div className="text-5xl mb-4">🎫</div>
          <p className="text-muted-foreground">Nenhum jogo vendido ainda.</p>
        </div>
      ) : (
        <div className="bg-card rounded-lg border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted text-left text-muted-foreground text-xs uppercase">
                  <th className="px-5 py-3">Data e hora</th>
                  <th className="px-5 py-3">Comprador</th>
                  <th className="px-5 py-3">Sorteio</th>
                  <th className="px-5 py-3">Números</th>
                  <th className="px-5 py-3">Cidade / Estado</th>
                  <th className="px-5 py-3 text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {list.map((b) => (
                  <tr key={b.id} className="hover:bg-muted/50">
                    <td className="px-5 py-3.5 whitespace-nowrap text-muted-foreground tabular-nums">
                      {fmtDateTime(b.orders?.paid_at ?? b.orders?.created_at ?? b.created_at)}
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-foreground">
                        {b.profiles?.full_name || b.profiles?.email || 'Participante'}
                      </p>
                      {b.profiles?.full_name && (
                        <p className="text-xs text-muted-foreground">{b.profiles.email}</p>
                      )}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">{b.raffles?.title ?? '—'}</td>
                    <td className="px-5 py-3.5 font-mono text-xs text-muted-foreground whitespace-nowrap">
                      {[...b.numbers]
                        .sort((x: number, y: number) => x - y)
                        .map((n: number) => String(n).padStart(2, '0'))
                        .join(' ')}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-muted-foreground">{fmtPlace(b.orders)}</td>
                    <td className="px-5 py-3.5 text-right font-semibold tabular-nums">
                      {formatCurrency(b.raffles?.ticket_price)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {list.length === LIMIT && (
            <p className="px-5 py-3 text-xs text-muted-foreground border-t border-border">
              Mostrando os {LIMIT} jogos mais recentes.
            </p>
          )}
        </div>
      )}
    </main>
  )
}
